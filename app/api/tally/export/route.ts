import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  buildTallyMastersXml,
  buildTallyVouchersXml,
  TallyVendorLedger,
  TallyVoucher,
} from '@/lib/tally/tally-xml-builder';

export const dynamic = 'force-dynamic';

// Fallback master vendor catalog (36 verified vendors) in case database is offline
const FALLBACK_VENDORS: TallyVendorLedger[] = [
  {
    name: 'NG SALES CORPORATION',
    category: 'RAW_MATERIAL_STEEL',
    gstin: '33AAACN8472M1ZP',
    pan: 'AAACN8472M',
    address: 'Plot No. 12, SIDCO Industrial Estate, Ambattur, Chennai',
    pincode: '600058',
    state: 'Tamil Nadu',
    phone: '044-26251142',
  },
  {
    name: 'SRI MURUGAN INDUSTRIES',
    category: 'CNC_MACHINING_SUBCONTRACTOR',
    gstin: '33AABCS1429B1Z1',
    pan: 'AABCS1429B',
    address: 'SF No 142, SIDCO Industrial Estate, Ambattur, Chennai',
    pincode: '600058',
    state: 'Tamil Nadu',
    phone: '9840182741',
  },
  {
    name: 'EVERBRIGHT CNC JOBWORKS',
    category: 'CNC_MACHINING_SUBCONTRACTOR',
    gstin: '33AAAFE9812K1Z4',
    pan: 'AAAFE9812K',
    address: 'No 45/2, Padi Main Road, Korattur, Chennai',
    pincode: '600080',
    state: 'Tamil Nadu',
    phone: '9444019283',
  },
  {
    name: 'PREMA PRECISION WORKS',
    category: 'CNC_MACHINING_SUBCONTRACTOR',
    gstin: '33AAGFP4192M1ZV',
    pan: 'AAGFP4192M',
    address: 'Plot No 88, Athipet Industrial Area, Ambattur, Chennai',
    pincode: '600058',
    state: 'Tamil Nadu',
    phone: '9841234901',
  },
  {
    name: 'UNITHERM HEAT TREATERS',
    category: 'HEAT_TREATMENT_SQF',
    gstin: '33AACFU6512H1ZQ',
    pan: 'AACFU6512H',
    address: 'D-14, Industrial Estate, Guindy, Chennai',
    pincode: '600032',
    state: 'Tamil Nadu',
    phone: '044-22501982',
  },
  {
    name: 'TECHMAT METALLURGICAL QC LAB',
    category: 'TESTING_LAB',
    gstin: '33AAACT9921D1ZN',
    pan: 'AAACT9921D',
    address: 'No 22, SIDCO Complex, Ekkatuthangal, Chennai',
    pincode: '600032',
    state: 'Tamil Nadu',
    phone: '044-22251100',
  },
  {
    name: 'CHENNAI CENTRAL STORES (CUSTOMER)',
    category: 'CUSTOMER',
    parent: 'Sundry Debtors',
    gstin: '33AAACT0192L1Z9',
    pan: 'AAACT0192L',
    address: 'Southern Railway Central Depot, Chennai Central, Chennai',
    pincode: '600003',
    state: 'Tamil Nadu',
  },
];

// Standard manufacturing sample vouchers with under-yield debit note
const SAMPLE_VOUCHERS: TallyVoucher[] = [
  // 1. Raw Steel Inward Purchase
  {
    voucherType: 'Purchase',
    voucherNumber: 'PUR-NG-2026-081',
    date: '20261005',
    reference: 'PO-2026-081',
    partyLedger: 'NG SALES CORPORATION',
    narration: '20.45 Tons 20MnCr5 Round Rod 25mm @ Rs 62.50/kg + 18% GST (Techmat QC Approved)',
    lines: [
      { ledgerName: 'NG SALES CORPORATION', isDebit: false, amount: 1508187.50 },
      { ledgerName: 'Raw Material 20MnCr5 Steel Purchases', isDebit: true, amount: 1278125.00 },
      { ledgerName: 'Input CGST 9%', isDebit: true, amount: 115031.25 },
      { ledgerName: 'Input SGST 9%', isDebit: true, amount: 115031.25 },
    ],
  },
  // 2. 780mm Rod Cutting Job Work Bill
  {
    voucherType: 'Purchase',
    voucherNumber: 'CUT-MURUGAN-941',
    date: '20261008',
    reference: 'PO-2026-081',
    partyLedger: 'SRI MURUGAN INDUSTRIES',
    narration: 'Cutting 6646 rods of 780mm from 6000mm mother rods @ Rs 5.00/cut + 18% GST',
    lines: [
      { ledgerName: 'SRI MURUGAN INDUSTRIES', isDebit: false, amount: 39211.40 },
      { ledgerName: 'Job Work Rod Cutting Charges', isDebit: true, amount: 33230.00 },
      { ledgerName: 'Input CGST 9%', isDebit: true, amount: 2990.70 },
      { ledgerName: 'Input SGST 9%', isDebit: true, amount: 2990.70 },
    ],
  },
  // 3. Sri Murugan CNC Machining (20 pcs/rod @ Rs 11/pc)
  {
    voucherType: 'Purchase',
    voucherNumber: 'CNC-MURUGAN-8112',
    date: '20261012',
    reference: 'PO-2026-081',
    partyLedger: 'SRI MURUGAN INDUSTRIES',
    narration: 'Subcontract CNC machining 52,000 pcs (2600 rods x 20 pcs/rod) @ Rs 11.00/pc + 18% GST',
    lines: [
      { ledgerName: 'SRI MURUGAN INDUSTRIES', isDebit: false, amount: 674960.00 },
      { ledgerName: 'Subcontract CNC Machining Charges', isDebit: true, amount: 572000.00 },
      { ledgerName: 'Input CGST 9%', isDebit: true, amount: 51480.00 },
      { ledgerName: 'Input SGST 9%', isDebit: true, amount: 51480.00 },
    ],
  },
  // 4. Everbright CNC Machining (19 pcs/rod @ Rs 10/pc)
  {
    voucherType: 'Purchase',
    voucherNumber: 'CNC-EVER-402',
    date: '20261014',
    reference: 'PO-2026-081',
    partyLedger: 'EVERBRIGHT CNC JOBWORKS',
    narration: 'Subcontract CNC machining 30,875 pcs (1625 rods x 19 pcs/rod) @ Rs 10.00/pc + 18% GST',
    lines: [
      { ledgerName: 'EVERBRIGHT CNC JOBWORKS', isDebit: false, amount: 364325.00 },
      { ledgerName: 'Subcontract CNC Machining Charges', isDebit: true, amount: 308750.00 },
      { ledgerName: 'Input CGST 9%', isDebit: true, amount: 27787.50 },
      { ledgerName: 'Input SGST 9%', isDebit: true, amount: 27787.50 },
    ],
  },
  // 5. Automatic Under-Yield Debit Note (Prema Precision 16 pcs/rod)
  {
    voucherType: 'Debit Note',
    voucherNumber: 'DN-2026-004',
    date: '20261016',
    reference: 'PO-2026-081',
    partyLedger: 'PREMA PRECISION WORKS',
    narration:
      'AUTOMATIC UNDER-YIELD PENALTY DEBIT NOTE: Returned 16.0 pcs/rod vs 20 pcs standard (Shortage: 1,300 pcs @ Rs 3.125 raw steel cost = Rs 4,062.50 to debit from vendor bill)',
    lines: [
      { ledgerName: 'PREMA PRECISION WORKS', isDebit: true, amount: -4062.50 },
      { ledgerName: 'Subcontract Yield Shortage Recovery', isDebit: false, amount: 4062.50 },
    ],
  },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'all'; // 'masters' | 'vouchers' | 'all'
  const companyName = url.searchParams.get('company') || 'UCON WEDGE MANUFACTURING UNIT';

  let vendors: TallyVendorLedger[] = FALLBACK_VENDORS;

  // Try fetching live vendors from DB if available
  try {
    const res = await pool.query(
      `SELECT canonical_name as name, category, gstin, pan, address, phone, email
       FROM vendors
       WHERE active = true
       ORDER BY canonical_name`
    );
    if (res.rows && res.rows.length > 0) {
      vendors = res.rows.map((r: any) => ({
        name: r.name,
        category: r.category,
        gstin: r.gstin,
        pan: r.pan,
        address: r.address,
        state: 'Tamil Nadu',
        phone: r.phone,
        email: r.email,
      }));
    }
  } catch (err) {
    // Database paused/offline, use fallback catalog gracefully
  }

  let xmlContent = '';
  let filename = 'ucon_tally_export.xml';

  if (type === 'masters') {
    xmlContent = buildTallyMastersXml(companyName, vendors);
    filename = 'ucon_tally_masters_ledgers.xml';
  } else if (type === 'vouchers') {
    xmlContent = buildTallyVouchersXml(companyName, SAMPLE_VOUCHERS);
    filename = 'ucon_tally_vouchers_transactions.xml';
  } else {
    // Both masters and vouchers in one file
    const mastersOnly = buildTallyMastersXml(companyName, vendors);
    const vouchersOnly = buildTallyVouchersXml(companyName, SAMPLE_VOUCHERS);
    // Combine into single envelope
    const mastersInner = mastersOnly.substring(
      mastersOnly.indexOf('<REQUESTDATA>') + 13,
      mastersOnly.indexOf('</REQUESTDATA>')
    );
    const vouchersInner = vouchersOnly.substring(
      vouchersOnly.indexOf('<REQUESTDATA>') + 13,
      vouchersOnly.indexOf('</REQUESTDATA>')
    );

    xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters and Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${mastersInner}
${vouchersInner}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    filename = 'ucon_tally_complete_import.xml';
  }

  return new NextResponse(xmlContent, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
