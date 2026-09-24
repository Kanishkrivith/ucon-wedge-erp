'use client';

import { useERP } from '../_components/ModulePage';
import { useState, useMemo } from 'react';

// Generates all historical months from January 2024 through current month (September 2026+)
function generateHistoricalMonths(): string[] {
  const months: string[] = [];
  const startYear = 2024;
  const currentYear = 2026;
  const currentMonth = 9;

  for (let y = currentYear; y >= startYear; y--) {
    const endM = y === currentYear ? currentMonth : 12;
    for (let m = endM; m >= 1; m--) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return months;
}

const ALL_HISTORICAL_MONTHS = generateHistoricalMonths();

export default function CostingPage() {
  const { data, loading, reload } = useERP('costing');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  const expenses = data?.expenses || [];
  const production = data?.production || [];
  const capex = data?.capex || [];

  const activeMonth = selectedMonth;

  // Calculate snapshot metrics for the active month (Section 33 & 81)
  const snapshot = useMemo(() => {
    const monthExpenses = expenses.filter((e: any) => e.month === activeMonth);
    const monthProd = production.find((p: any) => p.month === activeMonth) || { total_out: 0, total_rejected: 0 };
    const monthCapex = capex.find((c: any) => c.month === activeMonth)?.capex_investment || 0;

    let cncExp = 0;
    let tappingExp = 0;
    let slittingExp = 0;
    let toolsExp = 0;
    let htExp = 0;
    let rawMaterialExp = 0;
    let labourExp = 0;
    let otherExp = 0;
    let scrapRecovery = 0;

    for (const exp of monthExpenses) {
      const amt = Number(exp.total_amount) || 0;
      const cat = (exp.category || '').toUpperCase();
      if (cat.includes('CNC')) cncExp += amt;
      else if (cat.includes('TAPPING')) tappingExp += amt;
      else if (cat.includes('SLITTING')) slittingExp += amt;
      else if (cat.includes('TOOL')) toolsExp += amt;
      else if (cat.includes('HEAT') || cat.includes('HT')) htExp += amt;
      else if (cat.includes('RAW') || cat.includes('STEEL')) rawMaterialExp += amt;
      else if (cat.includes('LABOUR') || cat.includes('SALARY')) labourExp += amt;
      else if (cat.includes('SCRAP')) scrapRecovery += amt;
      else otherExp += amt;
    }

    const totalManufacturingCost =
      cncExp + tappingExp + slittingExp + toolsExp + htExp + rawMaterialExp + labourExp + otherExp - scrapRecovery;

    const goodQty = Number(monthProd.total_out) || 0;
    const rejQty = Number(monthProd.total_rejected) || 0;
    const totalQty = goodQty + rejQty;
    const actualYield = totalQty > 0 ? ((goodQty / totalQty) * 100).toFixed(1) + '%' : '—';
    const costPerWedge = goodQty > 0 ? (totalManufacturingCost / goodQty).toFixed(2) : '—';

    return {
      month: activeMonth,
      goodQty,
      rejectedQty: rejQty,
      actualYield,
      cncExp,
      tappingExp,
      slittingExp,
      toolsExp,
      htExp,
      rawMaterialExp,
      labourExp,
      otherExp,
      scrapRecovery,
      totalManufacturingCost,
      costPerWedge,
      monthCapex: Number(monthCapex),
      itemizedExpenses: monthExpenses,
    };
  }, [activeMonth, expenses, production, capex]);

  const drilledItems = useMemo(() => {
    if (!drillCategory) return [];
    return snapshot.itemizedExpenses.filter((e: any) =>
      (e.category || '').toUpperCase().includes(drillCategory.toUpperCase())
    );
  }, [snapshot.itemizedExpenses, drillCategory]);

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">SOURCE OF TRUTH SEC 33, 34, 35 &amp; 81</div>
          <h1>Monthly Business Snapshot &amp; Costing</h1>
          <p>
            Permanent historical reconstruction from January 2024 to September 2026 and forward.
            Strict separation of CapEx machine investments from direct wedge operating expenses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, fontWeight: 750, color: 'var(--navy)' }}>
            Select Month:
            <select
              value={activeMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setDrillCategory(null);
              }}
              style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 700 }}
            >
              {ALL_HISTORICAL_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m} {m === '2026-09' ? '(Current Month)' : m === '2024-01' ? '(Project Start)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost" onClick={reload}>Refresh</button>
        </div>
      </div>

      {/* Formula & Rule Callout */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #d5dee9',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="eyebrow">APPROVED COSTING FORMULA (SEC 35 &amp; 81)</span>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)', marginTop: 2 }}>
            Cost / Wedge = (Operating Expenses - Scrap Recovery) ÷ Good Wedge Output
          </div>
        </div>
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 11,
            color: '#92400e',
            fontWeight: 750,
          }}
        >
          🛡️ CapEx Rule (Sec 34): Machine purchases are segregated &amp; never added to monthly wedge cost.
        </div>
      </div>

      {/* Snapshot Top KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Good Production</div>
          <div className="stat-value">{snapshot.goodQty.toLocaleString('en-IN')}</div>
          <div className="stat-sub">Yield: {snapshot.actualYield} ({snapshot.rejectedQty} rejections)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Manufacturing Cost</div>
          <div className="stat-value" style={{ color: 'var(--navy)' }}>
            ₹{snapshot.totalManufacturingCost.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">Direct net operating costs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cost per Wedge</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {snapshot.costPerWedge === '—' ? '—' : `₹${snapshot.costPerWedge}`}
          </div>
          <div className="stat-sub">Total Cost ÷ Good Output</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CapEx Investment (Quarantined)</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>
            ₹{snapshot.monthCapex.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">Machine asset acquisition</div>
        </div>
      </div>

      {/* Master Hierarchy Tree Table (Section 81) */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Monthly Business Snapshot — Hierarchy Tree ({snapshot.month})</h2>
            <small className="muted">Click any expense category to drill down into supporting invoice documents</small>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Section 81 Hierarchy Node</th>
                <th>Classification</th>
                <th>Amount (₹) / Quantity</th>
                <th>Action &amp; Evidence</th>
              </tr>
            </thead>
            <tbody>
              {/* Production Node */}
              <tr style={{ background: '#f8fafc' }}>
                <td><b>1. Production</b></td>
                <td>Good Wedges: {snapshot.goodQty.toLocaleString('en-IN')} · Rejections: {snapshot.rejectedQty.toLocaleString('en-IN')}</td>
                <td style={{ fontWeight: 800 }}>Yield: {snapshot.actualYield}</td>
                <td><span className="badge green">Shop Floor Ledger</span></td>
              </tr>

              {/* Raw Material Node */}
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Raw Material Purchases</b></td>
                <td>20MnCr5 Round Bar (25mm / 26mm)</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.rawMaterialExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('RAW')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              {/* Operating Expenses */}
              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>CNC Machining Expenses</b></td>
                <td>Subcontract Turning (Murugan, Everbright, etc.)</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.cncExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('CNC')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Tapping Expenses</b></td>
                <td>T1 &amp; T2 Machines, Product 1305 Coolant</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.tappingExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('TAPPING')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Slitting Expenses</b></td>
                <td>S1, S2, S3 Machine Operations</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.slittingExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('SLITTING')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Tools &amp; Accessories</b></td>
                <td>Taps, 4" Slitting Saw Blades, Inserts, Regrinding</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.toolsExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('TOOL')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Heat Treatment &amp; Hardening</b></td>
                <td>Subcontract (Techmat, Thermal; 54–64 HRC)</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.htExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('HEAT')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Labour &amp; Operators</b></td>
                <td>Direct Production Wages &amp; Shifts</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.labourExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('LABOUR')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              <tr>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Other Operating Expenses</b></td>
                <td>Washing, DM Water, Packaging, Load Rig</td>
                <td style={{ fontWeight: 700 }}>₹{snapshot.otherExp.toLocaleString('en-IN')}</td>
                <td>
                  <button className="ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setDrillCategory('OTHER')}>
                    Drill Invoices
                  </button>
                </td>
              </tr>

              {/* Scrap Recovery */}
              <tr style={{ background: '#fef6f6' }}>
                <td>&nbsp;&nbsp;&nbsp;&nbsp;↳ <b style={{ color: 'var(--red)' }}>Less: Scrap Recovery</b></td>
                <td>Credit / Turnings Sale (Deducted from Cost)</td>
                <td style={{ fontWeight: 800, color: 'var(--red)' }}>- ₹{snapshot.scrapRecovery.toLocaleString('en-IN')}</td>
                <td><span className="badge amber">Sec 31 Scrap Credit</span></td>
              </tr>

              {/* Total Manufacturing Cost */}
              <tr style={{ background: '#f0f5fc', borderTop: '2px solid var(--navy)' }}>
                <td><b style={{ fontSize: 13, color: 'var(--navy)' }}>TOTAL MANUFACTURING COST</b></td>
                <td><b>Net Operational Sum</b></td>
                <td style={{ fontSize: 14, fontWeight: 900, color: 'var(--navy)' }}>
                  ₹{snapshot.totalManufacturingCost.toLocaleString('en-IN')}
                </td>
                <td><span className="badge green">Section 81 Total</span></td>
              </tr>

              {/* Cost Per Wedge */}
              <tr style={{ background: '#eaf8f1', borderTop: '1px solid #16845b' }}>
                <td><b style={{ fontSize: 14, color: 'var(--green)' }}>COST PER WEDGE</b></td>
                <td><b>(Total Cost ÷ Good Output)</b></td>
                <td style={{ fontSize: 16, fontWeight: 900, color: 'var(--green)' }}>
                  {snapshot.costPerWedge === '—' ? '—' : `₹${snapshot.costPerWedge} / piece`}
                </td>
                <td>Calculated on {snapshot.goodQty.toLocaleString('en-IN')} pieces</td>
              </tr>

              {/* Machine CapEx */}
              <tr style={{ background: '#fffbeb', borderTop: '2px dashed var(--amber)' }}>
                <td><b style={{ color: 'var(--amber)' }}>2. Machines / CapEx Investment</b></td>
                <td>CNC, Tapping, Slitting Machine Purchases</td>
                <td style={{ fontWeight: 900, color: 'var(--amber)' }}>₹{snapshot.monthCapex.toLocaleString('en-IN')}</td>
                <td><span className="badge red">Sec 34: Excluded from Wedge Cost</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Drill-down Drawer (Section 60 & 72) */}
      {drillCategory && (
        <div className="panel" style={{ marginTop: 20, border: '2px solid var(--blue)' }}>
          <div className="panel-head">
            <div>
              <div className="eyebrow">DOCUMENT EVIDENCE DRILL-DOWN (SEC 60 &amp; 72)</div>
              <h2>Itemized Invoices for Category: {drillCategory} ({snapshot.month})</h2>
            </div>
            <button className="ghost" onClick={() => setDrillCategory(null)}>Close Drill-down</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {drilledItems.length ? (
                  drilledItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td><b>{item.vendor_name || 'Vendor'}</b></td>
                      <td><span className="badge">{item.category}</span></td>
                      <td style={{ fontWeight: 750 }}>₹{Number(item.total_amount).toLocaleString('en-IN')}</td>
                      <td><span className="badge green">Verified</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">No individual verified invoices recorded for this category in {snapshot.month}.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
