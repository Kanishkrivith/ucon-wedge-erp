import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { CANONICAL_HEADER_FIELDS, CanonicalHeaderFieldDef } from '@/lib/ai/canonical-library';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // 1. Fetch document header, extractions, and line items
    const [docRes, fieldsRes, linesRes] = await Promise.all([
      pool.query(
        `SELECT d.*, v.canonical_name AS vendor_name, v.gstin AS vendor_gstin
         FROM documents d
         LEFT JOIN vendors v ON v.id = d.vendor_id
         WHERE d.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT * FROM document_extractions WHERE document_id = $1 ORDER BY page_no NULLS FIRST, field_name`,
        [id]
      ),
      pool.query(
        `SELECT * FROM document_line_items WHERE document_id = $1 ORDER BY line_no`,
        [id]
      ),
    ]);

    const doc = docRes.rows[0];
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Build field lookup map
    const fieldMap = new Map<string, any>();
    for (const f of fieldsRes.rows) {
      fieldMap.set(f.field_name?.toLowerCase(), f);
    }

    // 2. Prepare Sheet 1: EXTRACTED CANONICAL FIELDS
    const canonicalRows = CANONICAL_HEADER_FIELDS.map((def: CanonicalHeaderFieldDef, idx: number) => {
      const found = fieldMap.get(def.fieldCode.toLowerCase());
      const rawVal = found?.reviewed_value || found?.normalized_value || found?.extracted_value;
      const hasVal = rawVal && rawVal !== 'NOT AVAILABLE' && rawVal !== 'null' && String(rawVal).trim() !== '';
      const displayVal = hasVal ? String(rawVal).trim() : (def.required ? 'NEEDS REVIEW' : 'NOT AVAILABLE');

      let conf = found?.confidence ? Math.round(Number(found.confidence) * 100) : (hasVal ? 95 : 0);
      let status = found?.confidence_status || (hasVal ? 'HIGH' : 'LOW');

      return {
        'SL NO': idx + 1,
        'CANONICAL FIELD LABEL': def.displayLabel,
        'FIELD CODE': def.fieldCode,
        'SECTION': def.section,
        'EXTRACTED / REVIEWED VALUE': displayVal,
        'REQUIRED': def.required ? 'YES' : 'NO',
        'CONFIDENCE (%)': conf,
        'STATUS': status,
      };
    });

    // 3. Prepare Sheet 2: LINE-LEVEL CLASSIFICATION & ROUTING TABLE
    const lineRows = linesRes.rows.map((l: any, idx: number) => {
      const qty = Number(l.reviewed_quantity ?? l.quantity ?? 0);
      const rate = Number(l.reviewed_unit_rate ?? l.unit_rate ?? 0);
      const discount = Number(l.reviewed_discount ?? l.discount ?? 0);
      const taxable = Number(l.reviewed_taxable_amount ?? l.taxable_amount ?? (qty * rate - discount));
      const taxRate = Number(l.reviewed_tax_rate ?? l.tax_rate ?? 0);
      const cgst = Number(l.reviewed_cgst_amount ?? l.cgst_amount ?? 0);
      const sgst = Number(l.reviewed_sgst_amount ?? l.sgst_amount ?? 0);
      const igst = Number(l.reviewed_igst_amount ?? l.igst_amount ?? 0);
      const totalTax = Number(l.reviewed_tax_amount ?? l.tax_amount ?? (cgst + sgst + igst));
      const total = Number(l.reviewed_total_amount ?? l.total_amount ?? (taxable + totalTax));

      return {
        'LINE NO': l.line_no || (idx + 1),
        'DESCRIPTION': l.reviewed_description || l.description || '',
        'PART NUMBER': l.reviewed_part_number || l.part_number || '',
        'HSN / SAC CODE': l.reviewed_hsn_code || l.hsn_code || '',
        'QUANTITY': qty,
        'UNIT': l.reviewed_unit || l.unit || 'NOS',
        'UNIT RATE (₹)': rate,
        'DISCOUNT (₹)': discount,
        'TAXABLE AMOUNT (₹)': taxable,
        'TAX RATE (%)': taxRate,
        'CGST (₹)': cgst,
        'SGST (₹)': sgst,
        'IGST (₹)': igst,
        'GST TOTAL (₹)': totalTax,
        'TOTAL AMOUNT (₹)': total,
        'CATEGORY GROUP (A-V)': l.reviewed_category_code || l.category_code || '',
        'SUB CATEGORY': l.reviewed_sub_category || l.sub_category || '',
        'ERP DESTINATION MODULE': l.reviewed_destination_module || l.destination_module || '',
        'CAPEX OR OPEX': l.reviewed_capex_or_opex || l.capex_or_opex || 'OPEX',
        'COSTING HEAD': l.reviewed_costing_head || l.costing_head || '',
        'CONFIDENCE (%)': Math.round(Number(l.confidence || 0.95) * 100),
        'REVIEW STATUS': l.review_status || 'PENDING REVIEW',
      };
    });

    // 4. Create Workbook with 2 Sheets
    const wb = XLSX.utils.book_new();

    const wsFields = XLSX.utils.json_to_sheet(canonicalRows);
    XLSX.utils.book_append_sheet(wb, wsFields, 'EXTRACTED CANONICAL FIELDS');

    const wsLines = XLSX.utils.json_to_sheet(
      lineRows.length > 0
        ? lineRows
        : [
            {
              'LINE NO': 1,
              'DESCRIPTION': 'No line items extracted yet',
              'PART NUMBER': '',
              'HSN / SAC CODE': '',
              'QUANTITY': 0,
              'UNIT': '',
              'UNIT RATE (₹)': 0,
              'DISCOUNT (₹)': 0,
              'TAXABLE AMOUNT (₹)': 0,
              'TAX RATE (%)': 0,
              'CGST (₹)': 0,
              'SGST (₹)': 0,
              'IGST (₹)': 0,
              'GST TOTAL (₹)': 0,
              'TOTAL AMOUNT (₹)': 0,
              'CATEGORY GROUP (A-V)': '',
              'SUB CATEGORY': '',
              'ERP DESTINATION MODULE': '',
              'CAPEX OR OPEX': '',
              'COSTING HEAD': '',
              'CONFIDENCE (%)': 0,
              'REVIEW STATUS': 'NOT AVAILABLE',
            },
          ]
    );
    XLSX.utils.book_append_sheet(wb, wsLines, 'LINE CLASSIFICATION & ROUTING');

    const cleanName = (doc.original_filename || 'document')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_');
    const filename = `${cleanName}_CANONICAL_AND_ROUTING.xlsx`;

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Document Excel export error:', error);
    return NextResponse.json({ error: error.message || 'Failed to export Excel' }, { status: 500 });
  }
}
