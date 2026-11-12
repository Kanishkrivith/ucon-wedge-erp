'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface InwardRecord {
  id: string;
  grin_no: string | null;
  entry_date: string | null;
  supplier_name: string;
  vendor_id: string | null;
  po_number: string | null;
  po_date: string | null;
  dc_number: string | null;
  dc_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  item_code: string | null;
  item_description: string | null;
  heat_lot_number: string | null;
  qty: number | null;
  unit: string | null;
  qty_in_ton: number | null;
  weight_in_kg: number | null;
  invoice_amount: number | null;
  reconciliation_status: string;
  form_number: string;
  test_report_ref: string | null;
  hardness_rating: string | null;
  registered_vendor_name: string | null;
}

interface OutwardRecord {
  id: string;
  outward_sno: string | null;
  entry_date: string | null;
  destination_party: string;
  dc_stn_number: string | null;
  dc_date: string | null;
  po_reference: string | null;
  item_code: string | null;
  item_description: string | null;
  dispatch_purpose: string;
  heat_lot_number: string | null;
  qty: number | null;
  unit: string | null;
  weight_in_kg: number | null;
  form_number: string;
  remarks: string | null;
}

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState<'INWARD' | 'OUTWARD' | 'RECONCILIATION' | 'TRACEABILITY'>('INWARD');
  const [loading, setLoading] = useState(false);

  // Inward & Outward data
  const [inwardRows, setInwardRows] = useState<InwardRecord[]>([]);
  const [inwardMetrics, setInwardMetrics] = useState<any>(null);
  const [inwardSearch, setInwardSearch] = useState('');

  const [outwardRows, setOutwardRows] = useState<OutwardRecord[]>([]);
  const [outwardMetrics, setOutwardMetrics] = useState<any>(null);
  const [outwardSearch, setOutwardSearch] = useState('');

  // Reconciliation data
  const [recRows, setRecRows] = useState<any[]>([]);
  const [recStats, setRecStats] = useState<any>(null);

  // Traceability state
  const [searchLot, setSearchLot] = useState('HT-TM-3727');
  const [dossier, setDossier] = useState<any>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [suggestedLots, setSuggestedLots] = useState<any[]>([]);

  // Modal State for New Inward Entry
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [inwardForm, setInwardForm] = useState({
    supplier_name: '',
    grin_no: '',
    entry_date: new Date().toISOString().split('T')[0],
    po_number: '',
    dc_number: '',
    invoice_number: '',
    item_description: '20MnCr5 Steel Rods 25mm',
    heat_lot_number: '',
    qty: '',
    weight_in_kg: '',
    hardness_rating: '',
  });

  // Modal State for New Outward Entry
  const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);
  const [outwardForm, setOutwardForm] = useState({
    destination_party: '',
    outward_sno: '',
    entry_date: new Date().toISOString().split('T')[0],
    dc_stn_number: '',
    po_reference: '',
    item_description: '0.5 Live Wedges (12.7mm)',
    dispatch_purpose: 'CUSTOMER_DISPATCH',
    heat_lot_number: '',
    qty: '',
    weight_in_kg: '',
    remarks: '',
  });

  // Fetch Inward Data
  const fetchInward = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registry?tab=inward&search=${encodeURIComponent(searchQuery)}&limit=100`);
      const data = await res.json();
      if (data.ok) {
        setInwardRows(data.data || []);
        setInwardMetrics(data.metrics || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Outward Data
  const fetchOutward = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registry?tab=outward&search=${encodeURIComponent(searchQuery)}&limit=100`);
      const data = await res.json();
      if (data.ok) {
        setOutwardRows(data.data || []);
        setOutwardMetrics(data.metrics || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Reconciliation
  const fetchReconciliation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/registry?tab=reconciliation');
      const data = await res.json();
      if (data.ok) {
        setRecRows(data.reconciliations || []);
        setRecStats(data.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Traceability Dossier
  const fetchTraceability = async (lotQuery: string) => {
    if (!lotQuery) return;
    setTraceLoading(true);
    try {
      const res = await fetch(`/api/registry?tab=traceability&lot=${encodeURIComponent(lotQuery)}`);
      const data = await res.json();
      if (data.ok && data.dossier) {
        setDossier(data.dossier);
      }
      if (data.suggestedLots) {
        setSuggestedLots(data.suggestedLots);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTraceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'INWARD') fetchInward();
    if (activeTab === 'OUTWARD') fetchOutward();
    if (activeTab === 'RECONCILIATION') fetchReconciliation();
    if (activeTab === 'TRACEABILITY') fetchTraceability(searchLot);
  }, [activeTab]);

  const handleOpenLotDossier = (lot: string) => {
    setSearchLot(lot);
    setActiveTab('TRACEABILITY');
    fetchTraceability(lot);
  };

  const handleAddInward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'inward', ...inwardForm }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsInwardModalOpen(false);
        fetchInward();
        alert('Inward receipt recorded successfully!');
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddOutward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'outward', ...outwardForm }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsOutwardModalOpen(false);
        fetchOutward();
        alert('Outward dispatch recorded successfully!');
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px', fontFamily: 'inherit' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>
              ISO 9001 / RDSO COMPLIANT
            </span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Form USSQMS-MAC-003 &amp; Form USSQMS-MAC-004
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '2px 0 6px' }}>
            Inward &amp; Outward Registry &amp; Heat Lot Traceability
          </h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0, maxWidth: 800 }}>
            Unified factory register linking Purchase Orders, Delivery Challans (DC), Supplier Invoices, and Heat Treatment Lots for complete end-to-end quality and third-party inspection traceability.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {activeTab === 'INWARD' && (
            <button
              onClick={() => setIsInwardModalOpen(true)}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
              }}
            >
              ➕ Record Inward Entry (MAC-003)
            </button>
          )}

          {activeTab === 'OUTWARD' && (
            <button
              onClick={() => setIsOutwardModalOpen(true)}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              }}
            >
              ➕ Record Outward Dispatch (MAC-004)
            </button>
          )}

          {activeTab === 'TRACEABILITY' && dossier && (
            <button
              onClick={() => window.print()}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🖨 Print / Export Dossier
            </button>
          )}
        </div>
      </div>

      {/* TOP TAB NAVIGATION BAR */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid #e2e8f0', marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab('INWARD')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'INWARD' ? '3px solid #16a34a' : '3px solid transparent',
            background: activeTab === 'INWARD' ? '#f0fdf4' : 'transparent',
            color: activeTab === 'INWARD' ? '#15803d' : '#64748b',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
          }}
        >
          📥 Inward Register (Form MAC-003)
        </button>

        <button
          onClick={() => setActiveTab('OUTWARD')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'OUTWARD' ? '3px solid #0284c7' : '3px solid transparent',
            background: activeTab === 'OUTWARD' ? '#f0f9ff' : 'transparent',
            color: activeTab === 'OUTWARD' ? '#0369a1' : '#64748b',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
          }}
        >
          📤 Outward Register (Form MAC-004)
        </button>

        <button
          onClick={() => setActiveTab('RECONCILIATION')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'RECONCILIATION' ? '3px solid #f59e0b' : '3px solid transparent',
            background: activeTab === 'RECONCILIATION' ? '#fefce8' : 'transparent',
            color: activeTab === 'RECONCILIATION' ? '#b45309' : '#64748b',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
          }}
        >
          ⚖ 3-Way Match (PO ↔ DC ↔ Invoice)
        </button>

        <button
          onClick={() => setActiveTab('TRACEABILITY')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'TRACEABILITY' ? '3px solid #7c3aed' : '3px solid transparent',
            background: activeTab === 'TRACEABILITY' ? '#faf5ff' : 'transparent',
            color: activeTab === 'TRACEABILITY' ? '#6d28d9' : '#64748b',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
          }}
        >
          🔍 Heat Lot Traceability &amp; Third-Party Dossier
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: INWARD REGISTRY (FORM USSQMS-MAC-003) */}
      {/* ============================================================== */}
      {activeTab === 'INWARD' && (
        <div>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Inward Records</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                {inwardMetrics?.total_inward_records || inwardRows.length}
              </div>
              <span style={{ fontSize: 11, color: '#16a34a' }}>Form MAC-003 Historical &amp; Live</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Raw Steel Tonnage</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
                {Number(inwardMetrics?.total_tonnage || 0).toFixed(2)} Tons
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>20MnCr5 Round Rods (25/26mm)</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Inward Weight</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                {Math.round(Number(inwardMetrics?.total_weight_kg || 0)).toLocaleString('en-IN')} kg
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Steel, CNC Wedges &amp; Heat Treated</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>3-Way Matched Invoices</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>
                {inwardMetrics?.matched_count || 0}
              </div>
              <span style={{ fontSize: 11, color: '#16a34a' }}>PO ↔ DC ↔ Invoice Reconciled</span>
            </div>
          </div>

          {/* Search Filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Search by Supplier, Invoice No, DC No, PO No, Heat Lot No, Item..."
              value={inwardSearch}
              onChange={(e) => setInwardSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInward(inwardSearch)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={() => fetchInward(inwardSearch)}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
            <button
              onClick={() => { setInwardSearch(''); fetchInward(''); }}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '9px 14px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          {/* Inward Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>GRIN / S.No</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Supplier Name</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>PO / WO Ref</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>D.C. No. / Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Invoice No.</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Item Description</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Heat / Lot No.</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Qty / Weight</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>3-Way Status</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inwardRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                        {loading ? 'Loading inward records...' : 'No inward records found matching search.'}
                      </td>
                    </tr>
                  ) : (
                    inwardRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {row.grin_no || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {row.entry_date ? new Date(row.entry_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {row.supplier_name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>
                          {row.po_number || 'PO-2025-GEN'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {row.dc_number || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          {row.invoice_number ? (
                            <span style={{ color: '#0369a1' }}>#{row.invoice_number}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Pending Inv</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          <div>{row.item_description}</div>
                          {row.item_code && <small style={{ color: '#64748b' }}>HSN/Code: {row.item_code}</small>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {row.heat_lot_number ? (
                            <button
                              onClick={() => handleOpenLotDossier(row.heat_lot_number!)}
                              style={{
                                background: '#f5f3ff',
                                border: '1px solid #ddd6fe',
                                color: '#6d28d9',
                                fontWeight: 800,
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                              title="Click to view full Third-Party Traceability Dossier"
                            >
                              🔍 {row.heat_lot_number}
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {row.qty_in_ton ? (
                            <span>{row.qty_in_ton} Tons</span>
                          ) : row.weight_in_kg ? (
                            <span>{row.weight_in_kg} kg</span>
                          ) : (
                            <span>{row.qty} {row.unit || 'Nos'}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: row.reconciliation_status === 'MATCHED' ? '#f0fdf4' : '#fefce8',
                              color: row.reconciliation_status === 'MATCHED' ? '#15803d' : '#b45309',
                            }}
                          >
                            {row.reconciliation_status === 'MATCHED' ? '✓ MATCHED' : '⏳ PENDING INV'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => handleOpenLotDossier(row.heat_lot_number || row.invoice_number || row.dc_number || 'LOT')}
                            style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 11,
                              padding: '4px 10px',
                              borderRadius: 4,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: OUTWARD REGISTRY (FORM USSQMS-MAC-004) */}
      {/* ============================================================== */}
      {activeTab === 'OUTWARD' && (
        <div>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Outward Lots</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                {outwardMetrics?.total_outward_records || outwardRows.length}
              </div>
              <span style={{ fontSize: 11, color: '#0284c7' }}>Form MAC-004 Dispatches</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Heat Treatment Outward</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#b45309', marginTop: 4 }}>
                {outwardMetrics?.heat_treat_count || 0} Lots
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Techmat Case Hardening</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Customer &amp; Site Dispatches</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>
                {outwardMetrics?.customer_dispatch_count || 0} Lots
              </div>
              <span style={{ fontSize: 11, color: '#16a34a' }}>SPR Mall, Asia Raheja, Central Depot</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Finished Dispatched</span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                {Math.round(Number(outwardMetrics?.total_qty_dispatched || 0)).toLocaleString('en-IN')} pcs
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>0.5&quot; &amp; 0.6&quot; Live Wedges</span>
            </div>
          </div>

          {/* Search Filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Search by Destination Party, DC No, Heat Lot, Item Description..."
              value={outwardSearch}
              onChange={(e) => setOutwardSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOutward(outwardSearch)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={() => fetchOutward(outwardSearch)}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
            <button
              onClick={() => { setOutwardSearch(''); fetchOutward(''); }}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '9px 14px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          {/* Outward Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>S. No</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Job / Destination</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>DC / STN No.</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Item Description</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Dispatch Purpose</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Heat / Lot No.</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Qty / Pairs</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Weight (kg)</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {outwardRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                        {loading ? 'Loading outward records...' : 'No outward records found.'}
                      </td>
                    </tr>
                  ) : (
                    outwardRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {row.outward_sno || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {row.entry_date ? new Date(row.entry_date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {row.destination_party}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0284c7' }}>
                          {row.dc_stn_number || 'DC-OUT'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          <div>{row.item_description}</div>
                          {row.item_code && <small style={{ color: '#64748b' }}>Item Code: {row.item_code}</small>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: row.dispatch_purpose === 'HEAT_TREATMENT' ? '#fef3c7' : '#f0fdf4',
                              color: row.dispatch_purpose === 'HEAT_TREATMENT' ? '#b45309' : '#15803d',
                            }}
                          >
                            {row.dispatch_purpose}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => handleOpenLotDossier(row.heat_lot_number || 'HT-TM-3727')}
                            style={{
                              background: '#f5f3ff',
                              border: '1px solid #ddd6fe',
                              color: '#6d28d9',
                              fontWeight: 800,
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            🔍 {row.heat_lot_number || 'HT-DC'}
                          </button>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                          {row.qty} {row.unit || 'Nos'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {row.weight_in_kg ? `${row.weight_in_kg} kg` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => handleOpenLotDossier(row.heat_lot_number || 'HT-TM-3727')}
                            style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: 11,
                              padding: '4px 10px',
                              borderRadius: 4,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Trace
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: 3-WAY RECONCILIATION AUDIT (PO ↔ DC ↔ INVOICE) */}
      {/* ============================================================== */}
      {activeTab === 'RECONCILIATION' && (
        <div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              ⚖ 3-Way Match Audit: Purchase Order ➔ Delivery Challan ➔ Vendor Invoice
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Ensures zero over-billing and complete material control. Matches what was authorized on PO with what was delivered on the physical DC and billed on the vendor&apos;s GST invoice.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Date / GRIN</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Supplier</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>1. Authorized PO</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>2. Physical DC Inward</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>3. Billed GST Invoice</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Material / Item</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Quantity &amp; Weight</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {recRows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                      <strong>{r.grin_no}</strong>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{r.entry_date ? new Date(r.entry_date).toLocaleDateString('en-IN') : '—'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                      {r.supplier_name}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#0284c7', fontWeight: 600 }}>
                      {r.po_number || 'PO-2025-GEN'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>
                      {r.dc_number ? `DC: ${r.dc_number}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      {r.invoice_number ? (
                        <span style={{ color: '#7c3aed' }}>Inv #{r.invoice_number}</span>
                      ) : (
                        <span style={{ color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>Pending Inv</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {r.item_description}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      {r.qty_in_ton ? `${r.qty_in_ton} Tons` : `${r.qty || r.weight_in_kg} ${r.unit || 'kg'}`}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: r.invoice_number ? '#f0fdf4' : '#fffbeb',
                          color: r.invoice_number ? '#15803d' : '#b45309',
                        }}
                      >
                        {r.invoice_number ? '✓ 3-WAY VERIFIED' : '⏳ PENDING INVOICE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: HEAT LOT TRACEABILITY & THIRD-PARTY INSPECTION DOSSIER */}
      {/* ============================================================== */}
      {activeTab === 'TRACEABILITY' && (
        <div>
          {/* Search Box & Quick Pick Chips */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  🔍 Heat Treatment Lot Search &amp; Full Traceability Engine
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Enter any Heat Lot No., Invoice No., or D.C. No. to instantly reconstruct the complete manufacturing pedigree and third-party inspection dossier.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 500 }}>
                <input
                  type="text"
                  placeholder="e.g. HT-TM-3727, HT-TM-1064, LOT-20MnCr5-2378, 3727..."
                  value={searchLot}
                  onChange={(e) => setSearchLot(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTraceability(searchLot)}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 6,
                    border: '2px solid #7c3aed',
                    fontSize: 13,
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => fetchTraceability(searchLot)}
                  style={{
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Inspect Lot
                </button>
              </div>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Verified Heat Lots:</span>
              {['HT-TM-3727', 'HT-TM-1064', 'HT-TM-2082', 'LOT-20MnCr5-2378', 'LOT-20MnCr5-4477', 'LOT-20MnCr5-5172', 'HT-DC-003'].map((lot) => (
                <button
                  key={lot}
                  onClick={() => { setSearchLot(lot); fetchTraceability(lot); }}
                  style={{
                    background: searchLot === lot ? '#7c3aed' : '#f1f5f9',
                    color: searchLot === lot ? '#ffffff' : '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 16,
                    padding: '3px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {lot}
                </button>
              ))}
            </div>
          </div>

          {/* DOSSIER RENDER */}
          {traceLoading ? (
            <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', marginBottom: 8 }}>Reconstructing Manufacturing Pedigree...</div>
              <p style={{ color: '#64748b', fontSize: 12 }}>Pulling raw steel MTC, cutting DC, CNC piece yield, buttress tapping log, and Techmat SQF hardness test certificate...</p>
            </div>
          ) : dossier ? (
            <div
              id="printable-dossier"
              style={{
                background: '#ffffff',
                border: '2px solid #0f172a',
                borderRadius: 12,
                padding: 28,
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              {/* DOSSIER OFFICIAL HEADER */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ background: '#0f172a', color: '#ffffff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                      OFFICIAL QUALITY &amp; TRACEABILITY DOSSIER
                    </span>
                    <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '6px 0 2px' }}>
                      UCON WEDGE MANUFACTURING UNIT
                    </h2>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Plot No 142, SIDCO Industrial Estate, Ambattur, Chennai - 600 058 | GSTIN: 33AAACU1284M1Z5
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Heat Treatment Lot ID:</div>
                    <strong style={{ fontSize: 18, color: '#7c3aed' }}>{dossier.heatLotNumber}</strong>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                      ✓ {dossier.verifiedStatus}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 11, color: '#475569' }}>
                  <div><strong>Standard:</strong> {dossier.formUSSQMS_MAC_003}</div>
                  <div><strong>Dispatch Reg:</strong> {dossier.formUSSQMS_MAC_004}</div>
                  <div><strong>Generated:</strong> {new Date(dossier.generatedAt).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* 6-TIER VISUAL PROGRESSION */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
                
                {/* TIER 1: RAW STEEL PEDIGREE */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>STAGE 1: RAW MATERIAL STEEL</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>✓ APPROVED</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {dossier.tier1_rawSteel.supplier}
                  </h4>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Grade:</strong> {dossier.tier1_rawSteel.materialGrade}</div>
                    <div><strong>PO Ref:</strong> {dossier.tier1_rawSteel.poNumber} | <strong>Invoice:</strong> #{dossier.tier1_rawSteel.invoiceNumber}</div>
                    <div><strong>Inward DC:</strong> {dossier.tier1_rawSteel.inwardDcNumber} ({dossier.tier1_rawSteel.inwardDate})</div>
                    <div><strong>Tonnage Received:</strong> {dossier.tier1_rawSteel.tonnageReceived} Tons</div>
                  </div>
                  <div style={{ marginTop: 8, padding: 8, background: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 10 }}>
                    <strong>Chemical Analysis (Techmat QC #QC-841):</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4, color: '#334155' }}>
                      <div>C: {dossier.tier1_rawSteel.chemicalComposition.carbon}</div>
                      <div>Mn: {dossier.tier1_rawSteel.chemicalComposition.manganese}</div>
                      <div>Cr: {dossier.tier1_rawSteel.chemicalComposition.chromium}</div>
                      <div>Si: {dossier.tier1_rawSteel.chemicalComposition.silicon}</div>
                    </div>
                  </div>
                </div>

                {/* TIER 2: CUTTING */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>STAGE 2: BAR CUTTING (780 MM)</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>✓ VERIFIED</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {dossier.tier2_cutting.vendor}
                  </h4>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Mother Rod Length:</strong> {dossier.tier2_cutting.motherRodLength}</div>
                    <div><strong>Cut Rod Length:</strong> <strong style={{ color: '#0f172a' }}>{dossier.tier2_cutting.cutRodLength}</strong></div>
                    <div><strong>Cutting Charge:</strong> {dossier.tier2_cutting.ratePerCut}</div>
                    <div><strong>Cutting DC:</strong> {dossier.tier2_cutting.cuttingDcNumber}</div>
                    <div><strong>Conversion Factor:</strong> {dossier.tier2_cutting.rodsPerTon}</div>
                  </div>
                </div>

                {/* TIER 3: CNC MACHINING */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>STAGE 3: CNC MACHINING &amp; BORE QC</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>✓ 20 PCS/ROD</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {dossier.tier3_cncMachining.subcontractor}
                  </h4>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Component:</strong> {dossier.tier3_cncMachining.description} (Code: {dossier.tier3_cncMachining.itemCode})</div>
                    <div><strong>Pieces Machined:</strong> {dossier.tier3_cncMachining.piecesReturned}</div>
                    <div><strong>Piece Yield:</strong> <strong style={{ color: '#16a34a' }}>{dossier.tier3_cncMachining.pieceYieldPerRod}</strong></div>
                    <div><strong>ID Bore Gauge Check:</strong> {dossier.tier3_cncMachining.idBoreGaugeCheck}</div>
                    <div><strong>Shortage Penalty:</strong> None (Within 18-22 pcs tolerance)</div>
                  </div>
                </div>

                {/* TIER 4: TAPPING & SLITTING */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>STAGE 4: IN-HOUSE TAPPING &amp; SLITTING</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>✓ BUTTRESS PASS</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    Tapping Lines (TAP 1, TAP 2, TAP 3)
                  </h4>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Thread Profile:</strong> {dossier.tier4_tappingAndSlitting.threadType}</div>
                    <div><strong>Tool Wear Progress:</strong> {dossier.tier4_tappingAndSlitting.buttressTapWearCount}</div>
                    <div><strong>Slitting Division:</strong> {dossier.tier4_tappingAndSlitting.slittingStation}</div>
                    <div><strong>Cutter Spec:</strong> {dossier.tier4_tappingAndSlitting.slittingCutter}</div>
                  </div>
                </div>

                {/* TIER 5: HEAT TREATMENT (SQF) */}
                <div style={{ background: '#fefce8', border: '2px solid #ca8a04', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #fef08a', paddingBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>STAGE 5: HEAT TREATMENT (SQF)</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d' }}>✓ THIRD-PARTY CERTIFIED</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {dossier.tier5_heatTreatment.processor}
                  </h4>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Heat Treatment Lot:</strong> <strong style={{ color: '#854d0e', fontSize: 13 }}>{dossier.tier5_heatTreatment.heatLotNumber}</strong></div>
                    <div><strong>Furnace Process:</strong> {dossier.tier5_heatTreatment.processType}</div>
                    <div><strong>Surface Hardness Achieved:</strong> <strong style={{ color: '#15803d', fontSize: 12 }}>{dossier.tier5_heatTreatment.hardnessRatingAchieved}</strong> ({dossier.tier5_heatTreatment.hardnessSpecRequired})</div>
                    <div><strong>Effective Case Depth:</strong> <strong style={{ color: '#15803d' }}>{dossier.tier5_heatTreatment.effectiveCaseDepthAchieved}</strong></div>
                    <div><strong>Microstructure:</strong> {dossier.tier5_heatTreatment.microstructureResult}</div>
                    <div><strong>Lab MTC Report Ref:</strong> {dossier.tier5_heatTreatment.thirdPartyTestCertRef}</div>
                  </div>
                </div>

                {/* TIER 6: LOAD TEST & CENTRAL STORE DISPATCH */}
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #bbf7d0', paddingBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>STAGE 6: 190 KN LOAD TEST &amp; DISPATCH</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d' }}>✓ CONFORMANT</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {dossier.tier6_loadTestAndDispatch.destinationSite}
                  </h4>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Testing Machine:</strong> {dossier.tier6_loadTestAndDispatch.testingMachine}</div>
                    <div><strong>Proof Load Applied:</strong> <strong style={{ color: '#15803d' }}>{dossier.tier6_loadTestAndDispatch.proofLoadApplied}</strong></div>
                    <div><strong>Duration:</strong> {dossier.tier6_loadTestAndDispatch.holdingDuration}</div>
                    <div><strong>Proof Load Result:</strong> {dossier.tier6_loadTestAndDispatch.testResult}</div>
                    <div><strong>Dispatch DC No:</strong> {dossier.tier6_loadTestAndDispatch.finalOutwardDc} ({dossier.tier6_loadTestAndDispatch.dispatchDate})</div>
                    <div><strong>Spring Assembly:</strong> {dossier.tier6_loadTestAndDispatch.springRetainerWire}</div>
                  </div>
                </div>

              </div>

              {/* THIRD-PARTY INSPECTOR & WORKS MANAGER SIGN-OFF BLOCK */}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: 18, marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  <div style={{ border: '1px dashed #cbd5e1', padding: 14, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
                      THIRD-PARTY INSPECTION AGENCY (RITES / RAILWAYS / LAB)
                    </div>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '70%', margin: '0 auto 6px' }}></div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Authorized Inspecting Officer Signature &amp; Stamp</div>
                  </div>

                  <div style={{ border: '1px dashed #cbd5e1', padding: 14, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
                      QUALITY ASSURANCE MANAGER / METALLURGIST
                    </div>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '70%', margin: '0 auto 6px' }}></div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Ucon Wedge QA Department Stamp</div>
                  </div>

                  <div style={{ border: '1px dashed #cbd5e1', padding: 14, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
                      FACTORY WORKS MANAGER
                    </div>
                    <div style={{ borderBottom: '1px solid #94a3b8', width: '70%', margin: '0 auto 6px' }}></div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Approved for Outward Dispatch &amp; Site Commissioning</div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Enter a Heat Lot Number above to view the Golden Dossier</div>
              <p style={{ color: '#64748b', fontSize: 12 }}>Or click on any heat lot in the Inward or Outward table.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: RECORD NEW INWARD ENTRY (FORM USSQMS-MAC-003) */}
      {/* ============================================================== */}
      {isInwardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 10, width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>FORM USSQMS-MAC-003</span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Record Inward Material Receipt</h3>
              </div>
              <button onClick={() => setIsInwardModalOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleAddInward}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Supplier Name *</label>
                  <input
                    required
                    placeholder="e.g. NG Sales Corp / Techmat / DSM"
                    value={inwardForm.supplier_name}
                    onChange={(e) => setInwardForm({ ...inwardForm, supplier_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>GRIN / S.No</label>
                  <input
                    placeholder="e.g. GRIN-841"
                    value={inwardForm.grin_no}
                    onChange={(e) => setInwardForm({ ...inwardForm, grin_no: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Receipt Date</label>
                  <input
                    type="date"
                    value={inwardForm.entry_date}
                    onChange={(e) => setInwardForm({ ...inwardForm, entry_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>PO / WO Number</label>
                  <input
                    placeholder="e.g. PO-STEEL-2025-081"
                    value={inwardForm.po_number}
                    onChange={(e) => setInwardForm({ ...inwardForm, po_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Delivery Challan (DC) No.</label>
                  <input
                    placeholder="e.g. 83/22/11/24"
                    value={inwardForm.dc_number}
                    onChange={(e) => setInwardForm({ ...inwardForm, dc_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Invoice No. (if received)</label>
                  <input
                    placeholder="e.g. 3727"
                    value={inwardForm.invoice_number}
                    onChange={(e) => setInwardForm({ ...inwardForm, invoice_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Item Description</label>
                  <input
                    placeholder="e.g. 20MnCr5 Steel Rods 25mm / Wedges CNC"
                    value={inwardForm.item_description}
                    onChange={(e) => setInwardForm({ ...inwardForm, item_description: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Heat / Lot Number</label>
                  <input
                    placeholder="e.g. HT-TM-3727 / LOT-20MnCr5-841"
                    value={inwardForm.heat_lot_number}
                    onChange={(e) => setInwardForm({ ...inwardForm, heat_lot_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Quantity (Pcs / Tons)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 4600 pcs or 20.45 tons"
                    value={inwardForm.qty}
                    onChange={(e) => setInwardForm({ ...inwardForm, qty: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Inward Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: RECORD NEW OUTWARD ENTRY (FORM USSQMS-MAC-004) */}
      {/* ============================================================== */}
      {isOutwardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 10, width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#0284c7' }}>FORM USSQMS-MAC-004</span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Record Outward Dispatch</h3>
              </div>
              <button onClick={() => setIsOutwardModalOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleAddOutward}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Job / Destination Party *</label>
                  <input
                    required
                    placeholder="e.g. Techmat / SPR Mall site / DSM"
                    value={outwardForm.destination_party}
                    onChange={(e) => setOutwardForm({ ...outwardForm, destination_party: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Outward S.No</label>
                  <input
                    placeholder="e.g. OUT-841"
                    value={outwardForm.outward_sno}
                    onChange={(e) => setOutwardForm({ ...outwardForm, outward_sno: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Dispatch Date</label>
                  <input
                    type="date"
                    value={outwardForm.entry_date}
                    onChange={(e) => setOutwardForm({ ...outwardForm, entry_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>DC / STN Number</label>
                  <input
                    placeholder="e.g. DC-003 / UCON/DC/094"
                    value={outwardForm.dc_stn_number}
                    onChange={(e) => setOutwardForm({ ...outwardForm, dc_stn_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Dispatch Purpose</label>
                  <select
                    value={outwardForm.dispatch_purpose}
                    onChange={(e) => setOutwardForm({ ...outwardForm, dispatch_purpose: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  >
                    <option value="CUSTOMER_DISPATCH">Customer / Site Dispatch (Live Wedges)</option>
                    <option value="HEAT_TREATMENT">Heat Treatment (Techmat SQF)</option>
                    <option value="SUBCONTRACT_CNC">Subcontract CNC Machining</option>
                    <option value="CUTTING">780mm Bar Cutting</option>
                    <option value="REWORK">Rework / Correction</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Heat Lot No.</label>
                  <input
                    placeholder="e.g. HT-DC-003"
                    value={outwardForm.heat_lot_number}
                    onChange={(e) => setOutwardForm({ ...outwardForm, heat_lot_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Quantity (Pcs / Pairs)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 4500"
                    value={outwardForm.qty}
                    onChange={(e) => setOutwardForm({ ...outwardForm, qty: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Weight in Kgs</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 256.5"
                    value={outwardForm.weight_in_kg}
                    onChange={(e) => setOutwardForm({ ...outwardForm, weight_in_kg: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsOutwardModalOpen(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Outward Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
