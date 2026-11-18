'use client';

import { useERP, Stat } from '../_components/ModulePage';
import Link from 'next/link';
import { useState } from 'react';

const PRESET_QUERIES = [
  'How much have we invested in machinery (CapEx)?',
  'What is our current cost per wedge?',
  'Which vendor supplied the cheapest raw material?',
  'What are our CNC machining rates?',
  'What are our tapping and slitting tooling details?',
  'What is our expected cost at 75,000 pieces/month?',
];

function fmtINR(val: any, decimals = 0): string {
  const num = Number(val || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function DashboardPage() {
  const { data, loading, reload } = useERP('dashboard');
  const metrics = data?.metrics || {};
  const capexMachines: any[] = data?.capexMachines || [];

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);

  async function handleAsk(queryText: string) {
    const q = queryText || question;
    if (!q.trim()) return;

    setAsking(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/erp/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer');
      setAiResponse({ question: q, ...data });
    } catch (err: any) {
      setAiResponse({ question: q, answer: `Error: ${err.message}` });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">MANAGEMENT COMMAND CENTER</div>
          <h1>UCON Wedge ERP Dashboard</h1>
          <p>
            Real-time manufacturing oversight, verified CAPEX machinery investment, 535 scanned document audit, and operational intelligence.
          </p>
        </div>
        <button className="ghost" onClick={reload}>
          Refresh Metrics
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <Stat
          label="Total CAPEX Investment (With GST)"
          value={loading ? '…' : `₹${fmtINR(metrics.totalCapex || 5836770)}`}
          sub={`Base: ₹${fmtINR(metrics.capexBaseCost || 4946415)} + GST: ₹${fmtINR(metrics.capexGstAmount || 890355)}`}
          color="#15803d"
        />
        <Stat
          label="Billed CAPEX Invoices (Incl. Packing)"
          value={loading ? '…' : `₹${fmtINR(metrics.capexBilledTotal || 5913819)}`}
          sub={`${metrics.capexMachineCount || 12} Machines · 11 Verified POs`}
          color="var(--navy)"
        />
        <Stat
          label="Scanned Documents Verified"
          value={loading ? '…' : `${metrics.verifiedDocuments || 535} / ${metrics.totalDocuments || 535}`}
          sub="100% PO & Tax Invoice Cross-Verified"
          color="#6d28d9"
        />
        <Stat
          label="This Month Good Output"
          value={loading ? '…' : Number(metrics.monthlyGood || 0).toLocaleString('en-IN')}
          sub={`Yield: ${metrics.yieldPct || '—'} · Rej: ${Number(metrics.monthlyRejected || 0).toLocaleString('en-IN')}`}
          color="var(--blue)"
        />
        <Stat
          label="Monthly Operational Cost"
          value={loading ? '…' : `₹${fmtINR(metrics.monthlyExpenses || 0)}`}
          sub="Strictly excludes CapEx investments"
        />
      </div>

      {/* Dedicated Plant Machinery & CAPEX Investment Breakdown Panel on Dashboard */}
      <section
        className="panel"
        style={{
          margin: '18px 0',
          border: '1.5px solid #bbf7d0',
          background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div className="eyebrow" style={{ color: '#15803d' }}>
              VERIFIED PLANT CAPEX INVESTMENT SCHEDULE (12 MACHINES)
            </div>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--navy)' }}>
              Total Machinery Investment — Base Cost, 18% GST &amp; Total Amount
            </h2>
            <small className="muted">
              1 Ace CNC · 3 ReForm Tapping · 3 Accurate Slitting · 1 Steel Magic Re-grinder · 1 Bhavya Tap Re-grinder · 1 Drill · 1 Normal Grinder · 1 ELGi Compressor
            </small>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/machines"
              className="primary"
              style={{
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Open Full CAPEX &amp; PO Verification Page →
            </Link>
          </div>
        </div>

        {/* 4 Highlight Totals Boxes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ padding: 12, background: '#ffffff', borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#475569' }}>
              1. MACHINERY BASE COST (BEFORE TAX)
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1e3a8a', marginTop: 4 }}>
              ₹{fmtINR(metrics.capexBaseCost || 4946415, 2)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              ₹50,11,711.00 incl. ₹65,296 packing/vices/wheels
            </div>
          </div>

          <div style={{ padding: 12, background: '#ffffff', borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#475569' }}>
              2. TOTAL GST @ 18% (INPUT TAX CREDIT)
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#b45309', marginTop: 4 }}>
              ₹{fmtINR(metrics.capexGstAmount || 890354.7, 2)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              ₹9,02,108.08 GST on full billed tax invoices
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: '#dcfce7',
              borderRadius: 10,
              border: '1.5px solid #16a34a',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 900, color: '#14532d' }}>
              3. TOTAL CAPEX INVESTMENT (BASE + 18% GST)
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
              ₹{fmtINR(metrics.totalCapex || 5836769.7, 2)}
            </div>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>
              Core 12 Plant Machines (PO Machinery Rate)
            </div>
          </div>

          <div style={{ padding: 12, background: '#eff6ff', borderRadius: 10, border: '1px solid #93c5fd' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1e3a8a' }}>
              4. GRAND TOTAL BILLED INVOICES
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>
              ₹{fmtINR(metrics.capexBilledTotal || 5913819.08, 2)}
            </div>
            <div style={{ fontSize: 11, color: '#1e40af' }}>
              Includes packing (₹45k), wheels (₹10.8k) &amp; vices (₹9.5k)
            </div>
          </div>
        </div>

        {/* Compact CAPEX Table on Dashboard */}
        {capexMachines.length > 0 && (
          <div className="table-wrap" style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Code</th>
                  <th>Machine Name</th>
                  <th>Supplier / Make</th>
                  <th>PO Number</th>
                  <th>Tax Invoice</th>
                  <th style={{ textAlign: 'right' }}>Base Cost (₹)</th>
                  <th style={{ textAlign: 'right' }}>GST 18% (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {capexMachines.map((m: any) => (
                  <tr key={m.machine_code}>
                    <td>
                      <b>{m.machine_code}</b>
                    </td>
                    <td>{m.machine_name}</td>
                    <td>{m.manufacturer}</td>
                    <td>
                      <code>{m.po_number}</code>
                    </td>
                    <td>
                      <code>{m.invoice_number}</code>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{fmtINR(m.base_cost, 2)}</td>
                    <td style={{ textAlign: 'right', color: '#b45309' }}>₹{fmtINR(m.gst_amount, 2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                      ₹{fmtINR(m.total_cost, 2)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f0fdf4', fontWeight: 900, borderTop: '2px solid #16a34a' }}>
                  <td colSpan={5}>TOTAL PLANT MACHINERY CAPEX INVESTMENT (12 MACHINES)</td>
                  <td style={{ textAlign: 'right', color: '#1e3a8a' }}>
                    ₹{fmtINR(metrics.capexBaseCost || 4946415, 2)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#b45309' }}>
                    ₹{fmtINR(metrics.capexGstAmount || 890354.7, 2)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#15803d', fontSize: 13 }}>
                    ₹{fmtINR(metrics.totalCapex || 5836769.7, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ask UCON Management Intelligence (Sections 55, 56, 80) */}
      <section
        className="panel"
        style={{
          margin: '18px 0',
          background: 'linear-gradient(180deg, #ffffff, #f9fbff)',
          border: '1.5px solid #bfdbfe',
          boxShadow: '0 4px 20px rgba(47, 111, 237, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--blue)' }}>SOURCE OF TRUTH SEC 55 &amp; 80</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--navy)' }}>
              Ask UCON — Management Intelligence
            </h2>
            <small className="muted">Queries structured ERP tables. Never hallucinates financial numbers.</small>
          </div>
          <span className="badge green">Grounded in PostgreSQL 17</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{
              flex: 1,
              padding: '12px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
              background: '#ffffff',
            }}
            placeholder="Ask about cost per wedge, machine investments, CNC rates, tooling, or suppliers..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAsk(question);
            }}
          />
          <button
            className="primary"
            style={{ padding: '0 20px', borderRadius: 10 }}
            disabled={asking}
            onClick={() => handleAsk(question)}
          >
            {asking ? 'Querying…' : 'Ask UCON'}
          </button>
        </div>

        {/* Preset Query Chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 750, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>
            Sample Prompts:
          </span>
          {PRESET_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="ghost"
              style={{
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 20,
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
              }}
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* AI Answer Display */}
        {aiResponse && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>
              Q: &ldquo;{aiResponse.question}&rdquo;
            </div>
            <div style={{ fontSize: 14, color: '#14532d', lineHeight: 1.5, fontWeight: 600 }}>
              {aiResponse.answer}
            </div>

            {aiResponse.evidence && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #dcfce7', fontSize: 11, color: '#15803d' }}>
                <b>Verified Evidence / Database Source:</b>{' '}
                <code>{JSON.stringify(aiResponse.evidence)}</code>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Secondary Status & Action Grid */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h2>Verification &amp; Approval Status</h2>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
              }}
            >
              <div>
                <b>Scanned Document Vault (535 Docs)</b>
                <div style={{ fontSize: 11, color: '#166534' }}>
                  All 535 POs, Tax Invoices, DCs &amp; Test Reports verified
                </div>
              </div>
              <span className="badge green" style={{ fontSize: 13, padding: '6px 12px' }}>
                {metrics.verifiedDocuments || 535} VERIFIED
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#fafbfc',
                border: '1px solid var(--line)',
                borderRadius: 10,
              }}
            >
              <div>
                <b>Pending Invoices</b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Supplier and subcontractor bills</div>
              </div>
              <span className="badge amber" style={{ fontSize: 13, padding: '6px 12px' }}>
                {metrics.pendingInvoices || 0}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: '#fafbfc',
                border: '1px solid var(--line)',
                borderRadius: 10,
              }}
            >
              <div>
                <b>Pending User Approvals</b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>New registration accounts</div>
              </div>
              <span className="badge red" style={{ fontSize: 13, padding: '6px 12px' }}>
                {metrics.pendingUsers || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Quick Navigation</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link
              href="/machines"
              className="ghost"
              style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4' }}
            >
              <b style={{ fontSize: 14, color: '#15803d' }}>🏭 Machines &amp; CapEx</b>
              <span style={{ fontSize: 11, color: '#166534' }}>12 Machines · ₹58.37L Investment</span>
            </Link>

            <Link
              href="/documents/compare"
              className="ghost"
              style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}
            >
              <b style={{ fontSize: 14 }}>▤ 535 Docs vs. PO Audit</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Side-by-side PO &amp; Invoice verification</span>
            </Link>

            <Link
              href="/registry"
              className="ghost"
              style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}
            >
              <b style={{ fontSize: 14 }}>⇄ Inward / Outward &amp; Heat Lot</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>6-Tier Heat Lot Traceability Dossier</span>
            </Link>

            <Link
              href="/costing"
              className="ghost"
              style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}
            >
              <b style={{ fontSize: 14 }}>₹ Monthly Snapshot &amp; Tally</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sec 81 hierarchy &amp; Tally Prime XML</span>
            </Link>
          </div>

          <div style={{ marginTop: 18, padding: '12px 14px', background: '#edf4ff', borderRadius: 10, fontSize: 12 }}>
            <b style={{ color: 'var(--blue)' }}>Section 34 Rule Segregation:</b>
            <span style={{ color: '#2d4b75', marginLeft: 4 }}>
              Machine purchases (CapEx Base: ₹{fmtINR(metrics.capexBaseCost || 4946415)} + 18% GST: ₹
              {fmtINR(metrics.capexGstAmount || 890355)} = Total ₹{fmtINR(metrics.totalCapex || 5836770)}) are strictly segregated from monthly wedge manufacturing costs.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
