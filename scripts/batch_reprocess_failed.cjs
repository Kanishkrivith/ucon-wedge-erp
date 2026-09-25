const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve('.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
let apiKey = '';
for (const line of envText.split('\n')) {
  if (line.trim().startsWith('DATABASE_URL=')) dbUrl = line.trim().substring('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
  if (line.trim().startsWith('GEMINI_API_KEY=')) apiKey = line.trim().substring('GEMINI_API_KEY='.length).replace(/^['"]|['"]$/g, '');
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

function sanitizeDateForPg(rawDate) {
  if (!rawDate) return null;
  const s = String(rawDate).trim();
  if (!s || s === 'NOT AVAILABLE' || s === 'NEEDS REVIEW' || s === 'null' || s === 'undefined' || s === 'N/A' || s.toUpperCase().includes('PENDING') || s.toUpperCase().includes('AVAILABLE')) return null;
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]), m = Number(ymd[2]), d = Number(ymd[3]);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const dmy = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = `20${y}`;
    const yr = Number(y), m = Number(dmy[2]), d = Number(dmy[1]);
    if (yr >= 1970 && yr <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${yr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    if (yr >= 1970 && yr <= 2100) return parsed.toISOString().split('T')[0];
  }
  return null;
}

function sanitizeTextForPg(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === 'NOT AVAILABLE' || s === 'NEEDS REVIEW' || s === 'null' || s === 'undefined' || s === 'N/A') return null;
  return s;
}

const prompt = `You are an expert Indian Manufacturing Accounting & Tax Auditor for UCON PT Structural System Pvt Ltd (GSTIN: 33AAACU6685L1ZV).
Extract:
1. Header canonical fields: document_type, document_number, document_date (YYYY-MM-DD), vendor_name, vendor_gstin, customer_name, customer_gstin, taxable_value, cgst_amount, sgst_amount, igst_amount, total_invoice_amount.
2. All line items: line_no, description, part_number, hsn_code, quantity, unit, unit_rate, discount, taxable_amount, tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount, category_code, destination_module, capex_or_opex, costing_head.
Classify items into Master Groups A through V.
Return STRICTLY valid JSON with:
{
  "document_type": "INVOICE" | "DELIVERY_CHALLAN",
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
      "category_code": "string",
      "sub_category": "string",
      "destination_module": "TOOLING" | "MACHINES & CAPEX" | "RAW MATERIAL INVENTORY" | "CONSUMABLES" | "PURCHASE",
      "capex_or_opex": "OPEX" | "CAPEX",
      "costing_head": "string"
    }
  ]
}`;

async function reprocessDoc(doc) {
  console.log(`\n==============================================`);
  console.log(`Processing: ${doc.original_filename} (${doc.id})...`);
  if (!doc.file_data) {
    console.log(`No file_data for ${doc.original_filename}`);
    return;
  }

  const models = [
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
  ];

  let parsed = null;
  for (const m of models) {
    try {
      console.log(`Trying model: ${m}...`);
      const t0 = Date.now();
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: doc.mime_type || 'application/pdf', data: doc.file_data } }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (!res.ok) {
        console.log(`Model ${m} returned ${res.status}`);
        continue;
      }
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      parsed = JSON.parse(rawText);
      console.log(`Model ${m} succeeded in ${Date.now() - t0}ms!`);
      break;
    } catch (e) {
      console.log(`Model ${m} error: ${e.message}`);
    }
  }

  if (!parsed) {
    console.error(`Failed to extract ${doc.original_filename} with all models.`);
    return;
  }

  const hdr = parsed.header || parsed.invoice_header || parsed;
  const rawLines = parsed.line_items || parsed.lines || hdr.line_items || hdr.lines || [];
  const docType = (parsed.document_type || hdr.document_type || 'INVOICE').toUpperCase().includes('CHALLAN') ? 'DC' : 'INVOICE';
  const docNum = parsed.document_number || parsed.invoice_number || hdr.document_number || hdr.invoice_number;
  const docDate = parsed.document_date || parsed.invoice_date || hdr.document_date || hdr.invoice_date;
  const vendorName = parsed.vendor_name || hdr.vendor_name;
  const vendorGstin = parsed.vendor_gstin || hdr.vendor_gstin;
  const custName = parsed.customer_name || hdr.customer_name || 'UCON PT STRUCTURAL SYSTEM PRIVATE LIMITED';
  const custGstin = parsed.customer_gstin || hdr.customer_gstin || '33AAACU6685L1ZV';
  const taxableVal = parsed.taxable_value ?? hdr.taxable_value;
  const cgstVal = parsed.cgst_amount ?? hdr.cgst_amount;
  const sgstVal = parsed.sgst_amount ?? hdr.sgst_amount;
  const igstVal = parsed.igst_amount ?? hdr.igst_amount;
  const totalTax = (Number(cgstVal || 0) + Number(sgstVal || 0) + Number(igstVal || 0)) || parsed.total_tax_amount;
  const totalInv = parsed.total_invoice_amount ?? parsed.total_amount ?? hdr.total_invoice_amount ?? hdr.total_amount;

  console.log(`Extracted metadata:`, {
    docNum,
    docDate,
    vendorName,
    totalInv,
    linesCount: rawLines.length,
  });

  // Clear old extractions & line items
  await pool.query('DELETE FROM document_extractions WHERE document_id = $1', [doc.id]);
  await pool.query('DELETE FROM document_line_items WHERE document_id = $1', [doc.id]);
  await pool.query('DELETE FROM document_pages WHERE document_id = $1', [doc.id]);

  // Insert extractions
  const fields = [
    { name: 'document_type', val: docType },
    { name: 'document_number', val: docNum },
    { name: 'invoice_number', val: docNum },
    { name: 'document_date', val: docDate },
    { name: 'vendor_name', val: vendorName },
    { name: 'vendor_gstin', val: vendorGstin },
    { name: 'customer_name', val: custName },
    { name: 'customer_gstin', val: custGstin },
    { name: 'taxable_value', val: taxableVal },
    { name: 'cgst_amount', val: cgstVal },
    { name: 'sgst_amount', val: sgstVal },
    { name: 'igst_amount', val: igstVal },
    { name: 'total_tax_amount', val: totalTax },
    { name: 'total_invoice_amount', val: totalInv },
  ];

  for (const f of fields) {
    if (f.val !== undefined && f.val !== null) {
      await pool.query(
        `INSERT INTO document_extractions (
          document_id, page_no, field_name, extracted_value, normalized_value, confidence, confidence_status
        ) VALUES ($1, 1, $2, $3, $4, 0.98, 'HIGH')`,
        [doc.id, f.name, String(f.val), String(f.val)]
      );
    }
  }

  // Insert lines
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    const qty = Math.max(0, Number(l.quantity) || 1);
    const rate = Math.max(0, Number(l.unit_rate) || 0);
    const disc = Math.max(0, Number(l.discount) || 0);
    const taxRate = Math.max(0, Number(l.tax_rate) || 18);
    const taxable = l.taxable_amount !== undefined ? Number(l.taxable_amount) : Math.max(0, qty * rate - disc);
    const cgst = Math.max(0, Number(l.cgst_amount) || 0);
    const sgst = Math.max(0, Number(l.sgst_amount) || 0);
    const igst = Math.max(0, Number(l.igst_amount) || 0);
    const taxAmt = l.tax_amount !== undefined ? Number(l.tax_amount) : (cgst + sgst + igst);
    const total = l.total_amount !== undefined ? Number(l.total_amount) : (taxable + taxAmt);

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
        l.line_no || i + 1,
        l.description || `Item ${i + 1}`,
        l.part_number || '',
        l.hsn_code || '',
        qty,
        (l.unit || 'NOS').toUpperCase(),
        rate,
        disc,
        taxable,
        taxRate,
        cgst,
        sgst,
        igst,
        taxAmt,
        total,
        l.category_code || 'C. TOOLING AND INSERTS',
        l.sub_category || '',
        l.process_stage_code || '',
        l.destination_module || 'TOOLING',
        l.capex_or_opex || 'OPEX',
        l.costing_head || 'Consumable Tools',
      ]
    );
  }

  // Insert rich page text stream
  const ocrStream = [
    `=======================================================`,
    `DOCUMENT TYPE: ${docType}`,
    `DOCUMENT NUMBER: ${docNum || 'N/A'}`,
    `DOCUMENT DATE: ${docDate || 'N/A'}`,
    `VENDOR: ${vendorName || 'N/A'}  (GSTIN: ${vendorGstin || 'N/A'})`,
    `CUSTOMER: ${custName || 'N/A'}  (GSTIN: ${custGstin || 'N/A'})`,
    `TAXABLE AMOUNT: ₹${taxableVal || 0}`,
    `GST TOTAL: ₹${totalTax || 0}`,
    `TOTAL INVOICE AMOUNT: ₹${totalInv || 0}`,
    `=======================================================`,
    '',
    `--- ITEMIZED LINES EXTRACTED (${rawLines.length} ITEMS) ---`,
    ...rawLines.map((l, idx) => `[Line ${l.line_no || idx + 1}] ${l.description} | Qty: ${l.quantity || 1} ${l.unit || 'NOS'} @ ₹${l.unit_rate || 0} | Taxable: ₹${l.taxable_amount || 0} | Total: ₹${l.total_amount || 0} | Category: ${l.category_code || 'GENERAL'}`),
  ].join('\n');

  await pool.query(
    `INSERT INTO document_pages (document_id, page_no, ocr_text)
     VALUES ($1, 1, $2)
     ON CONFLICT (document_id, page_no) DO UPDATE SET ocr_text = EXCLUDED.ocr_text`,
    [doc.id, ocrStream]
  );

  // Vendor resolution
  let vendorId = null;
  const safeVendor = sanitizeTextForPg(vendorName);
  if (safeVendor) {
    let vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${safeVendor}%`]);
    if (!vRes.rows[0]) {
      const firstWord = safeVendor.split(' ')[0];
      if (firstWord && firstWord.length > 2) {
        vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${firstWord}%`]);
      }
    }
    if (vRes.rows[0]) {
      vendorId = vRes.rows[0].id;
    } else {
      const newV = await pool.query(
        `INSERT INTO vendors (canonical_name, category) VALUES ($1, 'SUBCONTRACT') RETURNING id`,
        [safeVendor]
      );
      vendorId = newV.rows[0].id;
    }
  }

  const safeDate = sanitizeDateForPg(docDate);
  const safeNumber = sanitizeTextForPg(docNum);
  const topCategory = rawLines[0]?.category_code || 'C. TOOLING AND INSERTS';
  const topDest = rawLines[0]?.destination_module || 'TOOLING';

  await pool.query(
    `UPDATE documents
     SET classification_code = $1,
         destination_module = $2,
         destination_record_type = 'INVENTORY_RECEIPT',
         ai_confidence = 0.98,
         document_date = $3,
         document_number = $4,
         vendor_id = $5,
         document_type = $6,
         page_count = 1,
         status = 'PENDING_REVIEW',
         rejection_reason = NULL
     WHERE id = $7`,
    [
      topCategory,
      topDest,
      safeDate,
      safeNumber,
      vendorId,
      docType,
      doc.id,
    ]
  );

  console.log(`SUCCESSFULLY UPDATED: ${doc.original_filename}!`);
}

async function run() {
  const docs = await pool.query(
    `SELECT id, original_filename, mime_type, file_data 
     FROM documents 
     WHERE original_filename IN ('3579-2627.pdf', '118.pdf', '113.pdf', 'LLP-3023-202526.pdf')
     ORDER BY original_filename`
  );

  console.log(`Found ${docs.rows.length} target documents to reprocess.`);
  for (const doc of docs.rows) {
    await reprocessDoc(doc);
  }

  await pool.end();
}

run().catch(console.error);
