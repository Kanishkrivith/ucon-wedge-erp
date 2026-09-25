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
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'LINES' | 'HEADER' | 'OCR_TEXT' | 'ALL'>('LINES');
  const [viewLayout, setViewLayout] = useState<'SPLIT' | 'FULL'>('SPLIT');
  const [previewDocType, setPreviewDocType] = useState<'ORIGINAL' | 'OCR_TEXT'>('ORIGINAL');
  const [splitRatio, setSplitRatio] = useState<'45_55' | '50_50' | '60_40'>('45_55');
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [lineFilter, setLineFilter] = useState('');
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [copiedOcr, setCopiedOcr] = useState(false);
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

  // Zero-latency in-memory Blob URL created whenever detail.document.file_data changes
  useEffect(() => {
    if (!detail?.document?.file_data) {
      setBlobUrl(null);
      return;
    }
    try {
      const filename = detail.document.original_filename || '';
      const ext = filename.toLowerCase().split('.').pop();
      let mime = detail.document.mime_type || 'application/pdf';
      if (ext === 'pdf') mime = 'application/pdf';
      else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'png') mime = 'image/png';
      else if (ext === 'webp') mime = 'image/webp';

      const byteChars = atob(detail.document.file_data);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: mime });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.warn('Could not create Blob URL:', e);
      setBlobUrl(null);
    }
  }, [detail]);

  const isPdf = useMemo(() => {
    const fn = (detail?.document?.original_filename || '').toLowerCase();
    const mime = (detail?.document?.mime_type || '').toLowerCase();
    return fn.endsWith('.pdf') || mime.includes('pdf');
  }, [detail]);

  const fileSourceUrl = blobUrl || (selected?.id ? `/api/documents/file?id=${selected.id}` : '');

  async function openDoc(d: any) {
    setSelected(d);
    setMessage('');
    setActiveWorkspaceTab('LINES'); // Default active tab is Line-Level Routing Table
    setPreviewDocType('ORIGINAL');
    setImageZoom(100);
    setImageRotation(0);
    setLineFilter('');
    setSelectedLineId(null);
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

  function handleAddLine() {
    const newLine: EditableLineItem = {
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
    };
    setEditableLines([...editableLines, newLine]);
    setSelectedLineId(newLine.id);
  }

  function handleCopyOcr() {
    const activePageText = detail?.pages?.find((p: any) => p.page_no === activePage)?.ocr_text || '';
    if (activePageText) {
      navigator.clipboard.writeText(activePageText);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
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

  const filteredLines = useMemo(() => {
    if (!lineFilter) return editableLines;
    const lf = lineFilter.toLowerCase();
    return editableLines.filter(
      (l) =>
        (l.description || '').toLowerCase().includes(lf) ||
        (l.partNumber || '').toLowerCase().includes(lf) ||
        (l.hsnCode || '').toLowerCase().includes(lf) ||
        (l.categoryCode || '').toLowerCase().includes(lf) ||
        (l.subCategory || '').toLowerCase().includes(lf) ||
        (l.destinationModule || '').toLowerCase().includes(lf)
    );
  }, [editableLines, lineFilter]);

  return (
    <div className="page" style={{ maxWidth: viewLayout === 'SPLIT' && selected ? '100%' : 1680, margin: '0 auto', transition: 'max-width 0.2s ease' }}>
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

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
                📥 Export to Excel (.xlsx)
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

          {/* Top Workspace Tab Switcher & Side-by-Side View Controller */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: 10,
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {/* Dedicated Workspace Navigation Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={activeWorkspaceTab === 'LINES' ? 'primary' : 'ghost'}
                onClick={() => setActiveWorkspaceTab('LINES')}
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                  boxShadow: activeWorkspaceTab === 'LINES' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                📋 LINE-LEVEL ROUTING TABLE ({editableLines.length})
              </button>
              <button
                type="button"
                className={activeWorkspaceTab === 'HEADER' ? 'primary' : 'ghost'}
                onClick={() => setActiveWorkspaceTab('HEADER')}
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                  boxShadow: activeWorkspaceTab === 'HEADER' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                🏷️ CANONICAL HEADER FIELDS ({editableFields.length})
              </button>
              <button
                type="button"
                className={activeWorkspaceTab === 'OCR_TEXT' ? 'primary' : 'ghost'}
                onClick={() => setActiveWorkspaceTab('OCR_TEXT')}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                }}
              >
                📝 SCANNED RAW OCR TEXT
              </button>
              <button
                type="button"
                className={activeWorkspaceTab === 'ALL' ? 'primary' : 'ghost'}
                onClick={() => setActiveWorkspaceTab('ALL')}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                }}
              >
                🔀 ALL-IN-ONE COMPLETE AUDIT
              </button>
            </div>

            {/* Split Screen & Layout Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {viewLayout === 'SPLIT' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '2px 6px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>SPLIT:</span>
                  <button
                    type="button"
                    onClick={() => setSplitRatio('45_55')}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      border: 'none',
                      background: splitRatio === '45_55' ? '#fff' : 'transparent',
                      fontWeight: splitRatio === '45_55' ? 800 : 500,
                      color: splitRatio === '45_55' ? 'var(--navy)' : 'var(--muted)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: splitRatio === '45_55' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    45:55
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitRatio('50_50')}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      border: 'none',
                      background: splitRatio === '50_50' ? '#fff' : 'transparent',
                      fontWeight: splitRatio === '50_50' ? 800 : 500,
                      color: splitRatio === '50_50' ? 'var(--navy)' : 'var(--muted)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: splitRatio === '50_50' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    50:50
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitRatio('60_40')}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      border: 'none',
                      background: splitRatio === '60_40' ? '#fff' : 'transparent',
                      fontWeight: splitRatio === '60_40' ? 800 : 500,
                      color: splitRatio === '60_40' ? 'var(--navy)' : 'var(--muted)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: splitRatio === '60_40' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    60:40
                  </button>
                </div>
              )}

              <button
                type="button"
                className="ghost"
                onClick={() => setViewLayout(viewLayout === 'SPLIT' ? 'FULL' : 'SPLIT')}
                style={{
                  fontSize: 11,
                  padding: '6px 11px',
                  fontWeight: 750,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                title={viewLayout === 'SPLIT' ? 'Expand Editor to Full Width' : 'Show Side-by-Side Original Document'}
              >
                {viewLayout === 'SPLIT' ? '▤ Editor Full Width' : '◫ Show Side-by-Side Doc'}
              </button>
            </div>
          </div>

          {/* Main Side-by-Side Workstation Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                viewLayout === 'FULL'
                  ? '1fr'
                  : splitRatio === '45_55'
                  ? 'minmax(380px, 45%) 1fr'
                  : splitRatio === '50_50'
                  ? 'minmax(400px, 50%) 1fr'
                  : 'minmax(450px, 60%) 1fr',
              gap: 16,
              alignItems: 'start',
            }}
          >
            {/* LEFT PANE: Original Document / Raw OCR Stream Viewer */}
            {viewLayout === 'SPLIT' && (
              <div
                style={{
                  position: 'sticky',
                  top: 80,
                  background: '#fff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100vh - 110px)',
                  minHeight: 700,
                }}
              >
                {/* Viewer Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {/* Mode Switcher */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewDocType('ORIGINAL')}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: 5,
                        cursor: 'pointer',
                        fontWeight: previewDocType === 'ORIGINAL' ? 800 : 600,
                        background: previewDocType === 'ORIGINAL' ? '#2563eb' : '#e2e8f0',
                        color: previewDocType === 'ORIGINAL' ? '#ffffff' : '#475569',
                      }}
                    >
                      📄 Scanned Bill / PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDocType('OCR_TEXT')}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: 5,
                        cursor: 'pointer',
                        fontWeight: previewDocType === 'OCR_TEXT' ? 800 : 600,
                        background: previewDocType === 'OCR_TEXT' ? '#2563eb' : '#e2e8f0',
                        color: previewDocType === 'OCR_TEXT' ? '#ffffff' : '#475569',
                      }}
                    >
                      📝 Raw OCR Stream ({detail.pages?.length || 1})
                    </button>
                  </div>

                  {/* Viewer Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {previewDocType === 'ORIGINAL' && !isPdf && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#e2e8f0', padding: '2px 4px', borderRadius: 4 }}>
                        <button
                          type="button"
                          onClick={() => setImageZoom((z) => Math.max(25, z - 25))}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 800, fontSize: 12, padding: '1px 5px' }}
                          title="Zoom Out"
                        >
                          −
                        </button>
                        <span style={{ fontSize: 10, fontWeight: 700, minWidth: 34, textAlign: 'center' }}>{imageZoom}%</span>
                        <button
                          type="button"
                          onClick={() => setImageZoom((z) => Math.min(300, z + 25))}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 800, fontSize: 12, padding: '1px 5px' }}
                          title="Zoom In"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageRotation((r) => (r + 90) % 360)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 10, padding: '1px 5px' }}
                          title="Rotate 90 degrees"
                        >
                          ↺
                        </button>
                      </div>
                    )}

                    <a
                      href={`/api/documents/file?id=${selected.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        padding: '4px 9px',
                        textDecoration: 'none',
                        background: '#ffffff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        borderRadius: 5,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Open original document in a new tab or dual monitor window"
                    >
                      ↗ Pop-out Window
                    </a>
                  </div>
                </div>

                {/* Viewer Body */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
                  {previewDocType === 'ORIGINAL' ? (
                    isPdf ? (
                      <iframe
                        src={fileSourceUrl}
                        title={detail.document?.original_filename || 'Original Scanned Invoice PDF'}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          background: '#525659',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'auto',
                          background: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 12,
                        }}
                      >
                        <img
                          src={fileSourceUrl}
                          alt={detail.document?.original_filename || 'Scanned Document Image'}
                          style={{
                            transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.15s ease',
                            maxWidth: imageZoom <= 100 ? '100%' : 'none',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    )
                  ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a', padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(detail.pages || []).map((p: any) => (
                            <button
                              key={p.page_no}
                              type="button"
                              onClick={() => setActivePage(p.page_no)}
                              style={{
                                fontSize: 11,
                                padding: '3px 9px',
                                borderRadius: 4,
                                border: 'none',
                                fontWeight: activePage === p.page_no ? 800 : 500,
                                background: activePage === p.page_no ? '#2563eb' : '#334155',
                                color: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              PAGE {p.page_no}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyOcr}
                          style={{
                            fontSize: 10.5,
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: '1px solid #475569',
                            background: '#1e293b',
                            color: '#e2e8f0',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedOcr ? '✓ Copied!' : '📋 Copy Text'}
                        </button>
                      </div>
                      <pre
                        style={{
                          flex: 1,
                          margin: 0,
                          padding: 12,
                          background: '#090d16',
                          color: '#cbd5e1',
                          fontSize: 11,
                          fontFamily: 'Consolas, monospace',
                          borderRadius: 6,
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          border: '1px solid #1e293b',
                        }}
                      >
                        {detail.pages?.find((p: any) => p.page_no === activePage)?.ocr_text || 'No scanned text available on this page.'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RIGHT PANE: Workstation Editor (Tabs: Lines, Header, OCR, or All) */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* TAB 1: LINE-LEVEL CLASSIFICATION & ROUTING TABLE */}
              {(activeWorkspaceTab === 'LINES' || activeWorkspaceTab === 'ALL') && (
                <div>
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
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          ({editableLines.length} item{editableLines.length === 1 ? '' : 's'})
                        </span>
                      </div>
                      <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                        Compare line-by-line against the scanned bill on the left. Edits recalculate taxes, totals, and routing in real time.
                      </small>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        placeholder="Filter lines (description, part#, HSN, group)..."
                        value={lineFilter}
                        onChange={(e) => setLineFilter(e.target.value)}
                        style={{ fontSize: 11, padding: '5px 8px', width: 220 }}
                      />
                      <button
                        type="button"
                        className="ghost"
                        onClick={handleAddLine}
                        style={{ fontSize: 11, padding: '5px 12px', fontWeight: 700 }}
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
                          fontWeight: 750,
                          backgroundColor: '#2563eb',
                          borderColor: '#1d4ed8',
                          color: '#ffffff',
                        }}
                        title="Save line items directly without posting to ERP"
                      >
                        {savingDraft ? '💾 Saving…' : '💾 Save Line Items'}
                      </button>
                    </div>
                  </div>

                  {/* 23-Column Responsive Table */}
                  <div className="table-wrap" style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
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
                        {filteredLines.length ? (
                          filteredLines.map((l) => {
                            const originalIndex = editableLines.findIndex((item) => item.id === l.id);
                            const activeGroup = MASTER_CATEGORY_GROUPS.find((g) => g.groupName === l.categoryCode);
                            const subCategories = activeGroup?.categories || [];
                            const isSelectedRow = selectedLineId === l.id;

                            return (
                              <tr
                                key={l.id}
                                onClick={() => setSelectedLineId(l.id)}
                                style={{
                                  borderBottom: '1px solid #e2e8f0',
                                  background: isSelectedRow ? '#f0f9ff' : undefined,
                                }}
                              >
                                {/* Line No */}
                                <td style={{ textAlign: 'center', fontWeight: 800, color: isSelectedRow ? '#0284c7' : 'var(--muted)' }}>
                                  {l.lineNo}
                                </td>

                                {/* Description */}
                                <td>
                                  <input
                                    style={{
                                      width: '100%',
                                      fontSize: 11,
                                      padding: '4px 6px',
                                      fontWeight: 650,
                                      borderColor: isSelectedRow ? '#38bdf8' : undefined,
                                    }}
                                    value={l.description}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].description = e.target.value;
                                      setEditableLines(next);
                                    }}
                                  />
                                </td>

                                {/* Part Number */}
                                <td>
                                  <input
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                                    value={l.partNumber}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].partNumber = e.target.value;
                                      setEditableLines(next);
                                    }}
                                    placeholder="Part ID"
                                  />
                                </td>

                                {/* HSN */}
                                <td>
                                  <input
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                                    value={l.hsnCode}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].hsnCode = e.target.value;
                                      setEditableLines(next);
                                    }}
                                    placeholder="HSN"
                                  />
                                </td>

                                {/* Quantity */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.quantity}
                                    onChange={(e) => updateLineCalculation(originalIndex, { quantity: e.target.value })}
                                  />
                                </td>

                                {/* Unit */}
                                <td>
                                  <input
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px' }}
                                    value={l.unit}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].unit = e.target.value;
                                      setEditableLines(next);
                                    }}
                                  />
                                </td>

                                {/* Rate */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.unitRate}
                                    onChange={(e) => updateLineCalculation(originalIndex, { unitRate: e.target.value })}
                                  />
                                </td>

                                {/* Discount */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.discount}
                                    onChange={(e) => updateLineCalculation(originalIndex, { discount: e.target.value })}
                                  />
                                </td>

                                {/* Taxable Value */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', fontWeight: 650, textAlign: 'right' }}
                                    value={l.taxableAmount}
                                    onChange={(e) => updateLineCalculation(originalIndex, { taxableAmount: e.target.value })}
                                  />
                                </td>

                                {/* Tax Rate % */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.taxRate}
                                    onChange={(e) => updateLineCalculation(originalIndex, { taxRate: e.target.value })}
                                  />
                                </td>

                                {/* CGST */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.cgstAmount}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].cgstAmount = e.target.value;
                                      next[originalIndex].taxAmount = Number(e.target.value) + Number(next[originalIndex].sgstAmount) + Number(next[originalIndex].igstAmount);
                                      next[originalIndex].totalAmount = Number(next[originalIndex].taxableAmount) + Number(next[originalIndex].taxAmount);
                                      setEditableLines(next);
                                    }}
                                  />
                                </td>

                                {/* SGST */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.sgstAmount}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].sgstAmount = e.target.value;
                                      next[originalIndex].taxAmount = Number(next[originalIndex].cgstAmount) + Number(e.target.value) + Number(next[originalIndex].igstAmount);
                                      next[originalIndex].totalAmount = Number(next[originalIndex].taxableAmount) + Number(next[originalIndex].taxAmount);
                                      setEditableLines(next);
                                    }}
                                  />
                                </td>

                                {/* IGST */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', textAlign: 'right' }}
                                    value={l.igstAmount}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].igstAmount = e.target.value;
                                      next[originalIndex].taxAmount = Number(next[originalIndex].cgstAmount) + Number(next[originalIndex].sgstAmount) + Number(e.target.value);
                                      next[originalIndex].totalAmount = Number(next[originalIndex].taxableAmount) + Number(next[originalIndex].taxAmount);
                                      setEditableLines(next);
                                    }}
                                  />
                                </td>

                                {/* GST Total */}
                                <td style={{ textAlign: 'right', fontWeight: 700, padding: '4px 8px', color: '#0369a1' }}>
                                  ₹{Number(l.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>

                                {/* Total Amount */}
                                <td>
                                  <input
                                    type="number"
                                    style={{ width: '100%', fontSize: 11, padding: '4px 6px', fontWeight: 800, textAlign: 'right', color: 'var(--navy)' }}
                                    value={l.totalAmount}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].totalAmount = e.target.value;
                                      setEditableLines(next);
                                    }}
                                  />
                                </td>

                                {/* Category Group */}
                                <td>
                                  <select
                                    style={{ width: '100%', fontSize: 10.5, padding: '4px 6px', fontWeight: 650 }}
                                    value={l.categoryCode}
                                    onChange={(e) => handleCategoryGroupChange(originalIndex, e.target.value)}
                                  >
                                    {MASTER_CATEGORY_GROUPS.map((g) => (
                                      <option key={g.groupCode} value={g.groupName}>
                                        {g.groupName}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Sub-Category */}
                                <td>
                                  <select
                                    style={{ width: '100%', fontSize: 10.5, padding: '4px 6px' }}
                                    value={l.subCategory}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].subCategory = e.target.value;
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

                                {/* ERP Destination */}
                                <td>
                                  <select
                                    style={{ width: '100%', fontSize: 10.5, padding: '4px 6px' }}
                                    value={l.destinationModule}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].destinationModule = e.target.value;
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

                                {/* CapEx / OpEx */}
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
                                      next[originalIndex].capexOrOpex = e.target.value as 'CAPEX' | 'OPEX';
                                      setEditableLines(next);
                                    }}
                                  >
                                    <option value="CAPEX">CAPEX</option>
                                    <option value="OPEX">OPEX</option>
                                  </select>
                                </td>

                                {/* Costing Head */}
                                <td>
                                  <select
                                    style={{ width: '100%', fontSize: 10.5, padding: '4px 6px' }}
                                    value={l.costingHead}
                                    onChange={(e) => {
                                      const next = [...editableLines];
                                      next[originalIndex].costingHead = e.target.value;
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

                                {/* Confidence */}
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`badge ${l.confidenceStatus === 'HIGH' ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>
                                    {(Number(l.confidence || 0.9) * 100).toFixed(0)}%
                                  </span>
                                </td>

                                {/* Status */}
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...editableLines];
                                      next[originalIndex].reviewStatus =
                                        next[originalIndex].reviewStatus === 'VERIFIED' ? 'PENDING REVIEW' : 'VERIFIED';
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

                                {/* Delete Action */}
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = editableLines.filter((_, i) => i !== originalIndex);
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
                            <td colSpan={23}><div className="empty">No line items match filter.</div></td>
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
                </div>
              )}

              {/* TAB 2: EXTRACTED CANONICAL FIELDS */}
              {(activeWorkspaceTab === 'HEADER' || activeWorkspaceTab === 'ALL') && (
                <div style={{ marginTop: activeWorkspaceTab === 'ALL' ? 24 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                        EXTRACTED CANONICAL FIELDS
                      </h3>
                      <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                        All labels in CAPITAL LETTERS. Verify vendor, invoice number, dates, and GST details against the scanned bill.
                      </small>
                    </div>

                    {/* Card / Section Filter */}
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
                    {displayedFields.map((f) => {
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
              )}

              {/* TAB 3: SCANNED RAW OCR TEXT */}
              {activeWorkspaceTab === 'OCR_TEXT' && (
                <div style={{ background: '#fff', padding: 18, borderRadius: 10, border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                        SCANNED RAW OCR TEXT STREAM ({detail.pages?.length || 1} PAGES)
                      </h3>
                      <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                        Complete, unedited optical character recognition text extracted directly from document pages.
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {(detail.pages || []).map((p: any) => (
                        <button
                          key={p.page_no}
                          type="button"
                          className={activePage === p.page_no ? 'primary' : 'ghost'}
                          onClick={() => setActivePage(p.page_no)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          PAGE {p.page_no}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleCopyOcr}
                        className="ghost"
                        style={{ fontSize: 11, padding: '4px 10px', fontWeight: 700 }}
                      >
                        {copiedOcr ? '✓ Copied!' : '📋 Copy Page Text'}
                      </button>
                    </div>
                  </div>
                  <pre
                    style={{
                      padding: 16,
                      background: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: 12,
                      fontFamily: 'Consolas, monospace',
                      borderRadius: 8,
                      minHeight: 450,
                      maxHeight: 650,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.5,
                    }}
                  >
                    {detail.pages?.find((p: any) => p.page_no === activePage)?.ocr_text || 'No scanned text available on this page.'}
                  </pre>
                </div>
              )}

              {/* Controlled ERP Posting Action Bar */}
              <div
                style={{
                  marginTop: 16,
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
          </div>
        </section>
      )}
    </div>
  );
}
