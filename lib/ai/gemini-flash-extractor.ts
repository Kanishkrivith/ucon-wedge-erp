import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CANONICAL_HEADER_FIELDS,
  MASTER_CATEGORY_GROUPS,
  resolveCanonicalCategory,
} from './canonical-library';
import { DocumentAIResult, DocumentAIField, DocumentAILineItem } from './document-ocr';

export interface GeminiExtractionResult extends DocumentAIResult {
  engine: 'GEMINI_2_FLASH';
}

let cachedDbApiKey: string | null = null;

export async function getGeminiApiKey(): Promise<string | null> {
  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (envKey) return envKey;

  if (cachedDbApiKey) return cachedDbApiKey;

  try {
    const { pool } = await import('@/lib/db');
    const res = await pool.query("SELECT value FROM system_config WHERE key = 'GEMINI_API_KEY' LIMIT 1");
    if (res.rows[0]?.value) {
      cachedDbApiKey = res.rows[0].value;
      return cachedDbApiKey;
    }
  } catch (err) {
    console.warn('Could not read GEMINI_API_KEY from database system_config:', err);
  }

  return null;
}

export async function isGeminiConfigured(): Promise<boolean> {
  const k = await getGeminiApiKey();
  return !!k;
}

/**
 * Extracts invoice canonical fields and line items using Google Gemini 2.0 Flash Multimodal Vision API.
 */
export async function extractDocumentWithGeminiFlash(
  filePath: string,
  mimeType: string,
  bufferOverride?: Buffer
): Promise<DocumentAIResult> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in environment or database system_config.'
    );
  }

  const fileBuffer = bufferOverride || (filePath ? await fs.readFile(filePath) : null);
  if (!fileBuffer) {
    throw new Error('No file buffer or valid file path provided for extraction');
  }
  const base64Data = fileBuffer.toString('base64');
  const ext = filePath ? path.extname(filePath).toLowerCase() : '.pdf';

  let effectiveMime = mimeType;
  if (!effectiveMime || effectiveMime === 'application/octet-stream') {
    if (ext === '.pdf') effectiveMime = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') effectiveMime = 'image/jpeg';
    else if (ext === '.png') effectiveMime = 'image/png';
    else if (ext === '.webp') effectiveMime = 'image/webp';
    else effectiveMime = 'application/pdf';
  }

  const prompt = `You are an expert Indian Manufacturing Accounting & Tax Auditor for UCON PT Structural System Pvt Ltd (GSTIN: 33AAACU6685L1ZV).
Inspect this uploaded document (invoice, delivery challan, PO, or quote) and extract:
1. All canonical header fields
2. All invoice line items with exact numbers and classification

CRITICAL AUDIT RULES:
- Vendor is the supplier who issued the bill.
- Customer / Buyer is UCON PT Structural System Pvt Ltd (GSTIN: 33AAACU6685L1ZV).
- Always distinguish Vendor GSTIN from Customer GSTIN.
- Format all dates as YYYY-MM-DD.
- For numbers, extract clean numeric values without currency symbols or commas.
- Mathematical consistency: taxable_amount must equal quantity * unit_rate - discount. Total amount must equal taxable_amount + tax_amount.
- For line items, classify each item into one of the 22 Master Category Groups (A through V):
  "A. RAW MATERIAL", "B. CNC MACHINES AND CAPITAL EQUIPMENT", "C. TOOLING AND INSERTS", "D. TAPPING TOOLS AND ACCESSORIES", "E. SLITTING TOOLS AND CUTTERS", "F. LATHE AND WORKSHOP TOOLS", "G. GAUGES AND MEASURING INSTRUMENTS", "H. COOLANTS AND OILS", "I. WASHING AND CLEANING", "J. HEAT TREATMENT", "K. CHAMFERING AND MACHINING SERVICES", "L. SURFACE TREATMENT AND COATING", "M. SPRING AND ASSEMBLY", "N. PACKING AND DISPATCH", "O. TRANSPORT AND LOGISTICS", "P. TESTING AND CALIBRATION", "Q. MAINTENANCE AND REPAIRS", "R. ELECTRICAL AND UTILITIES", "S. SAFETY AND PPE", "T. OFFICE AND IT EXPENSES", "U. SUBCONTRACT PROCESSING", "V. GENERAL EXPENSES".

Return STRICTLY a JSON object with this exact schema (no markdown, no backticks, just raw JSON):
{
  "document_type": "INVOICE" | "DELIVERY_CHALLAN" | "PURCHASE_ORDER" | "QUOTATION" | "OTHER",
  "document_number": "string or null",
  "invoice_number": "string or null",
  "document_date": "YYYY-MM-DD or null",
  "vendor_name": "string or null",
  "vendor_gstin": "15-character GSTIN or null",
  "vendor_pan": "10-character PAN or null",
  "vendor_address": "string or null",
  "customer_name": "string or null",
  "customer_gstin": "string or null",
  "po_number": "string or null",
  "po_date": "YYYY-MM-DD or null",
  "dc_number": "string or null",
  "dc_date": "YYYY-MM-DD or null",
  "taxable_value": number or null,
  "cgst_amount": number or null,
  "sgst_amount": number or null,
  "igst_amount": number or null,
  "total_tax_amount": number or null,
  "total_invoice_amount": number or null,
  "reverse_charge": "YES" | "NO" | null,
  "lines": [
    {
      "line_no": number,
      "description": "string",
      "part_number": "string or null",
      "hsn_code": "string or null",
      "quantity": number,
      "unit": "string (NOS, KG, PCS, SET, etc.)",
      "unit_rate": number,
      "discount": number,
      "taxable_amount": number,
      "tax_rate": number,
      "cgst_amount": number,
      "sgst_amount": number,
      "igst_amount": number,
      "tax_amount": number,
      "total_amount": number,
      "category_code": "Group Name from A through V",
      "sub_category": "string",
      "destination_module": "MACHINES & CAPEX" | "RAW MATERIAL INVENTORY" | "CONSUMABLES" | "TOOLING" | "PURCHASE",
      "capex_or_opex": "CAPEX" | "OPEX",
      "costing_head": "string"
    }
  ],
  "full_text_summary": "Extracted OCR text from the document"
}`;

  // Call Gemini Flash models (prioritizing ultra-fast, high-availability models with timeout guard)
  const models = [
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
  ];
  let lastError: any = null;
  let rawResponseText = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: effectiveMime,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(18000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      rawResponseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (rawResponseText) break;
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${model} failed, trying next fallback:`, err);
    }
  }

  if (!rawResponseText) {
    throw new Error(
      `Gemini extraction failed: ${lastError?.message || 'Empty response from Gemini'}`
    );
  }

  // Parse structured JSON
  let parsed: any;
  try {
    const cleanJson = rawResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.error('Failed to parse Gemini JSON output:', rawResponseText);
    throw new Error('Gemini output could not be parsed as JSON: ' + String(parseErr));
  }

  const hdr = parsed.header || parsed.invoice_header || parsed;
  const rawLines = Array.isArray(parsed.lines)
    ? parsed.lines
    : Array.isArray(parsed.line_items)
    ? parsed.line_items
    : Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.invoice_items)
    ? parsed.invoice_items
    : Array.isArray(hdr.lines)
    ? hdr.lines
    : Array.isArray(hdr.line_items)
    ? hdr.line_items
    : Array.isArray(hdr.items)
    ? hdr.items
    : [];

  const docType = parsed.document_type || hdr.document_type || 'INVOICE';
  const docNum = parsed.document_number || parsed.invoice_number || hdr.document_number || hdr.invoice_number;
  const invNum = parsed.invoice_number || parsed.document_number || hdr.invoice_number || hdr.document_number;
  const docDate = parsed.document_date || parsed.invoice_date || hdr.document_date || hdr.invoice_date;
  const vendorName = parsed.vendor_name || parsed.supplier_name || hdr.vendor_name || hdr.supplier_name;
  const vendorGstin = parsed.vendor_gstin || parsed.gstin || parsed.supplier_gstin || hdr.vendor_gstin || hdr.gstin || hdr.supplier_gstin;
  const vendorPan = parsed.vendor_pan || parsed.pan || hdr.vendor_pan || hdr.pan || (vendorGstin ? String(vendorGstin).substring(2, 12) : null);
  const vendorAddress = parsed.vendor_address || parsed.supplier_address || hdr.vendor_address || hdr.supplier_address;
  const custName = parsed.customer_name || parsed.buyer_name || hdr.customer_name || hdr.buyer_name || 'UCON PT STRUCTURAL SYSTEM PRIVATE LIMITED';
  const custGstin = parsed.customer_gstin || parsed.buyer_gstin || hdr.customer_gstin || hdr.buyer_gstin || '33AAACU6685L1ZV';
  const poNum = parsed.po_number || hdr.po_number;
  const poDate = parsed.po_date || hdr.po_date;
  const dcNum = parsed.dc_number || hdr.dc_number;
  const dcDate = parsed.dc_date || hdr.dc_date;
  const taxableVal = parsed.taxable_value ?? parsed.taxable_amount ?? hdr.taxable_value ?? hdr.taxable_amount;
  const cgstVal = parsed.cgst_amount ?? hdr.cgst_amount;
  const sgstVal = parsed.sgst_amount ?? hdr.sgst_amount;
  const igstVal = parsed.igst_amount ?? hdr.igst_amount;
  const totalTax = parsed.total_tax_amount ?? hdr.total_tax_amount ?? (Number(cgstVal || 0) + Number(sgstVal || 0) + Number(igstVal || 0));
  const totalInv = parsed.total_invoice_amount ?? parsed.total_amount ?? hdr.total_invoice_amount ?? hdr.total_amount;

  // Map to DocumentAIField[] (Sections 1-5, all labels in CAPITAL LETTERS)
  const fields: DocumentAIField[] = [];
  const addField = (fieldName: string, label: string, val: any, conf = 0.98) => {
    const strVal = val !== undefined && val !== null ? String(val).trim() : null;
    fields.push({
      fieldName,
      label,
      extractedValue: strVal,
      normalizedValue: strVal && strVal !== 'null' ? strVal : 'NOT AVAILABLE',
      confidence: strVal ? conf : 0.5,
      confidenceStatus: strVal ? 'HIGH' : 'LOW',
    });
  };

  addField('document_type', 'DOCUMENT TYPE', docType);
  addField('document_number', 'DOCUMENT NUMBER', docNum);
  addField('invoice_number', 'INVOICE NUMBER', invNum);
  addField('document_date', 'DOCUMENT DATE', docDate);
  addField('vendor_name', 'VENDOR NAME', vendorName);
  addField('gstin', 'GSTIN', vendorGstin);
  addField('vendor_gstin', 'VENDOR GSTIN', vendorGstin);
  addField('pan', 'PAN', vendorPan);
  addField('vendor_address', 'VENDOR ADDRESS', vendorAddress);
  addField('customer_name', 'CUSTOMER NAME', custName);
  addField('customer_gstin', 'CUSTOMER GSTIN', custGstin);
  addField('po_number', 'PO NUMBER', poNum);
  addField('po_date', 'PO DATE', poDate);
  addField('dc_number', 'DC NUMBER', dcNum);
  addField('dc_date', 'DC DATE', dcDate);
  addField('taxable_value', 'TAXABLE VALUE', taxableVal !== undefined && taxableVal !== null ? String(taxableVal) : null);
  addField('cgst_amount', 'CGST AMOUNT', cgstVal !== undefined && cgstVal !== null ? String(cgstVal) : null);
  addField('sgst_amount', 'SGST AMOUNT', sgstVal !== undefined && sgstVal !== null ? String(sgstVal) : null);
  addField('igst_amount', 'IGST AMOUNT', igstVal !== undefined && igstVal !== null ? String(igstVal) : null);
  addField('total_tax_amount', 'GST TOTAL', totalTax !== undefined && totalTax !== null ? String(totalTax) : null);
  addField('total_invoice_amount', 'TOTAL INVOICE AMOUNT', totalInv !== undefined && totalInv !== null ? String(totalInv) : null);
  addField('reverse_charge_applicable', 'REVERSE CHARGE APPLICABLE', parsed.reverse_charge || hdr.reverse_charge || 'NO');

  // Map Line Items
  const lines: DocumentAILineItem[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rl = rawLines[i];
    const desc = rl.description || `Line item ${i + 1}`;
    const canonical = resolveCanonicalCategory(desc, rl.category_code || rl.sub_category);

    const qty = Math.max(0, Number(rl.quantity) || 1);
    const unitRate = Math.max(0, Number(rl.unit_rate) || 0);
    const discount = Math.max(0, Number(rl.discount) || 0);
    const taxable = rl.taxable_amount !== undefined ? Number(rl.taxable_amount) : Math.max(0, qty * unitRate - discount);
    const taxRate = Math.max(0, Number(rl.tax_rate) || 18);
    const cgst = Math.max(0, Number(rl.cgst_amount) || 0);
    const sgst = Math.max(0, Number(rl.sgst_amount) || 0);
    const igst = Math.max(0, Number(rl.igst_amount) || 0);
    const totalTax = rl.tax_amount !== undefined ? Number(rl.tax_amount) : cgst + sgst + igst;
    const total = rl.total_amount !== undefined ? Number(rl.total_amount) : taxable + totalTax;

    lines.push({
      lineNo: rl.line_no || i + 1,
      description: desc,
      partNumber: rl.part_number || '',
      hsnCode: rl.hsn_code || '',
      quantity: qty,
      unit: (rl.unit || 'NOS').toUpperCase(),
      unitRate,
      discount,
      taxableAmount: taxable,
      taxRate,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      taxAmount: totalTax,
      totalAmount: total,
      categoryCode: rl.category_code || canonical.groupName,
      subCategory: rl.sub_category || canonical.subCategory,
      processStageCode: canonical.costingHead,
      destinationModule: rl.destination_module || canonical.destinationModule,
      capexOrOpex: rl.capex_or_opex || canonical.capexOrOpex,
      costingHead: rl.costing_head || canonical.costingHead,
      confidence: 0.98,
      confidenceStatus: 'HIGH',
      sourcePageNumber: 1,
    });
  }

  // Derive top-level document classification
  const topCategory = lines[0]?.categoryCode || 'A. RAW MATERIAL';
  const topDestination = lines[0]?.destinationModule || 'PURCHASE';

  const ocrTextStream =
    parsed.full_text_summary && parsed.full_text_summary.length > 50
      ? parsed.full_text_summary
      : [
          `=======================================================`,
          `DOCUMENT TYPE: ${docType}`,
          `DOCUMENT NUMBER: ${docNum || 'N/A'}`,
          `DOCUMENT DATE: ${docDate || 'N/A'}`,
          `VENDOR: ${vendorName || 'N/A'}  (GSTIN: ${vendorGstin || 'N/A'})`,
          `CUSTOMER: ${custName || 'N/A'}  (GSTIN: ${custGstin || 'N/A'})`,
          `TAXABLE AMOUNT: ₹${taxableVal || 0}`,
          `GST AMOUNT (CGST+SGST+IGST): ₹${totalTax || 0}`,
          `TOTAL INVOICE AMOUNT: ₹${totalInv || 0}`,
          `REVERSE CHARGE: ${parsed.reverse_charge || 'NO'}`,
          `=======================================================`,
          '',
          `--- ITEMIZED LINES EXTRACTED (${lines.length} ITEMS) ---`,
          ...lines.map(
            (l) =>
              `[Line ${l.lineNo}] ${l.description} | Qty: ${l.quantity} ${l.unit} @ ₹${l.unitRate} | HSN: ${l.hsnCode || 'N/A'} | Taxable: ₹${l.taxableAmount} | Tax: ₹${l.taxAmount} (${l.taxRate}%) | Total: ₹${l.totalAmount} | Category: ${l.categoryCode} -> ${l.destinationModule} (${l.capexOrOpex})`
          ),
        ].join('\n');

  return {
    fields,
    lines,
    pages: [
      {
        pageNo: 1,
        text: ocrTextStream,
      },
    ],
    classificationCode: topCategory,
    destinationModule: topDestination,
    destinationRecordType: 'Document Ingestion (Gemini Flash Vision)',
    confidence: 0.98,
    documentType: (parsed.document_type || 'INVOICE').toUpperCase(),
  };
}
