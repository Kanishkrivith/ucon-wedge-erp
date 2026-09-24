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
  const models = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
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

      const hdr = extracted.header || extracted.invoice_header || extracted;
      const rawLines = Array.isArray(extracted.lines)
        ? extracted.lines
        : Array.isArray(extracted.line_items)
        ? extracted.line_items
        : Array.isArray(extracted.items)
        ? extracted.items
        : Array.isArray(extracted.invoice_items)
        ? extracted.invoice_items
        : Array.isArray(hdr.lines)
        ? hdr.lines
        : Array.isArray(hdr.line_items)
        ? hdr.line_items
        : Array.isArray(hdr.items)
        ? hdr.items
        : [];

      const vendorName = extracted.vendor_name || extracted.supplier_name || hdr.vendor_name || hdr.supplier_name;
      const vendorGstin = extracted.vendor_gstin || extracted.gstin || extracted.supplier_gstin || hdr.vendor_gstin || hdr.gstin || hdr.supplier_gstin;
      const vendorPan = extracted.vendor_pan || extracted.pan || hdr.vendor_pan || hdr.pan || (vendorGstin ? String(vendorGstin).substring(2, 12) : null);
      const invoiceNum = extracted.invoice_number || extracted.document_number || hdr.invoice_number || hdr.document_number || baseName;
      const invoiceDate = extracted.document_date || extracted.invoice_date || hdr.document_date || hdr.invoice_date;
      const custName = extracted.customer_name || extracted.buyer_name || hdr.customer_name || hdr.buyer_name || 'UCON PT STRUCTURAL SYSTEM PRIVATE LIMITED';
      const custGstin = extracted.customer_gstin || extracted.buyer_gstin || hdr.customer_gstin || hdr.buyer_gstin || '33AAACU6685L1ZV';
      const poNum = extracted.po_number || hdr.po_number;
      const dcNum = extracted.dc_number || hdr.dc_number;
      const taxableVal = extracted.taxable_value ?? extracted.taxable_amount ?? hdr.taxable_value ?? hdr.taxable_amount;
      const cgstVal = extracted.cgst_amount ?? hdr.cgst_amount;
      const sgstVal = extracted.sgst_amount ?? hdr.sgst_amount;
      const igstVal = extracted.igst_amount ?? hdr.igst_amount;
      const totalTax = extracted.total_tax_amount ?? hdr.total_tax_amount ?? (Number(cgstVal || 0) + Number(sgstVal || 0) + Number(igstVal || 0));
      const totalInv = extracted.total_invoice_amount ?? extracted.total_amount ?? hdr.total_invoice_amount ?? hdr.total_amount;

      // Vendor handling
      let vendorId = null;
      if (vendorName) {
        let vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${vendorName}%`]);
        if (!vRes.rows[0]) {
          const newV = await pool.query(
            `INSERT INTO vendors (canonical_name, category, gstin, active) VALUES ($1, 'SUBCONTRACT', $2, true) RETURNING id`,
            [vendorName, vendorGstin || null]
          );
          vendorId = newV.rows[0].id;
        } else {
          vendorId = vRes.rows[0].id;
        }
      }

      let docTypeEnum = 'INVOICE';
      const rawType = String(extracted.document_type || hdr.document_type || '').toUpperCase();
      if (rawType.includes('DC') || rawType.includes('CHALLAN')) docTypeEnum = 'DC';
      else if (rawType.includes('PO') || rawType.includes('ORDER')) docTypeEnum = 'PO';
      else if (rawType.includes('QUOTE')) docTypeEnum = 'QUOTATION';
      else if (rawType.includes('MACHINE')) docTypeEnum = 'MACHINE_INVOICE';
      else if (rawType.includes('TOOL')) docTypeEnum = 'TOOL_INVOICE';
      else if (rawType.includes('MTC')) docTypeEnum = 'MTC';
      else if (rawType.includes('TEST')) docTypeEnum = 'TEST_REPORT';
      else if (rawType.includes('EXPENSE')) docTypeEnum = 'EXPENSE';

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
          docTypeEnum,
          `local://historical/${baseName}`,
          file,
          buf.length,
          hash,
          invoiceNum,
          invoiceDate || null,
          vendorId,
          b64,
          rawLines[0]?.category_code || 'A. RAW MATERIAL',
          rawLines[0]?.destination_module || 'PURCHASE'
        ]
      );

      const docId = docRes.rows[0].id;

      // Insert Canonical Header Fields
      const headerFields = [
        ['document_type', 'DOCUMENT TYPE', docTypeEnum],
        ['invoice_number', 'INVOICE NUMBER', invoiceNum],
        ['document_number', 'DOCUMENT NUMBER', invoiceNum],
        ['document_date', 'DOCUMENT DATE', invoiceDate],
        ['vendor_name', 'VENDOR NAME', vendorName],
        ['vendor_gstin', 'VENDOR GSTIN', vendorGstin],
        ['gstin', 'GSTIN', vendorGstin],
        ['pan', 'PAN', vendorPan],
        ['customer_name', 'CUSTOMER NAME', custName],
        ['customer_gstin', 'CUSTOMER GSTIN', custGstin],
        ['po_number', 'PO NUMBER', poNum],
        ['dc_number', 'DC NUMBER', dcNum],
        ['taxable_value', 'TAXABLE VALUE', taxableVal !== undefined && taxableVal !== null ? String(taxableVal) : null],
        ['cgst_amount', 'CGST AMOUNT', cgstVal !== undefined && cgstVal !== null ? String(cgstVal) : null],
        ['sgst_amount', 'SGST AMOUNT', sgstVal !== undefined && sgstVal !== null ? String(sgstVal) : null],
        ['igst_amount', 'IGST AMOUNT', igstVal !== undefined && igstVal !== null ? String(igstVal) : null],
        ['total_tax_amount', 'GST TOTAL', totalTax !== undefined && totalTax !== null ? String(totalTax) : null],
        ['total_invoice_amount', 'TOTAL INVOICE AMOUNT', totalInv !== undefined && totalInv !== null ? String(totalInv) : null]
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
      for (let j = 0; j < rawLines.length; j++) {
        const l = rawLines[j];
        const desc = l.description || `Line item ${j + 1}`;
        const qty = Number(l.quantity) || 1;
        const rate = Number(l.unit_rate) || 0;
        const discount = Number(l.discount) || 0;
        const taxable = l.taxable_amount !== undefined && l.taxable_amount !== null ? Number(l.taxable_amount) : Math.max(0, qty * rate - discount);
        const taxRate = Number(l.tax_rate) || 18;
        const cgst = Number(l.cgst_amount) || 0;
        const sgst = Number(l.sgst_amount) || 0;
        const igst = Number(l.igst_amount) || 0;
        const lineTax = l.tax_amount !== undefined && l.tax_amount !== null ? Number(l.tax_amount) : (cgst + sgst + igst);
        const lineTotal = l.total_amount !== undefined && l.total_amount !== null ? Number(l.total_amount) : (taxable + lineTax);

        // Simple intelligent category matcher
        let catCode = l.category_code || 'A. RAW MATERIAL';
        let destMod = l.destination_module || 'PURCHASE';
        const dLower = desc.toLowerCase();
        if (dLower.includes('tap') || dLower.includes('insert') || dLower.includes('cutter') || dLower.includes('tool')) {
          catCode = 'C. TOOLING AND INSERTS';
          destMod = 'TOOLING';
        } else if (dLower.includes('spring') || dLower.includes('ring') || dLower.includes('wire') || dLower.includes('coolant') || dLower.includes('oil')) {
          catCode = 'M. SPRING AND ASSEMBLY';
          destMod = 'CONSUMABLES';
        } else if (dLower.includes('postage') || dLower.includes('courier') || dLower.includes('transport') || dLower.includes('freight')) {
          catCode = 'O. TRANSPORT AND LOGISTICS';
          destMod = 'PURCHASE';
        } else if (dLower.includes('machine') || dLower.includes('lathe') || dLower.includes('cnc')) {
          catCode = 'B. CNC MACHINES AND CAPITAL EQUIPMENT';
          destMod = 'MACHINES & CAPEX';
        }

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
            desc,
            l.part_number || '',
            l.hsn_code || '',
            qty,
            (l.unit || 'NOS').toUpperCase(),
            rate,
            discount,
            taxable,
            taxRate,
            cgst,
            sgst,
            igst,
            lineTax,
            lineTotal,
            catCode,
            destMod
          ]
        );
      }

      console.log(`✅ OK (${elapsedSec}s) — Vendor: "${vendorName || 'N/A'}" | Total: ₹${totalInv || '0'} | Lines: ${rawLines.length}`);
      successCount++;

      // Pause 4.1 seconds to strictly guarantee staying within Google's 15 RPM 100% free tier limit
      await sleep(4100);
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
