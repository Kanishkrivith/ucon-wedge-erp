const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function getAllPdfFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllPdfFiles(fullPath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(fullPath);
    }
  }
  return results;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(apiKey, base64Pdf, prompt) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'application/pdf', data: base64Pdf } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');

      const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      lastErr = err;
      if (err.message && err.message.includes('429')) {
        console.log('   ⏳ Hit rate limit, waiting 15 seconds...');
        await sleep(15000);
      }
    }
  }
  throw lastErr;
}

const PROMPT = `You are an expert Indian Manufacturing Accounting & Tax Auditor for UCON PT Structural System Pvt Ltd (GSTIN: 33AAACU6685L1ZV).
Inspect this uploaded invoice or document and extract:
1. Canonical header fields (document_type, document_number, invoice_number, document_date, vendor_name, vendor_gstin, vendor_pan, vendor_address, customer_name, customer_gstin, po_number, dc_number, taxable_value, cgst_amount, sgst_amount, igst_amount, total_tax_amount, total_invoice_amount).
2. Line items with line_no, description, part_number, hsn_code, quantity, unit, unit_rate, discount, taxable_amount, tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount, category_code, destination_module.

Output strictly raw valid JSON.`;

async function main() {
  const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ERROR: Gemini API key required!');
    console.error('Usage: node scripts/bulk_ingest_historical_invoices.cjs <YOUR_GEMINI_API_KEY>\n');
    process.exit(1);
  }

  const baseDir = process.argv[3] || 'D:\\Ucon Wedge Unit\\all scan\\INVOICE';
  console.log(`\n===============================================================`);
  console.log(`🚀 UCON WEDGE ERP — BULK HISTORICAL INVOICE INGESTION`);
  console.log(`AI Engine: Google Gemini 2.0 Flash (Multimodal Vision)`);
  console.log(`Scanning directory: ${baseDir}`);
  console.log(`===============================================================\n`);

  const pdfFiles = getAllPdfFiles(baseDir);
  console.log(`Found ${pdfFiles.length} total PDF invoices to process.\n`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    const relName = path.relative(baseDir, file);
    const baseName = path.basename(file);
    process.stdout.write(`[${i + 1}/${pdfFiles.length}] ${relName} ... `);

    try {
      const buf = fs.readFileSync(file);
      const hash = sha256(buf);

      // Check if already in DB
      const existing = await pool.query('SELECT id, document_number FROM documents WHERE file_sha256 = $1', [hash]);
      if (existing.rows[0]) {
        console.log(`⏭️ ALREADY INGESTED (Doc #${existing.rows[0].document_number || 'N/A'})`);
        skippedCount++;
        continue;
      }

      const b64 = buf.toString('base64');
      const startTime = Date.now();
      const extracted = await callGemini(apiKey, b64, PROMPT);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

      // Vendor handling
      let vendorId = null;
      if (extracted.vendor_name) {
        let vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${extracted.vendor_name}%`]);
        if (!vRes.rows[0]) {
          const newV = await pool.query(
            `INSERT INTO vendors (canonical_name, category, gstin) VALUES ($1, 'SUBCONTRACT', $2) RETURNING id`,
            [extracted.vendor_name, extracted.vendor_gstin || null]
          );
          vendorId = newV.rows[0].id;
        } else {
          vendorId = vRes.rows[0].id;
        }
      }

      // Insert document record
      const docRes = await pool.query(
        `INSERT INTO documents (
          original_filename, document_type, source_kind, storage_uri, source_path,
          source_folder, mime_type, file_size_bytes, file_sha256, status,
          document_number, document_date, vendor_id, file_data, ai_confidence, classification_code, destination_module
        ) VALUES ($1, $2, 'SCANNED_PDF', $3, $4, 'HISTORICAL_SCAN', 'application/pdf', $5, $6, 'PENDING_REVIEW', $7, $8, $9, $10, 0.98, $11, $12)
        RETURNING id`,
        [
          baseName,
          (extracted.document_type || 'INVOICE').toUpperCase(),
          `local://historical/${baseName}`,
          file,
          buf.length,
          hash,
          extracted.invoice_number || extracted.document_number || baseName,
          extracted.document_date || null,
          vendorId,
          b64,
          extracted.lines?.[0]?.category_code || 'GENERAL',
          extracted.lines?.[0]?.destination_module || 'PURCHASE'
        ]
      );

      const docId = docRes.rows[0].id;

      // Insert Canonical Header Fields
      const headerFields = [
        ['document_type', 'DOCUMENT TYPE', extracted.document_type || 'INVOICE'],
        ['invoice_number', 'INVOICE NUMBER', extracted.invoice_number || extracted.document_number],
        ['document_number', 'DOCUMENT NUMBER', extracted.document_number || extracted.invoice_number],
        ['document_date', 'DOCUMENT DATE', extracted.document_date],
        ['vendor_name', 'VENDOR NAME', extracted.vendor_name],
        ['vendor_gstin', 'VENDOR GSTIN', extracted.vendor_gstin],
        ['gstin', 'GSTIN', extracted.vendor_gstin],
        ['pan', 'PAN', extracted.vendor_pan],
        ['customer_name', 'CUSTOMER NAME', extracted.customer_name || 'UCON PT STRUCTURAL SYSTEM PRIVATE LIMITED'],
        ['customer_gstin', 'CUSTOMER GSTIN', extracted.customer_gstin || '33AAACU6685L1ZV'],
        ['po_number', 'PO NUMBER', extracted.po_number],
        ['dc_number', 'DC NUMBER', extracted.dc_number],
        ['taxable_value', 'TAXABLE VALUE', extracted.taxable_value !== undefined ? String(extracted.taxable_value) : null],
        ['cgst_amount', 'CGST AMOUNT', extracted.cgst_amount !== undefined ? String(extracted.cgst_amount) : null],
        ['sgst_amount', 'SGST AMOUNT', extracted.sgst_amount !== undefined ? String(extracted.sgst_amount) : null],
        ['igst_amount', 'IGST AMOUNT', extracted.igst_amount !== undefined ? String(extracted.igst_amount) : null],
        ['total_tax_amount', 'GST TOTAL', extracted.total_tax_amount !== undefined ? String(extracted.total_tax_amount) : null],
        ['total_invoice_amount', 'TOTAL INVOICE AMOUNT', extracted.total_invoice_amount !== undefined ? String(extracted.total_invoice_amount) : null]
      ];

      for (const [code, label, val] of headerFields) {
        if (val) {
          await pool.query(
            `INSERT INTO document_extractions (document_id, page_no, field_name, extracted_value, normalized_value, confidence, confidence_status)
             VALUES ($1, 1, $2, $3, $4, 0.98, 'HIGH')`,
            [docId, code, String(val), String(val)]
          );
        }
      }

      // Insert Line Items
      const lines = Array.isArray(extracted.lines) ? extracted.lines : [];
      for (let j = 0; j < lines.length; j++) {
        const l = lines[j];
        await pool.query(
          `INSERT INTO document_line_items (
            document_id, line_no, description, part_number, hsn_code,
            quantity, unit, unit_rate, discount, taxable_amount,
            tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
            category_code, destination_module, capex_or_opex, confidence, confidence_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'OPEX', 0.98, 'HIGH')`,
          [
            docId,
            j + 1,
            l.description || 'Line item',
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
            Number(l.tax_amount) || 0,
            Number(l.total_amount) || 0,
            l.category_code || 'GENERAL',
            l.destination_module || 'PURCHASE'
          ]
        );
      }

      console.log(`✅ OK (${elapsedSec}s) — Vendor: "${extracted.vendor_name || 'N/A'}" | Total: ₹${extracted.total_invoice_amount || '0'} | Lines: ${lines.length}`);
      successCount++;

      // Pause 2.5 seconds to respect 15 RPM free tier limit
      await sleep(2500);
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      failCount++;
      await sleep(3000);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 INGESTION COMPLETED!`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Skipped (Already existed): ${skippedCount}`);
  console.log(`   - Failed: ${failCount}`);
  console.log(`Open https://uconwedgeerp.vercel.app/documents to view your full queue!`);
  console.log(`===============================================================\n`);

  await pool.end();
}

main().catch(console.error);
