const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Import Canonical Data from canonical-library.ts
const {
  MASTER_CATEGORY_GROUPS,
  ERP_DESTINATION_MODULES,
  MASTER_COSTING_HEADS,
  CANONICAL_DOCUMENT_TYPES,
  CANONICAL_HEADER_FIELDS
} = require('../lib/ai/canonical-library.ts');

// 1. Parse all canonical fields from prompt_library_full.txt
const txtPath = path.join(__dirname, 'prompt_library_full.txt');
const txt = fs.readFileSync(txtPath, 'utf8');
const lines = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const sections = [
  { name: '1. DOCUMENT IDENTIFICATION FIELDS', startIdx: 5, endIdx: 65, level: 'HEADER' },
  { name: '2. VENDOR / SUPPLIER FIELDS', startIdx: 66, endIdx: 121, level: 'HEADER' },
  { name: '3. CUSTOMER / BUYER / CONSIGNEE FIELDS', startIdx: 122, endIdx: 164, level: 'HEADER' },
  { name: '4. PURCHASE / ORDER REFERENCE FIELDS', startIdx: 165, endIdx: 203, level: 'HEADER' },
  { name: '5. TAX AND FINANCIAL FIELDS', startIdx: 204, endIdx: 286, level: 'HEADER' },
  { name: '6. ITEM / MATERIAL FIELDS', startIdx: 287, endIdx: 368, level: 'LINE_ITEM' },
  { name: '7. DELIVERY CHALLAN-SPECIFIC FIELDS', startIdx: 369, endIdx: 429, level: 'HEADER / LOGISTICS' },
  { name: '8. MACHINE-SPECIFIC FIELDS', startIdx: 430, endIdx: 482, level: 'LINE_ITEM / CAPEX' },
  { name: '9. TOOL-SPECIFIC FIELDS', startIdx: 483, endIdx: 533, level: 'LINE_ITEM / TOOLS' },
  { name: '10. SERVICE / PROCESS FIELDS', startIdx: 534, endIdx: 566, level: 'LINE_ITEM / SERVICE' },
  { name: '11. OCR / AI CONTROL FIELDS', startIdx: 567, endIdx: 627, level: 'SYSTEM / AUDIT' },
  { name: '12. LINE-LEVEL CLASSIFICATION CONTROLS', startIdx: 628, endIdx: 659, level: 'LINE_ITEM / ROUTING' }
];

const omittedFields = [
  'SOURCE_FOLDER',
  'SOURCE FOLDER',
  'VENDOR_ARCHIVE_TAG',
  'VENDOR ARCHIVE TAG',
  'HISTORICAL_BATCH_CODE',
  'HISTORICAL BATCH CODE (SEC 75)'
];

const canonicalFieldsData = [];

sections.forEach(sec => {
  const secLines = lines.slice(sec.startIdx, sec.endIdx);
  for (let i = 0; i < secLines.length; i++) {
    const l = secLines[i];
    if (l.match(/^[A-Z0-9_]{3,}$/) && !['FIELD_CODE', 'DISPLAY_LABEL', 'DOCUMENT_TYPES', 'INVOICE'].includes(l)) {
      const code = l;
      const label = (i + 1 < secLines.length && !secLines[i+1].includes('_')) ? secLines[i+1] : code.replace(/_/g, ' ');
      
      if (!omittedFields.includes(code) && !omittedFields.includes(label)) {
        canonicalFieldsData.push({
          'SECTION': sec.name,
          'FIELD_CODE': code,
          'DISPLAY_LABEL': label.toUpperCase(),
          'FIELD_LEVEL': sec.level,
          'DATA_TYPE': inferDataType(code),
          'DEFAULT_VALUE_IF_MISSING': 'NOT AVAILABLE / NEEDS REVIEW',
          'HUMAN_VERIFICATION_REQUIRED': 'YES',
          'ERP_PURPOSE_AND_USAGE': inferPurpose(code, sec.name)
        });
      }
    }
  }
});

function inferDataType(code) {
  if (code.includes('DATE')) return 'DATE (YYYY-MM-DD)';
  if (code.includes('TIME')) return 'TIME (HH:MM:SS)';
  if (code.includes('AMOUNT') || code.includes('VALUE') || code.includes('PRICE') || code.includes('RATE') || code.includes('COST') || code.includes('TOTAL') || code.includes('TAX') || code.includes('CGST') || code.includes('SGST') || code.includes('IGST') || code.includes('TDS') || code.includes('TCS') || code.includes('DISCOUNT') || code.includes('FREIGHT') || code.includes('CHARGES') || code.includes('ROUND_OFF')) return 'CURRENCY (INR / NUMERIC)';
  if (code.includes('QUANTITY') || code.includes('COUNT') || code.includes('HOURS') || code.includes('DAYS') || code.includes('PAGE') || code.includes('LINE_NO')) return 'INTEGER / DECIMAL';
  if (code.includes('PERCENTAGE') || code.includes('PCT') || code.includes('RATE_PCT')) return 'PERCENTAGE (%)';
  if (code.includes('CONFIDENCE')) return 'DECIMAL (0.00 - 1.00)';
  if (code.includes('STATUS') || code.includes('TYPE') || code.includes('TREATMENT') || code.includes('CATEGORY') || code.includes('HEAD') || code.includes('MODULE')) return 'ENUM / CODE';
  if (code.includes('FLAG') || code.includes('APPLICABLE') || code.includes('REQUIRED') || code.includes('IS_')) return 'BOOLEAN (YES / NO)';
  return 'STRING / TEXT';
}

function inferPurpose(code, section) {
  if (code === 'DOCUMENT_TYPE') return 'Canonical document classification (Invoice, PO, Delivery Challan, etc.)';
  if (code === 'DOCUMENT_NUMBER' || code === 'INVOICE_NUMBER') return 'Primary legal document identifier extracted from header';
  if (code === 'DOCUMENT_DATE') return 'Official transaction date for financial ledger and GST filing';
  if (code === 'FINANCIAL_YEAR') return 'Fiscal accounting year (e.g. 2025-2026, 2026-2027) for audit posting';
  if (code.includes('GSTIN')) return '15-digit GSTIN used for automated 2B reconciliation and vendor lookup';
  if (code.includes('PAN')) return 'Permanent Account Number for TDS / TCS compliance and vendor KYC';
  if (code.includes('VENDOR')) return 'Supplier identification and link to vendor master database';
  if (code.includes('CUSTOMER') || code.includes('BUYER')) return 'Consignee / Customer account in ERP client receivables ledger';
  if (code.includes('PO_')) return 'Cross-matching against approved Purchase Order in ERP procurement';
  if (code.includes('DC_')) return 'Delivery Challan traceability and gate entry store inward verification';
  if (code.includes('HSN') || code.includes('SAC')) return 'HSN/SAC 4 to 8 digit tariff code for GST audit and rate validation';
  if (code.includes('TAXABLE')) return 'Pre-tax net assessable value for line item or total invoice';
  if (code.includes('LINE_CAPEX_OR_OPEX')) return 'Capitalization vs Operating Expense routing flag (Capex to Assets, Opex to Costing)';
  if (code.includes('DESTINATION_MODULE')) return 'Automated ERP destination routing module (Raw Material, CNC Tools, Machines, etc.)';
  if (code.includes('COSTING_HEAD')) return 'Monthly costing ledger allocation for wedge unit piece-rate formula';
  if (code.includes('CONFIDENCE')) return 'AI OCR extraction confidence score (High >= 85%, Medium, Low)';
  return `Canonical field for ${section.toLowerCase()}`;
}

// 2. Build Sheet 2: Line-Level Classification & Routing Table
const lineRoutingData = [];

MASTER_CATEGORY_GROUPS.forEach(group => {
  group.categories.forEach(cat => {
    lineRoutingData.push({
      'GROUP_CODE': group.groupCode,
      'GROUP_NAME': group.groupName,
      'SUB_CATEGORY': cat,
      'ERP_DESTINATION_MODULE': group.defaultDestination,
      'COSTING_HEAD': group.defaultCostingHead,
      'ACCOUNTING_TREATMENT': group.defaultAccounting,
      'INDEPENDENT_ROUTING': 'YES',
      'ROUTING_RULE_AND_DESCRIPTION': `Routes line items classified as "${cat}" independently to ${group.defaultDestination} under ${group.defaultCostingHead} (${group.defaultAccounting})`
    });
  });
});

// 3. Build Sheet 3: Document Types
const documentTypesData = CANONICAL_DOCUMENT_TYPES.map(docType => {
  let defaultDest = 'PURCHASE';
  let accounting = 'OPEX';
  if (docType.includes('CAPEX') || docType.includes('MACHINE')) {
    defaultDest = 'MACHINES & CAPEX';
    accounting = 'CAPEX';
  } else if (docType.includes('TOOL')) {
    defaultDest = 'CNC TOOLS';
  } else if (docType.includes('CHALLAN')) {
    defaultDest = 'DELIVERY CHALLAN';
  } else if (docType.includes('RECEIPT')) {
    defaultDest = 'RAW MATERIAL INVENTORY';
  } else if (docType.includes('TEST') || docType.includes('WARRANTY')) {
    defaultDest = 'QUALITY & INSPECTION';
  } else if (docType.includes('TRANSPORT')) {
    defaultDest = 'DISPATCH';
  }

  return {
    'DOCUMENT_TYPE': docType,
    'CATEGORY_GROUP': getDocTypeGroup(docType),
    'DEFAULT_DESTINATION_MODULE': defaultDest,
    'DEFAULT_ACCOUNTING': accounting,
    'OCR_EXTRACTION_PRIORITY': docType.includes('INVOICE') || docType.includes('PO') || docType.includes('CHALLAN') ? 'HIGH' : 'STANDARD',
    'DESCRIPTION': getDocTypeDescription(docType)
  };
});

function getDocTypeGroup(type) {
  if (type.includes('INVOICE') || type.includes('BILL')) return 'FINANCIAL / BILLING';
  if (type.includes('ORDER')) return 'PROCUREMENT / ORDERS';
  if (type.includes('CHALLAN') || type.includes('RECEIPT') || type.includes('TRANSPORT')) return 'LOGISTICS / MOVEMENTS';
  if (type.includes('NOTE')) return 'ACCOUNTING ADJUSTMENTS';
  if (type.includes('QUOTATION')) return 'PRE-PURCHASE ESTIMATES';
  if (type.includes('TEST') || type.includes('CERTIFICATE') || type.includes('WARRANTY')) return 'QUALITY / COMPLIANCE';
  return 'GENERAL';
}

function getDocTypeDescription(type) {
  switch (type) {
    case 'INVOICE': return 'Commercial vendor invoice for goods or raw material purchase.';
    case 'TAX INVOICE': return 'GST-compliant tax invoice carrying GSTIN, CGST/SGST/IGST breakdown and HSN.';
    case 'BILL OF SUPPLY': return 'Non-taxable supply or invoice for composition dealer purchases.';
    case 'PURCHASE ORDER': return 'Customer or internal purchase order outlining ordered quantities and rates.';
    case 'DELIVERY CHALLAN': return 'Goods transfer, outward job-work or inward delivery document without payment.';
    case 'GOODS RECEIPT NOTE': return 'Store inward verification of received goods against PO.';
    case 'MATERIAL RECEIPT NOTE': return 'Quality and store verification note for inward raw material.';
    case 'QUOTATION': return 'Supplier price estimate and terms prior to order issuance.';
    case 'PROFORMA INVOICE': return 'Preliminary bill sent in advance of shipment or advance payment.';
    case 'CREDIT NOTE': return 'Supplier credit adjustment for returned goods or price differences.';
    case 'DEBIT NOTE': return 'Debit claim raised against vendor for rejections or debit adjustments.';
    case 'PAYMENT RECEIPT': return 'Proof of payment receipt or remittance voucher.';
    case 'MACHINE INVOICE': return 'Capital asset invoice for CNC, Tapping, or Slitting machines.';
    case 'TOOL INVOICE': return 'Invoice specifically for inserts, holders, taps, or slitting tools.';
    case 'SERVICE BILL': return 'Job-work invoice for heat treatment, machining, plating, or maintenance.';
    case 'EXPENSE BILL': return 'Factory operating utility, travel, courier, or professional fees bill.';
    case 'CAPEX DOCUMENT': return 'Asset acquisition, civil work, or commissioning certificate.';
    case 'TEST REPORT': return 'Spectro analysis, chemical testing, or mechanical dimension test report.';
    case 'MATERIAL TEST CERTIFICATE': return 'Mill test certificate (MTC) for 20MnCr5 steel chemistry & hardness.';
    case 'WARRANTY DOCUMENT': return 'Warranty card or service guarantee certificate for machinery or tools.';
    case 'TRANSPORT DOCUMENT': return 'Lorry Receipt (LR), Bilty, or transporter delivery slip.';
    case 'OTHER DOCUMENT': return 'Miscellaneous operational or administrative scanned documents.';
    default: return 'Canonical document for UCON Wedge ERP workflow.';
  }
}

// 4. Build Sheet 4: Routing Examples (Section 15)
const routingExamplesData = [
  {
    'LINE_ITEM_DESCRIPTION': 'THREE-WAY SLOT CUTTER MACHINE',
    'EXTRACTED_CATEGORY': 'CNC TOOL / MACHINE ACCESSORY',
    'ERP_DESTINATION': 'MACHINES & CAPEX',
    'COSTING_HEAD': 'MACHINES & CAPEX',
    'CAPEX_OR_OPEX': 'CAPEX',
    'ERP_ACTION': 'Capitalized as Fixed Asset under Depreciation Schedule'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'PACKING CHARGES',
    'EXTRACTED_CATEGORY': 'PACKING / OTHER CHARGES',
    'ERP_DESTINATION': 'MONTHLY COSTING',
    'COSTING_HEAD': 'PACKING',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Absorbed in monthly operational costing calculation'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'TAPPING TAP M8 X 1.25 HSS',
    'EXTRACTED_CATEGORY': 'TAPPING TOOLS',
    'ERP_DESTINATION': 'TAPPING TOOLS',
    'COSTING_HEAD': 'TAPPING TOOLS',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Added to tool inventory and issued to Stage 3 Tapping operations'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'WATER SOLUBLE CUTTING COOLANT OIL',
    'EXTRACTED_CATEGORY': 'CNC CONSUMABLES',
    'ERP_DESTINATION': 'CONSUMABLES',
    'COSTING_HEAD': 'CONSUMABLES',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Recorded in Store Consumables ledger'
  },
  {
    'LINE_ITEM_DESCRIPTION': '20MNCR5 ROUND BAR 32MM DIA',
    'EXTRACTED_CATEGORY': 'RAW MATERIAL',
    'ERP_DESTINATION': 'RAW MATERIAL INVENTORY',
    'COSTING_HEAD': 'RAW MATERIAL',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Stocked in raw material warehouse with heat code & weight tracking'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'GO / NO-GO PLUG GAUGE',
    'EXTRACTED_CATEGORY': 'INSPECTION TOOL / GAUGES',
    'ERP_DESTINATION': 'QUALITY & INSPECTION',
    'COSTING_HEAD': 'TAPPING TOOLS',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Assigned to Quality Lab with periodic calibration tracking'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'SLITTING SAW BLADE 100MM X 1.0MM',
    'EXTRACTED_CATEGORY': 'SLITTING TOOL',
    'ERP_DESTINATION': 'SLITTING TOOLS',
    'COSTING_HEAD': 'SLITTING TOOLS',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Tracked with regrinding cycle and wedge slot yield'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'CNC MACHINE INSTALLATION & LEVELING CHARGES',
    'EXTRACTED_CATEGORY': 'MACHINE CAPITAL SERVICE',
    'ERP_DESTINATION': 'MACHINES & CAPEX',
    'COSTING_HEAD': 'MACHINES & CAPEX',
    'CAPEX_OR_OPEX': 'CAPEX',
    'ERP_ACTION': 'Added to machine capital cost basis for asset capitalization'
  },
  {
    'LINE_ITEM_DESCRIPTION': 'MONTHLY CNC LATHE SPINDLE REPAIR SERVICE',
    'EXTRACTED_CATEGORY': 'MAINTENANCE SERVICE',
    'ERP_DESTINATION': 'MACHINE MAINTENANCE',
    'COSTING_HEAD': 'CNC',
    'CAPEX_OR_OPEX': 'OPEX',
    'ERP_ACTION': 'Expensed against CNC machine maintenance ledger'
  }
];

// Create Workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Canonical Fields
const wsFields = XLSX.utils.json_to_sheet(canonicalFieldsData);
wsFields['!cols'] = [
  { wch: 38 }, // SECTION
  { wch: 32 }, // FIELD_CODE
  { wch: 35 }, // DISPLAY_LABEL
  { wch: 20 }, // FIELD_LEVEL
  { wch: 28 }, // DATA_TYPE
  { wch: 32 }, // DEFAULT_VALUE
  { wch: 28 }, // HUMAN_VERIFICATION
  { wch: 75 }  // PURPOSE
];
XLSX.utils.book_append_sheet(wb, wsFields, 'CANONICAL_FIELDS');

// Sheet 2: Line-Level Classification & Routing
const wsRouting = XLSX.utils.json_to_sheet(lineRoutingData);
wsRouting['!cols'] = [
  { wch: 25 }, // GROUP_CODE
  { wch: 45 }, // GROUP_NAME
  { wch: 38 }, // SUB_CATEGORY
  { wch: 30 }, // ERP_DESTINATION_MODULE
  { wch: 25 }, // COSTING_HEAD
  { wch: 24 }, // ACCOUNTING_TREATMENT
  { wch: 24 }, // INDEPENDENT_ROUTING
  { wch: 80 }  // ROUTING_RULE
];
XLSX.utils.book_append_sheet(wb, wsRouting, 'LINE_CLASSIFICATION_ROUTING');

// Sheet 3: Document Types
const wsDocTypes = XLSX.utils.json_to_sheet(documentTypesData);
wsDocTypes['!cols'] = [
  { wch: 30 }, // DOCUMENT_TYPE
  { wch: 28 }, // CATEGORY_GROUP
  { wch: 30 }, // DEFAULT_DESTINATION_MODULE
  { wch: 22 }, // DEFAULT_ACCOUNTING
  { wch: 26 }, // OCR_EXTRACTION_PRIORITY
  { wch: 80 }  // DESCRIPTION
];
XLSX.utils.book_append_sheet(wb, wsDocTypes, 'DOCUMENT_TYPES');

// Sheet 4: Routing Examples
const wsExamples = XLSX.utils.json_to_sheet(routingExamplesData);
wsExamples['!cols'] = [
  { wch: 45 }, // LINE_ITEM_DESCRIPTION
  { wch: 35 }, // EXTRACTED_CATEGORY
  { wch: 28 }, // ERP_DESTINATION
  { wch: 25 }, // COSTING_HEAD
  { wch: 18 }, // CAPEX_OR_OPEX
  { wch: 75 }  // ERP_ACTION
];
XLSX.utils.book_append_sheet(wb, wsExamples, 'ROUTING_EXAMPLES');

// Ensure public/templates exists
const publicTemplatesDir = path.resolve(__dirname, '..', 'public', 'templates');
fs.mkdirSync(publicTemplatesDir, { recursive: true });

const targetFile1 = path.join(publicTemplatesDir, 'UCON_WEDGE_MASTER_CANONICAL_AND_ROUTING_LIBRARY.xlsx');
const targetFile2 = path.resolve(__dirname, '..', 'UCON_WEDGE_MASTER_CANONICAL_AND_ROUTING_LIBRARY.xlsx');

XLSX.writeFile(wb, targetFile1);
XLSX.writeFile(wb, targetFile2);

console.log('✓ Successfully created Master Excel at:', targetFile1);
console.log('✓ Successfully created copy at root:', targetFile2);
console.log('Summary:');
console.log('- Canonical Fields Sheet:', canonicalFieldsData.length, 'fields');
console.log('- Line Classification & Routing Sheet:', lineRoutingData.length, 'categories');
console.log('- Document Types Sheet:', documentTypesData.length, 'document types');
console.log('- Routing Examples Sheet:', routingExamplesData.length, 'examples');
