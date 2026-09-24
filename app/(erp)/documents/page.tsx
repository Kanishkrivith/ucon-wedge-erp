'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  MASTER_CATEGORY_GROUPS,
  ERP_DESTINATION_MODULES,
  MASTER_COSTING_HEADS,
  CANONICAL_HEADER_FIELDS,
  CanonicalHeaderFieldDef,
  CANONICAL_DOCUMENT_TYPES,
  matchCanonicalDocumentType,
} from '@/lib/ai/canonical-library';

interface EditableLineItem {
  id: string;
  lineNo: number;
  description: string;
  partNumber: string;
  hsnCode: string;
  quantity: number | string;
  unit: string;
  unitRate: number | string;
  discount: number | string;
  taxableAmount: number | string;
  taxRate: number | string;
  cgstAmount: number | string;
  sgstAmount: number | string;
  igstAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  categoryCode: string;
  subCategory: string;
  processStageCode: string;
  destinationModule: string;
  capexOrOpex: 'CAPEX' | 'OPEX';
  costingHead: string;
  confidence: number;
  confidenceStatus: string;
  reviewStatus: 'PENDING REVIEW' | 'VERIFIED';
}

interface EditableHeaderField {
  fieldCode: string;
  fieldName: string;
  displayLabel: string;
  section: string;
  required: boolean;
  value: string;
  reviewedValue: string;
  confidence: number;
  confidenceStatus: string;
  id?: string;
}

export default function DocumentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [editableFields, setEditableFields] = useState<EditableHeaderField[]>([]);
  const [editableLines, setEditableLines] = useState<EditableLineItem[]>([]);
  const [activeHeaderTab, setActiveHeaderTab] = useState<'ALL' | 'VENDOR' | 'DOCUMENT' | 'FINANCIAL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load documents');
      setRows(data.rows || []);
      setStats(data.stats || {});
    } catch (err: any) {
      setMessage(err.message || 'Unable to load documents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openDoc(d: any) {
    setSelected(d);
    setMessage('');
    try {
      const res = await fetch(`/api/documents?id=${d.id}`);
      const data = await res.json();
      setDetail(data);

      // Map extractions against Master Canonical Library
      const fieldMap = new Map<string, any>();
      (data.fields || []).forEach((f: any) => {
        fieldMap.set(f.field_name?.toLowerCase(), f);
      });

      const fields: EditableHeaderField[] = CANONICAL_HEADER_FIELDS.map((def: CanonicalHeaderFieldDef) => {
        const found = fieldMap.get(def.fieldCode.toLowerCase());
        const rawVal = found?.reviewed_value || found?.normalized_value || found?.extracted_value;
        const hasVal = rawVal && rawVal !== 'NOT AVAILABLE' && rawVal !== 'null' && String(rawVal).trim() !== '';
        let valStr = hasVal ? String(rawVal).trim() : '';

        // If field is DOCUMENT_TYPE, auto-resolve to official canonical type if possible
        if (def.fieldCode === 'DOCUMENT_TYPE') {
          const rawDocType = valStr || data.document?.classification_code || data.document?.document_type;
          valStr = matchCanonicalDocumentType(rawDocType);
        }

        return {
          fieldCode: def.fieldCode,
          fieldName: def.fieldCode.toLowerCase(),
          displayLabel: def.displayLabel, // All in CAPITAL LETTERS
          section: def.section,
          required: def.required || false,
          value: valStr,
          reviewedValue: valStr || (def.required ? 'NEEDS REVIEW' : 'NOT AVAILABLE'),
          confidence: found?.confidence ? Number(found.confidence) : (def.fieldCode === 'DOCUMENT_TYPE' && valStr ? 0.95 : 0.5),
          confidenceStatus: hasVal || (def.fieldCode === 'DOCUMENT_TYPE' && valStr) ? (found?.confidence_status || 'HIGH') : 'LOW',
          id: found?.id,
        };
      });
      setEditableFields(fields);

      // Map line items with full canonical schema
      const lines: EditableLineItem[] = (data.lines || []).map((l: any, idx: number) => {
        const desc = l.reviewed_description || l.description || '';
        const rawCat = l.reviewed_category_code || l.category_code || 'B. CNC MACHINES AND CAPITAL EQUIPMENT';
        const subCat = l.reviewed_sub_category || l.sub_category || '';
        const qty = l.reviewed_quantity ?? l.quantity ?? 1;
        const rate = l.reviewed_unit_rate ?? l.unit_rate ?? 0;
        const discount = l.reviewed_discount ?? l.discount ?? 0;
        const taxable = l.reviewed_taxable_amount ?? l.taxable_amount ?? (Number(qty) * Number(rate) - Number(discount));
        const taxRate = l.reviewed_tax_rate ?? l.tax_rate ?? 18;
        const cgst = l.reviewed_cgst_amount ?? l.cgst_amount ?? 0;
        const sgst = l.reviewed_sgst_amount ?? l.sgst_amount ?? 0;
        const igst = l.reviewed_igst_amount ?? l.igst_amount ?? 0;
        const tax = l.reviewed_tax_amount ?? l.tax_amount ?? (Number(cgst) + Number(sgst) + Number(igst));
        const total = l.reviewed_total_amount ?? l.total_amount ?? (Number(taxable) + Number(tax));

        return {
          id: l.id || `line-${idx + 1}`,
          lineNo: l.line_no || (idx + 1),
          description: desc,
          partNumber: l.reviewed_part_number || l.part_number || '',
          hsnCode: l.reviewed_hsn_code || l.hsn_code || '',
          quantity: Number(qty),
          unit: l.reviewed_unit || l.unit || 'NOS',
          unitRate: Number(rate),
          discount: Number(discount),
          taxableAmount: Number(taxable),
          taxRate: Number(taxRate),
          cgstAmount: Number(cgst),
          sgstAmount: Number(sgst),
          igstAmount: Number(igst),
          taxAmount: Number(tax),
          totalAmount: Number(total),
          categoryCode: rawCat,
          subCategory: subCat,
          processStageCode: l.process_stage_code || l.costing_head || 'GENERAL',
          destinationModule: l.reviewed_destination_module || l.destination_module || 'MACHINES & CAPEX',
          capexOrOpex: (l.reviewed_capex_or_opex || l.capex_or_opex || (rawCat.includes('MACHINE') ? 'CAPEX' : 'OPEX')) as 'CAPEX' | 'OPEX',
          costingHead: l.reviewed_costing_head || l.costing_head || 'MACHINES & CAPEX',
          confidence: Number(l.confidence || 0.95),
          confidenceStatus: l.confidence_status || 'HIGH',
          reviewStatus: (l.review_status || 'PENDING REVIEW') as 'PENDING REVIEW' | 'VERIFIED',
        };
      });
      setEditableLines(lines);
    } catch (err: any) {
      setMessage('Failed to load document details.');
    }
  }

  // Recalculate line amounts automatically on value edits
  function updateLineCalculation(index: number, patch: Partial<EditableLineItem>) {
    const next = [...editableLines];
    const current = { ...next[index], ...patch };

    const qty = Math.max(0, Number(current.quantity) || 0);
    const rate = Math.max(0, Number(current.unitRate) || 0);
    const discount = Math.max(0, Number(current.discount) || 0);
    const taxable = Math.max(0, qty * rate - discount);
    current.taxableAmount = Number(taxable.toFixed(2));

    const taxRate = Math.max(0, Number(current.taxRate) || 0);
    const isInterstate = Number(current.igstAmount) > 0 || (Number(current.cgstAmount) === 0 && Number(current.sgstAmount) === 0);

    if (isInterstate) {
      const igst = (taxable * taxRate) / 100;
      current.igstAmount = Number(igst.toFixed(2));
      current.cgstAmount = 0;
      current.sgstAmount = 0;
      current.taxAmount = Number(igst.toFixed(2));
    } else {
      const halfTax = (taxable * (taxRate / 2)) / 100;
      current.cgstAmount = Number(halfTax.toFixed(2));
      current.sgstAmount = Number(halfTax.toFixed(2));
      current.igstAmount = 0;
      current.taxAmount = Number((halfTax * 2).toFixed(2));
    }

    current.totalAmount = Number((taxable + Number(current.taxAmount)).toFixed(2));
    next[index] = current;
    setEditableLines(next);
  }

  // Sync Category Group change with default destination, accounting head, and sub-category
  function handleCategoryGroupChange(index: number, groupName: string) {
    const group = MASTER_CATEGORY_GROUPS.find((g) => g.groupName === groupName);
    const next = [...editableLines];
    next[index] = {
      ...next[index],
      categoryCode: groupName,
      subCategory: group?.categories[0] || '',
      destinationModule: group?.defaultDestination || 'PURCHASE',
      costingHead: group?.defaultCostingHead || 'OTHER EXPENSES',
      capexOrOpex: group?.defaultAccounting || 'OPEX',
    };
    setEditableLines(next);
  }

  // Calculate totals across all lines
  const linesSummary = useMemo(() => {
    return editableLines.reduce(
      (acc, l) => ({
        taxable: acc.taxable + (Number(l.taxableAmount) || 0),
        cgst: acc.cgst + (Number(l.cgstAmount) || 0),
        sgst: acc.sgst + (Number(l.sgstAmount) || 0),
        igst: acc.igst + (Number(l.igstAmount) || 0),
        tax: acc.tax + (Number(l.taxAmount) || 0),
        total: acc.total + (Number(l.totalAmount) || 0),
      }),
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 }
    );
  }, [editableLines]);

  async function handleDeleteDocument(docToDelete?: any) {
    const target = docToDelete || selected;
    if (!target) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete document "${target.original_filename}"?\n\nThis will remove the vault file, OCR lines, and all draft records.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/documents?id=${target.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');
      setMessage(`Document "${target.original_filename}" deleted successfully.`);
      if (selected?.id === target.id) {
        setSelected(null);
        setDetail(null);
      }
      await load();
    } catch (err: any) {
      setMessage(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null;

    const file = fileInput?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sourceFolder', 'Direct Upload');
      fd.append('batchCode', '');

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: fd,
      });
      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text || `Server returned status ${res.status}` };
      }
      if (!res.ok) {
        setMessage(`Upload error: ${data.error || 'Failed to upload'}`);
      } else {
        setMessage('Document ingested and canonical OCR extractions completed successfully.');
        form.reset();
        await load();
      }
    } catch (err: any) {
      setMessage(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleControlledERPPost() {
    if (!selected) return;
    setPosting(true);
    setMessage('');

    try {
      const totalField = editableFields.find((f) => f.fieldName === 'total_invoice_amount');
      const subtotalField = editableFields.find((f) => f.fieldName === 'taxable_value');
      const vendorField = editableFields.find((f) => f.fieldName === 'vendor_name');
      const docNumField = editableFields.find((f) => f.fieldName === 'invoice_number' || f.fieldName === 'document_number');
      const docDateField = editableFields.find((f) => f.fieldName === 'document_date');

      const totalAmount = totalField?.reviewedValue && totalField.reviewedValue !== 'NOT AVAILABLE'
        ? Number(totalField.reviewedValue)
        : linesSummary.total;
      const subtotal = subtotalField?.reviewedValue && subtotalField.reviewedValue !== 'NOT AVAILABLE'
        ? Number(subtotalField.reviewedValue)
        : linesSummary.taxable;
      const vendorName = vendorField?.reviewedValue && vendorField.reviewedValue !== 'NOT AVAILABLE'
        ? vendorField.reviewedValue
        : '';
      const documentNumber = docNumField?.reviewedValue && docNumField.reviewedValue !== 'NOT AVAILABLE'
        ? docNumField.reviewedValue
        : '';
      const documentDate = docDateField?.reviewedValue && docDateField.reviewedValue !== 'NOT AVAILABLE'
        ? docDateField.reviewedValue
        : '';

      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          action: 'post_to_erp',
          totalAmount,
          subtotal,
          vendorName,
          documentNumber,
          documentDate,
          verifiedFields: editableFields,
          verifiedLines: editableLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(`Posting error: ${data.error || 'Failed to post'}`);
      } else {
        setMessage(`✓ Success: ${data.message || 'Document verified and posted to ERP!'}`);
        await openDoc(selected);
        await load();
      }
    } catch (err: any) {
      setMessage(`Error posting to ERP: ${err.message}`);
    } finally {
      setPosting(false);
    }
  }

  async function handleSaveDraft() {
    if (!selected) return;
    setSavingDraft(true);
    setMessage('');

    try {
      const vendorField = editableFields.find((f) => f.fieldName === 'vendor_name');
      const docNumField = editableFields.find((f) => f.fieldName === 'invoice_number' || f.fieldName === 'document_number');
      const docDateField = editableFields.find((f) => f.fieldName === 'document_date');

      const vendorName = vendorField?.reviewedValue && vendorField.reviewedValue !== 'NOT AVAILABLE'
        ? vendorField.reviewedValue
        : '';
      const documentNumber = docNumField?.reviewedValue && docNumField.reviewedValue !== 'NOT AVAILABLE'
        ? docNumField.reviewedValue
        : '';
      const documentDate = docDateField?.reviewedValue && docDateField.reviewedValue !== 'NOT AVAILABLE'
        ? docDateField.reviewedValue
        : '';

      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          action: 'save_draft',
          vendorName,
          documentNumber,
          documentDate,
          verifiedFields: editableFields,
          verifiedLines: editableLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(`Save error: ${data.error || 'Failed to save changes'}`);
      } else {
        setMessage(`✓ Success: ${data.message || 'Line items and canonical fields saved successfully!'}`);
        await openDoc(selected);
        await load();
      }
    } catch (err: any) {
      setMessage(`Save error: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleReprocess() {
    if (!selected) return;
    setReprocessing(true);
    setMessage('');

    try {
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          action: 'reprocess',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(`Re-scan error: ${data.error || 'Failed to re-process'}`);
      } else {
        setMessage(`✓ Success: ${data.message || 'Document re-scanned and classified with AI!'}`);
        await openDoc(selected);
        await load();
      }
    } catch (err: any) {
      setMessage(`Re-scan error: ${err.message}`);
    } finally {
      setReprocessing(false);
    }
  }

  const filteredRows = q
    ? rows.filter(
        (r) =>
          (r.original_filename || '').toLowerCase().includes(q.toLowerCase()) ||
          (r.vendor_name || '').toLowerCase().includes(q.toLowerCase()) ||
          (r.document_number || '').toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  // Filtered fields based on active tab
  const displayedFields = useMemo(() => {
    if (activeHeaderTab === 'VENDOR') {
      return editableFields.filter((f) => f.section === 'VENDOR');
    }
    if (activeHeaderTab === 'DOCUMENT') {
      return editableFields.filter(
        (f) =>
          f.section === 'DOCUMENT_IDENTIFICATION' ||
          f.section === 'PURCHASE_ORDER' ||
          f.section === 'DELIVERY_CHALLAN' ||
          f.section === 'CUSTOMER'
      );
    }
    if (activeHeaderTab === 'FINANCIAL') {
      return editableFields.filter((f) => f.section === 'TAX_FINANCIAL');
    }
    return editableFields;
  }, [editableFields, activeHeaderTab]);

  return (
    <div className="page" style={{ maxWidth: 1680, margin: '0 auto' }}>
      {/* Header Bar */}
      <div className="section-intro" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">UCON DOCUMENTS &amp; OCR — MASTER FIELD &amp; CATEGORY LIBRARY</div>
          <h1 style={{ fontSize: 24, fontWeight: 850, color: 'var(--navy)', margin: '4px 0 6px' }}>
            DOCUMENT INTELLIGENCE &amp; REVIEW QUEUE
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Canonical extractions strictly conform to Master Library Groups A–V. Missing data is flagged <b>NOT AVAILABLE / NEEDS REVIEW</b> without synthetic hallucination. Final ERP posting requires human verification.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href="/templates/UCON_WEDGE_MASTER_CANONICAL_AND_ROUTING_LIBRARY.xlsx"
            download="UCON_WEDGE_MASTER_CANONICAL_AND_ROUTING_LIBRARY.xlsx"
            style={{
              fontSize: 12,
              padding: '7px 14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              backgroundColor: '#0f766e',
              color: '#ffffff',
              borderRadius: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
            title="Download Master Canonical Fields, Line Classification & Routing Library Excel"
          >
            📊 Download Canonical &amp; Routing Library (.xlsx)
          </a>
          <button className="ghost" onClick={load} style={{ fontSize: 12, padding: '6px 14px' }}>
            ↻ Refresh Queue
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">TOTAL INGESTED</div>
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-sub">Immutable files in vault</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">REVIEW QUEUE</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>
            {stats.pending || 0}
          </div>
          <div className="stat-sub">Awaiting human verification</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">VERIFIED &amp; POSTED</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {stats.verified || 0}
          </div>
          <div className="stat-sub">Posted to official ERP ledger</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DECLINED / DISPUTED</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>
            {stats.rejected || 0}
          </div>
          <div className="stat-sub">Flagged documents</div>
        </div>
      </div>

      {/* Ingestion & Queue Grid */}
      <div className="two-col" style={{ gap: 20 }}>
        {/* Upload Form */}
        <form className="form-card" onSubmit={handleUpload}>
          <div className="eyebrow">HISTORICAL INGESTION VAULT</div>
          <h3 style={{ margin: '4px 0 14px', fontSize: 16, color: 'var(--navy)' }}>Ingest Original Document / Bill</h3>

          <label style={{ fontSize: 12, fontWeight: 650, color: 'var(--navy)' }}>
            SELECT INVOICE / BILL (PDF, IMAGE, OR EXCEL .XLSX / .XLS) *
            <input
              name="file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/*"
              capture="environment"
              required
              style={{ marginTop: 4, fontSize: 12 }}
            />
          </label>

          <div style={{ fontSize: 11, color: 'var(--muted)', background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            🛡️ <b>Immutable Evidence Guarantee:</b> File SHA-256 fingerprint generated upon ingestion. Duplicate files are prevented automatically. Supports scanned PDF, camera photos, and Excel spreadsheets (.xlsx, .xls).
          </div>

          <button className="primary" type="submit" disabled={uploading} style={{ width: '100%', marginTop: 8 }}>
            {uploading ? 'Processing OCR & Extracting…' : 'Ingest & Extract Canonical Fields'}
          </button>
        </form>

        {/* Document Review Queue Table */}
        <section className="panel">
          <div className="panel-head" style={{ marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Document Review Queue</h2>
              <small className="muted">Click any document for side-by-side human review &amp; posting</small>
            </div>
          </div>

          <div className="toolbar" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search filename, vendor, or invoice number..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>

          {loading ? (
            <div className="empty">Loading document queue…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DOCUMENT</th>
                    <th>CLASSIFICATION</th>
                    <th>DESTINATION</th>
                    <th>CONFIDENCE</th>
                    <th>STATUS</th>
                    <th style={{ width: 45, textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length ? (
                    filteredRows.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => openDoc(d)}
                        style={{ cursor: 'pointer', background: selected?.id === d.id ? '#edf4ff' : undefined }}
                      >
                        <td>
                          <b>{d.original_filename}</b>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {d.document_date ? new Date(d.document_date).toLocaleDateString('en-GB') : 'Date pending'} · {d.vendor_name || 'Vendor pending'}
                          </div>
                        </td>
                        <td style={{ fontSize: 11 }}>{d.classification_code || d.document_type}</td>
                        <td style={{ fontSize: 11 }}>{d.destination_module || 'Pending'}</td>
                        <td>
                          <span className={`badge ${Number(d.ai_confidence) >= 0.85 ? 'green' : 'amber'}`}>
                            {d.ai_confidence ? `${(Number(d.ai_confidence) * 100).toFixed(0)}%` : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${d.status === 'VERIFIED' ? 'green' : d.status === 'REJECTED' ? 'red' : 'amber'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <a
                            href={`/api/documents/export?id=${d.id}`}
                            download
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              fontSize: 11,
                              marginRight: 4,
                              background: '#ecfdf5',
                              color: '#047857',
                              borderRadius: 4,
                              border: '1px solid #a7f3d0',
                              textDecoration: 'none',
                            }}
                            title="Download Single Excel (.xlsx) with Canonical Fields & Lines"
                          >
                            📊
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(d);
                            }}
                            className="danger"
                            style={{ padding: '3px 8px', fontSize: 11, minWidth: 'auto', background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
                            title="Delete document"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}><div className="empty">No documents found.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {message && (
        <div className={message.startsWith('Error') || message.startsWith('Upload error') ? 'error-box' : 'notice'} style={{ marginTop: 16 }}>
          {message}
        </div>
      )}

      {/* Side-by-Side Review & Verification Workspace */}
      {selected && detail && (
        <section
          className="panel"
          style={{
            marginTop: 24,
            border: '2px solid var(--blue)',
            boxShadow: '0 12px 36px rgba(47, 111, 237, 0.12)',
            padding: 20,
          }}
        >
          {/* Document Header & Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              paddingBottom: 16,
              borderBottom: '1px solid var(--line)',
              marginBottom: 16,
            }}
          >
            <div>
              <div className="eyebrow">HUMAN VERIFICATION &amp; CONTROLLED ERP POSTING WORKSPACE</div>
              <h2 style={{ fontSize: 20, fontWeight: 850, margin: '4px 0', color: 'var(--navy)' }}>
                {detail.document?.original_filename}
              </h2>
              <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span>STATUS: <b style={{ color: detail.document?.status === 'VERIFIED' ? 'var(--green)' : 'var(--amber)' }}>{detail.document?.status}</b></span>
                <span>SHA-256: <code>{detail.document?.file_sha256?.substring(0, 18)}…</code></span>
                <span>DESTINATION: <b>{detail.document?.destination_module || 'MACHINES & CAPEX'}</b></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <a
                href={`/api/documents/export?id=${selected.id}`}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  padding: '7px 14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  borderRadius: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
                title="Download Single Excel with Canonical Fields & Line Classification"
              >
                📥 Export to Single Excel (.xlsx)
              </a>
              <button
                type="button"
                className="primary"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                style={{
                  fontSize: 12,
                  padding: '7px 14px',
                  fontWeight: 700,
                  backgroundColor: '#2563eb',
                  borderColor: '#1d4ed8',
                  color: '#ffffff',
                }}
                title="Save changes to Line Items and Canonical Fields without posting to ERP"
              >
                {savingDraft ? '💾 Saving…' : '💾 Save Changes'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={handleReprocess}
                disabled={reprocessing}
                style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff', fontWeight: 650, fontSize: 12 }}
              >
                {reprocessing ? '⚡ Scanning with AI…' : '⚡ Re-Scan with AI'}
              </button>
              <button
                type="button"
                className="danger"
                disabled={deleting}
                onClick={() => handleDeleteDocument()}
                style={{ fontSize: 12, padding: '7px 12px', background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
              >
                {deleting ? 'Deleting…' : '🗑️ Delete Document'}
              </button>
              <button className="ghost" onClick={() => { setSelected(null); setDetail(null); }} style={{ fontSize: 12 }}>
                ✕ Close Workspace
              </button>
            </div>
          </div>

          {/* Section 1: Extracted Canonical Fields (Organized into 3 Structured Cards) */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                  EXTRACTED CANONICAL FIELDS
                </h3>
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  All labels in CAPITAL LETTERS. Unidentified items are marked NOT AVAILABLE / NEEDS REVIEW.
                </small>
              </div>

              {/* Card / Tab Switcher */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={activeHeaderTab === 'ALL' ? 'primary' : 'ghost'}
                  onClick={() => setActiveHeaderTab('ALL')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  ALL FIELDS ({editableFields.length})
                </button>
                <button
                  type="button"
                  className={activeHeaderTab === 'VENDOR' ? 'primary' : 'ghost'}
                  onClick={() => setActiveHeaderTab('VENDOR')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  VENDOR &amp; SUPPLIER
                </button>
                <button
                  type="button"
                  className={activeHeaderTab === 'DOCUMENT' ? 'primary' : 'ghost'}
                  onClick={() => setActiveHeaderTab('DOCUMENT')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  DOCUMENT &amp; LOGISTICS
                </button>
                <button
                  type="button"
                  className={activeHeaderTab === 'FINANCIAL' ? 'primary' : 'ghost'}
                  onClick={() => setActiveHeaderTab('FINANCIAL')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  TAX &amp; FINANCIAL
                </button>
              </div>
            </div>

            {/* Field Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
                background: '#f8fafc',
                padding: 14,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
              }}
            >
              {displayedFields.map((f, idx) => {
                const globalIdx = editableFields.findIndex((item) => item.fieldCode === f.fieldCode);
                const isMissing = !f.reviewedValue || f.reviewedValue === 'NOT AVAILABLE' || f.reviewedValue === 'NEEDS REVIEW';
                return (
                  <div
                    key={f.fieldCode}
                    style={{
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: isMissing && f.required ? '1.5px solid #f87171' : '1px solid #cbd5e1',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.4px' }}>
                        {f.displayLabel} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                      </span>
                      <span
                        className={`badge ${f.confidenceStatus === 'HIGH' ? 'green' : f.confidenceStatus === 'MEDIUM' ? 'amber' : 'red'}`}
                        style={{ fontSize: 9, padding: '2px 5px' }}
                      >
                        {isMissing ? 'NOT AVAILABLE' : `${(Number(f.confidence || 0.8) * 100).toFixed(0)}%`}
                      </span>
                    </div>

                    {f.fieldCode === 'DOCUMENT_TYPE' ? (
                      <select
                        style={{
                          width: '100%',
                          fontSize: 12,
                          fontWeight: 700,
                          color: f.reviewedValue && f.reviewedValue !== 'NOT AVAILABLE' && f.reviewedValue !== 'NEEDS REVIEW' ? '#0f172a' : '#94a3b8',
                          padding: '5px 8px',
                          border: isMissing && f.required ? '1.5px solid #f87171' : '1px solid #cbd5e1',
                          borderRadius: 5,
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                        value={CANONICAL_DOCUMENT_TYPES.includes(f.reviewedValue as any) ? f.reviewedValue : ''}
                        onChange={(e) => {
                          const next = [...editableFields];
                          next[globalIdx].reviewedValue = e.target.value;
                          next[globalIdx].value = e.target.value;
                          next[globalIdx].confidence = e.target.value ? 1.0 : 0.5;
                          next[globalIdx].confidenceStatus = e.target.value ? 'HIGH' : 'LOW';
                          setEditableFields(next);
                        }}
                      >
                        <option value="">-- SELECT DOCUMENT TYPE --</option>
                        {CANONICAL_DOCUMENT_TYPES.map((dt) => (
                          <option key={dt} value={dt}>
                            {dt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        style={{
                          width: '100%',
                          fontSize: 12,
                          fontWeight: isMissing ? 500 : 650,
                          color: isMissing ? '#94a3b8' : '#0f172a',
                          padding: '5px 8px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 5,
                          background: isMissing ? '#f8fafc' : '#fff',
                        }}
                        value={f.reviewedValue}
                        onChange={(e) => {
                          const next = [...editableFields];
                          next[globalIdx].reviewedValue = e.target.value;
                          setEditableFields(next);
                        }}
                        placeholder="NOT AVAILABLE / NEEDS REVIEW"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Line-Level Classification Table (Sections 46 & 47) */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                    LINE-LEVEL CLASSIFICATION &amp; ROUTING TABLE
                  </h3>
                  <span className="badge green" style={{ fontSize: 10 }}>INDEPENDENT ROUTING</span>
                </div>
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                  Sections 46 &amp; 47: Each line item independently routes across Groups A–V and 20 ERP Destinations (e.g. Slot Cutter &rarr; Machines &amp; CapEx, Packing &rarr; Packing Materials).
                </small>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditableLines([
                      ...editableLines,
                      {
                        id: `new-${Date.now()}`,
                        lineNo: editableLines.length + 1,
                        description: 'NEW LINE ITEM',
                        partNumber: '',
                        hsnCode: '',
                        quantity: 1,
                        unit: 'NOS',
                        unitRate: 0,
                        discount: 0,
                        taxableAmount: 0,
                        taxRate: 18,
                        cgstAmount: 0,
                        sgstAmount: 0,
                        igstAmount: 0,
                        taxAmount: 0,
                        totalAmount: 0,
                        categoryCode: 'B. CNC MACHINES AND CAPITAL EQUIPMENT',
                        subCategory: 'CNC LATHE MACHINE',
                        processStageCode: 'MACHINES & CAPEX',
                        destinationModule: 'MACHINES & CAPEX',
                        capexOrOpex: 'CAPEX',
                        costingHead: 'MACHINES & CAPEX',
                        confidence: 1.0,
                        confidenceStatus: 'HIGH',
                        reviewStatus: 'VERIFIED',
                      },
                    ]);
                  }}
                  style={{ fontSize: 11, padding: '5px 12px' }}
                >
                  + Add Line Item
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  style={{
                    fontSize: 11,
                    padding: '5px 14px',
                    fontWeight: 700,
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                    color: '#ffffff',
                  }}
                  title="Save current line items to database"
                >
                  {savingDraft ? '💾 Saving…' : '💾 Save Line Items'}
                </button>
              </div>
            </div>

            {/* 23-Column Responsive Table */}
            <div className="table-wrap" style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <table style={{ minWidth: 1950, fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ width: 35, textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: 200 }}>DESCRIPTION</th>
                    <th style={{ width: 100 }}>PART / ITEM NO</th>
                    <th style={{ width: 85 }}>HSN / SAC</th>
                    <th style={{ width: 60 }}>QTY</th>
                    <th style={{ width: 55 }}>UNIT</th>
                    <th style={{ width: 85 }}>RATE (₹)</th>
                    <th style={{ width: 70 }}>DISCOUNT</th>
                    <th style={{ width: 95 }}>TAXABLE (₹)</th>
                    <th style={{ width: 65 }}>TAX %</th>
                    <th style={{ width: 80 }}>CGST (₹)</th>
                    <th style={{ width: 80 }}>SGST (₹)</th>
                    <th style={{ width: 85 }}>IGST (₹)</th>
                    <th style={{ width: 85 }}>GST TOTAL</th>
                    <th style={{ width: 105 }}>TOTAL AMOUNT (₹)</th>
                    <th style={{ minWidth: 190 }}>CATEGORY GROUP (A-V)</th>
                    <th style={{ minWidth: 160 }}>SUB-CATEGORY</th>
                    <th style={{ minWidth: 140 }}>ERP DESTINATION</th>
                    <th style={{ width: 80 }}>CAPEX / OPEX</th>
                    <th style={{ minWidth: 130 }}>COSTING HEAD</th>
                    <th style={{ width: 75, textAlign: 'center' }}>CONFIDENCE</th>
                    <th style={{ width: 95, textAlign: 'center' }}>STATUS</th>
                    <th style={{ width: 40, textAlign: 'center' }}>DEL</th>
                  </tr>
                </thead>
                <tbody>
                  {editableLines.length ? (
                    editableLines.map((l, idx) => {
                      const activeGroup = MASTER_CATEGORY_GROUPS.find((g) => g.groupName === l.categoryCode);
                      const subCategories = activeGroup?.categories || [];

                      return (
                        <tr key={l.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          {/* 1. Line No */}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--muted)' }}>
                            {l.lineNo}
                          </td>

                          {/* 2. Description */}
                          <td>
                            <input
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', fontWeight: 600 }}
                              value={l.description}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].description = e.target.value;
                                setEditableLines(next);
                              }}
                            />
                          </td>

                          {/* 3. Part Number */}
                          <td>
                            <input
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                              value={l.partNumber}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].partNumber = e.target.value;
                                setEditableLines(next);
                              }}
                              placeholder="Part ID"
                            />
                          </td>

                          {/* 4. HSN */}
                          <td>
                            <input
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                              value={l.hsnCode}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].hsnCode = e.target.value;
                                setEditableLines(next);
                              }}
                              placeholder="HSN"
                            />
                          </td>

                          {/* 5. Quantity */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.quantity}
                              onChange={(e) => updateLineCalculation(idx, { quantity: e.target.value })}
                            />
                          </td>

                          {/* 6. Unit */}
                          <td>
                            <input
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                              value={l.unit}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].unit = e.target.value;
                                setEditableLines(next);
                              }}
                            />
                          </td>

                          {/* 7. Rate */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.unitRate}
                              onChange={(e) => updateLineCalculation(idx, { unitRate: e.target.value })}
                            />
                          </td>

                          {/* 8. Discount */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.discount}
                              onChange={(e) => updateLineCalculation(idx, { discount: e.target.value })}
                            />
                          </td>

                          {/* 9. Taxable Value */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', fontWeight: 650, textAlign: 'right' }}
                              value={l.taxableAmount}
                              onChange={(e) => updateLineCalculation(idx, { taxableAmount: e.target.value })}
                            />
                          </td>

                          {/* 10. Tax Rate % */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.taxRate}
                              onChange={(e) => updateLineCalculation(idx, { taxRate: e.target.value })}
                            />
                          </td>

                          {/* 11. CGST */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.cgstAmount}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].cgstAmount = e.target.value;
                                next[idx].taxAmount = Number(e.target.value) + Number(next[idx].sgstAmount) + Number(next[idx].igstAmount);
                                next[idx].totalAmount = Number(next[idx].taxableAmount) + Number(next[idx].taxAmount);
                                setEditableLines(next);
                              }}
                            />
                          </td>

                          {/* 12. SGST */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.sgstAmount}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].sgstAmount = e.target.value;
                                next[idx].taxAmount = Number(next[idx].cgstAmount) + Number(e.target.value) + Number(next[idx].igstAmount);
                                next[idx].totalAmount = Number(next[idx].taxableAmount) + Number(next[idx].taxAmount);
                                setEditableLines(next);
                              }}
                            />
                          </td>

                          {/* 13. IGST */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                              value={l.igstAmount}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].igstAmount = e.target.value;
                                next[idx].taxAmount = Number(next[idx].cgstAmount) + Number(next[idx].sgstAmount) + Number(e.target.value);
                                next[idx].totalAmount = Number(next[idx].taxableAmount) + Number(next[idx].taxAmount);
                                setEditableLines(next);
                              }}
                            />
                          </td>

                          {/* 14. GST Total */}
                          <td style={{ textAlign: 'right', fontWeight: 700, padding: '4px 8px', color: '#0369a1' }}>
                            ₹{Number(l.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* 15. Total Amount */}
                          <td>
                            <input
                              type="number"
                              style={{ width: '100%', fontSize: 11, padding: '4px 6px', fontWeight: 800, textAlign: 'right', color: 'var(--navy)' }}
                              value={l.totalAmount}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].totalAmount = e.target.value;
                                setEditableLines(next);
                              }}
                            />
                          </td>

                          {/* 16. Category Group (Groups A through V) */}
                          <td>
                            <select
                              style={{ width: '100%', fontSize: 10.5, padding: '4px 6px', fontWeight: 650 }}
                              value={l.categoryCode}
                              onChange={(e) => handleCategoryGroupChange(idx, e.target.value)}
                            >
                              {MASTER_CATEGORY_GROUPS.map((g) => (
                                <option key={g.groupCode} value={g.groupName}>
                                  {g.groupName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 17. Sub-Category */}
                          <td>
                            <select
                              style={{ width: '100%', fontSize: 10.5, padding: '4px 6px' }}
                              value={l.subCategory}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].subCategory = e.target.value;
                                setEditableLines(next);
                              }}
                            >
                              {subCategories.length > 0 ? (
                                subCategories.map((sub) => (
                                  <option key={sub} value={sub}>
                                    {sub}
                                  </option>
                                ))
                              ) : (
                                <option value={l.subCategory || 'GENERAL'}>{l.subCategory || 'GENERAL'}</option>
                              )}
                            </select>
                          </td>

                          {/* 18. ERP Destination Module (Section 14) */}
                          <td>
                            <select
                              style={{ width: '100%', fontSize: 10.5, padding: '4px 6px' }}
                              value={l.destinationModule}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].destinationModule = e.target.value;
                                setEditableLines(next);
                              }}
                            >
                              {ERP_DESTINATION_MODULES.map((dest) => (
                                <option key={dest} value={dest}>
                                  {dest}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 19. CapEx / OpEx */}
                          <td style={{ textAlign: 'center' }}>
                            <select
                              style={{
                                fontSize: 10,
                                padding: '3px 6px',
                                fontWeight: 800,
                                color: l.capexOrOpex === 'CAPEX' ? '#b45309' : '#047857',
                                background: l.capexOrOpex === 'CAPEX' ? '#fef3c7' : '#d1fae5',
                                border: '1px solid #cbd5e1',
                                borderRadius: 4,
                              }}
                              value={l.capexOrOpex}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].capexOrOpex = e.target.value as 'CAPEX' | 'OPEX';
                                setEditableLines(next);
                              }}
                            >
                              <option value="CAPEX">CAPEX</option>
                              <option value="OPEX">OPEX</option>
                            </select>
                          </td>

                          {/* 20. Costing Head (Section 16) */}
                          <td>
                            <select
                              style={{ width: '100%', fontSize: 10.5, padding: '4px 6px' }}
                              value={l.costingHead}
                              onChange={(e) => {
                                const next = [...editableLines];
                                next[idx].costingHead = e.target.value;
                                setEditableLines(next);
                              }}
                            >
                              {MASTER_COSTING_HEADS.map((head) => (
                                <option key={head} value={head}>
                                  {head}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 21. Confidence */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${l.confidenceStatus === 'HIGH' ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>
                              {(Number(l.confidence || 0.9) * 100).toFixed(0)}%
                            </span>
                          </td>

                          {/* 22. Review Status */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...editableLines];
                                next[idx].reviewStatus =
                                  next[idx].reviewStatus === 'VERIFIED' ? 'PENDING REVIEW' : 'VERIFIED';
                                setEditableLines(next);
                              }}
                              style={{
                                border: 'none',
                                background: l.reviewStatus === 'VERIFIED' ? '#dcfce7' : '#fef9c3',
                                color: l.reviewStatus === 'VERIFIED' ? '#15803d' : '#a16207',
                                fontWeight: 750,
                                fontSize: 9.5,
                                padding: '3px 6px',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            >
                              {l.reviewStatus === 'VERIFIED' ? '✓ VERIFIED' : '⏳ PENDING'}
                            </button>
                          </td>

                          {/* 23. Delete Action */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = editableLines.filter((_, i) => i !== idx);
                                setEditableLines(next);
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: 13,
                                padding: 2,
                              }}
                              title="Delete line"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={23}><div className="empty">No line items extracted.</div></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Reconciliation Totals Banner */}
            <div
              style={{
                marginTop: 14,
                padding: '12px 18px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', fontWeight: 700 }}>
                    LINE ITEMS TAXABLE SUM
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
                    ₹{linesSummary.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', fontWeight: 700 }}>
                    TOTAL GST SUM
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0369a1' }}>
                    ₹{linesSummary.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', fontWeight: 700 }}>
                    TOTAL LINES SUM
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--green)' }}>
                    ₹{linesSummary.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Document Header Total Comparison */}
              {(() => {
                const headerTotal = Number(
                  editableFields.find((f) => f.fieldName === 'total_invoice_amount')?.reviewedValue || 0
                );
                const diff = Math.abs(headerTotal - linesSummary.total);
                const isMatch = diff < 1.0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      INVOICE HEADER: <b>₹{headerTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
                    </span>
                    <span
                      className={`badge ${isMatch ? 'green' : 'amber'}`}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      {isMatch ? '✓ RECONCILED' : `VARIANCE: ₹${diff.toFixed(2)}`}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Controlled ERP Posting Action Bar */}
            <div
              style={{
                marginTop: 20,
                padding: 18,
                background: 'linear-gradient(180deg, #fcfdfe, #f0f7ff)',
                border: '1.5px solid #bfdbfe',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 850, color: 'var(--navy)', letterSpacing: '0.5px' }}>
                  CONTROLLED ERP POSTING GATEWAY
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Atomically registers invoice ledger, CapEx fixed asset records, inventory movements, and audit log.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="danger"
                  disabled={deleting}
                  onClick={() => handleDeleteDocument()}
                  style={{ padding: '10px 16px', fontSize: 13, background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
                >
                  {deleting ? 'Deleting…' : '🗑️ Delete Document'}
                </button>

                <button
                  type="button"
                  className="secondary"
                  disabled={savingDraft}
                  onClick={handleSaveDraft}
                  style={{
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: 750,
                    background: '#2563eb',
                    borderColor: '#1d4ed8',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                  }}
                  title="Save current line items and canonical fields without posting to live ERP"
                >
                  {savingDraft ? '💾 Saving…' : '💾 Save Changes (Keep in Queue)'}
                </button>

                <button
                  type="button"
                  className="primary"
                  disabled={posting}
                  onClick={handleControlledERPPost}
                  style={{
                    padding: '10px 22px',
                    fontSize: 13,
                    fontWeight: 750,
                    background: 'var(--green)',
                    borderColor: 'var(--green)',
                    boxShadow: '0 4px 14px rgba(22, 132, 91, 0.25)',
                  }}
                >
                  {posting ? 'Posting to ERP…' : '✓ Approve and Post to ERP'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Scanned Raw Text Inspector (Tesseract OCR Output) */}
          {detail.pages && detail.pages.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, color: 'var(--navy)', fontWeight: 750 }}>
                    SCANNED RAW OCR TEXT ({detail.pages.length} PAGES)
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Original unedited OCR text stream for deep optical verification
                  </span>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowRawOcr(!showRawOcr)}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  {showRawOcr ? 'Hide Raw Text' : 'View Scanned OCR Text'}
                </button>
              </div>

              {showRawOcr && (
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {detail.pages.map((p: any) => (
                      <button
                        key={p.page_no}
                        type="button"
                        className={activePage === p.page_no ? 'primary' : 'ghost'}
                        onClick={() => setActivePage(p.page_no)}
                        style={{ fontSize: 11, padding: '3px 10px' }}
                      >
                        PAGE {p.page_no}
                      </button>
                    ))}
                  </div>
                  <pre
                    style={{
                      padding: 14,
                      background: '#0f172a',
                      color: '#94a3b8',
                      fontSize: 11,
                      borderRadius: 8,
                      maxHeight: 250,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {detail.pages.find((p: any) => p.page_no === activePage)?.ocr_text || 'No text on this page.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
