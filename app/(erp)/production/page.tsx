'use client';

import { useERP } from '../_components/ModulePage';
import { useState, useMemo } from 'react';

const STAGE_HINTS: Record<string, { title: string; hint: string; checklist?: string[] }> = {
  RM_INGEST: {
    title: 'Raw Material Verification (Sec 7)',
    hint: '20MnCr5 25mm black bar, approximately 5.7m to 6.0m incoming bar lengths. Check MTC and lab test report before release.',
  },
  CUTTING: {
    title: 'Blank Cutting (Sec 10)',
    hint: 'Incoming long bars cut into ~780mm blanks for CNC processing. Performed by Sri Murugan or in-house.',
  },
  CNC: {
    title: 'CNC Machining (Sec 12 & 14)',
    hint: 'Rough turning, center drilling, main drilling, finish turning, ID boring, OD grooving, parting. Reference thumb rule: ~6,600 wedges/ton.',
  },
  CNC_QC: {
    title: 'CNC QC & Gauge Inspection (Sec 16 & 21)',
    hint: 'Check dimensions with Go/No-Go gauges. Segregate scrap vs rework candidates with reason code.',
  },
  CHAMFERING: {
    title: 'Chamfering Process (Sec 17)',
    hint: 'Chamfering component edges prior to internal tapping.',
  },
  TAPPING: {
    title: 'Tapping Operation (Sec 18 & 20)',
    hint: 'UCON Tapping Machines T1 & T2. Uses Product 1305 coolant (200L barrel) and Go/No-Go gauge check.',
  },
  TAPPING_REGRIND: {
    title: 'Tap Regrinding (Sec 19)',
    hint: 'In-house Babiya Industries Regrinder vs external regrinding. Monitors tap life pieces and regrind cycle.',
  },
  SLITTING: {
    title: 'Slitting Operation (Sec 22 & 24)',
    hint: 'UCON Slitting Machines S1, S2, S3. Uses 4-inch slitting saw cutter/blade, DM water, and coolant.',
  },
  WASHING: {
    title: 'Component Washing (Sec 25)',
    hint: 'Washing with DM water and cleaning consumables before outsourced heat treatment.',
  },
  HEAT_TREATMENT: {
    title: 'Heat Treatment / Case Hardening (Sec 26)',
    hint: 'Outsourced to Techmat or Thermal. Spec targets: Case depth 0.5–0.7 mm, Hardness 54–64 HRC. Outward DC & Return DC tracking.',
  },
  QC_INSPECTION: {
    title: 'Post-HT Inspection (Sec 27)',
    hint: 'Visual, dimensional, and thread inspection following case hardening.',
  },
  LOAD_TESTING: {
    title: '100% Load Testing (Sec 27)',
    hint: '100% proof load testing on dedicated test rig. Passed wedges move to assembly; failed are scrapped.',
  },
  SPRING_ASSEMBLY: {
    title: 'Spring / Circlip Assembly (Sec 28)',
    hint: 'Assembly with precision springs from Micromatic or Viking Spring.',
  },
  PACKING: {
    title: 'Lot Packing (Sec 29)',
    hint: 'Packed in polythene bags, standard lot size ~300 pieces per bag.',
  },
  STORE_DISPATCH: {
    title: 'Store & Dispatch (Sec 30)',
    hint: 'Finished goods stock strictly segregated from WIP. Outward Delivery Challan (DC) issued to customer site.',
  },
};

export default function ProductionPage() {
  const { data, loading, reload } = useERP('production');
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Daily entry form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    processStageId: '',
    batchId: '',
    machineId: '',
    vendorId: '',
    qtyIn: '',
    qtyOut: '',
    qtyRejected: '',
    rejectionReason: '',
    disposition: 'SCRAP',
    operatorName: '',
    notes: '',
    // Domain parameters
    barLength: '6.0',
    cutLength: '780',
    inputWeightTonnes: '',
    testRigId: 'RIG-01',
    heatTreatmentVendor: 'Techmat',
    caseDepthMm: '0.6',
    hardnessHrc: '58',
  });

  const selectedStage = useMemo(() => {
    return (data?.stages || []).find((s: any) => s.id === form.processStageId);
  }, [data?.stages, form.processStageId]);

  const stageCode = selectedStage?.code || '';
  const hintInfo = STAGE_HINTS[stageCode];

  const qtyInNum = Number(form.qtyIn) || 0;
  const qtyOutNum = Number(form.qtyOut) || 0;
  const qtyRejNum = Number(form.qtyRejected) || 0;
  const liveYield = qtyInNum > 0 ? ((qtyOutNum / qtyInNum) * 100).toFixed(1) : null;
  const liveRejectionRate = qtyInNum > 0 ? ((qtyRejNum / qtyInNum) * 100).toFixed(1) : null;

  // CNC Section 14 thumb rule comparison
  const inputWeight = Number(form.inputWeightTonnes) || (qtyInNum > 0 ? qtyInNum / 6600 : 0);
  const referenceOutput = inputWeight > 0 ? Math.round(inputWeight * 6600) : null;
  const yieldVsReference = referenceOutput && qtyOutNum > 0 ? ((qtyOutNum / referenceOutput) * 100).toFixed(1) : null;

  // KPI calculations
  const stats = useMemo(() => {
    const rows = data?.rows || [];
    let totalIn = 0;
    let totalOut = 0;
    let totalRejected = 0;
    for (const r of rows) {
      totalIn += Number(r.qty_in) || 0;
      totalOut += Number(r.qty_out) || 0;
      totalRejected += Number(r.qty_rejected) || 0;
    }
    const yieldPct = totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) + '%' : '—';
    return {
      totalIn,
      totalOut,
      totalRejected,
      yieldPct,
      count: rows.length,
    };
  }, [data?.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let list = data?.rows || [];
    if (stageFilter) {
      list = list.filter((r: any) => r.stage_code === stageFilter || r.stage === stageFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r: any) =>
          (r.operator_name || '').toLowerCase().includes(q) ||
          (r.batch_code || '').toLowerCase().includes(q) ||
          (r.machine_name || '').toLowerCase().includes(q) ||
          (r.vendor_name || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.rows, stageFilter, searchQuery]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.processStageId) {
      alert('Please select a Process Stage.');
      return;
    }
    setSubmitting(true);
    setMessage('');

    // Append stage parameters into notes for full audit retention
    let enrichedNotes = form.notes;
    if (stageCode === 'CUTTING') {
      enrichedNotes = `[Cutting: Bar ${form.barLength}m -> ${form.cutLength}mm blank] ${enrichedNotes}`;
    } else if (stageCode === 'HEAT_TREATMENT') {
      enrichedNotes = `[HT: ${form.heatTreatmentVendor}, Target Depth: ${form.caseDepthMm}mm, Hardness: ${form.hardnessHrc}HRC] ${enrichedNotes}`;
    } else if (stageCode === 'LOAD_TESTING') {
      enrichedNotes = `[100% Load Test Rig: ${form.testRigId}] ${enrichedNotes}`;
    }

    try {
      const r = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'production', ...form, notes: enrichedNotes }),
      });
      const x = await r.json();
      if (!r.ok) {
        setMessage(`Error: ${x.error || 'Failed to save'}`);
      } else {
        setMessage('Production entry recorded successfully.');
        setForm((prev) => ({
          ...prev,
          qtyIn: '',
          qtyOut: '',
          qtyRejected: '',
          rejectionReason: '',
          notes: '',
        }));
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">SOURCE OF TRUTH SEC 6, 10–30</div>
          <h1>15-Stage Manufacturing Execution</h1>
          <p>
            Complete sequence from raw material cutting to CNC, tapping, slitting, heat treatment, 100% load testing, and store dispatch.
          </p>
        </div>
        <button className="ghost" onClick={reload}>Refresh</button>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Good Wedges</div>
          <div className="stat-value">{stats.totalOut.toLocaleString('en-IN')}</div>
          <div className="stat-sub">Good output logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Rejections</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>
            {stats.totalRejected.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">Scrap / rework candidates</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Yield</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {stats.yieldPct}
          </div>
          <div className="stat-sub">Output / Input ratio</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Logged Records</div>
          <div className="stat-value">{stats.count}</div>
          <div className="stat-sub">Transaction entries</div>
        </div>
      </div>

      {/* Process Stages Quick Filter Strip */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <b style={{ fontSize: 11, letterSpacing: 0.5, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Process Stages (15 Stages from Raw Material to Dispatch)
          </b>
          {stageFilter && (
            <button
              className="ghost"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => setStageFilter('')}
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="process-strip">
          <button
            className={`ghost ${stageFilter === '' ? 'primary' : ''}`}
            style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8 }}
            onClick={() => setStageFilter('')}
          >
            All Stages
          </button>
          {(data?.stages || []).map((s: any) => (
            <button
              key={s.id}
              className={`ghost ${stageFilter === s.code ? 'primary' : ''}`}
              style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}
              onClick={() => setStageFilter(stageFilter === s.code ? '' : s.code)}
            >
              {s.sequence_no}. {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="two-col">
        {/* Daily Entry Form */}
        <form className="form-card" onSubmit={save}>
          <div className="eyebrow">STAGE LOG ENTRY</div>
          <h3>Record Daily Stage Production</h3>

          {hintInfo && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
              <b style={{ color: '#166534' }}>{hintInfo.title}:</b>
              <div style={{ color: '#15803d', marginTop: 2 }}>{hintInfo.hint}</div>
            </div>
          )}

          <div className="form-grid">
            <label>
              Production Date *
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>

            <label>
              Process Stage (15 Stages) *
              <select
                required
                value={form.processStageId}
                onChange={(e) => setForm({ ...form, processStageId: e.target.value })}
              >
                <option value="">Select Process Stage</option>
                {(data?.stages || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.sequence_no}. {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Stage-Specific Controls */}
          {stageCode === 'CUTTING' && (
            <div className="form-grid" style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid var(--line)' }}>
              <label>
                Incoming Bar Length (Sec 7)
                <select value={form.barLength} onChange={(e) => setForm({ ...form, barLength: e.target.value })}>
                  <option value="6.0">6.0 Metres (Standard)</option>
                  <option value="5.7">5.7 Metres (Short Bar)</option>
                </select>
              </label>
              <label>
                Cut Blank Length (Sec 10)
                <input
                  value={form.cutLength}
                  onChange={(e) => setForm({ ...form, cutLength: e.target.value })}
                  placeholder="780 mm"
                />
              </label>
            </div>
          )}

          {stageCode === 'HEAT_TREATMENT' && (
            <div className="form-grid" style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid var(--line)' }}>
              <label>
                Subcontractor (Sec 26)
                <select value={form.heatTreatmentVendor} onChange={(e) => setForm({ ...form, heatTreatmentVendor: e.target.value })}>
                  <option value="Techmat">Techmat Metallurgical Services</option>
                  <option value="Thermal">Thermal / Unitherm Engineers</option>
                  <option value="Ambattur">Ambattur Heat Treaters</option>
                </select>
              </label>
              <label>
                Case Depth Target (0.5–0.7 mm)
                <input
                  value={form.caseDepthMm}
                  onChange={(e) => setForm({ ...form, caseDepthMm: e.target.value })}
                  placeholder="0.6 mm"
                />
              </label>
              <label>
                Hardness Target (54–64 HRC)
                <input
                  value={form.hardnessHrc}
                  onChange={(e) => setForm({ ...form, hardnessHrc: e.target.value })}
                  placeholder="58 HRC"
                />
              </label>
            </div>
          )}

          {stageCode === 'LOAD_TESTING' && (
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid var(--line)' }}>
              <label>
                100% Load Test Rig ID (Sec 27)
                <input
                  value={form.testRigId}
                  onChange={(e) => setForm({ ...form, testRigId: e.target.value })}
                  placeholder="e.g. UCON-RIG-01"
                />
              </label>
            </div>
          )}

          <div className="form-grid">
            <label>
              Batch / Lot Code (Optional)
              <select
                value={form.batchId}
                onChange={(e) => setForm({ ...form, batchId: e.target.value })}
              >
                <option value="">Select Batch</option>
                {(data?.batches || []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_code} {b.material_lot ? `(${b.material_lot})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Machine (In-House)
              <select
                value={form.machineId}
                onChange={(e) => setForm({ ...form, machineId: e.target.value })}
              >
                <option value="">Select Machine (T1, T2, S1-S3, CNC...)</option>
                {(data?.machines || []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.machine_code} - {m.machine_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              Outsourced Vendor (If Subcontracted)
              <select
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
              >
                <option value="">Select Vendor (Murugan, Techmat, etc.)</option>
                {(data?.vendors || []).map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.canonical_name} {v.category ? `(${v.category})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Operator Name / Team
              <input
                placeholder="e.g. Ramesh / Shift A"
                value={form.operatorName}
                onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
              />
            </label>
          </div>

          {/* Quantities */}
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <label>
              Qty Input
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0"
                value={form.qtyIn}
                onChange={(e) => setForm({ ...form, qtyIn: e.target.value })}
              />
            </label>

            <label>
              Qty Good Output *
              <input
                type="number"
                step="0.001"
                min="0"
                required
                placeholder="0"
                value={form.qtyOut}
                onChange={(e) => setForm({ ...form, qtyOut: e.target.value })}
              />
            </label>

            <label>
              Qty Rejected
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0"
                value={form.qtyRejected}
                onChange={(e) => setForm({ ...form, qtyRejected: e.target.value })}
              />
            </label>
          </div>

          {/* Section 14 CNC Yield Comparison Banner */}
          {stageCode === 'CNC' && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 750, color: 'var(--navy)' }}>
                <span>Section 14: Thumb Rule Yield Comparison</span>
                <span>Reference: 6,600 wedges / ton</span>
              </div>
              <div style={{ color: '#1e40af', marginTop: 4 }}>
                {referenceOutput ? (
                  <span>
                    Actual Output: <b>{qtyOutNum}</b> vs Expected Reference: <b>{referenceOutput}</b> ({yieldVsReference}% performance)
                  </span>
                ) : (
                  <span>Enter input quantity to compare against the 6,600 wedges/ton reference thumb rule.</span>
                )}
              </div>
            </div>
          )}

          {/* Live Yield & Rejection Rate Display */}
          {liveYield !== null && (
            <div
              style={{
                background: '#f4f7fc',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
              }}
            >
              <div>
                <b>Calculated Yield:</b>{' '}
                <span style={{ color: Number(liveYield) >= 90 ? 'var(--green)' : 'var(--amber)', fontWeight: 800 }}>
                  {liveYield}%
                </span>
              </div>
              {liveRejectionRate !== null && (
                <div>
                  <b>Rejection Rate:</b>{' '}
                  <span style={{ color: 'var(--red)', fontWeight: 800 }}>{liveRejectionRate}%</span>
                </div>
              )}
            </div>
          )}

          {qtyRejNum > 0 && (
            <div className="form-grid">
              <label>
                Rejection Reason
                <input
                  placeholder="e.g. Dimensional error, crack, tap breakage"
                  value={form.rejectionReason}
                  onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })}
                />
              </label>
              <label>
                Disposition (Sec 16 &amp; 31)
                <select
                  value={form.disposition}
                  onChange={(e) => setForm({ ...form, disposition: e.target.value })}
                >
                  <option value="SCRAP">Scrap (Recorded separately under scrap)</option>
                  <option value="REWORK">Rework (Internal correction)</option>
                  <option value="VENDOR_RETURN">Return to Vendor (Debit Note)</option>
                </select>
              </label>
            </div>
          )}

          <label>
            Notes &amp; Observations
            <textarea
              placeholder="Enter batch remarks, heat treatment parameters, hardness results, or machine condition"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {message && (
            <div
              className={message.startsWith('Error') ? 'error-box' : 'notice'}
            >
              {message}
            </div>
          )}

          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Record Production Entry'}
          </button>
        </form>

        {/* Production Logs Section */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent Production Records</h2>
              <small className="muted">
                {stageFilter ? `Showing stage: ${stageFilter}` : 'All stages'} ({filteredRows.length} records)
              </small>
            </div>
            <button className="ghost" onClick={reload}>
              Refresh
            </button>
          </div>

          <div className="toolbar" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search batch, operator, machine, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty">Loading production records…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Stage</th>
                    <th>Batch</th>
                    <th>Qty In</th>
                    <th>Qty Out</th>
                    <th>Rejected</th>
                    <th>Yield</th>
                    <th>Machine / Vendor</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length ? (
                    filteredRows.map((r: any) => {
                      const inVal = Number(r.qty_in) || 0;
                      const outVal = Number(r.qty_out) || 0;
                      const yieldVal = inVal > 0 ? ((outVal / inVal) * 100).toFixed(1) + '%' : '—';
                      return (
                        <tr key={r.id}>
                          <td><b>{r.production_date}</b></td>
                          <td>
                            <span className="badge">
                              {r.stage}
                            </span>
                          </td>
                          <td><code>{r.batch_code || '—'}</code></td>
                          <td>{inVal.toLocaleString('en-IN')}</td>
                          <td style={{ color: 'var(--navy)', fontWeight: 700 }}>
                            {outVal.toLocaleString('en-IN')}
                          </td>
                          <td style={{ color: r.qty_rejected > 0 ? 'var(--red)' : 'inherit' }}>
                            {r.qty_rejected || 0}
                            {r.rejection_reason ? ` (${r.rejection_reason})` : ''}
                          </td>
                          <td><b>{yieldVal}</b></td>
                          <td>{r.machine_name || r.vendor_name || '—'}</td>
                          <td>{r.operator_name || '—'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty">No production records found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
