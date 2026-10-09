'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface Vendor {
  id: string;
  canonical_name: string;
  vendor_type: string;
  category: string;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  material_supplied: string | null;
  inward_stock_type: string | null;
  conversion_rule: string | null;
  scrap_applicable: boolean;
  active: boolean;
  document_count?: number;
  total_spend?: number;
}

interface StockItem {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  unit: string;
  yield_factor: number;
  current_stock: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'STOCK_FLOW' | 'SCRAP_ANALYSIS' | 'SCAN_INTEGRATION'>('DIRECTORY');
  
  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State for Register / Edit Vendor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    vendorType: 'STEEL SUPPLIER',
    gstin: '',
    pan: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    materialSupplied: '',
    inwardStockType: 'RAW_STEEL_TONS',
    conversionRule: '',
    scrapApplicable: false,
  });

  // Scrap Calculator State for In-House CNC
  const [scrapCalc, setScrapCalc] = useState({
    rodsProcessed: 100, // 100 rods of 780mm
    rodWeightKg: 3.12, // approx 3.12 kg per 780mm rod of 25mm steel
    finishedPartWeightKg: 0.115, // approx 115g per wedge piece
    scrapPricePerKg: 38, // ₹38/kg scrap selling rate
    grossOperatingCostPerPiece: 14.50, // ₹14.50 gross machine run cost
  });

  const fetchVendorsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/erp?resource=vendors');
      if (res.ok) {
        const json = await res.json();
        setVendors(json.rows || []);
        setStocks(json.stocks || []);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsData();
  }, []);

  const openRegisterModal = (vendorToEdit?: Vendor) => {
    if (vendorToEdit) {
      setEditingVendor(vendorToEdit);
      setFormData({
        name: vendorToEdit.canonical_name,
        vendorType: vendorToEdit.vendor_type || 'STEEL SUPPLIER',
        gstin: vendorToEdit.gstin || '',
        pan: vendorToEdit.pan || '',
        contactName: vendorToEdit.contact_name || '',
        phone: vendorToEdit.phone || '',
        email: vendorToEdit.email || '',
        address: vendorToEdit.address || '',
        materialSupplied: vendorToEdit.material_supplied || '',
        inwardStockType: vendorToEdit.inward_stock_type || 'RAW_STEEL_TONS',
        conversionRule: vendorToEdit.conversion_rule || '',
        scrapApplicable: !!vendorToEdit.scrap_applicable,
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        vendorType: 'STEEL SUPPLIER',
        gstin: '',
        pan: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        materialSupplied: '',
        inwardStockType: 'RAW_STEEL_TONS',
        conversionRule: '',
        scrapApplicable: false,
      });
    }
    setFormMessage('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setFormSubmitting(true);
    setFormMessage('');

    try {
      const payload: any = {
        resource: 'vendor',
        name: formData.name,
        vendorType: formData.vendorType,
        category: formData.vendorType,
        gstin: formData.gstin.trim().toUpperCase(),
        pan: formData.pan.trim().toUpperCase() || (formData.gstin.length === 15 ? formData.gstin.substring(2, 12).toUpperCase() : null),
        contactName: formData.contactName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        materialSupplied: formData.materialSupplied,
        inwardStockType: formData.inwardStockType,
        conversionRule: formData.conversionRule,
        scrapApplicable: formData.scrapApplicable,
      };

      if (editingVendor) {
        payload.id = editingVendor.id;
      }

      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setFormMessage(`Error: ${resJson.error || 'Failed to save vendor'}`);
      } else {
        setFormMessage(editingVendor ? 'Vendor updated successfully!' : 'Vendor registered successfully!');
        setTimeout(() => {
          setIsModalOpen(false);
          fetchVendorsData();
        }, 1000);
      }
    } catch (err: any) {
      setFormMessage(`Error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => {
      if (v.vendor_type) set.add(v.vendor_type);
    });
    return Array.from(set).sort();
  }, [vendors]);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchCat = selectedCategory === 'ALL' || v.vendor_type === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        v.canonical_name.toLowerCase().includes(q) ||
        (v.gstin && v.gstin.toLowerCase().includes(q)) ||
        (v.pan && v.pan.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q)) ||
        (v.material_supplied && v.material_supplied.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [vendors, selectedCategory, search]);

  // In-House CNC Scrap Calculations
  const calculatedScrap = useMemo(() => {
    const totalParts = scrapCalc.rodsProcessed * 20; // 1 Rod 780mm = 20 CNC Pieces
    const totalInputWeightKg = scrapCalc.rodsProcessed * scrapCalc.rodWeightKg;
    const totalFinishedWeightKg = totalParts * scrapCalc.finishedPartWeightKg;
    const totalScrapKg = Math.max(0, totalInputWeightKg - totalFinishedWeightKg);
    const scrapKgPerPiece = totalParts > 0 ? totalScrapKg / totalParts : 0;
    const scrapCreditPerPiece = scrapKgPerPiece * scrapCalc.scrapPricePerKg;
    const netCostPerPiece = Math.max(0, scrapCalc.grossOperatingCostPerPiece - scrapCreditPerPiece);
    const totalScrapRevenue = totalScrapKg * scrapCalc.scrapPricePerKg;

    return {
      totalParts,
      totalInputWeightKg: totalInputWeightKg.toFixed(1),
      totalFinishedWeightKg: totalFinishedWeightKg.toFixed(1),
      totalScrapKg: totalScrapKg.toFixed(1),
      scrapKgPerPiece: scrapKgPerPiece.toFixed(3),
      scrapCreditPerPiece: scrapCreditPerPiece.toFixed(2),
      netCostPerPiece: netCostPerPiece.toFixed(2),
      totalScrapRevenue: totalScrapRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
    };
  }, [scrapCalc]);

  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="section-intro">
        <div>
          <div className="eyebrow">MASTER DATA &amp; STOCK RECONCILIATION</div>
          <h1>Vendor Registration &amp; Material Stock</h1>
          <p>
            Permanent registry of verified suppliers, subcontract machine shops, raw material allocations,
            and automated scan enrichment.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="primary" onClick={() => openRegisterModal()}>
            + Register New Vendor
          </button>
          <button className="ghost" onClick={fetchVendorsData}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">REGISTERED VENDORS</div>
          <div className="metric-value">{vendors.length}</div>
          <div className="metric-sub">100% Verified in Database</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">RAW STEEL SUPPLIERS</div>
          <div className="metric-value">
            {vendors.filter((v) => v.vendor_type?.includes('STEEL')).length}
          </div>
          <div className="metric-sub">NG Sales, Thirupathy, Material Point</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">CNC SUBCONTRACTORS</div>
          <div className="metric-value">
            {vendors.filter((v) => v.vendor_type?.includes('CNC') || v.canonical_name?.includes('MURUGAN') || v.canonical_name?.includes('EVERBRIGHT') || v.canonical_name?.includes('PREMA')).length}
          </div>
          <div className="metric-sub">1 Rod (780mm) = 20 CNC Pieces</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">IN-HOUSE CNC SCRAP</div>
          <div className="metric-value" style={{ color: 'var(--green, #10b981)' }}>
            ACTIVE
          </div>
          <div className="metric-sub">Scrap Credited vs Operating Cost</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <button
          className={`tab-btn ${activeTab === 'DIRECTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('DIRECTORY')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'DIRECTORY' ? '3px solid #38bdf8' : 'none',
            background: 'transparent',
            color: activeTab === 'DIRECTORY' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🏢 Registered Vendors Directory ({filteredVendors.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'STOCK_FLOW' ? 'active' : ''}`}
          onClick={() => setActiveTab('STOCK_FLOW')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'STOCK_FLOW' ? '3px solid #38bdf8' : 'none',
            background: 'transparent',
            color: activeTab === 'STOCK_FLOW' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔄 Vendor Stock &amp; 780mm Flow
        </button>
        <button
          className={`tab-btn ${activeTab === 'SCRAP_ANALYSIS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SCRAP_ANALYSIS')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'SCRAP_ANALYSIS' ? '3px solid #38bdf8' : 'none',
            background: 'transparent',
            color: activeTab === 'SCRAP_ANALYSIS' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ⚙ In-House CNC vs Outsource Scrap Costing
        </button>
        <button
          className={`tab-btn ${activeTab === 'SCAN_INTEGRATION' ? 'active' : ''}`}
          onClick={() => setActiveTab('SCAN_INTEGRATION')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'SCAN_INTEGRATION' ? '3px solid #38bdf8' : 'none',
            background: 'transparent',
            color: activeTab === 'SCAN_INTEGRATION' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔍 Automated Scanning Integration
        </button>
      </div>

      {/* TAB 1: REGISTERED VENDORS DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <section className="panel">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280 }}>
              <input
                type="text"
                placeholder="Search vendor name, GSTIN, PAN, material, address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className={`badge ${selectedCategory === 'ALL' ? 'blue' : 'ghost'}`}
                onClick={() => setSelectedCategory('ALL')}
                style={{ cursor: 'pointer' }}
              >
                All ({vendors.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`badge ${selectedCategory === cat ? 'blue' : 'ghost'}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ cursor: 'pointer' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading registered vendors from PostgreSQL…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendor Name &amp; Category</th>
                    <th>GSTIN &amp; PAN</th>
                    <th>Material Supplied / Scope</th>
                    <th>Inward Stock Type &amp; Yield Rule</th>
                    <th>Contact &amp; Address</th>
                    <th>Scrap Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{v.canonical_name}</div>
                        <span className="badge blue" style={{ marginTop: 4 }}>
                          {v.vendor_type || v.category}
                        </span>
                        {v.document_count ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {v.document_count} Linked Documents
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          GSTIN: {v.gstin || '—'}
                        </div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          PAN: {v.pan || '—'}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                          {v.material_supplied || '—'}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <span className="badge green" style={{ fontSize: '0.75rem' }}>
                          {v.inward_stock_type || 'GENERAL'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {v.conversion_rule || '1:1 Standard Movement'}
                        </div>
                      </td>
                      <td style={{ maxWidth: 240, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {v.contact_name && <div>👤 {v.contact_name}</div>}
                        {v.phone && <div>📞 {v.phone}</div>}
                        {v.email && <div>✉ {v.email}</div>}
                        {v.address && <div style={{ fontSize: '0.75rem', marginTop: 3 }}>📍 {v.address}</div>}
                      </td>
                      <td>
                        {v.scrap_applicable ? (
                          <span className="badge green" title="In-House CNC Scrap Credited Against Operating Cost">
                            ✓ Scrap Credited
                          </span>
                        ) : (
                          <span className="badge" style={{ opacity: 0.7 }} title="Outsource Vendor: Per-Piece Component Basis">
                            Per-Piece Job Work
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="ghost"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          onClick={() => openRegisterModal(v)}
                        >
                          ✎ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: VENDOR STOCK & 780mm FLOW */}
      {activeTab === 'STOCK_FLOW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Material Stock &amp; Conversion Chain</h2>
                <small className="muted">
                  From Raw 20MnCr5 Steel Tonnage to 780mm Rods and 20 CNC Pieces per Rod
                </small>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
              {/* Step 1: Steel */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18, borderLeft: '4px solid #38bdf8' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700 }}>
                  STAGE 1: RAW MATERIAL INWARD
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem' }}>NG Sales Corporation / Material Point</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Raw Steel: 20MnCr5H 25mm / 26mm round rods. Inward is recorded in <strong>Tonnage (e.g. 20 Tons)</strong>.
                </p>
                <div style={{ marginTop: 12, padding: 10, background: '#1e293b', borderRadius: 6, fontSize: '0.8rem' }}>
                  <strong>Stock Bucket:</strong> <code>RAW_STEEL_TONS</code><br />
                  <strong>QC Check:</strong> Sample 200mm sent to Microlab / Techmat for chemical &amp; tensile verification.
                </div>
              </div>

              {/* Step 2: Cutting */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18, borderLeft: '4px solid #a855f7' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700 }}>
                  STAGE 2: ROD CUTTING (780mm)
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem' }}>Sri Murugan Industries (Cutting)</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  6000mm steel bars are cut to <strong>780mm length</strong> (approx 7 pieces + balance end piece) @ ₹5/cut.
                </p>
                <div style={{ marginTop: 12, padding: 10, background: '#1e293b', borderRadius: 6, fontSize: '0.8rem' }}>
                  <strong>Stock Bucket:</strong> <code>WIP-ROD-780MM</code> (Numbers/Rods)<br />
                  <strong>Yield:</strong> 1 Ton 25mm steel ≈ ~325 cut rods of 780mm.
                </div>
              </div>

              {/* Step 3: CNC Machining */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18, borderLeft: '4px solid #10b981' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 700 }}>
                  STAGE 3: CNC TURNING (4 SUBCONTRACTORS + IN-HOUSE)
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem' }}>Murugan / Everbright / Prema / Ucon</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  780mm rods dispatched by DC. <strong>1 Rod (780mm) = 20 CNC Wedge Components!</strong>
                </p>
                <div style={{ marginTop: 12, padding: 10, background: '#1e293b', borderRadius: 6, fontSize: '0.8rem' }}>
                  <strong>Stock Bucket:</strong> <code>WIP-CNC-WEDGE-PART</code> (Pieces)<br />
                  <strong>Outsource Vendors:</strong> Billed per piece (Murugan @ ₹10.80, Everbright @ ₹10.00).<br />
                  <strong>In-House Ucon:</strong> CNC turning + Scrap recovery credited!
                </div>
              </div>

              {/* Step 4: Downstream */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18, borderLeft: '4px solid #f59e0b' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 700 }}>
                  STAGE 4: FINISHING, HEAT TREATMENT &amp; TESTING
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem' }}>Tapping ➔ Slitting ➔ Unitherm ➔ Dispatch</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Tapping (Buttress taps: 2,500 pcs limit) ➔ Slitting ➔ Unitherm SQF (54-64 HRC) ➔ 190kN load test ➔ Spring assembly.
                </p>
                <div style={{ marginTop: 12, padding: 10, background: '#1e293b', borderRadius: 6, fontSize: '0.8rem' }}>
                  <strong>Final Stock Bucket:</strong> <code>FG-WEDGE-ASSEMBLY</code><br />
                  <strong>Destination:</strong> Dispatched to Chennai Central Store via Delivery Challan.
                </div>
              </div>
            </div>
          </section>

          {/* Current Master Inventory Items Table */}
          <section className="panel">
            <div className="panel-head">
              <h2>Configured Inventory Stock Buckets in Database</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Unit</th>
                    <th>Conversion / Yield Factor</th>
                    <th>Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((it) => (
                    <tr key={it.id}>
                      <td><code style={{ color: '#38bdf8' }}>{it.item_code}</code></td>
                      <td><strong>{it.item_name}</strong></td>
                      <td><span className="badge">{it.item_type}</span></td>
                      <td>{it.unit}</td>
                      <td>
                        {it.item_code === 'WIP-ROD-780MM' ? (
                          <span style={{ color: '#10b981', fontWeight: 700 }}>1 Rod = 20 CNC Pieces</span>
                        ) : it.item_code === 'RM-STEEL-20MNCR5-TONS' ? (
                          <span>~325 Rods (780mm) per Ton</span>
                        ) : (
                          '1:1'
                        )}
                      </td>
                      <td>{it.yield_factor || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: IN-HOUSE CNC VS OUTSOURCE SCRAP COSTING */}
      {activeTab === 'SCRAP_ANALYSIS' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>In-House CNC Machining vs Outsource Vendor Scrap Policy</h2>
              <small className="muted">
                Section 48 Rule: Outsource CNC vendors charge per piece (scrap not credited). In-House Ucon CNC credits scrap revenue against operating cost.
              </small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 20 }}>
            {/* Outsource Subcontractor CNC Policy */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 22 }}>
              <span className="badge amber">OUTSOURCE CNC SUBCONTRACTORS</span>
              <h3 style={{ marginTop: 12, fontSize: '1.2rem', color: '#fff' }}>Sri Murugan / Everbright / Prema</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 8 }}>
                We provide cut 780mm rods via Delivery Challan. The vendor machines the wedges and returns finished CNC wedge parts back to Ucon.
              </p>
              
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1e293b', borderRadius: 6 }}>
                  <span>Sri Murugan Rate:</span>
                  <strong style={{ color: '#38bdf8' }}>₹10.80 / piece</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1e293b', borderRadius: 6 }}>
                  <span>Everbright Engineering Rate:</span>
                  <strong style={{ color: '#38bdf8' }}>₹10.00 / piece</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1e293b', borderRadius: 6 }}>
                  <span>Scrap Credit:</span>
                  <strong style={{ color: '#f87171' }}>Zero (Retained by Vendor)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#1e293b', borderRadius: 6 }}>
                  <span>Accounting Basis:</span>
                  <strong>Pure Per-Piece Job Work Rate</strong>
                </div>
              </div>
            </div>

            {/* In-House Ucon CNC Scrap Recovery Calculator */}
            <div style={{ background: '#0f172a', border: '1px solid #10b981', borderRadius: 12, padding: 22 }}>
              <span className="badge green">UCON IN-HOUSE CNC (ACE MICROMATIC)</span>
              <h3 style={{ marginTop: 12, fontSize: '1.2rem', color: '#fff' }}>Scrap Recovery Deduction Model</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 8 }}>
                In Ucon's in-house unit, boring swarf and parting chips are consolidated and sold to scrap dealers.
                The net per-piece machining cost is calculated <strong>after deducting scrap revenue</strong>.
              </p>

              {/* Calculator Inputs */}
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Cut Rods Processed (780mm):
                  </label>
                  <input
                    type="number"
                    value={scrapCalc.rodsProcessed}
                    onChange={(e) => setScrapCalc({ ...scrapCalc, rodsProcessed: Number(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Gross Run Cost / Piece (₹):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={scrapCalc.grossOperatingCostPerPiece}
                    onChange={(e) => setScrapCalc({ ...scrapCalc, grossOperatingCostPerPiece: Number(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Weight per 780mm Rod (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={scrapCalc.rodWeightKg}
                    onChange={(e) => setScrapCalc({ ...scrapCalc, rodWeightKg: Number(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Scrap Market Price (₹/kg):
                  </label>
                  <input
                    type="number"
                    value={scrapCalc.scrapPricePerKg}
                    onChange={(e) => setScrapCalc({ ...scrapCalc, scrapPricePerKg: Number(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Calculated Outputs */}
              <div style={{ marginTop: 18, background: '#1e293b', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span>Wedges Produced (20 pcs/rod):</span>
                  <strong>{calculatedScrap.totalParts.toLocaleString('en-IN')} pcs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span>Steel Scrap Recovered:</span>
                  <strong style={{ color: '#10b981' }}>{calculatedScrap.totalScrapKg} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span>Total Scrap Revenue:</span>
                  <strong style={{ color: '#10b981' }}>₹{calculatedScrap.totalScrapRevenue}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span>Scrap Credit per Wedge:</span>
                  <strong style={{ color: '#38bdf8' }}>- ₹{calculatedScrap.scrapCreditPerPiece} / pc</strong>
                </div>
                <div style={{ borderTop: '1px solid #334155', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem' }}>
                  <span>NET IN-HOUSE CNC COST:</span>
                  <span style={{ color: '#10b981' }}>₹{calculatedScrap.netCostPerPiece} / pc</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: SCANNING AUTO-FILL INTEGRATION */}
      {activeTab === 'SCAN_INTEGRATION' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>AI Scanner Auto-Fill &amp; Registered Vendor Matching</h2>
              <small className="muted">
                How document scanning links directly to registered vendor masters without manual re-entry
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, fontSize: '0.9rem', color: '#cbd5e1' }}>
            <div style={{ background: '#0f172a', padding: 18, borderRadius: 10, border: '1px solid #1e293b' }}>
              <h3 style={{ color: '#38bdf8', marginBottom: 6 }}>1. Zero Manual Data Re-Entry</h3>
              <p>
                When a new invoice or Delivery Challan is scanned via <Link href="/documents" style={{ color: '#38bdf8', textDecoration: 'underline' }}>Documents &amp; OCR</Link>,
                the Google Gemini Flash Vision engine identifies the supplier's name, GSTIN, or PAN.
              </p>
              <p style={{ marginTop: 8 }}>
                The backend <code>resolveRegisteredVendor</code> module automatically checks the verified 51 master vendors in PostgreSQL.
                If matched, the registered <strong>Legal Name, GSTIN, PAN, Address, Contact, Material Category, and Stock Bucket</strong> are populated instantly.
              </p>
            </div>

            <div style={{ background: '#0f172a', padding: 18, borderRadius: 10, border: '1px solid #1e293b' }}>
              <h3 style={{ color: '#10b981', marginBottom: 6 }}>2. Automatic Stock Bucket Update</h3>
              <p>
                Because each vendor has an assigned <code>inward_stock_type</code>:
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.8 }}>
                <li><strong>NG Sales / Material Point:</strong> Inward tonnage is credited to <code>RAW_STEEL_TONS</code>.</li>
                <li><strong>Sri Murugan Cutting:</strong> Cut rods are credited to <code>WIP-ROD-780MM</code>.</li>
                <li><strong>Everbright / Prema / Murugan CNC:</strong> Finished pieces are credited to <code>WIP-CNC-WEDGE-PART</code> at 20 pcs per 780mm rod.</li>
                <li><strong>National Tools / Royal Tools:</strong> Taps are added to <code>tools</code> register, with tool life tracked up to 2,500 pieces.</li>
                <li><strong>Unitherm Engineers:</strong> Heat treated lots are credited with verified 54-64 HRC status.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* REGISTER / EDIT VENDOR MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 14,
              width: '100%',
              maxWidth: 650,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>
                {editingVendor ? `Edit Vendor: ${editingVendor.canonical_name}` : 'Register New Vendor / Subcontractor'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                  Vendor Legal Name *
                </label>
                <input
                  required
                  placeholder="e.g. SRI MURUGAN INDUSTRIES / NG SALES"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    Vendor Category / Type *
                  </label>
                  <select
                    value={formData.vendorType}
                    onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  >
                    <option value="STEEL SUPPLIER">STEEL SUPPLIER</option>
                    <option value="CNC MACHINING WORKS">CNC MACHINING WORKS</option>
                    <option value="HEAT TREATERS">HEAT TREATERS</option>
                    <option value="TOOLS SUPPLIER">TOOLS SUPPLIER</option>
                    <option value="MACHINE SUPPLIER">MACHINE SUPPLIER</option>
                    <option value="OIL & LUBRICATION SUPPLIER">OIL &amp; LUBRICATION SUPPLIER</option>
                    <option value="WEDGE SPRING SUPPLIER">WEDGE SPRING SUPPLIER</option>
                    <option value="MATERIAL COATING">MATERIAL COATING</option>
                    <option value="EQUIPMENT SUPPLIER">EQUIPMENT SUPPLIER</option>
                    <option value="CRATES SUPPLIER">CRATES SUPPLIER</option>
                    <option value="MACHINE & TOOLS SUPPLIER">MACHINE &amp; TOOLS SUPPLIER</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    Inward Stock Bucket
                  </label>
                  <select
                    value={formData.inwardStockType}
                    onChange={(e) => setFormData({ ...formData, inwardStockType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  >
                    <option value="RAW_STEEL_TONS">RAW_STEEL_TONS (Steel Bar)</option>
                    <option value="CUT_RODS_780MM">CUT_RODS_780MM (780mm Rods)</option>
                    <option value="CNC_WEDGE_PARTS">CNC_WEDGE_PARTS (Wedge Pieces)</option>
                    <option value="HEAT_TREATED_PARTS">HEAT_TREATED_PARTS (Hardened)</option>
                    <option value="SPRING_STOCK">SPRING_STOCK (Retaining Springs)</option>
                    <option value="COOLANT_OIL_LITRES">COOLANT_OIL_LITRES (Oils)</option>
                    <option value="CNC_INSERTS">CNC_INSERTS (Inserts/Tooling)</option>
                    <option value="TAPPING_TOOLS">TAPPING_TOOLS (Buttress Taps)</option>
                    <option value="CAPEX_MACHINE">CAPEX_MACHINE (Machinery)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    GSTIN (15 Digits)
                  </label>
                  <input
                    placeholder="33AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    PAN No. (10 Digits)
                  </label>
                  <input
                    placeholder="AAAAA0000A"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                  Material Description / Work Scope
                </label>
                <input
                  placeholder="e.g. 20MnCr5 Round Rods 25mm / CNC Wedge Turning"
                  value={formData.materialSupplied}
                  onChange={(e) => setFormData({ ...formData, materialSupplied: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                  Conversion &amp; Production Rule
                </label>
                <input
                  placeholder="e.g. 1 Rod (780mm) = 20 CNC Pieces. Rate: ₹10.80/pc."
                  value={formData.conversionRule}
                  onChange={(e) => setFormData({ ...formData, conversionRule: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    placeholder="+91 94451 11114"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', display: 'block', marginBottom: 4 }}>
                  Factory / Office Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot No., Industrial Estate, City, Pincode"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
                />
              </div>

              {/* Scrap Applicable Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1e293b', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  id="scrapCheck"
                  checked={formData.scrapApplicable}
                  onChange={(e) => setFormData({ ...formData, scrapApplicable: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="scrapCheck" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                  <strong>Scrap Recovery Applicable</strong> (Credit scrap swarf sale against machining cost. Use for UCON In-House CNC).
                </label>
              </div>

              {formMessage && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: '0.85rem', background: formMessage.startsWith('Error') ? '#7f1d1d' : '#065f46', color: '#fff' }}>
                  {formMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving…' : editingVendor ? 'Update Vendor' : 'Save & Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
