const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve('.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
let geminiApiKey = '';

for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.substring('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
  }
  if (trimmed.startsWith('GEMINI_API_KEY=')) {
    geminiApiKey = trimmed.substring('GEMINI_API_KEY='.length).replace(/^['"]|['"]$/g, '');
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const prompt = `You are an expert Indian Manufacturing Accounting & Tax Auditor for UCON PT Structural System Pvt Ltd (GSTIN: 33AAACU6685L1ZV).
Extract all information from this document with 100% precision.
Classify the document (INVOICE, DELIVERY_CHALLAN, PURCHASE_ORDER, RECEIPT, CREDIT_NOTE, DEBIT_NOTE).
Extract:
1. Header fields: document_type, document_number, document_date (YYYY-MM-DD), vendor_name, vendor_gstin, customer_name, customer_gstin, taxable_value, cgst_amount, sgst_amount, igst_amount, total_invoice_amount.
2. Every line item: line_no, description, part_number, hsn_code, quantity, unit, unit_rate, discount, taxable_amount, tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount, category_code, destination_module, capex_or_opex, costing_head.

Return STRICTLY a JSON object matching this schema:
{
  "document_type": "DELIVERY_CHALLAN" | "INVOICE",
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
      "description": "string",
      "part_number": "string",
      "hsn_code": "string",
      "quantity": number,
      "unit": "string",
      "unit_rate": number,
      "discount": number,
      "taxable_amount": number,
      "tax_rate": number,
      "cgst_amount": number,
      "sgst_amount": number,
      "igst_amount": number,
      "tax_amount": number,
      "total_amount": number,
      "category_code": "A. RAW MATERIALS - STEEL" | "B. HARDWARE AND FASTENERS" | "C. TOOLING AND INSERTS" | "D. SUBCONTRACTING / JOB WORK" | "E. PACKING AND DISPATCH" | "F. CONSUMABLES",
      "destination_module": "INVENTORY" | "TOOLING" | "PURCHASE" | "ACCOUNTS",
      "capex_or_opex": "OPEX" | "CAPEX",
      "costing_head": "string"
    }
  ]
}`;

async function run() {
  try {
    const docRes = await pool.query(
      `SELECT id, original_filename, document_type, status, mime_type, file_data 
       FROM documents 
       WHERE original_filename ILIKE '%DC-0050%' 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (docRes.rows.length === 0) {
      console.log('No DC-0050 document found in DB.');
      return;
    }

    const doc = docRes.rows[0];
    console.log(`Processing Document ID: ${doc.id}, Filename: ${doc.original_filename}`);

    if (!doc.file_data) {
      console.log('No file_data stored for document!');
      return;
    }

    console.log(`Calling Gemini 3.5 Flash Lite...`);
    const t0 = Date.now();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: doc.mime_type || 'application/pdf',
                  data: doc.file_data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    const elapsed = Date.now() - t0;
    console.log(`Gemini response received in ${elapsed}ms, Status: ${res.status}`);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('No candidate content returned');

    const parsed = JSON.parse(rawText);
    console.log('Parsed extraction:');
    console.log({
      document_type: parsed.document_type,
      document_number: parsed.document_number,
      document_date: parsed.document_date,
      vendor_name: parsed.vendor_name,
      total_amount: parsed.total_invoice_amount,
      lines_count: parsed.line_items?.length || 0,
    });

    // Clean old extractions & line items
    await pool.query('DELETE FROM document_extractions WHERE document_id = $1', [doc.id]);
    await pool.query('DELETE FROM document_line_items WHERE document_id = $1', [doc.id]);

    // Save fields
    const fieldsToSave = [
      { name: 'document_type', val: parsed.document_type },
      { name: 'document_number', val: parsed.document_number },
      { name: 'invoice_number', val: parsed.document_number },
      { name: 'document_date', val: parsed.document_date },
      { name: 'vendor_name', val: parsed.vendor_name },
      { name: 'vendor_gstin', val: parsed.vendor_gstin },
      { name: 'customer_name', val: parsed.customer_name },
      { name: 'customer_gstin', val: parsed.customer_gstin },
      { name: 'taxable_value', val: parsed.taxable_value },
      { name: 'cgst_amount', val: parsed.cgst_amount },
      { name: 'sgst_amount', val: parsed.sgst_amount },
      { name: 'igst_amount', val: parsed.igst_amount },
      { name: 'total_invoice_amount', val: parsed.total_invoice_amount },
    ];

    for (const f of fieldsToSave) {
      if (f.val !== undefined && f.val !== null) {
        await pool.query(
          `INSERT INTO document_extractions (
            document_id, page_no, field_name, extracted_value, normalized_value, confidence, confidence_status
          ) VALUES ($1, 1, $2, $3, $4, 0.98, 'HIGH')`,
          [doc.id, f.name, String(f.val), String(f.val)]
        );
      }
    }

    // Save lines
    const lines = parsed.line_items || [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await pool.query(
        `INSERT INTO document_line_items (
          document_id, line_no, description, part_number, hsn_code,
          quantity, unit, unit_rate, discount, taxable_amount,
          tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
          category_code, sub_category, process_stage_code, destination_module,
          capex_or_opex, costing_head, confidence, confidence_status, source_page_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 0.98, 'HIGH', 1)`,
        [
          doc.id,
          line.line_no || i + 1,
          line.description || 'Line item',
          line.part_number || '',
          line.hsn_code || '',
          line.quantity || 1,
          line.unit || 'NOS',
          line.unit_rate || 0,
          line.discount || 0,
          line.taxable_amount || 0,
          line.tax_rate || 0,
          line.cgst_amount || 0,
          line.sgst_amount || 0,
          line.igst_amount || 0,
          line.tax_amount || (line.cgst_amount || 0) + (line.sgst_amount || 0) + (line.igst_amount || 0),
          line.total_amount || 0,
          line.category_code || 'F. CONSUMABLES',
          line.sub_category || '',
          line.process_stage_code || '',
          line.destination_module || 'INVENTORY',
          line.capex_or_opex || 'OPEX',
          line.costing_head || 'Consumable Springs',
        ]
      );
    }

    // Resolve or insert vendor
    let vendorId = null;
    if (parsed.vendor_name) {
      let vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${parsed.vendor_name}%`]);
      if (vRes.rows[0]) {
        vendorId = vRes.rows[0].id;
      } else {
        const newV = await pool.query(
          `INSERT INTO vendors (canonical_name, category) VALUES ($1, 'SUBCONTRACT') RETURNING id`,
          [parsed.vendor_name]
        );
        vendorId = newV.rows[0].id;
      }
    }

    // Update document header
    const docType = (parsed.document_type || '').includes('CHALLAN') ? 'DC' : 'INVOICE';
    await pool.query(
      `UPDATE documents
       SET classification_code = 'F. CONSUMABLES',
           destination_module = 'INVENTORY',
           destination_record_type = 'INVENTORY_RECEIPT',
           ai_confidence = 0.98,
           document_date = $1,
           document_number = $2,
           vendor_id = $3,
           document_type = $4,
           page_count = 1,
           status = 'PENDING_REVIEW',
           rejection_reason = NULL
       WHERE id = $5`,
      [
        parsed.document_date || null,
        parsed.document_number || null,
        vendorId,
        docType,
        doc.id,
      ]
    );

    console.log('SUCCESS: Supabase document DC-0050 has been fully extracted and updated!');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Execution error:', err);
});
