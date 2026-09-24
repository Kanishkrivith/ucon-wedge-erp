'use client';

import { useERP, Stat } from '../_components/ModulePage';
import Link from 'next/link';
import { useState } from 'react';

const PRESET_QUERIES = [
  'What is our current cost per wedge?',
  'How much have we invested in machinery (CapEx)?',
  'Which vendor supplied the cheapest raw material?',
  'What are our CNC machining rates?',
  'What are our tapping and slitting tooling details?',
  'What is our expected cost at 75,000 pieces/month?',
];

export default function DashboardPage() {
  const { data, loading, reload } = useERP('dashboard');
  const metrics = data?.metrics || {};

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
          <p>Real-time manufacturing oversight, quality metrics, operational expenses, and management intelligence.</p>
        </div>
        <button className="ghost" onClick={reload}>Refresh Metrics</button>
      </div>

      {/* Primary KPI Grid */}
      <div className="stats-grid">
        <Stat
          label="This Month Good Output"
          value={loading ? '…' : Number(metrics.monthlyGood || 0).toLocaleString('en-IN')}
          sub="Finished wedges passed QC"
          color="var(--navy)"
        />
        <Stat
          label="This Month Rejections"
          value={loading ? '…' : Number(metrics.monthlyRejected || 0).toLocaleString('en-IN')}
          sub="Scrap / rework candidates"
          color="var(--red)"
        />
        <Stat
          label="Manufacturing Yield"
          value={loading ? '…' : metrics.yieldPct || '—'}
          sub="Section 14 thumb rule: 6,600/ton"
          color="var(--green)"
        />
        <Stat
          label="Monthly Operational Cost"
          value={loading ? '…' : `₹${Number(metrics.monthlyExpenses || 0).toLocaleString('en-IN')}`}
          sub="Excludes CapEx investments"
        />
      </div>

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
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--navy)' }}>Ask UCON — Management Intelligence</h2>
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
              style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
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
            <h2>Pending Reviews &amp; Approvals</h2>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fafbfc', border: '1px solid var(--line)', borderRadius: 10 }}>
              <div>
                <b>Pending Invoices</b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Supplier and subcontractor bills</div>
              </div>
              <span className="badge amber" style={{ fontSize: 13, padding: '6px 12px' }}>
                {metrics.pendingInvoices || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fafbfc', border: '1px solid var(--line)', borderRadius: 10 }}>
              <div>
                <b>Document OCR Inbox</b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Scanned PDFs awaiting verification</div>
              </div>
              <span className="badge" style={{ fontSize: 13, padding: '6px 12px' }}>
                {metrics.pendingDocuments || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fafbfc', border: '1px solid var(--line)', borderRadius: 10 }}>
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
            <Link href="/production" className="ghost" style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}>
              <b style={{ fontSize: 14 }}>⚙ Daily Production</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>15-Stage sequences &amp; live yield</span>
            </Link>

            <Link href="/documents" className="ghost" style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}>
              <b style={{ fontSize: 14 }}>▤ Documents &amp; AI</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>OCR line classification &amp; posting</span>
            </Link>

            <Link href="/inventory" className="ghost" style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}>
              <b style={{ fontSize: 14 }}>▦ Stock &amp; Inventory</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Raw bar, blanks &amp; WIP stock</span>
            </Link>

            <Link href="/costing" className="ghost" style={{ padding: '16px', display: 'grid', gap: 4, textAlign: 'left', borderRadius: 10 }}>
              <b style={{ fontSize: 14 }}>₹ Monthly Snapshot</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sec 81 hierarchy &amp; CapEx reports</span>
            </Link>
          </div>

          <div style={{ marginTop: 18, padding: '12px 14px', background: '#edf4ff', borderRadius: 10, fontSize: 12 }}>
            <b style={{ color: 'var(--blue)' }}>Section 34 Rule Segregation:</b>
            <span style={{ color: '#2d4b75', marginLeft: 4 }}>
              Machine purchases (CapEx: ₹{Number(metrics.totalCapex || 0).toLocaleString('en-IN')}) are strictly segregated from monthly wedge manufacturing costs.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
