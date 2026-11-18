const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { pool } = require('./batch_utils.cjs');

const poDir = 'D:/Ucon Wedge Unit/all scan/purchase and work order';

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  const dotParts = s.split('.');
  if (dotParts.length === 3) {
    let day = parseInt(dotParts[0], 10);
    let month = parseInt(dotParts[1], 10);
    let year = parseInt(dotParts[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    let day = parseInt(slashParts[0], 10);
    let month = parseInt(slashParts[1], 10);
    let year = parseInt(slashParts[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

async function main() {
  console.log('1. Loading existing vendors...');
  const vRes = await pool.query(`SELECT id, canonical_name, gstin FROM vendors`);
  const vendorMap = new Map();
  for (const v of vRes.rows) {
    vendorMap.set(v.canonical_name.toLowerCase().trim(), v.id);
  }

  async function getOrCreateVendorId(name) {
    if (!name || !name.trim()) name = 'GENERAL VENDOR';
    const cleanName = name.trim();
    const n = cleanName.toLowerCase();
    for (const [key, id] of vendorMap.entries()) {
      if (n.includes(key) || key.includes(n)) return id;
    }
    if (n.includes('murugan')) {
      for (const [key, id] of vendorMap.entries()) {
        if (key.includes('murugan')) return id;
      }
    }
    if (n.includes('everbright')) {
      for (const [key, id] of vendorMap.entries()) {
        if (key.includes('everbright')) return id;
      }
    }
    if (n.includes('techmat') || n.includes('tacmat')) {
      for (const [key, id] of vendorMap.entries()) {
        if (key.includes('techmat')) return id;
      }
    }
    if (n.includes('micro tech') || n.includes('microtech')) {
      for (const [key, id] of vendorMap.entries()) {
        if (key.includes('micro tech') || key.includes('microtech')) return id;
      }
    }

    // Auto-create new vendor if not found
    console.log(`Auto-creating new vendor in vendors table: ${cleanName}`);
    const cat = cleanName.toLowerCase().includes('steel') ? 'RAW_MATERIAL' : 'SUBCONTRACT';
    const ins = await pool.query(`
      INSERT INTO vendors (canonical_name, category, active)
      VALUES ($1, $2, true)
      RETURNING id
    `, [cleanName.toUpperCase(), cat]);
    const newId = ins.rows[0].id;
    vendorMap.set(n, newId);
    return newId;
  }

  const uRes = await pool.query(`SELECT id FROM users LIMIT 1`);
  const adminUserId = uRes.rows[0]?.id || null;

  console.log('2. Clearing existing purchase orders...');
  await pool.query(`DELETE FROM purchase_order_items`);
  await pool.query(`DELETE FROM purchase_orders`);

  let poCount = 0;
  let itemCount = 0;

  // 3. Ingest CNC Purchase (1).xlsx
  console.log('3. Ingesting CNC Purchase (1).xlsx...');
  const cncFile = path.join(poDir, 'CNC Purchase (1).xlsx');
  if (fs.existsSync(cncFile)) {
    const wb = XLSX.readFile(cncFile);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1 });
    const ordersMap = new Map();
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[10]) continue;
      const orderNo = String(r[10]).trim();
      if (!ordersMap.has(orderNo)) {
        ordersMap.set(orderNo, {
          orderNo,
          vendorName: String(r[2] || '').trim(),
          orderDate: parseDate(r[11]),
          items: [],
          subtotal: 0,
          gstAmount: 0,
          totalAmount: 0,
          status: 'VERIFIED'
        });
      }
      const ord = ordersMap.get(orderNo);
      const qty = parseFloat(r[13]) || 0;
      const rate = parseFloat(r[14]) || 0;
      const amt = parseFloat(r[17]) || (qty * rate);
      const tax = parseFloat(r[22]) || 0;
      const net = parseFloat(r[26]) || (amt + tax);

      ord.items.push({
        itemCode: r[5],
        itemName: String(r[6] || '').trim(),
        spec: String(r[8] || '').trim(),
        uom: String(r[12] || 'Nos').trim(),
        qty,
        rate,
        tax,
        lineTotal: net
      });
      ord.subtotal += amt;
      ord.gstAmount += tax;
      ord.totalAmount += net;
    }

    for (const [orderNo, ord] of ordersMap.entries()) {
      const vId = await getOrCreateVendorId(ord.vendorName);
      const insertRes = await pool.query(`
        INSERT INTO purchase_orders (
          po_number, vendor_id, po_date, currency,
          subtotal, gst_amount, total_amount, status, created_by
        ) VALUES (
          $1, $2, $3, 'INR',
          $4, $5, $6, 'VERIFIED', $7
        ) RETURNING id
      `, [
        orderNo,
        vId,
        ord.orderDate || new Date().toISOString().split('T')[0],
        ord.subtotal,
        ord.gstAmount,
        ord.totalAmount,
        adminUserId
      ]);

      const poId = insertRes.rows[0].id;
      poCount++;

      for (const it of ord.items) {
        const desc = it.spec ? `${it.itemName} (${it.spec})` : it.itemName;
        await pool.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, description, quantity, unit,
            unit_rate, gst_rate, line_total
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7
          )
        `, [
          poId,
          desc || 'Industrial Component',
          it.qty,
          it.uom || 'Nos',
          it.rate,
          it.tax > 0 && it.qty * it.rate > 0 ? Math.round((it.tax / (it.qty * it.rate)) * 100) : 18,
          it.lineTotal
        ]);
        itemCount++;
      }
    }
    console.log(`Ingested ${ordersMap.size} purchase orders from CNC Purchase (1).xlsx.`);
  }

  // 4. Ingest 44 Individual PO/Work Order files
  console.log('4. Ingesting individual PO/WO .xls files...');
  const files = fs.readdirSync(poDir).filter(f => (f.endsWith('.xls') || f.endsWith('.xlsx')) && f !== 'CNC Purchase (1).xlsx');
  
  for (const file of files) {
    try {
      const wb = XLSX.readFile(path.join(poDir, file));
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      let poNumber = '';
      let poDate = '';
      let vendorName = '';
      let items = [];
      let totalAmount = 0;

      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const r = rows[i] || [];
        const str = r.join(' ');
        if (str.includes('ORDER NO')) {
          const match = str.match(/ORDER NO\s*[:\s]*([^\s,]+)/i);
          if (match) poNumber = match[1].trim();
        }
        if (str.includes('DATE') && !poDate) {
          const match = str.match(/DATE\s*[:\s]*([0-9.]+)/i);
          if (match) poDate = match[1].trim();
        }
        if (i >= 3 && i <= 6 && !vendorName) {
          if (r[0] && typeof r[0] === 'string' && r[0].length > 3 && !r[0].startsWith('TO')) {
            vendorName = r[0].trim();
          }
        }
      }

      if (!poNumber) {
        poNumber = file.replace(/\.xls[x]?$/i, '');
      }

      let foundHeader = false;
      for (let i = 10; i < rows.length; i++) {
        const r = rows[i] || [];
        const str = r.join(' ');
        if (str.includes('S.NO') && str.includes('DESCRIPTION')) {
          foundHeader = true;
          continue;
        }
        if (foundHeader && r[0] && (typeof r[0] === 'number' || !isNaN(parseInt(r[0])))) {
          const desc = String(r[2] || r[1] || '').trim();
          const qty = parseFloat(r[8] || r[7] || r[6]) || 0;
          const rate = parseFloat(r[10] || r[9]) || 0;
          const amt = parseFloat(r[12] || r[11]) || (qty * rate);
          if (desc) {
            items.push({ desc, qty, rate, amt });
            totalAmount += amt;
          }
        }
      }

      const existing = await pool.query(`SELECT id FROM purchase_orders WHERE po_number = $1`, [poNumber]);
      if (existing.rows.length === 0) {
        const vId = await getOrCreateVendorId(vendorName);
        const gstAmount = Number((totalAmount * 0.18).toFixed(2));
        const netTotal = Number((totalAmount + gstAmount).toFixed(2));

        const insertRes = await pool.query(`
          INSERT INTO purchase_orders (
            po_number, vendor_id, po_date, currency,
            subtotal, gst_amount, total_amount, status, created_by
          ) VALUES (
            $1, $2, $3, 'INR',
            $4, $5, $6, 'VERIFIED', $7
          ) RETURNING id
        `, [
          poNumber,
          vId,
          parseDate(poDate) || new Date().toISOString().split('T')[0],
          totalAmount,
          gstAmount,
          netTotal,
          adminUserId
        ]);

        const poId = insertRes.rows[0].id;
        poCount++;

        for (const it of items) {
          await pool.query(`
            INSERT INTO purchase_order_items (
              purchase_order_id, description, quantity, unit,
              unit_rate, gst_rate, line_total
            ) VALUES (
              $1, $2, $3, 'Nos',
              $4, 18, $5
            )
          `, [
            poId,
            it.desc,
            it.qty,
            it.rate,
            it.amt
          ]);
          itemCount++;
        }
      }
    } catch (err) {
      console.error(`Error ingesting ${file}:`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`PO INGESTION COMPLETE!`);
  console.log(`Total Purchase Orders in DB: ${poCount}`);
  console.log(`Total PO Items in DB: ${itemCount}`);
}

main().catch(console.error).then(() => pool.end());
