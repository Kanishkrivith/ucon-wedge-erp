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

export default function VendorMasterPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

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

  const fetchVendorsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/erp?resource=vendors');
      if (res.ok) {
        const json = await res.json();
        setVendors(json.rows || []);
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
        }, 800);
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

  return (
    <div style={{ padding: '24px 32px 60px', maxWidth: 1440, margin: '0 auto', color: '#1e293b' }}>
      
      {/* Top Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#2563eb' }}>
            MASTER DATA &amp; TAX REGISTRY
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 6px', color: '#0f172a' }}>
            Vendor Master Directory
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
            Verified suppliers, machine shops, GSTIN/PAN records, and automated AI scanning profiles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => openRegisterModal()}
            style={{
              background: '#0f274a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+</span> Register New Vendor
          </button>

          <Link
            href="/stock-flow"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚖</span> Material &amp; CNC Stock Flow →
          </Link>

          <button
            onClick={fetchVendorsData}
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Metric Stat Cards - Explicit CSS Grid with No Overlapping */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            TOTAL REGISTERED VENDORS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {vendors.length}
          </div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 3, fontWeight: 600 }}>
            ✓ 100% Verified in Database
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            RAW STEEL SUPPLIERS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {vendors.filter((v) => v.vendor_type?.includes('STEEL')).length}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            NG Sales, Thirupathy, Material Point
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CNC MACHINE WORKSHOPS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {vendors.filter((v) => v.vendor_type?.includes('CNC') || v.canonical_name?.includes('MURUGAN') || v.canonical_name?.includes('EVERBRIGHT') || v.canonical_name?.includes('PREMA')).length}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            Murugan, Everbright, Prema, In-House
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SCAN AUTO-FILL STATUS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            ACTIVE
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            Auto-binds GSTIN, PAN &amp; Address on Scan
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filter Pills */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="🔍 Search vendor by name, GSTIN, PAN, city, or material…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                background: '#f8fafc',
                color: '#0f172a',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>View Mode:</span>
            <button
              onClick={() => setViewMode('CARDS')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: viewMode === 'CARDS' ? '#0f274a' : '#ffffff',
                color: viewMode === 'CARDS' ? '#ffffff' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗂 Cards View
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: viewMode === 'TABLE' ? '#0f274a' : '#ffffff',
                color: viewMode === 'TABLE' ? '#ffffff' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📋 Table View
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: selectedCategory === 'ALL' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: selectedCategory === 'ALL' ? '#eff6ff' : '#f8fafc',
              color: selectedCategory === 'ALL' ? '#1d4ed8' : '#475569',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            All Vendors ({vendors.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: selectedCategory === cat ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: selectedCategory === cat ? '#eff6ff' : '#f8fafc',
                color: selectedCategory === cat ? '#1d4ed8' : '#475569',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', color: '#64748b' }}>
          Loading vendor master registry from PostgreSQL…
        </div>
      ) : filteredVendors.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', color: '#64748b' }}>
          No vendors found matching your search. Try adjusting the query.
        </div>
      ) : viewMode === 'CARDS' ? (
        
        /* 1. CARDS VIEW - Spacious, Structured, Zero Overlapping */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 16,
          }}
        >
          {filteredVendors.map((v) => (
            <div
              key={v.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 18,
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Header: Name & Category */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1.4 }}>
                    {v.canonical_name}
                  </h3>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {v.vendor_type || v.category}
                  </span>
                </div>

                {/* GSTIN & PAN Monospace Block */}
                <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#64748b' }}>GSTIN:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{v.gstin || 'NOT REGISTERED'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>PAN:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{v.pan || '—'}</strong>
                  </div>
                </div>

                {/* Scope & Material Supplied */}
                <div style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.5 }}>
                  <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}>Material / Scope:</div>
                  <div style={{ color: '#1e293b', fontWeight: 500 }}>
                    {v.material_supplied || 'General Subcontracting / Spares'}
                  </div>
                </div>

                {/* Inward Stock Bucket & Yield Rule */}
                <div style={{ marginBottom: 12, fontSize: 12, lineHeight: 1.5 }}>
                  <div style={{ color: '#64748b', fontWeight: 600, marginBottom: 2 }}>Stock Bucket &amp; Yield:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                      {v.inward_stock_type || 'GENERAL'}
                    </span>
                    <span style={{ color: '#475569', fontSize: 11 }}>
                      {v.conversion_rule || '1:1 Movement'}
                    </span>
                  </div>
                </div>

                {/* Contact & Address Block */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                  {v.contact_name && <div>👤 <strong>Contact:</strong> {v.contact_name}</div>}
                  {v.phone && <div>📞 <strong>Phone:</strong> {v.phone}</div>}
                  {v.email && <div>✉ <strong>Email:</strong> {v.email}</div>}
                  {v.address && <div style={{ marginTop: 2 }}>📍 <strong>Address:</strong> {v.address}</div>}
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {v.scrap_applicable ? (
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 4 }}>
                      ✓ Scrap Deducted (In-House)
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 4 }}>
                      Per-Piece Job Work
                    </span>
                  )}
                </div>

                <button
                  onClick={() => openRegisterModal(v)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  ✎ Edit Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (

        /* 2. TABLE VIEW - With Explicit Normal White-Space and No Text Overlapping */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, width: '22%' }}>Vendor Legal Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: '16%' }}>Tax Registration</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: '22%' }}>Material &amp; Stock Bucket</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: '26%' }}>Contact &amp; Address</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, width: '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', verticalAlign: 'top', whiteSpace: 'normal', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>{v.canonical_name}</div>
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8' }}>
                      {v.vendor_type || v.category}
                    </span>
                  </td>

                  <td style={{ padding: '14px 14px', verticalAlign: 'top', whiteSpace: 'normal', lineHeight: 1.6 }}>
                    <div><strong>GSTIN:</strong> <code style={{ fontFamily: 'monospace', color: '#0f172a' }}>{v.gstin || '—'}</code></div>
                    <div><strong>PAN:</strong> <code style={{ fontFamily: 'monospace', color: '#64748b' }}>{v.pan || '—'}</code></div>
                  </td>

                  <td style={{ padding: '14px 14px', verticalAlign: 'top', whiteSpace: 'normal', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      {v.material_supplied || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                      Bucket: {v.inward_stock_type || 'GENERAL'}
                    </div>
                    {v.conversion_rule && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Rule: {v.conversion_rule}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 14px', verticalAlign: 'top', whiteSpace: 'normal', lineHeight: 1.5, color: '#475569', fontSize: 11 }}>
                    {v.phone && <div>📞 {v.phone}</div>}
                    {v.email && <div>✉ {v.email}</div>}
                    {v.address && <div style={{ marginTop: 2 }}>📍 {v.address}</div>}
                  </td>

                  <td style={{ padding: '14px 14px', verticalAlign: 'top', textAlign: 'right' }}>
                    <button
                      onClick={() => openRegisterModal(v)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'pointer',
                      }}
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

      {/* REGISTER / EDIT VENDOR MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
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
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 14,
              width: '100%',
              maxWidth: 620,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              color: '#0f172a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {editingVendor ? `Edit Vendor: ${editingVendor.canonical_name}` : 'Register New Vendor / Subcontractor'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Vendor Legal Name *
                </label>
                <input
                  required
                  placeholder="e.g. SRI MURUGAN INDUSTRIES / NG SALES CORPORATION"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Vendor Category / Type *
                  </label>
                  <select
                    value={formData.vendorType}
                    onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Inward Stock Bucket
                  </label>
                  <select
                    value={formData.inwardStockType}
                    onChange={(e) => setFormData({ ...formData, inwardStockType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    GSTIN (15 Digits)
                  </label>
                  <input
                    placeholder="33AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    PAN No. (10 Digits)
                  </label>
                  <input
                    placeholder="AAAAA0000A"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Material Description / Work Scope
                </label>
                <input
                  placeholder="e.g. 20MnCr5 Round Rods 25mm / CNC Wedge Machining"
                  value={formData.materialSupplied}
                  onChange={(e) => setFormData({ ...formData, materialSupplied: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Conversion &amp; Production Rule
                </label>
                <input
                  placeholder="e.g. 1 Rod (780mm) = 20 CNC Pieces. Rate: ₹11.00/pc."
                  value={formData.conversionRule}
                  onChange={(e) => setFormData({ ...formData, conversionRule: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    placeholder="+91 94451 11114"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Factory / Office Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot No., Industrial Estate, City, Pincode"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}
                />
              </div>

              {/* Scrap Applicable Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  id="scrapCheckModal"
                  checked={formData.scrapApplicable}
                  onChange={(e) => setFormData({ ...formData, scrapApplicable: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="scrapCheckModal" style={{ fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                  <strong>Scrap Recovery Applicable</strong> (Credit scrap swarf sale against machining cost. Use for UCON In-House CNC).
                </label>
              </div>

              {formMessage && (
                <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 12, background: formMessage.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: formMessage.startsWith('Error') ? '#991b1b' : '#166534', border: formMessage.startsWith('Error') ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                  {formMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ background: '#0f274a', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 12, fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
                >
                  {formSubmitting ? 'Saving…' : editingVendor ? 'Update Vendor' : 'Save & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
