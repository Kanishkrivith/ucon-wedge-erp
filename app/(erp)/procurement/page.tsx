'use client';
import { useERP } from '../_components/ModulePage';
import { useState } from 'react';

export default function ProcurementPage() {
  const { data, loading, reload } = useERP('purchase');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: 'RAW_MATERIAL',
    gstin: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'vendor', ...form }),
      });
      const x = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${x.error || 'Failed to create vendor'}`);
      } else {
        setMessage('Vendor created successfully.');
        setForm({ name: '', category: 'RAW_MATERIAL', gstin: '', contactName: '', phone: '', email: '', address: '' });
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const orders = data?.orders || [];
  const invoices = data?.invoices || [];
  const rates = data?.rates || [];

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">PROCUREMENT &amp; VENDORS</div>
          <h1>Purchase &amp; Subcontractors</h1>
          <p>Manage vendors, purchase orders, subcontractor rates, and invoice histories.</p>
        </div>
        <button className="ghost" onClick={reload}>Refresh</button>
      </div>

      <div className="two-col">
        {/* Add Vendor Card */}
        <form className="form-card" onSubmit={handleAddVendor}>
          <h3>Add New Vendor / Subcontractor</h3>

          <label>
            Vendor Legal Name *
            <input
              required
              placeholder="e.g. Ace Micromatic / Sri Murugan / Techmat"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <div className="form-grid">
            <label>
              Category *
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="RAW_MATERIAL">Raw Material (Steel / Bar)</option>
                <option value="CNC_MACHINING">CNC Subcontractor</option>
                <option value="HEAT_TREATMENT">Heat Treatment / Hardening</option>
                <option value="MACHINES">Machine Manufacturer (CapEx)</option>
                <option value="TOOLS">Tooling / Taps / Blades</option>
                <option value="SPRING">Springs / Circlips</option>
                <option value="CONSUMABLES">Coolants / Oils / Grease</option>
                <option value="QC_TESTING">Testing Labs</option>
              </select>
            </label>

            <label>
              GSTIN
              <input
                placeholder="33AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Contact Person
              <input
                placeholder="Contact Name"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </label>

            <label>
              Phone
              <input
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </div>

          <label>
            Email Address
            <input
              type="email"
              placeholder="orders@vendor.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label>
            Address / City
            <textarea
              placeholder="Factory / Office Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>

          {message && (
            <div className={message.startsWith('Error') ? 'error-box' : 'notice'}>
              {message}
            </div>
          )}

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Register Vendor'}
          </button>
        </form>

        {/* Historical Vendor Rates */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Vendor Rate History</h2>
              <small className="muted">Section 13: Rates are effective-dated, never hard-coded</small>
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading vendor rates…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Process</th>
                    <th>Rate (₹)</th>
                    <th>Effective From</th>
                    <th>Effective To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.length ? (
                    rates.map((r: any) => (
                      <tr key={r.id}>
                        <td><b>{r.vendor_name}</b></td>
                        <td>{r.process_name || r.item_description || 'General'}</td>
                        <td style={{ fontWeight: 800, color: 'var(--navy)' }}>
                          ₹{Number(r.rate).toFixed(2)}
                        </td>
                        <td>{r.effective_from}</td>
                        <td>{r.effective_to || 'Current'}</td>
                        <td>
                          <span className={`badge ${r.effective_to ? 'amber' : 'green'}`}>
                            {r.effective_to ? 'Historical' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}><div className="empty">No vendor rates recorded yet.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Invoices List */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Purchase &amp; Service Invoices</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length ? (
                invoices.map((inv: any) => (
                  <tr key={inv.id}>
                    <td><b>{inv.invoice_number}</b></td>
                    <td>{inv.invoice_date}</td>
                    <td>{inv.vendor}</td>
                    <td style={{ fontWeight: 800 }}>
                      ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td><span className="badge">{inv.payment_status}</span></td>
                    <td>
                      <span className={`badge ${inv.status === 'VERIFIED' ? 'green' : 'amber'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}><div className="empty">No invoices recorded yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
