'use client';
import { useERP } from '../_components/ModulePage';
import { useState } from 'react';

export default function InventoryPage() {
  const { data, loading, reload } = useERP('inventory');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    itemId: '',
    movementType: 'RECEIPT',
    quantity: '',
    unitCost: '',
    notes: '',
  });

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemId || !form.quantity) {
      alert('Please select an item and quantity.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'inventory_movement', ...form }),
      });
      const x = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${x.error || 'Failed to record movement'}`);
      } else {
        setMessage('Inventory movement recorded successfully.');
        setForm({ itemId: '', movementType: 'RECEIPT', quantity: '', unitCost: '', notes: '' });
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const items = data?.items || [];
  const movements = data?.movements || [];

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">MATERIALS &amp; STORES</div>
          <h1>Inventory &amp; Stock Tracking</h1>
          <p>Real-time balances across Raw Materials, 780mm Blanks, WIP, and Finished Goods.</p>
        </div>
        <button className="ghost" onClick={reload}>Refresh</button>
      </div>

      <div className="two-col">
        {/* Record Movement Form */}
        <form className="form-card" onSubmit={handleMovement}>
          <h3>Record Inventory Movement</h3>

          <label>
            Inventory Item *
            <select
              required
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
            >
              <option value="">Select Item</option>
              {items.map((it: any) => (
                <option key={it.id} value={it.id}>
                  [{it.item_type}] {it.item_name} ({it.item_code}) — Stock: {it.current_stock} {it.unit}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label>
              Movement Type *
              <select
                value={form.movementType}
                onChange={(e) => setForm({ ...form, movementType: e.target.value })}
              >
                <option value="RECEIPT">Receipt (Incoming Supplier/DC)</option>
                <option value="ISSUE">Issue (To Production/Vendor)</option>
                <option value="TRANSFER">Transfer (Between Stores)</option>
                <option value="PRODUCTION_IN">Production Inward</option>
                <option value="PRODUCTION_OUT">Production Outward</option>
                <option value="DISPATCH">Dispatch (To Customer/Site)</option>
                <option value="REJECTION">Scrap / Rejection</option>
                <option value="ADJUSTMENT">Physical Count Adjustment</option>
              </select>
            </label>

            <label>
              Quantity *
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                placeholder="0.00"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </label>
          </div>

          <label>
            Unit Cost / Purchase Rate (₹)
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 78.50"
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
            />
          </label>

          <label>
            Reference Notes / DC Number
            <textarea
              placeholder="DC Number, supplier batch, vehicle number, or reason for adjustment"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {message && (
            <div className={message.startsWith('Error') ? 'error-box' : 'notice'}>
              {message}
            </div>
          )}

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Post Movement'}
          </button>
        </form>

        {/* Current Balances Table */}
        <section className="panel">
          <div className="panel-head">
            <h2>Current Stock Balances</h2>
            <small className="muted">{items.length} items registered</small>
          </div>

          {loading ? (
            <div className="empty">Loading inventory balances…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length ? (
                    items.map((it: any) => {
                      const stock = Number(it.current_stock) || 0;
                      const reorder = Number(it.reorder_level) || 0;
                      const isLow = reorder > 0 && stock <= reorder;
                      return (
                        <tr key={it.id}>
                          <td><b>{it.item_code}</b></td>
                          <td>{it.item_name}</td>
                          <td><span className="badge">{it.item_type}</span></td>
                          <td style={{ fontWeight: 800, color: isLow ? 'var(--red)' : 'inherit' }}>
                            {stock.toLocaleString('en-IN')}
                          </td>
                          <td>{it.unit}</td>
                          <td>
                            {isLow ? (
                              <span className="badge red">Low Stock</span>
                            ) : (
                              <span className="badge green">In Stock</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}><div className="empty">No inventory items found.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Movement History Log */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Recent Stock Movements</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Batch / Ref Doc</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {movements.length ? (
                movements.map((m: any) => (
                  <tr key={m.id}>
                    <td><b>{m.movement_date ? new Date(m.movement_date).toLocaleDateString() : '—'}</b></td>
                    <td><span className="badge">{m.movement_type}</span></td>
                    <td>{m.item_name} ({m.item_code})</td>
                    <td style={{ fontWeight: 700 }}>
                      {Number(m.quantity).toLocaleString('en-IN')} {m.unit}
                    </td>
                    <td>{m.unit_cost ? `₹${Number(m.unit_cost).toLocaleString('en-IN')}` : '—'}</td>
                    <td>{m.batch_code !== '-' ? `Batch: ${m.batch_code}` : m.document_ref !== '-' ? `Doc: ${m.document_ref}` : '—'}</td>
                    <td>{m.entered_by_name || 'System'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}><div className="empty">No movements logged yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
