'use client';
import { useERP } from '../_components/ModulePage';
import { useState } from 'react';

export default function ToolsPage() {
  const { data, loading, reload } = useERP('tools');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [toolForm, setToolForm] = useState({
    code: '',
    name: '',
    type: 'TAPPING_TAP',
    manufacturer: '',
    partNumber: '',
    life: '',
    regrind: '',
    cost: '',
  });

  const [eventForm, setEventForm] = useState({
    toolId: '',
    eventType: 'REGRIND',
    piecesMachined: '',
    regrindCost: '',
    notes: '',
  });

  async function handleAddTool(e: React.FormEvent) {
    e.preventDefault();
    if (!toolForm.code || !toolForm.name) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'tool', ...toolForm }),
      });
      const x = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${x.error || 'Failed to add tool'}`);
      } else {
        setMessage('Tool registered successfully.');
        setToolForm({ code: '', name: '', type: 'TAPPING_TAP', manufacturer: '', partNumber: '', life: '', regrind: '', cost: '' });
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventForm.toolId) {
      alert('Please select a tool.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'tool_event', ...eventForm }),
      });
      const x = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${x.error || 'Failed to log tool event'}`);
      } else {
        setMessage('Tool regrinding / event recorded successfully.');
        setEventForm({ toolId: '', eventType: 'REGRIND', piecesMachined: '', regrindCost: '', notes: '' });
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const tools = data?.tools || [];
  const events = data?.events || [];

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">TOOLING &amp; CONSUMABLES</div>
          <h1>Tools, Consumables &amp; Regrinding</h1>
          <p>
            Track taps (T1/T2), slitting saw blades (S1-S3), CNC inserts, and monitor regrinding cycles (Babiya in-house vs external).
          </p>
        </div>
        <button className="ghost" onClick={reload}>Refresh</button>
      </div>

      <div className="two-col">
        {/* Register Tool Form */}
        <form className="form-card" onSubmit={handleAddTool}>
          <h3>Register Recurring Tool</h3>

          <div className="form-grid">
            <label>
              Tool Code *
              <input
                required
                placeholder="e.g. TAP-M14 / SLIT-SAW-04 / INSERT-CNMG"
                value={toolForm.code}
                onChange={(e) => setToolForm({ ...toolForm, code: e.target.value })}
              />
            </label>

            <label>
              Tool Name *
              <input
                required
                placeholder="e.g. HSS Tap M14 / 4-Inch Slitting Blade"
                value={toolForm.name}
                onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Tool Type *
              <select
                value={toolForm.type}
                onChange={(e) => setToolForm({ ...toolForm, type: e.target.value })}
              >
                <option value="TAPPING_TAP">Tapping Tap (T1, T2)</option>
                <option value="SLITTING_SAW">Slitting Saw Blade (4-inch)</option>
                <option value="CNC_INSERT">CNC Carbide Insert</option>
                <option value="DRILL">Drill Bit</option>
                <option value="GAUGE">Go / No-Go Gauge</option>
                <option value="OTHER">Other Tooling</option>
              </select>
            </label>

            <label>
              Purchase Cost (₹)
              <input
                type="number"
                step="0.01"
                placeholder="Unit purchase cost"
                value={toolForm.cost}
                onChange={(e) => setToolForm({ ...toolForm, cost: e.target.value })}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Standard Life (Pieces)
              <input
                type="number"
                placeholder="e.g. 500"
                value={toolForm.life}
                onChange={(e) => setToolForm({ ...toolForm, life: e.target.value })}
              />
            </label>

            <label>
              Regrind Limit
              <input
                type="number"
                placeholder="e.g. 3 times"
                value={toolForm.regrind}
                onChange={(e) => setToolForm({ ...toolForm, regrind: e.target.value })}
              />
            </label>
          </div>

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register Tool'}
          </button>
        </form>

        {/* Log Regrind / Tool Event Form */}
        <form className="form-card" onSubmit={handleLogEvent}>
          <h3>Log Tool Regrinding / Replacement</h3>

          <label>
            Select Tool *
            <select
              required
              value={eventForm.toolId}
              onChange={(e) => setEventForm({ ...eventForm, toolId: e.target.value })}
            >
              <option value="">Select Tool from Register</option>
              {tools.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.tool_code} - {t.tool_name} ({t.tool_type})
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label>
              Event Type *
              <select
                value={eventForm.eventType}
                onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
              >
                <option value="REGRIND">Regrinding (In-House Babiya)</option>
                <option value="EXTERNAL_REGRIND">Regrinding (External)</option>
                <option value="INSPECTION">Inspection / Gauge Check</option>
                <option value="REPLACED">Replaced with New Tool</option>
                <option value="SCRAPPED">Scrapped / Broken</option>
              </select>
            </label>

            <label>
              Pieces Machined
              <input
                type="number"
                placeholder="Pieces produced before regrind"
                value={eventForm.piecesMachined}
                onChange={(e) => setEventForm({ ...eventForm, piecesMachined: e.target.value })}
              />
            </label>
          </div>

          <label>
            Regrinding Cost (₹, if external)
            <input
              type="number"
              step="0.01"
              placeholder="0.00 if in-house"
              value={eventForm.regrindCost}
              onChange={(e) => setEventForm({ ...eventForm, regrindCost: e.target.value })}
            />
          </label>

          <label>
            Notes / Operator Remarks
            <textarea
              placeholder="Cutter wear condition, sharpening angle, or tap breakage reason"
              value={eventForm.notes}
              onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
            />
          </label>

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Log Regrinding Event'}
          </button>
        </form>
      </div>

      {message && (
        <div className={message.startsWith('Error') ? 'error-box' : 'notice'} style={{ marginTop: 14 }}>
          {message}
        </div>
      )}

      {/* Tools Register Table */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Active Tool Register</h2>
        </div>
        {loading ? (
          <div className="empty">Loading tools…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tool Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Std Life</th>
                  <th>Regrind Limit</th>
                  <th>Unit Cost (₹)</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {tools.length ? (
                  tools.map((t: any) => (
                    <tr key={t.id}>
                      <td><b>{t.tool_code}</b></td>
                      <td>{t.tool_name}</td>
                      <td><span className="badge">{t.tool_type}</span></td>
                      <td>{t.standard_life_pieces || '—'} pcs</td>
                      <td>{t.regrind_limit || '—'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {t.unit_cost ? `₹${Number(t.unit_cost).toFixed(2)}` : '—'}
                      </td>
                      <td>{t.stage || 'General'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}><div className="empty">No tools registered yet.</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Regrind History */}
      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h2>Tool Regrinding &amp; Life Events</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tool</th>
                <th>Event</th>
                <th>Pieces Machined</th>
                <th>Regrind Count</th>
                <th>Cost (₹)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {events.length ? (
                events.map((ev: any) => (
                  <tr key={ev.id}>
                    <td><b>{ev.event_date}</b></td>
                    <td>{ev.tool_name} ({ev.tool_code})</td>
                    <td><span className="badge green">{ev.event_type}</span></td>
                    <td>{ev.pieces_machined || '—'}</td>
                    <td>{ev.regrind_count || '1'}</td>
                    <td>{ev.regrind_cost ? `₹${Number(ev.regrind_cost).toFixed(2)}` : '—'}</td>
                    <td>{ev.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}><div className="empty">No tool life events recorded yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
