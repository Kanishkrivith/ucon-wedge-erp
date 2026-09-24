/**
 * UCON Wedge ERP - Master Canonical Field and Category Library
 * Conforms to Master Requirements Sections 1-16 (Sections 46 & 47)
 * All display labels are in CAPITAL LETTERS.
 */

export interface CanonicalCategoryGroup {
  groupCode: string;
  groupName: string; // CAPITAL LETTERS
  defaultDestination: string; // Section 14 Destination Module
  defaultCostingHead: string;
  defaultAccounting: 'CAPEX' | 'OPEX';
  categories: string[]; // Sub-categories in CAPITAL LETTERS
}

// 22 Main Line-Level Category Groups (Section 13, Groups A through V)
export const MASTER_CATEGORY_GROUPS: CanonicalCategoryGroup[] = [
  {
    groupCode: 'A_RAW_MATERIAL',
    groupName: 'A. RAW MATERIAL',
    defaultDestination: 'RAW MATERIAL INVENTORY',
    defaultCostingHead: 'RAW MATERIAL',
    defaultAccounting: 'OPEX',
    categories: [
      'RAW MATERIAL',
      '20MNCR5 RAW MATERIAL',
      'CASE-HARDENING STEEL',
      'ALLOY STEEL',
      'ROUND BAR',
      'STEEL BAR',
      'STEEL ROD',
      'STEEL PLATE',
      'STEEL SHEET',
      'FORGING RAW MATERIAL',
      'SPRING STEEL',
      'STAINLESS STEEL',
      'CARBON STEEL',
      'SPECIAL GRADE STEEL',
      'RAW MATERIAL CUT PIECES',
      'SCRAP RAW MATERIAL',
      'IMPORTED RAW MATERIAL',
      'DOMESTIC RAW MATERIAL',
    ],
  },
  {
    groupCode: 'B_CNC_MACHINES',
    groupName: 'B. CNC MACHINES AND CAPITAL EQUIPMENT',
    defaultDestination: 'MACHINES & CAPEX',
    defaultCostingHead: 'MACHINES & CAPEX',
    defaultAccounting: 'CAPEX',
    categories: [
      'CNC TURNING MACHINE',
      'CNC LATHE MACHINE',
      'CNC MACHINING CENTRE',
      'CNC MACHINE ACCESSORY',
      'CNC MACHINE ATTACHMENT',
      'CNC MACHINE CONTROL PANEL',
      'CNC MACHINE MOTOR',
      'CNC MACHINE SPINDLE',
      'CNC MACHINE CHUCK',
      'CNC MACHINE HYDRAULIC UNIT',
      'CNC MACHINE COOLING UNIT',
      'CNC MACHINE CHIP CONVEYOR',
      'CNC MACHINE BAR FEEDER',
      'CNC MACHINE TOOL POST',
      'CNC MACHINE INSTALLATION',
      'CNC MACHINE COMMISSIONING',
      'CNC MACHINE AMC',
      'CNC MACHINE REPAIR',
      'CNC MACHINE SPARE PART',
      'MACHINE FOUNDATION WORK',
      'MACHINE ELECTRICAL WORK',
      'MACHINE CALIBRATION',
      'MACHINE ASSET',
    ],
  },
  {
    groupCode: 'C_TAPPING_MACHINES',
    groupName: 'C. TAPPING MACHINES AND EQUIPMENT',
    defaultDestination: 'MACHINES & CAPEX',
    defaultCostingHead: 'TAPPING',
    defaultAccounting: 'CAPEX',
    categories: [
      'TAPPING MACHINE',
      'TAPPING MACHINE ACCESSORY',
      'TAPPING MACHINE SPARE',
      'TAPPING MACHINE MOTOR',
      'TAPPING MACHINE CONTROL',
      'TAPPING MACHINE CHUCK',
      'TAPPING MACHINE HOLDER',
      'TAPPING MACHINE REPAIR',
      'TAPPING MACHINE MAINTENANCE',
      'TAPPING MACHINE INSTALLATION',
      'TAPPING MACHINE AMC',
    ],
  },
  {
    groupCode: 'D_SLITTING_MACHINES',
    groupName: 'D. SLITTING MACHINES AND EQUIPMENT',
    defaultDestination: 'MACHINES & CAPEX',
    defaultCostingHead: 'SLITTING',
    defaultAccounting: 'CAPEX',
    categories: [
      'SLITTING MACHINE',
      'THREE WAY SLOT CUTTER MACHINE',
      'SLITTING MACHINE ACCESSORY',
      'SLITTING MACHINE SPARE',
      'SLITTING MACHINE ARBOR',
      'SLITTING MACHINE HOLDER',
      'SLITTING MACHINE FIXTURE',
      'SLITTING MACHINE REPAIR',
      'SLITTING MACHINE MAINTENANCE',
      'SLITTING MACHINE INSTALLATION',
      'SLITTING MACHINE AMC',
    ],
  },
  {
    groupCode: 'E_CNC_TOOLS',
    groupName: 'E. CNC CUTTING TOOLS AND INSERTS',
    defaultDestination: 'CNC TOOLS',
    defaultCostingHead: 'CNC TOOLS',
    defaultAccounting: 'OPEX',
    categories: [
      'CNC CUTTING INSERT',
      'TURNING INSERT',
      'MILLING INSERT',
      'CARBIDE INSERT',
      'INDEXABLE INSERT',
      'INSERT HOLDER',
      'TOOL HOLDER',
      'BORING BAR',
      'BORING TOOL',
      'TURNING TOOL',
      'GROOVING TOOL',
      'THREADING TOOL',
      'PARTING TOOL',
      'DRILL',
      'CARBIDE DRILL',
      'HSS DRILL',
      'STEP DRILL',
      'CENTRE DRILL',
      'REAMER',
      'END MILL',
      'COUNTERSINK',
      'COUNTERBORE TOOL',
      'CNC TOOLING ACCESSORY',
      'TOOL CLAMP',
      'TOOL HOLDER SCREW',
      'TOOL NOZZLE',
      'TOOL COOLANT NOZZLE',
    ],
  },
  {
    groupCode: 'F_TAPPING_TOOLS',
    groupName: 'F. TAPPING TOOLS AND GAUGES',
    defaultDestination: 'TAPPING TOOLS',
    defaultCostingHead: 'TAPPING TOOLS',
    defaultAccounting: 'OPEX',
    categories: [
      'TAPPING TAP',
      'MACHINE TAP',
      'HAND TAP',
      'SPIRAL FLUTE TAP',
      'SPIRAL POINT TAP',
      'FORMING TAP',
      'CARBIDE TAP',
      'HSS TAP',
      'TAPPING HOLDER',
      'TAPPING COLLET',
      'TAPPING CHUCK',
      'TAPPING ADAPTER',
      'TAPPING TOOL ACCESSORY',
      'GO GAUGE',
      'NO-GO GAUGE',
      'GO/NO-GO GAUGE',
      'THREAD PLUG GAUGE',
      'THREAD RING GAUGE',
      'THREAD GAUGE',
      'GAUGE CALIBRATION',
      'GAUGE REPAIR',
      'TAP REGRINDING',
      'TAP COATING',
      'TAPPING TOOL MAINTENANCE',
    ],
  },
  {
    groupCode: 'G_SLITTING_TOOLS',
    groupName: 'G. SLITTING TOOLS',
    defaultDestination: 'SLITTING TOOLS',
    defaultCostingHead: 'SLITTING TOOLS',
    defaultAccounting: 'OPEX',
    categories: [
      'SLITTING SAW BLADE',
      'HSS SLITTING SAW',
      'M35 SLITTING SAW',
      'M42 SLITTING SAW',
      'CARBIDE SLITTING SAW',
      'SLITTING CUTTER',
      'SLITTING ARBOR',
      'SLITTING BLADE HOLDER',
      'SLITTING BLADE SPACER',
      'SLITTING BLADE REGRINDING',
      'SLITTING BLADE SHARPENING',
      'SLITTING BLADE COATING',
      'SLITTING TOOL ACCESSORY',
      'SLITTING TOOL REPAIR',
    ],
  },
  {
    groupCode: 'H_LUBRICANTS_CHEMICALS',
    groupName: 'H. COOLANT, OIL, LUBRICATION AND CHEMICALS',
    defaultDestination: 'CONSUMABLES',
    defaultCostingHead: 'CONSUMABLES',
    defaultAccounting: 'OPEX',
    categories: [
      'CNC COOLANT',
      'CUTTING COOLANT',
      'TAPPING COOLANT',
      'TAPPING OIL',
      'CUTTING OIL',
      'HYDRAULIC OIL',
      'LUBRICATING OIL',
      'MACHINE OIL',
      'GEAR OIL',
      'SPINDLE OIL',
      'WAY OIL',
      'COMPRESSOR OIL',
      'GREASE',
      'INDUSTRIAL GREASE',
      'ANTI-RUST OIL',
      'RUST PREVENTIVE',
      'DEGREASING CHEMICAL',
      'CLEANING CHEMICAL',
      'WASHING CHEMICAL',
      'COOLANT ADDITIVE',
      'COOLANT FILTER',
      'COOLANT PUMP',
      'COOLANT TANK',
      'COOLANT PIPE',
      'COOLANT NOZZLE',
      'INDUSTRIAL CHEMICAL',
      'PROCESS CHEMICAL',
    ],
  },
  {
    groupCode: 'I_WASHING_CLEANING',
    groupName: 'I. WASHING AND CLEANING',
    defaultDestination: 'PRODUCTION PROCESS COST',
    defaultCostingHead: 'WASHING',
    defaultAccounting: 'OPEX',
    categories: [
      'INDUSTRIAL WASHING MACHINE',
      'COMPONENT WASHING',
      'WASHING SERVICE',
      'DEGREASING SERVICE',
      'CLEANING SERVICE',
      'WASHING CHEMICAL',
      'CLEANING CHEMICAL',
      'DETERGENT',
      'INDUSTRIAL CLEANER',
      'AIR BLOWING EQUIPMENT',
      'WASHING MACHINE SPARE',
      'WASHING MACHINE MAINTENANCE',
    ],
  },
  {
    groupCode: 'J_HEAT_TREATMENT',
    groupName: 'J. HEAT TREATMENT',
    defaultDestination: 'PURCHASE',
    defaultCostingHead: 'HEAT TREATMENT',
    defaultAccounting: 'OPEX',
    categories: [
      'CASE HARDENING',
      'HEAT TREATMENT',
      'CARBURISING',
      'HARDENING',
      'TEMPERING',
      'ANNEALING',
      'NORMALISING',
      'STRESS RELIEVING',
      'HEAT TREATMENT SERVICE',
      'HEAT TREATMENT CHARGES',
      'HEAT TREATMENT TESTING',
      'HARDNESS TESTING',
      'HEAT TREATMENT INSPECTION',
      'HEAT TREATMENT BATCH',
      'HEAT TREATMENT TRANSPORT',
      'HEAT TREATMENT REWORK',
    ],
  },
  {
    groupCode: 'K_CHAMFERING_MACHINING',
    groupName: 'K. CHAMFERING AND MACHINING SERVICES',
    defaultDestination: 'PRODUCTION PROCESS COST',
    defaultCostingHead: 'CNC',
    defaultAccounting: 'OPEX',
    categories: [
      'CHAMFERING SERVICE',
      'CHAMFERING TOOL',
      'CHAMFERING CUTTER',
      'CHAMFERING FIXTURE',
      'CNC MACHINING SERVICE',
      'CNC TURNING SERVICE',
      'CNC COMPONENT MACHINING',
      'THREADING SERVICE',
      'DRILLING SERVICE',
      'BORING SERVICE',
      'GRINDING SERVICE',
      'PRECISION MACHINING',
      'SUBCONTRACT MACHINING',
      'MACHINING REWORK',
      'MACHINING INSPECTION',
    ],
  },
  {
    groupCode: 'L_GRINDING_REGRINDING',
    groupName: 'L. GRINDING AND REGRINDING',
    defaultDestination: 'TAPPING TOOLS',
    defaultCostingHead: 'TAPPING TOOLS',
    defaultAccounting: 'OPEX',
    categories: [
      'TOOL REGRINDING',
      'TAP REGRINDING',
      'SLITTING BLADE REGRINDING',
      'INSERT REGRINDING',
      'CUTTER REGRINDING',
      'GRINDING SERVICE',
      'SURFACE GRINDING',
      'CYLINDRICAL GRINDING',
      'TOOL SHARPENING',
      'IN-HOUSE GRINDING',
      'EXTERNAL GRINDING',
      'GRINDING MACHINE',
      'GRINDING MACHINE SPARE',
      'GRINDING WHEEL',
      'ABRASIVE WHEEL',
      'GRINDING CONSUMABLE',
    ],
  },
  {
    groupCode: 'M_SPRING_ASSEMBLY',
    groupName: 'M. SPRING AND ASSEMBLY',
    defaultDestination: 'FINISHED GOODS INVENTORY',
    defaultCostingHead: 'SPRING',
    defaultAccounting: 'OPEX',
    categories: [
      'SPRING',
      'CIRCLIP',
      'SPRING WIRE',
      'SPRING COMPONENT',
      'SPRING MANUFACTURING',
      'SPRING MAKING SERVICE',
      'SPRING ASSEMBLY',
      'ASSEMBLY COMPONENT',
      'ASSEMBLY TOOL',
      'ASSEMBLY FIXTURE',
      'ASSEMBLY LABOUR',
      'SPRING INSPECTION',
    ],
  },
  {
    groupCode: 'N_INSPECTION_QUALITY',
    groupName: 'N. INSPECTION, TESTING AND QUALITY',
    defaultDestination: 'QUALITY & INSPECTION',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'OPEX',
    categories: [
      'INSPECTION SERVICE',
      'QUALITY INSPECTION',
      'DIMENSIONAL INSPECTION',
      'HARDNESS TESTING',
      'LOAD TESTING',
      'ANCHORAGE EFFICIENCY TEST',
      'STATIC TESTING',
      'DYNAMIC TESTING',
      'MATERIAL TESTING',
      'CALIBRATION SERVICE',
      'CALIBRATION CERTIFICATE',
      'TESTING EQUIPMENT',
      'TESTING FIXTURE',
      'MEASURING INSTRUMENT',
      'VERNIER CALIPER',
      'MICROMETER',
      'HEIGHT GAUGE',
      'DIAL GAUGE',
      'BORE GAUGE',
      'PRESSURE GAUGE',
      'LOAD CELL',
      'TESTING ACCESSORY',
      'QUALITY DOCUMENTATION',
    ],
  },
  {
    groupCode: 'O_PACKING_MATERIALS',
    groupName: 'O. PACKING MATERIALS',
    defaultDestination: 'PACKING MATERIALS',
    defaultCostingHead: 'PACKING',
    defaultAccounting: 'OPEX',
    categories: [
      'PACKING CHARGES',
      'PACKING MATERIAL',
      'CARTON BOX',
      'CORRUGATED BOX',
      'WOODEN BOX',
      'WOODEN PALLET',
      'PLASTIC BAG',
      'POLY BAG',
      'SHRINK FILM',
      'STRETCH FILM',
      'BUBBLE WRAP',
      'FOAM',
      'PACKING TAPE',
      'STRAPPING BAND',
      'STEEL STRAP',
      'LABEL',
      'STICKER',
      'PRINTED LABEL',
      'PACKING PAPER',
      'PACKING THREAD',
      'PACKING ACCESSORY',
      'PACKING LABOUR',
      'PACKING SERVICE',
    ],
  },
  {
    groupCode: 'P_ELECTRICAL_UTILITY',
    groupName: 'P. ELECTRICAL AND UTILITY ITEMS',
    defaultDestination: 'MACHINE MAINTENANCE',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'OPEX',
    categories: [
      'ELECTRICAL PANEL',
      'ELECTRICAL CABLE',
      'POWER CABLE',
      'CONTROL CABLE',
      'SWITCH',
      'SENSOR',
      'PROXIMITY SENSOR',
      'LIMIT SWITCH',
      'CONTACTOR',
      'RELAY',
      'MCB',
      'MCCB',
      'FUSE',
      'TERMINAL',
      'ELECTRICAL MOTOR',
      'FAN',
      'INDUSTRIAL FAN',
      'COOLING FAN',
      'LED LIGHT',
      'INDUSTRIAL LIGHT',
      'UPS',
      'BATTERY',
      'ELECTRICAL ACCESSORY',
      'ELECTRICAL REPAIR',
      'ELECTRICAL MAINTENANCE',
    ],
  },
  {
    groupCode: 'Q_COOLER_AIR',
    groupName: 'Q. COOLER AND AIR-CIRCULATION EQUIPMENT',
    defaultDestination: 'MACHINES & CAPEX',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'CAPEX',
    categories: [
      'INDUSTRIAL AIR COOLER',
      'DESERT AIR COOLER',
      'PORTABLE AIR COOLER',
      'COOLER MACHINE',
      'COOLER MOTOR',
      'COOLER FAN',
      'COOLER PUMP',
      'COOLER WATER TANK',
      'COOLER PIPE',
      'COOLER PAD',
      'COOLER FILTER',
      'COOLER CONTROL',
      'COOLER ELECTRICAL PART',
      'COOLER REPAIR',
      'COOLER MAINTENANCE',
      'COOLER INSTALLATION',
      'AIR CIRCULATOR',
      'INDUSTRIAL FAN',
      'EXHAUST FAN',
      'VENTILATION EQUIPMENT',
      'AIR CONDITIONER',
      'AIR CONDITIONER SERVICE',
    ],
  },
  {
    groupCode: 'R_SAFETY_PPE',
    groupName: 'R. SAFETY AND PERSONAL PROTECTIVE EQUIPMENT',
    defaultDestination: 'CONSUMABLES',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'OPEX',
    categories: [
      'SAFETY SHOES',
      'SAFETY HELMET',
      'SAFETY GOGGLES',
      'SAFETY GLASSES',
      'HAND GLOVES',
      'CUT-RESISTANT GLOVES',
      'EAR PLUGS',
      'EAR MUFFS',
      'FACE MASK',
      'RESPIRATOR',
      'SAFETY JACKET',
      'SAFETY APRON',
      'SAFETY BELT',
      'FIRE EXTINGUISHER',
      'FIRE SAFETY EQUIPMENT',
      'FIRST AID MATERIAL',
      'SAFETY SIGNAGE',
      'PPE CONSUMABLE',
    ],
  },
  {
    groupCode: 'S_FACTORY_MAINTENANCE',
    groupName: 'S. FACTORY MAINTENANCE AND GENERAL CONSUMABLES',
    defaultDestination: 'MACHINE MAINTENANCE',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'OPEX',
    categories: [
      'MAINTENANCE MATERIAL',
      'HARDWARE MATERIAL',
      'BOLT',
      'NUT',
      'WASHER',
      'SCREW',
      'BEARING',
      'BELT',
      'CHAIN',
      'COUPLING',
      'SEAL',
      'O-RING',
      'PIPE',
      'HOSE',
      'FITTING',
      'VALVE',
      'FASTENER',
      'WELDING ELECTRODE',
      'WELDING WIRE',
      'GRINDING DISC',
      'CUTTING DISC',
      'HAND TOOL',
      'POWER TOOL',
      'WORKSHOP TOOL',
      'CLEANING MATERIAL',
      'BROOM',
      'WASTE CLOTH',
      'INDUSTRIAL CLOTH',
      'GENERAL STATIONERY',
      'OFFICE CONSUMABLE',
      'HOUSEKEEPING MATERIAL',
    ],
  },
  {
    groupCode: 'T_TRANSPORT_LOGISTICS',
    groupName: 'T. TRANSPORTATION AND LOGISTICS',
    defaultDestination: 'DISPATCH',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'OPEX',
    categories: [
      'TRANSPORTATION CHARGES',
      'GOODS TRANSPORT',
      'FREIGHT CHARGES',
      'LOADING CHARGES',
      'UNLOADING CHARGES',
      'VEHICLE HIRE',
      'LOCAL TRANSPORT',
      'COURIER CHARGES',
      'DELIVERY CHARGES',
      'MATERIAL HANDLING',
      'PACKING AND FORWARDING',
      'LOGISTICS SERVICE',
      'TRANSPORT INSURANCE',
      'VEHICLE REPAIR',
      'VEHICLE MAINTENANCE',
    ],
  },
  {
    groupCode: 'U_PROFESSIONAL_SERVICES',
    groupName: 'U. PROFESSIONAL AND OTHER SERVICES',
    defaultDestination: 'OTHER OPERATING EXPENSE',
    defaultCostingHead: 'OTHER EXPENSES',
    defaultAccounting: 'OPEX',
    categories: [
      'CONSULTANCY SERVICE',
      'ENGINEERING SERVICE',
      'DESIGN SERVICE',
      'SOFTWARE SERVICE',
      'IT SERVICE',
      'AMC SERVICE',
      'REPAIR SERVICE',
      'MAINTENANCE SERVICE',
      'CALIBRATION SERVICE',
      'AUDIT SERVICE',
      'TESTING SERVICE',
      'SECURITY SERVICE',
      'HOUSEKEEPING SERVICE',
      'RENT',
      'ELECTRICITY',
      'WATER CHARGES',
      'TELEPHONE EXPENSE',
      'INTERNET EXPENSE',
      'BANK CHARGES',
      'GOVERNMENT FEES',
      'LICENSE FEES',
      'REGISTRATION FEES',
      'INSURANCE EXPENSE',
      'TRAINING EXPENSE',
      'TRAVEL EXPENSE',
      'OTHER OPERATING EXPENSE',
    ],
  },
  {
    groupCode: 'V_SCRAP_RECOVERY',
    groupName: 'V. SCRAP AND RECOVERY',
    defaultDestination: 'SCRAP & RECOVERY',
    defaultCostingHead: 'SCRAP RECOVERY',
    defaultAccounting: 'OPEX',
    categories: [
      'STEEL SCRAP',
      'TURNING SCRAP',
      'CNC SCRAP',
      'TAPPING SCRAP',
      'SLITTING SCRAP',
      'REJECTED COMPONENT',
      'PROCESS WASTE',
      'RECOVERABLE SCRAP',
      'NON-RECOVERABLE SCRAP',
      'SCRAP SALE',
      'SCRAP RECOVERY',
      'SCRAP TRANSPORT',
      'SCRAP HANDLING',
    ],
  },
];

// 20 Standard ERP Destination Modules (Section 14)
export const ERP_DESTINATION_MODULES = [
  'RAW MATERIAL INVENTORY',
  'WIP INVENTORY',
  'FINISHED GOODS INVENTORY',
  'CNC TOOLS',
  'TAPPING TOOLS',
  'SLITTING TOOLS',
  'CONSUMABLES',
  'PACKING MATERIALS',
  'MACHINES & CAPEX',
  'MACHINE MAINTENANCE',
  'PRODUCTION PROCESS COST',
  'PURCHASE',
  'WORK ORDER',
  'DELIVERY CHALLAN',
  'DISPATCH',
  'QUALITY & INSPECTION',
  'SCRAP & RECOVERY',
  'MONTHLY COSTING',
  'OTHER OPERATING EXPENSE',
  'ADMINISTRATION',
] as const;

// Master Costing Heads (Section 16)
export const MASTER_COSTING_HEADS = [
  'RAW MATERIAL',
  'CNC',
  'CNC TOOLS',
  'TAPPING',
  'TAPPING TOOLS',
  'SLITTING',
  'SLITTING TOOLS',
  'WASHING',
  'HEAT TREATMENT',
  'SPRING',
  'PACKING',
  'LABOUR',
  'OTHER EXPENSES',
  'SCRAP RECOVERY',
] as const;

// 22 Canonical Document Types requested for Document Type Dropdown
export const CANONICAL_DOCUMENT_TYPES = [
  'INVOICE',
  'TAX INVOICE',
  'BILL OF SUPPLY',
  'PURCHASE ORDER',
  'DELIVERY CHALLAN',
  'GOODS RECEIPT NOTE',
  'MATERIAL RECEIPT NOTE',
  'QUOTATION',
  'PROFORMA INVOICE',
  'CREDIT NOTE',
  'DEBIT NOTE',
  'PAYMENT RECEIPT',
  'MACHINE INVOICE',
  'TOOL INVOICE',
  'SERVICE BILL',
  'EXPENSE BILL',
  'CAPEX DOCUMENT',
  'TEST REPORT',
  'MATERIAL TEST CERTIFICATE',
  'WARRANTY DOCUMENT',
  'TRANSPORT DOCUMENT',
  'OTHER DOCUMENT',
] as const;

export type CanonicalDocumentType = (typeof CANONICAL_DOCUMENT_TYPES)[number];

export function matchCanonicalDocumentType(input?: string | null): CanonicalDocumentType {
  const s = String(input || '').trim().toUpperCase().replace(/[_/\\-]+/g, ' ');
  if (!s) return 'INVOICE';

  // Exact match
  const exact = CANONICAL_DOCUMENT_TYPES.find((t) => t === s);
  if (exact) return exact;

  // Specific priority matches
  if (s.includes('TAX INVOICE')) return 'TAX INVOICE';
  if (s.includes('BILL OF SUPPLY')) return 'BILL OF SUPPLY';
  if (s.includes('PROFORMA')) return 'PROFORMA INVOICE';
  if (s.includes('CREDIT NOTE')) return 'CREDIT NOTE';
  if (s.includes('DEBIT NOTE')) return 'DEBIT NOTE';
  if (s.includes('MATERIAL TEST') || s.includes('MTC')) return 'MATERIAL TEST CERTIFICATE';
  if (s.includes('TEST REPORT') || s.includes('TEST CERTIFICATE')) return 'TEST REPORT';
  if (s.includes('MACHINE')) return 'MACHINE INVOICE';
  if (s.includes('TOOL')) return 'TOOL INVOICE';
  if (s.includes('CAPEX')) return 'CAPEX DOCUMENT';
  if (s.includes('GOODS RECEIPT') || s.includes('GRN')) return 'GOODS RECEIPT NOTE';
  if (s.includes('MATERIAL RECEIPT') || s.includes('MRN')) return 'MATERIAL RECEIPT NOTE';
  if (s.includes('DELIVERY') || s.includes('CHALLAN') || s === 'DC') return 'DELIVERY CHALLAN';
  if (s.includes('PURCHASE ORDER') || s === 'PO') return 'PURCHASE ORDER';
  if (s.includes('QUOTATION') || s.includes('QUOTE')) return 'QUOTATION';
  if (s.includes('PAYMENT RECEIPT') || s.includes('RECEIPT')) return 'PAYMENT RECEIPT';
  if (s.includes('SERVICE')) return 'SERVICE BILL';
  if (s.includes('EXPENSE')) return 'EXPENSE BILL';
  if (s.includes('WARRANTY')) return 'WARRANTY DOCUMENT';
  if (s.includes('TRANSPORT') || s.includes('FREIGHT') || s.includes('LR')) return 'TRANSPORT DOCUMENT';
  if (s.includes('INVOICE') || s.includes('BILL')) return 'INVOICE';

  return 'OTHER DOCUMENT';
}

// Canonical Header Field Definitions (Sections 1-5, all labels in CAPITAL LETTERS)
export interface CanonicalHeaderFieldDef {
  fieldCode: string;
  displayLabel: string; // CAPITAL LETTERS
  section: 'DOCUMENT_IDENTIFICATION' | 'VENDOR' | 'CUSTOMER' | 'PURCHASE_ORDER' | 'TAX_FINANCIAL' | 'DELIVERY_CHALLAN';
  required?: boolean;
}

export const CANONICAL_HEADER_FIELDS: CanonicalHeaderFieldDef[] = [
  // Document Identification
  { fieldCode: 'DOCUMENT_TYPE', displayLabel: 'DOCUMENT TYPE', section: 'DOCUMENT_IDENTIFICATION', required: true },
  { fieldCode: 'DOCUMENT_NUMBER', displayLabel: 'DOCUMENT NUMBER', section: 'DOCUMENT_IDENTIFICATION' },
  { fieldCode: 'INVOICE_NUMBER', displayLabel: 'INVOICE NUMBER', section: 'DOCUMENT_IDENTIFICATION' },
  { fieldCode: 'DOCUMENT_DATE', displayLabel: 'DOCUMENT DATE', section: 'DOCUMENT_IDENTIFICATION', required: true },
  { fieldCode: 'FINANCIAL_YEAR', displayLabel: 'FINANCIAL YEAR', section: 'DOCUMENT_IDENTIFICATION' },
  { fieldCode: 'SOURCE_FILE_NAME', displayLabel: 'SOURCE FILE NAME', section: 'DOCUMENT_IDENTIFICATION' },

  // Vendor / Supplier
  { fieldCode: 'VENDOR_NAME', displayLabel: 'VENDOR NAME', section: 'VENDOR', required: true },
  { fieldCode: 'GSTIN', displayLabel: 'GSTIN', section: 'VENDOR', required: true },
  { fieldCode: 'PAN', displayLabel: 'PAN', section: 'VENDOR' },
  { fieldCode: 'VENDOR_ADDRESS', displayLabel: 'VENDOR ADDRESS', section: 'VENDOR' },
  { fieldCode: 'VENDOR_CITY', displayLabel: 'VENDOR CITY', section: 'VENDOR' },
  { fieldCode: 'VENDOR_STATE', displayLabel: 'VENDOR STATE', section: 'VENDOR' },

  // Customer / Consignee
  { fieldCode: 'CUSTOMER_NAME', displayLabel: 'CUSTOMER NAME', section: 'CUSTOMER' },
  { fieldCode: 'CUSTOMER_GSTIN', displayLabel: 'CUSTOMER GSTIN', section: 'CUSTOMER' },
  { fieldCode: 'BILL_TO_ADDRESS', displayLabel: 'BILL TO ADDRESS', section: 'CUSTOMER' },
  { fieldCode: 'SHIP_TO_ADDRESS', displayLabel: 'SHIP TO ADDRESS', section: 'CUSTOMER' },
  { fieldCode: 'PLACE_OF_SUPPLY', displayLabel: 'PLACE OF SUPPLY', section: 'CUSTOMER' },
  { fieldCode: 'PLACE_OF_DELIVERY', displayLabel: 'PLACE OF DELIVERY', section: 'CUSTOMER' },

  // Purchase / Order References & Logistics
  { fieldCode: 'PO_NUMBER', displayLabel: 'PO NUMBER', section: 'PURCHASE_ORDER' },
  { fieldCode: 'PO_DATE', displayLabel: 'PO DATE', section: 'PURCHASE_ORDER' },
  { fieldCode: 'DC_NUMBER', displayLabel: 'DC NUMBER', section: 'DELIVERY_CHALLAN' },
  { fieldCode: 'DC_DATE', displayLabel: 'DC DATE', section: 'DELIVERY_CHALLAN' },
  { fieldCode: 'VEHICLE_NUMBER', displayLabel: 'VEHICLE NUMBER', section: 'DELIVERY_CHALLAN' },
  { fieldCode: 'TRANSPORTER_NAME', displayLabel: 'TRANSPORTER NAME', section: 'DELIVERY_CHALLAN' },
  { fieldCode: 'LR_NUMBER', displayLabel: 'LR NUMBER', section: 'DELIVERY_CHALLAN' },
  { fieldCode: 'E_WAY_BILL_NUMBER', displayLabel: 'E-WAY BILL NUMBER', section: 'DELIVERY_CHALLAN' },

  // Tax & Financial Fields
  { fieldCode: 'TAXABLE_VALUE', displayLabel: 'TAXABLE VALUE', section: 'TAX_FINANCIAL', required: true },
  { fieldCode: 'CGST_AMOUNT', displayLabel: 'CGST AMOUNT', section: 'TAX_FINANCIAL' },
  { fieldCode: 'SGST_AMOUNT', displayLabel: 'SGST AMOUNT', section: 'TAX_FINANCIAL' },
  { fieldCode: 'IGST_AMOUNT', displayLabel: 'IGST AMOUNT', section: 'TAX_FINANCIAL' },
  { fieldCode: 'TOTAL_TAX_AMOUNT', displayLabel: 'GST TOTAL', section: 'TAX_FINANCIAL' },
  { fieldCode: 'DISCOUNT_AMOUNT', displayLabel: 'DISCOUNT AMOUNT', section: 'TAX_FINANCIAL' },
  { fieldCode: 'FREIGHT_AMOUNT', displayLabel: 'FREIGHT AMOUNT', section: 'TAX_FINANCIAL' },
  { fieldCode: 'PACKING_CHARGES', displayLabel: 'PACKING CHARGES', section: 'TAX_FINANCIAL' },
  { fieldCode: 'ROUND_OFF_AMOUNT', displayLabel: 'ROUND OFF AMOUNT', section: 'TAX_FINANCIAL' },
  { fieldCode: 'TOTAL_INVOICE_AMOUNT', displayLabel: 'TOTAL INVOICE AMOUNT', section: 'TAX_FINANCIAL', required: true },
  { fieldCode: 'AMOUNT_IN_WORDS', displayLabel: 'AMOUNT IN WORDS', section: 'TAX_FINANCIAL' },
  { fieldCode: 'REVERSE_CHARGE_APPLICABLE', displayLabel: 'REVERSE CHARGE APPLICABLE', section: 'TAX_FINANCIAL' },
];

/**
 * Normalizes any category string into the official Category Group and Sub-Category.
 */
export function resolveCanonicalCategory(desc: string, currentCategory?: string): {
  groupName: string;
  subCategory: string;
  destinationModule: string;
  costingHead: string;
  capexOrOpex: 'CAPEX' | 'OPEX';
} {
  const text = `${desc} ${currentCategory || ''}`.toUpperCase();

  // Check exact/partial sub-category matches across groups
  for (const group of MASTER_CATEGORY_GROUPS) {
    for (const cat of group.categories) {
      if (text.includes(cat)) {
        return {
          groupName: group.groupName,
          subCategory: cat,
          destinationModule: group.defaultDestination,
          costingHead: group.defaultCostingHead,
          capexOrOpex: group.defaultAccounting,
        };
      }
    }
  }

  // Heuristic fallbacks based on prominent keywords
  if (/SLOT\s*CUTT|SLITTING\s*MACHINE/i.test(text)) {
    return {
      groupName: 'D. SLITTING MACHINES AND EQUIPMENT',
      subCategory: 'THREE WAY SLOT CUTTER MACHINE',
      destinationModule: 'MACHINES & CAPEX',
      costingHead: 'SLITTING',
      capexOrOpex: 'CAPEX',
    };
  }
  if (/CNC\s*LATHE|TURNING\s*CENTRE|J\s*300/i.test(text)) {
    return {
      groupName: 'B. CNC MACHINES AND CAPITAL EQUIPMENT',
      subCategory: 'CNC LATHE MACHINE',
      destinationModule: 'MACHINES & CAPEX',
      costingHead: 'MACHINES & CAPEX',
      capexOrOpex: 'CAPEX',
    };
  }
  if (/PACKING\s*CHARGE/i.test(text)) {
    return {
      groupName: 'O. PACKING MATERIALS',
      subCategory: 'PACKING CHARGES',
      destinationModule: 'PACKING MATERIALS',
      costingHead: 'PACKING',
      capexOrOpex: 'OPEX',
    };
  }
  if (/TAPPING\s*MACHINE|TAP\s*MACHINE/i.test(text)) {
    return {
      groupName: 'C. TAPPING MACHINES AND EQUIPMENT',
      subCategory: 'TAPPING MACHINE',
      destinationModule: 'MACHINES & CAPEX',
      costingHead: 'TAPPING',
      capexOrOpex: 'CAPEX',
    };
  }
  if (/20MNCR5|ROUND\s*BAR|STEEL\s*BAR/i.test(text)) {
    return {
      groupName: 'A. RAW MATERIAL',
      subCategory: '20MNCR5 RAW MATERIAL',
      destinationModule: 'RAW MATERIAL INVENTORY',
      costingHead: 'RAW MATERIAL',
      capexOrOpex: 'OPEX',
    };
  }
  if (/HEAT\s*TREAT|CASE\s*HARD/i.test(text)) {
    return {
      groupName: 'J. HEAT TREATMENT',
      subCategory: 'HEAT TREATMENT SERVICE',
      destinationModule: 'PURCHASE',
      costingHead: 'HEAT TREATMENT',
      capexOrOpex: 'OPEX',
    };
  }
  if (/INSERT|CARBIDE/i.test(text)) {
    return {
      groupName: 'E. CNC CUTTING TOOLS AND INSERTS',
      subCategory: 'CNC CUTTING INSERT',
      destinationModule: 'CNC TOOLS',
      costingHead: 'CNC TOOLS',
      capexOrOpex: 'OPEX',
    };
  }
  if (/TAP\b|GAUGE/i.test(text)) {
    return {
      groupName: 'F. TAPPING TOOLS AND GAUGES',
      subCategory: 'TAPPING TAP',
      destinationModule: 'TAPPING TOOLS',
      costingHead: 'TAPPING TOOLS',
      capexOrOpex: 'OPEX',
    };
  }
  if (/COOLANT|OIL|GREASE/i.test(text)) {
    return {
      groupName: 'H. COOLANT, OIL, LUBRICATION AND CHEMICALS',
      subCategory: 'CUTTING OIL',
      destinationModule: 'CONSUMABLES',
      costingHead: 'CONSUMABLES',
      capexOrOpex: 'OPEX',
    };
  }

  return {
    groupName: 'U. PROFESSIONAL AND OTHER SERVICES',
    subCategory: 'OTHER OPERATING EXPENSE',
    destinationModule: 'OTHER OPERATING EXPENSE',
    costingHead: 'OTHER EXPENSES',
    capexOrOpex: 'OPEX',
  };
}
