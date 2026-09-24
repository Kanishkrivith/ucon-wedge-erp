'use client';
import { useERP } from '../_components/ModulePage';
import { useState } from 'react';

export default function MachinesPage() {
  const { data, loading, reload } = useERP('machines');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'CNC',
    manufacturer: '',
    model: '',
    serial: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    capacity: '',
    power: '',
    status: 'ACTIVE',
    notes: '',
  });

  async function handleAddMachine(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'machine', ...form }),
      });
      const x = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${x.error || 'Failed to add machine'}`);
      } else {
        setMessage('Machine and CapEx investment registered successfully.');
        setForm({
          code: '',
          name: '',
          type: 'CNC',
          manufacturer: '',
          model: '',
          serial: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseCost: '',
          capacity: '',
          power: '',
          status: 'ACTIVE',
          notes: '',
        });
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const machines = data?.machines || [];
  const capex = data?.capex || [];

  const totalCapex = capex.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">CAPEX &amp; INFRASTRUCTURE</div>
          <h1>Machines &amp; Capital Investment</h1>
          <p>Register production machinery (CNC, Tapping T1/T2, Slitting S1-S3, In-house regrinder) and track CapEx investments.</p>
        </div>
        <button className="ghost" onClick={reload}>Refresh</button>
      </div>

      <div className="stats-grid three">
        <div className="stat-card">
          <div className="stat-label">Active Machinery</div>
          <div className="stat-value">{machines.filter((m: any) => m.status === 'ACTIVE').length}</div>
          <div className="stat-sub">Units in production</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total CapEx Investment</div>
          <div className="stat-value" style={{ color: 'var(--navy)' }}>
            ₹{totalCapex.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">Tracked separately from wedge cost</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Registered Machines</div>
          <div className="stat-value">{machines.length}</div>
          <div className="stat-sub">Tapping, slitting, CNC, tooling</div>
        </div>
      </div>

      <div className="two-col">
        {/* Add Machine Form */}
        <form className="form-card" onSubmit={handleAddMachine}>
          <h3>Register Machine (CapEx)</h3>

          <div className="form-grid">
            <label>
              Machine Code *
              <input
                required
                placeholder="e.g. CNC-01 / TAP-T1 / SLIT-S1"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>

            <label>
              Machine Name *
              <input
                required
                placeholder="e.g. Tapping Machine 1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Machine Type *
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="CNC">CNC Turning Centre</option>
                <option value="TAPPING">Tapping Machine (T1, T2)</option>
                <option value="SLITTING">Slitting Machine (S1, S2, S3)</option>
                <option value="REGRINDING">In-House Regrinding (Babiya)</option>
                <option value="CUTTING">Band Saw / Cutting Machine</option>
                <option value="TESTING">Load Testing Rig</option>
                <option value="OTHER">Other Equipment</option>
              </select>
            </label>

            <label>
              Purchase Cost (₹ CapEx)
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1000000"
                value={form.purchaseCost}
                onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Manufacturer / Vendor
              <input
                placeholder="e.g. Ace Micromatic / Bhavya"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              />
            </label>

            <label>
              Purchase Date
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              />
            </label>
          </div>

          <label>
            Notes &amp; Technical Specifications
            <textarea
              placeholder="Spindle capacity, power (kW), serial number, installation date, or location"
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
            {submitting ? 'Registering…' : 'Save Machine & CapEx'}
          </button>
        </form>

        {/* Machines List */}
        <section className="panel">
          <div className="panel-head">
            <h2>Machine Register</h2>
          </div>
          {loading ? (
            <div className="empty">Loading machines…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Manufacturer</th>
                    <th>Cost (₹)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.length ? (
                    machines.map((m: any) => (
                      <tr key={m.id}>
                        <td><b>{m.machine_code}</b></td>
                        <td>{m.machine_name}</td>
                        <td><span className="badge">{m.machine_type}</span></td>
                        <td>{m.manufacturer || m.vendor || '—'}</td>
                        <td style={{ fontWeight: 700 }}>
                          {m.purchase_cost ? `₹${Number(m.purchase_cost).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td>
                          <span className={`badge ${m.status === 'ACTIVE' ? 'green' : 'amber'}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}><div className="empty">No machines registered yet.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* CapEx Log */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>CapEx / Investment Register</h2>
            <small className="muted">Section 34: CapEx investments are recorded here and separated from Monthly Cost / Wedge</small>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Amount (₹)</th>
                <th>Vendor / Machine</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {capex.length ? (
                capex.map((c: any) => (
                  <tr key={c.id}>
                    <td><b>{c.purchase_date}</b></td>
                    <td>{c.asset_name}</td>
                    <td><span className="badge">{c.asset_type}</span></td>
                    <td style={{ fontWeight: 800, color: 'var(--navy)' }}>
                      ₹{Number(c.amount).toLocaleString('en-IN')}
                    </td>
                    <td>{c.vendor_name || c.machine_name || '—'}</td>
                    <td>{c.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}><div className="empty">No CapEx investments recorded yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
