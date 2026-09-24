import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionUser, requireSuperAdmin } from '@/lib/auth';

const ok = NextResponse.json;

export async function GET(req: Request) {
  try {
    const u = await getSessionUser();
    if (!u) return ok({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const resource = url.searchParams.get('resource') || 'dashboard';

    // 1. Management Command Center / Dashboard
    if (resource === 'dashboard') {
      const [prod, exp, inv, cap, users, docs] = await Promise.all([
        pool.query(`
          SELECT
            COALESCE(SUM(qty_out), 0) AS good,
            COALESCE(SUM(qty_rejected), 0) AS rejected
          FROM daily_production
          WHERE production_date >= date_trunc('month', current_date)
        `),
        pool.query(`
          SELECT COALESCE(SUM(amount), 0) AS amount
          FROM monthly_expenses
          WHERE expense_month >= date_trunc('month', current_date)
        `),
        pool.query(`SELECT COUNT(*) AS count FROM invoices WHERE status = 'PENDING_REVIEW'`),
        pool.query(`SELECT COALESCE(SUM(amount), 0) AS amount FROM capex`),
        pool.query(`SELECT COUNT(*) AS count FROM users WHERE account_status = 'PENDING'`),
        pool.query(`SELECT COUNT(*) AS count FROM documents WHERE status = 'PENDING_REVIEW'`),
      ]);

      const good = Number(prod.rows[0].good);
      const rejected = Number(prod.rows[0].rejected);
      const total = good + rejected;
      const yieldPct = total > 0 ? ((good / total) * 100).toFixed(1) + '%' : '—';

      return ok({
        metrics: {
          monthlyGood: good,
          monthlyRejected: rejected,
          yieldPct,
          monthlyExpenses: Number(exp.rows[0].amount),
          totalCapex: Number(cap.rows[0].amount),
          pendingInvoices: Number(inv.rows[0].count),
          pendingDocuments: Number(docs.rows[0].count),
          pendingUsers: Number(users.rows[0].count),
        },
      });
    }

    // 2. Production
    if (resource === 'production') {
      const [rows, stages, machines, vendors, batches] = await Promise.all([
        pool.query(`
          SELECT
            dp.id,
            dp.production_date,
            ps.name AS stage,
            ps.code AS stage_code,
            dp.qty_in,
            dp.qty_out,
            dp.qty_rejected,
            dp.rejection_reason,
            dp.operator_name,
            dp.notes,
            COALESCE(pb.batch_code, '-') AS batch_code,
            m.machine_name,
            v.canonical_name AS vendor_name
          FROM daily_production dp
          JOIN process_stages ps ON ps.id = dp.process_stage_id
          LEFT JOIN production_batches pb ON pb.id = dp.batch_id
          LEFT JOIN machines m ON m.id = dp.machine_id
          LEFT JOIN vendors v ON v.id = dp.vendor_id
          ORDER BY dp.production_date DESC, dp.created_at DESC
          LIMIT 250
        `),
        pool.query(`SELECT id, code, name, sequence_no FROM process_stages WHERE active = true ORDER BY sequence_no`),
        pool.query(`SELECT id, machine_code, machine_name, machine_type FROM machines WHERE status = 'ACTIVE' ORDER BY machine_code`),
        pool.query(`SELECT id, canonical_name, category FROM vendors WHERE active = true ORDER BY canonical_name`),
        pool.query(`SELECT id, batch_code, material_lot, status FROM production_batches ORDER BY created_at DESC LIMIT 50`),
      ]);

      return ok({
        rows: rows.rows,
        stages: stages.rows,
        machines: machines.rows,
        vendors: vendors.rows,
        batches: batches.rows,
      });
    }

    // 3. Inventory
    if (resource === 'inventory') {
      const [items, movements] = await Promise.all([
        pool.query(`
          SELECT
            ii.id,
            ii.item_code,
            ii.item_name,
            ii.item_type,
            ii.unit,
            ii.reorder_level,
            COALESCE(SUM(
              CASE
                WHEN im.movement_type IN ('RECEIPT', 'PRODUCTION_IN', 'ADJUSTMENT') THEN im.quantity
                WHEN im.movement_type IN ('ISSUE', 'PRODUCTION_OUT', 'REJECTION', 'DISPATCH') THEN -im.quantity
                ELSE 0
              END
            ), 0) AS current_stock
          FROM inventory_items ii
          LEFT JOIN inventory_movements im ON im.item_id = ii.id
          WHERE ii.active = true
          GROUP BY ii.id, ii.item_code, ii.item_name, ii.item_type, ii.unit, ii.reorder_level
          ORDER BY ii.item_type, ii.item_code
        `),
        pool.query(`
          SELECT
            im.id,
            im.movement_date,
            im.movement_type,
            im.quantity,
            im.unit_cost,
            COALESCE(pb.batch_code, '-') AS batch_code,
            COALESCE(d.document_number, '-') AS document_ref,
            ii.item_code,
            ii.item_name,
            ii.unit,
            u.name AS entered_by_name
          FROM inventory_movements im
          JOIN inventory_items ii ON ii.id = im.item_id
          LEFT JOIN production_batches pb ON pb.id = im.batch_id
          LEFT JOIN documents d ON d.id = im.reference_document_id
          LEFT JOIN users u ON u.id = im.entered_by
          ORDER BY im.movement_date DESC
          LIMIT 100
        `),
      ]);

      return ok({ items: items.rows, movements: movements.rows });
    }

    // 4. Vendors & Procurement
    if (resource === 'vendors') {
      const r = await pool.query(`
        SELECT id, canonical_name, category, country, gstin, contact_name, phone, email, active
        FROM vendors
        ORDER BY canonical_name
      `);
      return ok({ rows: r.rows });
    }

    if (resource === 'purchase') {
      const [orders, invoices, rates] = await Promise.all([
        pool.query(`
          SELECT po.id, po.po_number, po.po_date, po.status, po.total_amount, COALESCE(v.canonical_name, 'Unknown Vendor') AS vendor
          FROM purchase_orders po
          LEFT JOIN vendors v ON v.id = po.vendor_id
          ORDER BY po.po_date DESC
          LIMIT 100
        `),
        pool.query(`
          SELECT inv.id, inv.invoice_number, inv.invoice_date, inv.subtotal, inv.total_amount, inv.payment_status, inv.status, COALESCE(v.canonical_name, 'Direct Purchase') AS vendor
          FROM invoices inv
          LEFT JOIN vendors v ON v.id = inv.vendor_id
          ORDER BY inv.invoice_date DESC NULLS LAST
          LIMIT 100
        `),
        pool.query(`
          SELECT vr.*, v.canonical_name AS vendor_name, ps.name AS process_name
          FROM vendor_rates vr
          JOIN vendors v ON v.id = vr.vendor_id
          LEFT JOIN process_stages ps ON ps.id = vr.process_stage_id
          ORDER BY vr.effective_from DESC
        `),
      ]);
      return ok({ orders: orders.rows, invoices: invoices.rows, rates: rates.rows });
    }

    // 5. Machines & CapEx
    if (resource === 'machines') {
      const [machines, capex] = await Promise.all([
        pool.query(`
          SELECT m.*, v.canonical_name AS vendor
          FROM machines m
          LEFT JOIN vendors v ON v.id = m.vendor_id
          ORDER BY m.machine_code
        `),
        pool.query(`
          SELECT c.*, m.machine_name, v.canonical_name AS vendor_name
          FROM capex c
          LEFT JOIN machines m ON m.id = c.machine_id
          LEFT JOIN vendors v ON v.id = c.vendor_id
          ORDER BY c.purchase_date DESC
        `),
      ]);
      return ok({ machines: machines.rows, capex: capex.rows });
    }

    // 6. Tools & Consumables
    if (resource === 'tools') {
      const [tools, events] = await Promise.all([
        pool.query(`
          SELECT t.*, ps.name AS stage
          FROM tools t
          LEFT JOIN process_stages ps ON ps.id = t.process_stage_id
          ORDER BY t.tool_code
        `),
        pool.query(`
          SELECT tle.*, t.tool_code, t.tool_name, m.machine_name
          FROM tool_life_events tle
          JOIN tools t ON t.id = tle.tool_id
          LEFT JOIN machines m ON m.id = tle.machine_id
          ORDER BY tle.event_date DESC
          LIMIT 100
        `),
      ]);
      return ok({ tools: tools.rows, events: events.rows });
    }

    // 7. Costing & Monthly Business Snapshot
    if (resource === 'costing') {
      const [expenses, production, capex] = await Promise.all([
        pool.query(`
          SELECT
            to_char(expense_month, 'YYYY-MM') AS month,
            category,
            subcategory,
            SUM(amount) AS total_amount
          FROM monthly_expenses
          GROUP BY to_char(expense_month, 'YYYY-MM'), category, subcategory
          ORDER BY month DESC
        `),
        pool.query(`
          SELECT
            to_char(production_date, 'YYYY-MM') AS month,
            SUM(qty_in) AS total_in,
            SUM(qty_out) AS total_out,
            SUM(qty_rejected) AS total_rejected
          FROM daily_production
          GROUP BY to_char(production_date, 'YYYY-MM')
          ORDER BY month DESC
        `),
        pool.query(`
          SELECT
            to_char(purchase_date, 'YYYY-MM') AS month,
            SUM(amount) AS capex_investment
          FROM capex
          GROUP BY to_char(purchase_date, 'YYYY-MM')
          ORDER BY month DESC
        `),
      ]);

      return ok({
        expenses: expenses.rows,
        production: production.rows,
        capex: capex.rows,
      });
    }

    // 8. Admin Users & Permissions
    if (resource === 'admin') {
      await requireSuperAdmin();
      const [users, audit] = await Promise.all([
        pool.query(`
          SELECT id, name, email, role, active, account_status, requested_at, last_login_at
          FROM users
          ORDER BY created_at DESC
        `),
        pool.query(`
          SELECT al.*, u.name AS user_name
          FROM audit_log al
          LEFT JOIN users u ON u.id = al.changed_by
          ORDER BY al.changed_at DESC
          LIMIT 100
        `),
      ]);
      return ok({ users: users.rows, audit: audit.rows });
    }

    return ok({ error: 'Unknown resource' }, { status: 404 });
  } catch (error: any) {
    console.error('ERP API error:', error);
    const status = error.message === 'FORBIDDEN' ? 403 : error.message === 'UNAUTHENTICATED' ? 401 : 500;
    return ok({ error: error.message || 'Internal server error' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const u = await getSessionUser();
    if (!u) return ok({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const r = String(body.resource || '');

    // 1. Record Daily Production Entry
    if (r === 'production') {
      const stage = body.processStageId;
      if (!stage) return ok({ error: 'Process stage is required.' }, { status: 400 });

      const q = await pool.query(
        `INSERT INTO daily_production (
          production_date, process_stage_id, machine_id, vendor_id, batch_id,
          qty_in, qty_out, qty_rejected, rejection_reason, operator_name, notes, entered_by
        ) VALUES (COALESCE($1, current_date), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          body.date || null,
          stage,
          body.machineId || null,
          body.vendorId || null,
          body.batchId || null,
          Number(body.qtyIn || 0),
          Number(body.qtyOut || 0),
          Number(body.qtyRejected || 0),
          body.rejectionReason || null,
          body.operatorName || null,
          body.notes || null,
          u.id,
        ]
      );

      if (Number(body.qtyRejected || 0) > 0 && body.rejectionReason) {
        await pool.query(
          `INSERT INTO production_rejections (production_id, reason_code, quantity, disposition)
           VALUES ($1, $2, $3, $4)`,
          [q.rows[0].id, body.rejectionReason, Number(body.qtyRejected || 0), body.disposition || 'SCRAP']
        );
      }

      await pool.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, new_value, changed_by)
         VALUES ('daily_production', $1, 'CREATE', $2, $3)`,
        [q.rows[0].id, JSON.stringify(body), u.id]
      );

      return ok({ ok: true, id: q.rows[0].id });
    }

    // 2. Create Batch
    if (r === 'batch') {
      const q = await pool.query(
        `INSERT INTO production_batches (batch_code, batch_date, material_lot, planned_quantity, notes, created_by)
         VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6)
         RETURNING id`,
        [
          body.batchCode,
          body.batchDate || null,
          body.materialLot || null,
          body.plannedQuantity ? Number(body.plannedQuantity) : null,
          body.notes || null,
          u.id,
        ]
      );
      return ok({ ok: true, id: q.rows[0].id });
    }

    // 3. Record Inventory Movement
    if (r === 'inventory_movement') {
      const q = await pool.query(
        `INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_cost, batch_id, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          body.itemId,
          body.movementType,
          Number(body.quantity),
          body.unitCost ? Number(body.unitCost) : null,
          body.batchId || null,
          u.id,
        ]
      );
      return ok({ ok: true, id: q.rows[0].id });
    }

    // 4. Create Vendor
    if (r === 'vendor') {
      const q = await pool.query(
        `INSERT INTO vendors (canonical_name, category, country, gstin, contact_name, phone, email, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          body.name,
          body.category || null,
          body.country || 'India',
          body.gstin || null,
          body.contactName || null,
          body.phone || null,
          body.email || null,
          body.address || null,
        ]
      );
      return ok({ ok: true, id: q.rows[0].id });
    }

    // 5. Create Machine Register / CapEx Entry
    if (r === 'machine') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const q = await client.query(
          `INSERT INTO machines (
            machine_code, machine_name, machine_type, manufacturer, model,
            serial_number, purchase_date, purchase_cost, capacity_per_month, power_kw, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id`,
          [
            body.code,
            body.name,
            body.type,
            body.manufacturer || null,
            body.model || null,
            body.serial || null,
            body.purchaseDate || null,
            body.purchaseCost ? Number(body.purchaseCost) : null,
            body.capacity ? Number(body.capacity) : null,
            body.power ? Number(body.power) : null,
            body.status || 'ACTIVE',
            body.notes || null,
          ]
        );

        // Record under CapEx separately (Section 34 requirement)
        if (body.purchaseCost && Number(body.purchaseCost) > 0) {
          await client.query(
            `INSERT INTO capex (asset_name, asset_type, purchase_date, amount, machine_id, notes)
             VALUES ($1, 'MACHINE', COALESCE($2, current_date), $3, $4, $5)`,
            [
              body.name,
              body.purchaseDate || null,
              Number(body.purchaseCost),
              q.rows[0].id,
              'Machine acquisition registered as CapEx',
            ]
          );
        }

        await client.query('COMMIT');
        return ok({ ok: true, id: q.rows[0].id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 6. Create Tool Register Entry
    if (r === 'tool') {
      const q = await pool.query(
        `INSERT INTO tools (tool_code, tool_name, tool_type, manufacturer, part_number, standard_life_pieces, regrind_limit, unit_cost, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING id`,
        [
          body.code,
          body.name,
          body.type,
          body.manufacturer || null,
          body.partNumber || null,
          body.life ? Number(body.life) : null,
          body.regrind ? Number(body.regrind) : null,
          body.cost ? Number(body.cost) : null,
        ]
      );
      return ok({ ok: true, id: q.rows[0].id });
    }

    // 7. Record Tool Regrind / Event
    if (r === 'tool_event') {
      const q = await pool.query(
        `INSERT INTO tool_life_events (tool_id, event_type, pieces_machined, regrind_count, regrind_cost, machine_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          body.toolId,
          body.eventType || 'REGRIND',
          body.piecesMachined ? Number(body.piecesMachined) : null,
          body.regrindCount ? Number(body.regrindCount) : 1,
          body.regrindCost ? Number(body.regrindCost) : null,
          body.machineId || null,
          body.notes || null,
        ]
      );
      return ok({ ok: true, id: q.rows[0].id });
    }

    // 8. User Status Approval / Rejection (Super Admin)
    if (r === 'user_status') {
      await requireSuperAdmin();
      const isActive = body.status === 'ACTIVE';
      await pool.query(
        `UPDATE users
         SET account_status = $1,
             active = $2,
             reviewed_at = now(),
             reviewed_by = $3
         WHERE id = $4`,
        [body.status, isActive, u.id, body.userId]
      );

      await pool.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, new_value, changed_by)
         VALUES ('users', $1, 'STATUS_UPDATE', $2, $3)`,
        [body.userId, JSON.stringify({ status: body.status, active: isActive }), u.id]
      );

      return ok({ ok: true });
    }

    return ok({ error: 'Unsupported operation' }, { status: 400 });
  } catch (error: any) {
    console.error('ERP POST error:', error);
    return ok({ error: error.message || 'Unable to save record.' }, { status: 500 });
  }
}
