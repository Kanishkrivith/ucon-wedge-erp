import * as XLSX from 'xlsx';
import fs from 'node:fs/promises';
import {
  DocumentAIResult,
  DocumentAIField,
  DocumentAILineItem,
  confidenceStatus,
  parseIndianMoney,
} from './document-ocr';
import {
  resolveCanonicalCategory,
  matchCanonicalDocumentType,
  CanonicalDocumentType,
} from './canonical-library';

function normalizeDateToISO(val: string | null): string | null {
  if (!val) return null;
  const s = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const month = m1[2].padStart(2, '0');
    const year = m1[3];
    return `${year}-${month}-${day}`;
  }
  const m2 = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m2) {
    const year = m2[1];
    const month = m2[2].padStart(2, '0');
    const day = m2[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return s;
}

export async function processExcelDocument(
  filePath: string,
  fileBuffer?: Buffer
): Promise<DocumentAIResult> {
  const buf = fileBuffer || (await fs.readFile(filePath));
  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });

  const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert sheet to array of rows (2D array)
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  // Also build formatted text representation of the workbook for audit & page display
  const pages: Array<{ pageNo: number; text: string }> = [];
  workbook.SheetNames.forEach((name, idx) => {
    const s = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(s);
    pages.push({
      pageNo: idx + 1,
      text: `--- SHEET: ${name} ---\n` + csv,
    });
  });

  const fullText = pages.map((p) => p.text).join('\n');

  // Metadata accumulators
  let docNumber: string | null = null;
  let docDate: string | null = null;
  let vendorName: string | null = null;
  let vendorGstin: string | null = null;
  let vendorPan: string | null = null;
  let vendorAddress: string | null = null;
  let customerName: string | null = null;
  let customerGstin: string | null = null;
  let poNumber: string | null = null;
  let poDate: string | null = null;
  let dcNumber: string | null = null;
  let vehicleNumber: string | null = null;
  let transporterName: string | null = null;
  let taxableValue: number | null = null;
  let cgstAmount: number | null = null;
  let sgstAmount: number | null = null;
  let igstAmount: number | null = null;
  let totalTaxAmount: number | null = null;
  let totalInvoiceAmount: number | null = null;

  // Regex patterns
  const gstinRegex = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g;
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
  const dateRegex = /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/;

  // Find all GSTINs in sheet
  const allGstins = Array.from(new Set(fullText.match(gstinRegex) || []));
  if (allGstins.length > 0) vendorGstin = allGstins[0];
  if (allGstins.length > 1) customerGstin = allGstins[1];

  // Find all PANs
  const allPans = Array.from(new Set(fullText.match(panRegex) || []));
  if (allPans.length > 0) vendorPan = allPans[0];

  // Look through first 25 rows for header key-values
  let headerRowIndex = -1;
  const maxScanRows = Math.min(rows.length, 30);

  for (let r = 0; r < maxScanRows; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      if (!cell) continue;

      const lower = cell.toLowerCase();

      // Invoice / Document Number
      if (!docNumber && (lower.includes('invoice no') || lower.includes('inv no') || lower.includes('bill no') || lower === 'inv #' || lower.includes('document no'))) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && nextCell.length < 50 && !nextCell.toLowerCase().includes('date')) {
          docNumber = nextCell;
        } else {
          const parts = cell.split(/[:#\-]/);
          if (parts.length > 1 && parts[1].trim()) docNumber = parts[1].trim();
        }
      }

      // Date
      if (
        !docDate &&
        (lower.includes('invoice date') ||
          lower.includes('inv date') ||
          lower.includes('bill date') ||
          lower.startsWith('date') ||
          lower.replace(/[:]/g, '').trim() === 'date')
      ) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && dateRegex.test(nextCell)) {
          docDate = normalizeDateToISO(nextCell);
        } else {
          const m = cell.match(dateRegex);
          if (m) docDate = normalizeDateToISO(m[1]);
        }
      }

      // Vendor Name
      if (!vendorName && (lower.startsWith('vendor') || lower.startsWith('supplier') || lower.startsWith('seller') || lower.startsWith('m/s'))) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && nextCell.length > 2) {
          vendorName = nextCell;
        } else {
          const parts = cell.split(/[:]/);
          if (parts.length > 1 && parts[1].trim()) vendorName = parts[1].trim();
        }
      }

      // Customer / Buyer
      if (!customerName && (lower.startsWith('buyer') || lower.startsWith('customer') || lower.startsWith('consignee') || lower.includes('bill to'))) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell && nextCell.length > 2) {
          customerName = nextCell;
        } else {
          const parts = cell.split(/[:]/);
          if (parts.length > 1 && parts[1].trim()) customerName = parts[1].trim();
        }
      }

      // PO & DC
      if (!poNumber && (lower.includes('po no') || lower.includes('purchase order'))) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell) poNumber = nextCell;
      }
      if (!dcNumber && (lower.includes('dc no') || lower.includes('challan no') || lower.includes('delivery challan'))) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell) dcNumber = nextCell;
      }
      if (!vehicleNumber && (lower.includes('vehicle no') || lower.includes('truck no'))) {
        const nextCell = String(row[c + 1] || '').trim();
        if (nextCell) vehicleNumber = nextCell;
      }
    }
  }

  // If vendor name wasn't labelled with "Vendor:", check top 3 rows for company name
  if (!vendorName && rows.length > 0) {
    for (let r = 0; r < Math.min(4, rows.length); r++) {
      const row = rows[r] || [];
      const firstText = String(row[0] || row[1] || '').trim();
      if (
        firstText &&
        firstText.length > 3 &&
        firstText.length < 80 &&
        !/invoice|tax|bill|date|s\.?no|item|qty|amount|phone|email|gstin/i.test(firstText)
      ) {
        vendorName = firstText;
        break;
      }
    }
  }

  // Detect Line Items Header Row
  // A header row typically contains columns like Description/Item, Qty, Rate/Price, Amount/Total
  type ColIndexMap = {
    sno?: number;
    desc?: number;
    partNo?: number;
    hsn?: number;
    qty?: number;
    unit?: number;
    rate?: number;
    discount?: number;
    taxable?: number;
    taxRate?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    tax?: number;
    total?: number;
  };

  let colMap: ColIndexMap = {};

  for (let r = 0; r < Math.min(rows.length, 35); r++) {
    const row = rows[r] || [];
    let matchCount = 0;
    const tempMap: ColIndexMap = {};

    row.forEach((colVal, cIdx) => {
      const col = String(colVal || '').trim().toLowerCase();
      if (!col) return;

      if (col === 's.no' || col === 'sl.no' || col === 'sno' || col === '#' || col === 'item no') {
        tempMap.sno = cIdx;
        matchCount++;
      } else if (
        col.includes('description') ||
        col.includes('item name') ||
        col.includes('particular') ||
        col === 'item' ||
        col === 'product' ||
        col.includes('material')
      ) {
        tempMap.desc = cIdx;
        matchCount++;
      } else if (col.includes('part no') || col.includes('item code') || col.includes('drawing no')) {
        tempMap.partNo = cIdx;
      } else if (col.includes('hsn') || col.includes('sac')) {
        tempMap.hsn = cIdx;
        matchCount++;
      } else if (col.includes('qty') || col.includes('quantity')) {
        tempMap.qty = cIdx;
        matchCount++;
      } else if (col === 'unit' || col === 'uom' || col.includes('unit of')) {
        tempMap.unit = cIdx;
      } else if (col.includes('rate') || col.includes('price') || col.includes('unit price')) {
        tempMap.rate = cIdx;
        matchCount++;
      } else if (col.includes('discount') || col === 'disc') {
        tempMap.discount = cIdx;
      } else if (col.includes('taxable') || col.includes('assessable') || col === 'basic value') {
        tempMap.taxable = cIdx;
        matchCount++;
      } else if (col.includes('tax %') || col.includes('rate %') || col.includes('gst %') || col === 'tax rate') {
        tempMap.taxRate = cIdx;
      } else if (col.includes('cgst')) {
        tempMap.cgst = cIdx;
      } else if (col.includes('sgst')) {
        tempMap.sgst = cIdx;
      } else if (col.includes('igst')) {
        tempMap.igst = cIdx;
      } else if (col === 'gst' || col === 'tax amount' || col === 'total tax') {
        tempMap.tax = cIdx;
      } else if (
        col.includes('total') ||
        col.includes('amount') ||
        col.includes('net amount') ||
        col === 'value'
      ) {
        // Only set total if not already captured taxable
        if (tempMap.total === undefined) {
          tempMap.total = cIdx;
          matchCount++;
        }
      }
    });

    if (matchCount >= 2 && (tempMap.desc !== undefined || tempMap.total !== undefined || tempMap.qty !== undefined)) {
      headerRowIndex = r;
      colMap = tempMap;
      break;
    }
  }

  // Parse Line Items
  const lines: DocumentAILineItem[] = [];
  let currentLineNo = 1;

  if (headerRowIndex !== -1) {
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const descVal = colMap.desc !== undefined ? String(row[colMap.desc] || '').trim() : '';
      const totalVal = colMap.total !== undefined ? parseIndianMoney(row[colMap.total]) : null;
      const taxableVal = colMap.taxable !== undefined ? parseIndianMoney(row[colMap.taxable]) : null;
      const qtyVal = colMap.qty !== undefined ? parseIndianMoney(row[colMap.qty]) : null;

      // Check if this row is a total/summary row
      const firstCell = String(row[0] || '').trim().toLowerCase();
      const anyTotalMatch = row.some((c) =>
        String(c || '').toLowerCase().includes('total') || String(c || '').toLowerCase().includes('grand total')
      );

      if (anyTotalMatch || firstCell.includes('sub total') || firstCell.includes('total')) {
        // Capture grand totals if not set
        const possibleTotal = row.map(parseIndianMoney).filter((n): n is number => n !== null && n > 0);
        if (possibleTotal.length > 0) {
          const maxVal = Math.max(...possibleTotal);
          if (!totalInvoiceAmount || maxVal > totalInvoiceAmount) {
            totalInvoiceAmount = maxVal;
          }
        }
        continue;
      }

      // If empty row or no meaningful content, skip
      if (!descVal && !totalVal && !taxableVal && !qtyVal) continue;

      const rawDescription = descVal || (colMap.sno !== undefined && row[colMap.sno] ? `Item ${row[colMap.sno]}` : `Line Item ${currentLineNo}`);
      const partNumber = colMap.partNo !== undefined ? String(row[colMap.partNo] || '').trim() || null : null;
      const hsnCode = colMap.hsn !== undefined ? String(row[colMap.hsn] || '').trim() || null : null;
      const quantity = qtyVal && qtyVal > 0 ? qtyVal : 1;
      const unit = colMap.unit !== undefined ? String(row[colMap.unit] || '').trim() || 'NOS' : 'NOS';
      let unitRate = colMap.rate !== undefined ? parseIndianMoney(row[colMap.rate]) : null;
      const discount = colMap.discount !== undefined ? parseIndianMoney(row[colMap.discount]) || 0 : 0;

      let lineTaxable = taxableVal;
      if (!lineTaxable && unitRate && quantity) {
        lineTaxable = Number((quantity * unitRate - discount).toFixed(2));
      }

      let lineTaxRate = colMap.taxRate !== undefined ? parseIndianMoney(row[colMap.taxRate]) : 18;
      if (!lineTaxRate || lineTaxRate <= 0) lineTaxRate = 18;

      let lineCgst = colMap.cgst !== undefined ? parseIndianMoney(row[colMap.cgst]) : null;
      let lineSgst = colMap.sgst !== undefined ? parseIndianMoney(row[colMap.sgst]) : null;
      let lineIgst = colMap.igst !== undefined ? parseIndianMoney(row[colMap.igst]) : null;
      let lineTax = colMap.tax !== undefined ? parseIndianMoney(row[colMap.tax]) : null;

      if (!lineCgst && !lineSgst && !lineIgst && lineTaxable) {
        // Interstate check
        const halfRate = lineTaxRate / 2;
        lineCgst = Number(((lineTaxable * halfRate) / 100).toFixed(2));
        lineSgst = Number(((lineTaxable * halfRate) / 100).toFixed(2));
        lineTax = Number((lineCgst + lineSgst).toFixed(2));
      }

      let lineTotal = totalVal;
      if (!lineTotal && lineTaxable) {
        lineTotal = Number((lineTaxable + (lineTax || 0)).toFixed(2));
      }
      if (!unitRate && lineTaxable && quantity) {
        unitRate = Number((lineTaxable / quantity).toFixed(2));
      }

      // Canonical Category Resolution
      const resolved = resolveCanonicalCategory(rawDescription);

      lines.push({
        lineNo: currentLineNo++,
        description: rawDescription,
        partNumber,
        hsnCode,
        quantity,
        unit,
        unitRate: unitRate || (lineTotal ? lineTotal / quantity : 0),
        discount,
        taxableAmount: lineTaxable || lineTotal || 0,
        taxRate: lineTaxRate,
        cgstAmount: lineCgst || 0,
        sgstAmount: lineSgst || 0,
        igstAmount: lineIgst || 0,
        taxAmount: lineTax || ((lineCgst || 0) + (lineSgst || 0) + (lineIgst || 0)),
        totalAmount: lineTotal || lineTaxable || 0,
        categoryCode: resolved.groupName,
        subCategory: resolved.subCategory,
        processStageCode: resolved.costingHead,
        destinationModule: resolved.destinationModule,
        capexOrOpex: resolved.capexOrOpex,
        costingHead: resolved.costingHead,
        confidence: 0.98,
        confidenceStatus: 'HIGH',
        sourcePageNumber: 1,
      });
    }
  }

  // If no tabular lines were detected, create a single summary line if amounts exist
  if (lines.length === 0 && (totalInvoiceAmount || fullText.length > 0)) {
    const fallbackAmount = totalInvoiceAmount || 0;
    const resolved = resolveCanonicalCategory(fullText.substring(0, 100));
    lines.push({
      lineNo: 1,
      description: docNumber ? `Invoice ${docNumber}` : 'Excel Spreadsheet Line Item',
      partNumber: null,
      hsnCode: null,
      quantity: 1,
      unit: 'NOS',
      unitRate: fallbackAmount,
      discount: 0,
      taxableAmount: fallbackAmount,
      taxRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      taxAmount: 0,
      totalAmount: fallbackAmount,
      categoryCode: resolved.groupName,
      subCategory: resolved.subCategory,
      processStageCode: resolved.costingHead,
      destinationModule: resolved.destinationModule,
      capexOrOpex: resolved.capexOrOpex,
      costingHead: resolved.costingHead,
      confidence: 0.9,
      confidenceStatus: 'HIGH',
      sourcePageNumber: 1,
    });
  }

  // Calculate totals from line items if not found in header cells
  const linesSummary = lines.reduce(
    (acc, l) => ({
      taxable: acc.taxable + (Number(l.taxableAmount) || 0),
      cgst: acc.cgst + (Number(l.cgstAmount) || 0),
      sgst: acc.sgst + (Number(l.sgstAmount) || 0),
      igst: acc.igst + (Number(l.igstAmount) || 0),
      tax: acc.tax + (Number(l.taxAmount) || 0),
      total: acc.total + (Number(l.totalAmount) || 0),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 }
  );

  if (!taxableValue || taxableValue === 0) taxableValue = Number(linesSummary.taxable.toFixed(2));
  if (!cgstAmount || cgstAmount === 0) cgstAmount = Number(linesSummary.cgst.toFixed(2));
  if (!sgstAmount || sgstAmount === 0) sgstAmount = Number(linesSummary.sgst.toFixed(2));
  if (!igstAmount || igstAmount === 0) igstAmount = Number(linesSummary.igst.toFixed(2));
  if (!totalTaxAmount || totalTaxAmount === 0) totalTaxAmount = Number(linesSummary.tax.toFixed(2));
  if (!totalInvoiceAmount || totalInvoiceAmount === 0) totalInvoiceAmount = Number(linesSummary.total.toFixed(2));

  // Determine Canonical Document Type
  let detectedType = 'TAX INVOICE';
  const checkText = fullText.toUpperCase();
  if (checkText.includes('DELIVERY CHALLAN') || checkText.includes('CHALLAN')) {
    detectedType = 'DELIVERY CHALLAN';
  } else if (checkText.includes('PURCHASE ORDER')) {
    detectedType = 'PURCHASE ORDER';
  } else if (checkText.includes('BILL OF SUPPLY')) {
    detectedType = 'BILL OF SUPPLY';
  } else if (checkText.includes('QUOTATION')) {
    detectedType = 'QUOTATION';
  } else if (checkText.includes('PROFORMA')) {
    detectedType = 'PROFORMA INVOICE';
  } else if (checkText.includes('MACHINE')) {
    detectedType = 'MACHINE INVOICE';
  } else if (checkText.includes('TOOL')) {
    detectedType = 'TOOL INVOICE';
  } else if (checkText.includes('MATERIAL TEST')) {
    detectedType = 'MATERIAL TEST CERTIFICATE';
  }
  const canonicalDocType: CanonicalDocumentType = matchCanonicalDocumentType(detectedType);

  // Build Canonical Fields List
  const fields: DocumentAIField[] = [
    {
      fieldName: 'DOCUMENT_TYPE',
      label: 'DOCUMENT TYPE',
      extractedValue: canonicalDocType,
      normalizedValue: canonicalDocType,
      confidence: 0.98,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
    {
      fieldName: 'DOCUMENT_NUMBER',
      label: 'DOCUMENT NUMBER',
      extractedValue: docNumber,
      normalizedValue: docNumber,
      confidence: docNumber ? 0.95 : 0.4,
      confidenceStatus: docNumber ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'INVOICE_NUMBER',
      label: 'INVOICE NUMBER',
      extractedValue: docNumber,
      normalizedValue: docNumber,
      confidence: docNumber ? 0.95 : 0.4,
      confidenceStatus: docNumber ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'DOCUMENT_DATE',
      label: 'DOCUMENT DATE',
      extractedValue: docDate,
      normalizedValue: docDate,
      confidence: docDate ? 0.95 : 0.4,
      confidenceStatus: docDate ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'VENDOR_NAME',
      label: 'VENDOR NAME',
      extractedValue: vendorName,
      normalizedValue: vendorName,
      confidence: vendorName ? 0.95 : 0.4,
      confidenceStatus: vendorName ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'GSTIN',
      label: 'GSTIN',
      extractedValue: vendorGstin,
      normalizedValue: vendorGstin,
      confidence: vendorGstin ? 0.98 : 0.4,
      confidenceStatus: vendorGstin ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'PAN',
      label: 'PAN',
      extractedValue: vendorPan,
      normalizedValue: vendorPan,
      confidence: vendorPan ? 0.98 : 0.4,
      confidenceStatus: vendorPan ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'CUSTOMER_NAME',
      label: 'CUSTOMER NAME',
      extractedValue: customerName,
      normalizedValue: customerName,
      confidence: customerName ? 0.9 : 0.4,
      confidenceStatus: customerName ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'CUSTOMER_GSTIN',
      label: 'CUSTOMER GSTIN',
      extractedValue: customerGstin,
      normalizedValue: customerGstin,
      confidence: customerGstin ? 0.98 : 0.4,
      confidenceStatus: customerGstin ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'PO_NUMBER',
      label: 'PO NUMBER',
      extractedValue: poNumber,
      normalizedValue: poNumber,
      confidence: poNumber ? 0.9 : 0.4,
      confidenceStatus: poNumber ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'DC_NUMBER',
      label: 'DC NUMBER',
      extractedValue: dcNumber,
      normalizedValue: dcNumber,
      confidence: dcNumber ? 0.9 : 0.4,
      confidenceStatus: dcNumber ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'VEHICLE_NUMBER',
      label: 'VEHICLE NUMBER',
      extractedValue: vehicleNumber,
      normalizedValue: vehicleNumber,
      confidence: vehicleNumber ? 0.9 : 0.4,
      confidenceStatus: vehicleNumber ? 'HIGH' : 'LOW',
      pageNo: 1,
    },
    {
      fieldName: 'TAXABLE_VALUE',
      label: 'TAXABLE VALUE',
      extractedValue: String(taxableValue || 0),
      normalizedValue: String(taxableValue || 0),
      confidence: 0.95,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
    {
      fieldName: 'CGST_AMOUNT',
      label: 'CGST AMOUNT',
      extractedValue: String(cgstAmount || 0),
      normalizedValue: String(cgstAmount || 0),
      confidence: 0.95,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
    {
      fieldName: 'SGST_AMOUNT',
      label: 'SGST AMOUNT',
      extractedValue: String(sgstAmount || 0),
      normalizedValue: String(sgstAmount || 0),
      confidence: 0.95,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
    {
      fieldName: 'IGST_AMOUNT',
      label: 'IGST AMOUNT',
      extractedValue: String(igstAmount || 0),
      normalizedValue: String(igstAmount || 0),
      confidence: 0.95,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
    {
      fieldName: 'TOTAL_TAX_AMOUNT',
      label: 'GST TOTAL',
      extractedValue: String(totalTaxAmount || 0),
      normalizedValue: String(totalTaxAmount || 0),
      confidence: 0.95,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
    {
      fieldName: 'TOTAL_INVOICE_AMOUNT',
      label: 'TOTAL INVOICE AMOUNT',
      extractedValue: String(totalInvoiceAmount || 0),
      normalizedValue: String(totalInvoiceAmount || 0),
      confidence: 0.98,
      confidenceStatus: 'HIGH',
      pageNo: 1,
    },
  ];

  const primaryLine = lines[0];

  return {
    documentType: canonicalDocType,
    classificationCode: canonicalDocType,
    destinationModule: primaryLine?.destinationModule || 'PURCHASE',
    destinationRecordType: primaryLine?.capexOrOpex === 'CAPEX' ? 'FIXED_ASSET' : 'INVOICE',
    confidence: 0.96,
    fields,
    lines,
    pages,
  };
}
