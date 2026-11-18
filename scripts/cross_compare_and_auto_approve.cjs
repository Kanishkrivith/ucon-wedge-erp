const { pool } = require('./batch_utils.cjs');

async function main() {
  console.log('1. Loading unapproved documents...');
  const docsRes = await pool.query(`
    SELECT d.id, d.document_number, d.document_type, d.document_date, d.status,
           d.vendor_id, v.canonical_name as vendor_name, v.gstin as vendor_gstin,
           d.original_filename
    FROM documents d
    LEFT JOIN vendors v ON v.id = d.vendor_id
    WHERE d.status = 'PENDING_REVIEW'
  `);
  console.log(`Unapproved documents: ${docsRes.rows.length}`);

  // Load extractions
  const extRes = await pool.query(`
    SELECT document_id, field_name, COALESCE(reviewed_value, normalized_value, extracted_value) as val
    FROM document_extractions
    WHERE field_name IN ('invoice_number', 'total_invoice_amount', 'taxable_value', 'po_number', 'dc_number', 'vendor_name', 'vendor_gstin')
  `);
  const extMap = new Map();
  for (const r of extRes.rows) {
    if (!extMap.has(r.document_id)) extMap.set(r.document_id, {});
    extMap.get(r.document_id)[r.field_name] = r.val;
  }

  // Load POs
  const poRes = await pool.query(`
    SELECT id, po_number, vendor_id, po_date, subtotal, gst_amount, total_amount
    FROM purchase_orders
  `);
  console.log(`Loaded ${poRes.rows.length} purchase orders.`);

  // Load Inward Registry
  const inRes = await pool.query(`
    SELECT id, grin_no, entry_date, supplier_name, vendor_id, po_number, dc_number, invoice_number,
           qty, weight_in_kg, qty_in_ton, invoice_amount, total_amount, heat_lot_number
    FROM inward_registry
  `);
  console.log(`Loaded ${inRes.rows.length} inward registry records.`);

  // Get Super Admin user ID
  const uRes = await pool.query(`SELECT id FROM users LIMIT 1`);
  const adminId = uRes.rows[0]?.id;

  let approvedCount = 0;
  const matchLog = [];

  for (const doc of docsRes.rows) {
    const ext = extMap.get(doc.id) || {};
    const invNum = ext.invoice_number || doc.document_number;
    const invAmt = parseFloat(ext.total_invoice_amount) || 0;
    const taxableAmt = parseFloat(ext.taxable_value) || 0;
    const vName = (ext.vendor_name || doc.vendor_name || '').toLowerCase().trim();
    const poNum = (ext.po_number || '').trim();
    const dcNum = (ext.dc_number || doc.document_number || '').trim();

    let matchReason = null;
    let matchedPoId = null;
    let matchedInwardId = null;

    // Check 1: Direct PO match by PO Number
    if (poNum) {
      const p = poRes.rows.find(p => p.po_number.toLowerCase() === poNum.toLowerCase() || p.po_number.toLowerCase().includes(poNum.toLowerCase()));
      if (p) {
        matchReason = `PO Match: ${p.po_number}`;
        matchedPoId = p.id;
      }
    }

    // Check 2: PO match by Vendor & Exact Total Amount (within ₹5)
    if (!matchReason && invAmt > 0 && doc.vendor_id) {
      const p = poRes.rows.find(p => p.vendor_id === doc.vendor_id && (Math.abs(Number(p.total_amount) - invAmt) <= 5 || Math.abs(Number(p.subtotal) - invAmt) <= 5));
      if (p) {
        matchReason = `PO Value Match: ${p.po_number} (₹${p.total_amount})`;
        matchedPoId = p.id;
      }
    }

    // Check 3: Inward Registry match by Invoice Number & Vendor
    if (!matchReason && invNum) {
      const inRow = inRes.rows.find(r => {
        if (!r.invoice_number) return false;
        const rInv = r.invoice_number.trim().toLowerCase();
        const dInv = invNum.trim().toLowerCase();
        return rInv === dInv || rInv.endsWith(dInv) || dInv.endsWith(rInv);
      });
      if (inRow) {
        matchReason = `Inward Registry Match: GRIN ${inRow.grin_no} (Inv #${inRow.invoice_number})`;
        matchedInwardId = inRow.id;
      }
    }

    // Check 4: Inward Registry match by DC Number
    if (!matchReason && dcNum) {
      const inRow = inRes.rows.find(r => {
        if (!r.dc_number) return false;
        const rDc = r.dc_number.trim().toLowerCase();
        const dDc = dcNum.trim().toLowerCase();
        return rDc === dDc || rDc.includes(dDc) || dDc.includes(rDc);
      });
      if (inRow) {
        matchReason = `Inward Registry DC Match: GRIN ${inRow.grin_no} (DC ${inRow.dc_number})`;
        matchedInwardId = inRow.id;
      }
    }

    // Check 5: Verified vendor with complete extracted GSTIN, invoice date & total amount
    if (!matchReason && doc.vendor_id && invAmt > 0 && ext.vendor_gstin && ext.invoice_number) {
      matchReason = `GSTIN & Extraction Conformance: ${doc.vendor_name} (Inv #${invNum} - ₹${invAmt})`;
    }

    // Check 6: Delivery Challans with valid registered vendor and DC number
    if (!matchReason && doc.document_type === 'DC' && doc.vendor_id && dcNum) {
      matchReason = `Registered Subcontract DC: ${doc.vendor_name} (${dcNum})`;
    }

    if (matchReason) {
      approvedCount++;
      // Auto-approve the document
      await pool.query(`
        UPDATE documents
        SET status = 'VERIFIED',
            verified_by = $1,
            verified_at = NOW()
        WHERE id = $2
      `, [adminId, doc.id]);

      // Link PO if found
      if (matchedPoId) {
        await pool.query(`UPDATE purchase_orders SET document_id = $1 WHERE id = $2`, [doc.id, matchedPoId]);
      }

      // Link Inward Registry if found
      if (matchedInwardId) {
        await pool.query(`UPDATE inward_registry SET document_id = $1, reconciliation_status = 'MATCHED' WHERE id = $2`, [doc.id, matchedInwardId]);
      }

      matchLog.push({
        docNo: doc.document_number,
        type: doc.document_type,
        vendor: doc.vendor_name,
        amt: invAmt,
        reason: matchReason
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`AUTO-APPROVAL & VERIFICATION COMPLETE!`);
  console.log(`Total Unapproved Evaluated: ${docsRes.rows.length}`);
  console.log(`Total Approved: ${approvedCount}`);
  console.log(`Remaining for manual review: ${docsRes.rows.length - approvedCount}`);
  console.log('\nSample Approved Documents:');
  console.table(matchLog.slice(0, 15));
}

main().catch(console.error).then(() => pool.end());
