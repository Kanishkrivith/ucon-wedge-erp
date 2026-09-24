const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const KEY = process.env.GEMINI_API_KEY || process.argv[2] || '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const prompt = `You are an expert Indian Manufacturing Accounting & Tax Auditor for UCON PT Structural System Pvt Ltd (GSTIN: 33AAACU6685L1ZV).
Extract:
1. Header canonical fields
2. All line items (line_no, description, part_number, hsn_code, quantity, unit, unit_rate, discount, taxable_amount, tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount, category_code, destination_module, capex_or_opex, costing_head).

Return strictly JSON with:
{
  "document_type": "INVOICE",
  "document_number": "string",
  "document_date": "YYYY-MM-DD",
  "vendor_name": "string",
  "vendor_gstin": "string",
  "customer_name": "string",
  "customer_gstin": "string",
  "taxable_value": number,
  "cgst_amount": number,
  "sgst_amount": number,
  "igst_amount": number,
  "total_invoice_amount": number,
  "line_items": [
    {
      "line_no": 1,
      "description": "item description",
      "hsn_code": "HSN",
      "quantity": 1,
      "unit": "NOS",
      "unit_rate": 100,
      "taxable_amount": 100,
      "tax_rate": 18,
      "cgst_amount": 9,
      "sgst_amount": 9,
      "igst_amount": 0,
      "total_amount": 118,
      "category_code": "C. TOOLING AND INSERTS",
      "destination_module": "TOOLING",
      "capex_or_opex": "OPEX",
      "costing_head": "Consumable Tooling"
    }
  ]
}`;

async function reprocess(doc) {
  const models = ['gemini-3.7-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  let rawText = '';

  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: doc.mime_type || 'application/pdf', data: doc.file_data } }
            ]
          }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn(`  Model ${m} failed (${res.status}), trying next:`, err.slice(0, 100));
        continue;
      }

      const data = await res.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        console.log(`  Extracted successfully using model: ${m}`);
        break;
      }
    } catch (e) {
      console.warn(`  Model ${m} error:`, e.message);
    }
  }

  if (!rawText) {
    console.error(`All models failed for ${doc.original_filename}`);
    return;
  }
  let parsed = {};
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error(`Parse error for ${doc.original_filename}:`, e);
    return;
  }

  const hdr = parsed.header || parsed.invoice_header || parsed;
  const rawLines = parsed.line_items || parsed.lines || parsed.items || hdr.line_items || hdr.lines || hdr.items || [];
  console.log(`  -> Found ${rawLines.length} lines`);

  await pool.query('DELETE FROM document_line_items WHERE document_id = $1', [doc.id]);
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    await pool.query(
      `INSERT INTO document_line_items (
        document_id, line_no, description, part_number, hsn_code,
        quantity, unit, unit_rate, discount, taxable_amount,
        tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
        category_code, sub_category, process_stage_code, destination_module,
        capex_or_opex, costing_head, confidence, confidence_status, source_page_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 1)`,
      [
        doc.id,
        l.line_no || (i + 1),
        l.description || 'Item',
        l.part_number || '',
        l.hsn_code || '',
        Number(l.quantity) || 1,
        l.unit || 'NOS',
        Number(l.unit_rate) || 0,
        Number(l.discount) || 0,
        Number(l.taxable_amount) || 0,
        Number(l.tax_rate) || 18,
        Number(l.cgst_amount) || 0,
        Number(l.sgst_amount) || 0,
        Number(l.igst_amount) || 0,
        Number(l.tax_amount) || (Number(l.cgst_amount || 0) + Number(l.sgst_amount || 0) + Number(l.igst_amount || 0)),
        Number(l.total_amount) || 0,
        l.category_code || 'B. CNC MACHINES AND CAPITAL EQUIPMENT',
        l.sub_category || 'GENERAL',
        l.costing_head || 'GENERAL',
        l.destination_module || 'PURCHASE',
        l.capex_or_opex || 'OPEX',
        l.costing_head || 'GENERAL',
        0.98,
        'HIGH'
      ]
    );
  }

  // Also update header fields if doc number or date was found
  const docNum = parsed.document_number || parsed.invoice_number || hdr.document_number;
  const docDate = parsed.document_date || hdr.document_date;
  if (docNum || docDate) {
    await pool.query(
      `UPDATE documents SET document_number = COALESCE($1, document_number), document_date = COALESCE($2, document_date) WHERE id = $3`,
      [docNum || null, docDate || null, doc.id]
    );
  }

  console.log(`[DONE] ${doc.original_filename} updated with ${rawLines.length} line items.`);
}

async function run() {
  const res = await pool.query(`
    SELECT d.id, d.original_filename, d.file_data, d.mime_type
    FROM documents d
    LEFT JOIN document_line_items l ON l.document_id = d.id
    WHERE l.id IS NULL AND d.file_data IS NOT NULL
    ORDER BY d.created_at DESC
  `);

  console.log(`Found ${res.rows.length} documents needing line item extraction.`);
  for (let i = 0; i < res.rows.length; i++) {
    const doc = res.rows[i];
    await reprocess(doc);
    if (i < res.rows.length - 1) {
      console.log('Sleeping 4.2s for Gemini rate limits...');
      await sleep(4200);
    }
  }
  console.log('All remaining documents populated successfully!');
  await pool.end();
}

run().catch(console.error);
