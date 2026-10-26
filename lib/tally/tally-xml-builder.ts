/**
 * Tally Prime XML Generator for Ucon Wedge ERP
 * Generates standards-compliant XML for:
 * 1. Masters (Vendor Ledgers under Sundry Creditors with GSTIN, PAN, Address, State)
 * 2. Purchase Vouchers (Raw Steel 20MnCr5, Cutting Charges, CNC Job Work)
 * 3. Debit Notes (Automatic penalties for CNC vendor under-yield <= 17 pcs/rod)
 * 4. Sales Vouchers (Finished Wedge dispatches)
 */

export interface TallyVendorLedger {
  name: string;
  category: string;
  parent?: string; // Default: 'Sundry Creditors'
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  pincode?: string | null;
  state?: string;
  email?: string | null;
  phone?: string | null;
}

export interface TallyVoucherLine {
  ledgerName: string;
  isDebit: boolean;
  amount: number;
}

export interface TallyVoucher {
  voucherType: 'Purchase' | 'Debit Note' | 'Sales' | 'Payment';
  voucherNumber: string;
  date: string; // YYYYMMDD
  reference?: string;
  partyLedger: string;
  narration: string;
  lines: TallyVoucherLine[];
}

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Tally Prime Master XML for Vendor Ledgers
 */
export function buildTallyMastersXml(
  companyName: string = 'UCON WEDGE MANUFACTURING UNIT',
  vendors: TallyVendorLedger[]
): string {
  const ledgerBlocks = vendors.map((v) => {
    const parentGroup = v.parent || (v.category.includes('CUSTOMER') ? 'Sundry Debtors' : 'Sundry Creditors');
    const stateName = v.state || 'Tamil Nadu';
    const isRegular = v.gstin && v.gstin.length === 15 ? 'Regular' : 'Unregistered';

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(v.name)}" ACTION="Create">
            <NAME.LIST>
              <NAME>${escapeXml(v.name)}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(parentGroup)}</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <ISMAILINGNAMEREQ>Yes</ISMAILINGNAMEREQ>
            <MAILINGNAME.LIST>
              <MAILINGNAME>${escapeXml(v.name)}</MAILINGNAME>
            </MAILINGNAME.LIST>
            <STATENAME>${escapeXml(stateName)}</STATENAME>
            <COUNTRYNAME>India</COUNTRYNAME>
            ${v.pincode ? `<PINCODE>${escapeXml(v.pincode)}</PINCODE>` : ''}
            ${v.pan ? `<PANNUM>${escapeXml(v.pan)}</PANNUM>` : ''}
            ${v.gstin ? `<PARTYGSTIN>${escapeXml(v.gstin)}</PARTYGSTIN>` : ''}
            <GSTREGISTRATIONTYPE>${isRegular}</GSTREGISTRATIONTYPE>
            ${
              v.address
                ? `<ADDRESS.LIST>
              <ADDRESS>${escapeXml(v.address)}</ADDRESS>
            </ADDRESS.LIST>`
                : ''
            }
            ${v.email ? `<EMAIL>${escapeXml(v.email)}</EMAIL>` : ''}
            ${v.phone ? `<LEDGERPHONE>${escapeXml(v.phone)}</LEDGERPHONE>` : ''}
          </LEDGER>
        </TALLYMESSAGE>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${ledgerBlocks}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generate Tally Prime Vouchers XML (Purchase Bills & Debit Notes)
 */
export function buildTallyVouchersXml(
  companyName: string = 'UCON WEDGE MANUFACTURING UNIT',
  vouchers: TallyVoucher[]
): string {
  const voucherBlocks = vouchers.map((vch) => {
    const linesXml = vch.lines
      .map((line) => {
        // In Tally:
        // ISDEEMEDPOSITIVE = Yes -> Debit (Negative amount value in XML)
        // ISDEEMEDPOSITIVE = No  -> Credit (Positive amount value in XML)
        const deemedPositive = line.isDebit ? 'Yes' : 'No';
        const formattedAmt = line.isDebit ? `-${Math.abs(line.amount).toFixed(2)}` : `${Math.abs(line.amount).toFixed(2)}`;

        return `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(line.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${deemedPositive}</ISDEEMEDPOSITIVE>
              <AMOUNT>${formattedAmt}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
      })
      .join('\n');

    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${escapeXml(vch.voucherType)}" ACTION="Create">
            <DATE>${escapeXml(vch.date)}</DATE>
            <VOUCHERTYPENAME>${escapeXml(vch.voucherType)}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(vch.voucherNumber)}</VOUCHERNUMBER>
            ${vch.reference ? `<REFERENCE>${escapeXml(vch.reference)}</REFERENCE>` : ''}
            <PARTYLEDGERNAME>${escapeXml(vch.partyLedger)}</PARTYLEDGERNAME>
            <NARRATION>${escapeXml(vch.narration)}</NARRATION>
            <EFFECTIVEDATE>${escapeXml(vch.date)}</EFFECTIVEDATE>
            <ISINVOICE>No</ISINVOICE>
${linesXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${voucherBlocks}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
