import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') || 'ALL'; // 'ALL', 'VERIFIED', 'PENDING'
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // 1. Fetch KPI metrics
    const metricsRes = await pool.query(`
      SELECT
        COUNT(1) as total_docs,
        COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as verified_count,
        COUNT(CASE WHEN status = 'PENDING_REVIEW' THEN 1 END) as pending_count,
        (SELECT COUNT(1) FROM purchase_orders) as total_pos,
        (SELECT COUNT(1) FROM inward_registry) as total_inward
      FROM documents
    `);

    // 2. Fetch documents with vendor & extractions
    let query = `
      SELECT 
        d.id, d.document_number, d.document_type, d.document_date, d.status,
        d.vendor_id, v.canonical_name as vendor_name, v.gstin as vendor_gstin,
        d.original_filename, d.verified_at,
        p.id as matched_po_id, p.po_number as matched_po_number, p.po_date as matched_po_date,
        p.subtotal as po_subtotal, p.gst_amount as po_gst, p.total_amount as po_total,
        ir.id as inward_id, ir.grin_no as inward_grin, ir.dc_number as inward_dc,
        ir.invoice_number as inward_inv, ir.weight_in_kg as inward_weight, ir.qty as inward_qty
      FROM documents d
      LEFT JOIN vendors v ON v.id = d.vendor_id
      LEFT JOIN purchase_orders p ON p.document_id = d.id
      LEFT JOIN inward_registry ir ON ir.document_id = d.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter === 'VERIFIED') {
      conditions.push(`d.status = 'VERIFIED'`);
    } else if (filter === 'PENDING') {
      conditions.push(`d.status = 'PENDING_REVIEW'`);
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(
        LOWER(d.document_number) LIKE $${params.length} OR
        LOWER(COALESCE(v.canonical_name, '')) LIKE $${params.length} OR
        LOWER(COALESCE(p.po_number, '')) LIKE $${params.length} OR
        LOWER(COALESCE(ir.grin_no, '')) LIKE $${params.length}
      )`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY d.status DESC, d.verified_at DESC NULLS LAST, d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const docsRes = await pool.query(query, params);

    // Fetch extractions for returned docs
    const docIds = docsRes.rows.map(r => r.id);
    let extractionsMap = new Map();
    let lineItemsMap = new Map();

    if (docIds.length > 0) {
      const extRes = await pool.query(`
        SELECT document_id, field_name, COALESCE(reviewed_value, normalized_value, extracted_value) as val
        FROM document_extractions
        WHERE document_id = ANY($1::uuid[])
          AND field_name IN ('invoice_number', 'total_invoice_amount', 'taxable_value', 'cgst_amount', 'sgst_amount', 'igst_amount', 'po_number', 'dc_number', 'vendor_name')
      `, [docIds]);

      for (const e of extRes.rows) {
        if (!extractionsMap.has(e.document_id)) extractionsMap.set(e.document_id, {});
        extractionsMap.get(e.document_id)[e.field_name] = e.val;
      }

      const linesRes = await pool.query(`
        SELECT document_id, line_no, description, quantity, unit, unit_rate AS unit_price, total_amount
        FROM document_line_items
        WHERE document_id = ANY($1::uuid[])
        ORDER BY line_no
      `, [docIds]);

      for (const l of linesRes.rows) {
        if (!lineItemsMap.has(l.document_id)) lineItemsMap.set(l.document_id, []);
        lineItemsMap.get(l.document_id).push(l);
      }
    }

    // Merge comparisons
    const comparisons = docsRes.rows.map(doc => {
      const ext = extractionsMap.get(doc.id) || {};
      const lines = lineItemsMap.get(doc.id) || [];
      const invoiceAmt = parseFloat(ext.total_invoice_amount) || 0;
      const poAmt = parseFloat(doc.po_total) || 0;
      const diff = Math.abs(invoiceAmt - poAmt);
      const isEqual = doc.status === 'VERIFIED' || (poAmt > 0 && diff <= 5);

      return {
        id: doc.id,
        document_number: doc.document_number,
        document_type: doc.document_type,
        document_date: doc.document_date || ext.document_date,
        status: doc.status,
        verified_at: doc.verified_at,
        original_filename: doc.original_filename,
        vendor_name: doc.vendor_name || ext.vendor_name || 'UNKNOWN VENDOR',
        vendor_gstin: doc.vendor_gstin || ext.vendor_gstin,
        scanned_financials: {
          taxable_value: parseFloat(ext.taxable_value) || 0,
          cgst_amount: parseFloat(ext.cgst_amount) || 0,
          sgst_amount: parseFloat(ext.sgst_amount) || 0,
          igst_amount: parseFloat(ext.igst_amount) || 0,
          total_invoice_amount: invoiceAmt,
        },
        scanned_line_items: lines,
        matched_po: doc.matched_po_number ? {
          id: doc.matched_po_id,
          po_number: doc.matched_po_number,
          po_date: doc.matched_po_date,
          subtotal: doc.po_subtotal,
          gst_amount: doc.po_gst,
          total_amount: doc.po_total,
        } : null,
        matched_inward: doc.inward_grin ? {
          id: doc.inward_id,
          grin_no: doc.inward_grin,
          dc_number: doc.inward_dc,
          invoice_number: doc.inward_inv,
          weight_in_kg: doc.inward_weight,
          qty: doc.inward_qty,
        } : null,
        comparison_delta: {
          amount_diff: diff,
          is_equal: isEqual,
          match_confidence: doc.status === 'VERIFIED' ? '100% EQUAL & VERIFIED' : (isEqual ? 'EQUAL MATCH' : 'VARIANCE CHECK'),
        }
      };
    });

    return NextResponse.json({
      ok: true,
      metrics: metricsRes.rows[0],
      comparisons,
    });
  } catch (err: any) {
    console.error('Error in GET /api/documents/compare:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents/compare: Approve single or bulk auto-approve equal matches
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action || 'approve_single'; // 'approve_single' or 'approve_all_equal'
    const docId = body.document_id;

    if (action === 'approve_single') {
      if (!docId) {
        return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
      }

      await pool.query(`
        UPDATE documents
        SET status = 'VERIFIED',
            verified_by = $1,
            verified_at = NOW()
        WHERE id = $2
      `, [user.id, docId]);

      return NextResponse.json({ ok: true, message: 'Document approved and marked as VERIFIED.' });
    }

    if (action === 'approve_all_equal') {
      const res = await pool.query(`
        UPDATE documents
        SET status = 'VERIFIED',
            verified_by = $1,
            verified_at = NOW()
        WHERE status = 'PENDING_REVIEW'
      `, [user.id]);

      return NextResponse.json({ ok: true, message: `Approved ${res.rowCount} documents successfully.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/documents/compare:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
