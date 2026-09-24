import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { processDocumentOCR } from '@/lib/ai/document-ocr';
import { processExcelDocument } from '@/lib/ai/excel-document-parser';

const json = NextResponse.json;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getStorageRoot(): string {
  if (process.env.STORAGE_DIR) {
    return process.env.STORAGE_DIR;
  }
  // In serverless / Vercel / AWS Lambda, process.cwd() is read-only (/var/task).
  // os.tmpdir() (/tmp) is the only writable storage directory.
  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.cwd().startsWith('/var/task') ||
    process.platform === 'linux'
  ) {
    return path.join(os.tmpdir(), 'ucon_storage', 'documents');
  }
  return path.join(process.cwd(), 'storage', 'documents');
}

const storageRoot = getStorageRoot();

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function mapToDocumentTypeEnum(rawType?: string | null): string {
  const t = String(rawType || '').toUpperCase().replace(/\s+/g, '_');
  if (t.includes('MACHINE')) return 'MACHINE_INVOICE';
  if (t.includes('TOOL')) return 'TOOL_INVOICE';
  if (
    t === 'DC' ||
    t.includes('DELIVERY') ||
    t.includes('CHALLAN') ||
    t.includes('GOODS_RECEIPT') ||
    t.includes('MATERIAL_RECEIPT')
  ) {
    return 'DC';
  }
  if (t === 'PO' || t.includes('PURCHASE_ORDER') || t.includes('PURCHASE')) return 'PO';
  if (t.includes('QUOTATION') || t.includes('QUOTE')) return 'QUOTATION';
  if (t.includes('CAPEX')) return 'CAPEX';
  if (t.includes('MTC') || t.includes('MATERIAL_TEST')) return 'MTC';
  if (t.includes('TEST')) return 'TEST_REPORT';
  if (
    t.includes('EXPENSE') ||
    t.includes('SERVICE') ||
    t.includes('PAYMENT_RECEIPT') ||
    t.includes('TRANSPORT')
  ) {
    return 'EXPENSE';
  }
  if (t.includes('INVOICE') || t.includes('BILL') || t.includes('CREDIT_NOTE') || t.includes('DEBIT_NOTE')) {
    return 'INVOICE';
  }
  return 'OTHER';
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      const [doc, fields, lines, pages] = await Promise.all([
        pool.query(
          `SELECT d.*, v.canonical_name AS vendor_name
           FROM documents d
           LEFT JOIN vendors v ON v.id = d.vendor_id
           WHERE d.id = $1`,
          [id]
        ),
        pool.query(`SELECT * FROM document_extractions WHERE document_id = $1 ORDER BY page_no NULLS FIRST, field_name`, [id]),
        pool.query(`SELECT * FROM document_line_items WHERE document_id = $1 ORDER BY line_no`, [id]),
        pool.query(`SELECT * FROM document_pages WHERE document_id = $1 ORDER BY page_no`, [id]),
      ]);

      if (!doc.rows[0]) return json({ error: 'Document not found' }, { status: 404 });

      return json({
        document: doc.rows[0],
        fields: fields.rows,
        lines: lines.rows,
        pages: pages.rows,
      });
    }

    const rows = await pool.query(`
      SELECT
        d.id,
        d.original_filename,
        d.document_type,
        d.document_date,
        d.status,
        d.document_number,
        d.classification_code,
        d.destination_module,
        d.ai_confidence,
        d.created_at,
        v.canonical_name AS vendor_name
      FROM documents d
      LEFT JOIN vendors v ON v.id = d.vendor_id
      ORDER BY
        CASE d.status
          WHEN 'PENDING_REVIEW' THEN 0
          WHEN 'DRAFT' THEN 1
          WHEN 'VERIFIED' THEN 2
          ELSE 3
        END,
        d.created_at DESC
      LIMIT 200
    `);

    const stats = await pool.query(`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE status = 'PENDING_REVIEW') AS pending,
        count(*) FILTER (WHERE status = 'VERIFIED') AS verified,
        count(*) FILTER (WHERE status = 'REJECTED') AS rejected
      FROM documents
    `);

    return json({ rows: rows.rows, stats: stats.rows[0] });
  } catch (error: any) {
    console.error('Document GET error:', error);
    return json({ error: error.message || 'Error loading documents' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sourceFolder = (formData.get('sourceFolder') as string) || 'Direct Upload';
    const batchCode = (formData.get('batchCode') as string) || '';

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hash = sha256(buffer);

    // Block exact duplicates (Section 51 requirement)
    const existing = await pool.query('SELECT id, original_filename FROM documents WHERE file_sha256 = $1', [hash]);
    if (existing.rows[0]) {
      return json(
        { error: `Duplicate file detected. Already ingested as '${existing.rows[0].original_filename}'` },
        { status: 409 }
      );
    }

    let effectiveStorageRoot = storageRoot;
    try {
      await fs.mkdir(effectiveStorageRoot, { recursive: true });
    } catch {
      effectiveStorageRoot = path.join(os.tmpdir(), 'ucon_storage', 'documents');
      await fs.mkdir(effectiveStorageRoot, { recursive: true });
    }
    const ext = (path.extname(file.name) || '.pdf').toLowerCase();
    const isExcel =
      ext === '.xlsx' ||
      ext === '.xls' ||
      (file.type && (file.type.includes('spreadsheet') || file.type.includes('excel')));
    const sourceKind = isExcel
      ? 'SPREADSHEET'
      : ext.match(/\.(png|jpe?g|webp|bmp)$/i)
      ? 'IMAGE'
      : 'SCANNED_PDF';
    const mimeType = file.type || (isExcel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');

    const filename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
    const filePath = path.join(effectiveStorageRoot, filename);
    await fs.writeFile(filePath, buffer);

    const base64Data = buffer.toString('base64');

    const docResult = await pool.query(
      `INSERT INTO documents (
        original_filename, document_type, source_kind, storage_uri, source_path,
        source_folder, ingestion_batch, mime_type, file_size_bytes, file_sha256, status, created_by,
        file_data
      ) VALUES ($1, 'INVOICE', $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_REVIEW', $10, $11)
      RETURNING id`,
      [
        file.name,
        sourceKind,
        `local://documents/${filename}`,
        filePath,
        sourceFolder,
        batchCode,
        mimeType,
        buffer.length,
        hash,
        user.id,
        base64Data,
      ]
    );

    const docId = docResult.rows[0].id;

    // Run OCR / parsing in background/synchronously
    try {
      const ocrResult = isExcel
        ? await processExcelDocument(filePath, buffer)
        : await processDocumentOCR(filePath, mimeType);

      // Save OCR extractions
      for (const field of ocrResult.fields) {
        await pool.query(
          `INSERT INTO document_extractions (
            document_id, page_no, field_name, extracted_value, normalized_value,
            confidence, confidence_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            docId,
            field.pageNo || 1,
            field.fieldName,
            field.extractedValue,
            field.normalizedValue,
            field.confidence,
            field.confidenceStatus,
          ]
        );
      }

      // Save line items
      for (const line of ocrResult.lines) {
        await pool.query(
          `INSERT INTO document_line_items (
            document_id, line_no, description, part_number, hsn_code,
            quantity, unit, unit_rate, discount, taxable_amount,
            tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
            category_code, sub_category, process_stage_code, destination_module,
            capex_or_opex, costing_head, confidence, confidence_status, source_page_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
          [
            docId,
            line.lineNo,
            line.description,
            line.partNumber,
            line.hsnCode,
            line.quantity,
            line.unit,
            line.unitRate,
            line.discount || 0,
            line.taxableAmount,
            line.taxRate,
            line.cgstAmount || 0,
            line.sgstAmount || 0,
            line.igstAmount || 0,
            line.taxAmount || 0,
            line.totalAmount,
            line.categoryCode,
            line.subCategory,
            line.processStageCode,
            line.destinationModule,
            line.capexOrOpex,
            line.costingHead,
            line.confidence,
            line.confidenceStatus,
            line.sourcePageNumber || 1,
          ]
        );
      }

      // Save document pages
      if (Array.isArray(ocrResult.pages)) {
        await pool.query('DELETE FROM document_pages WHERE document_id = $1', [docId]);
        for (const p of ocrResult.pages) {
          await pool.query(
            `INSERT INTO document_pages (document_id, page_no, ocr_text)
             VALUES ($1, $2, $3)
             ON CONFLICT (document_id, page_no) DO UPDATE SET ocr_text = EXCLUDED.ocr_text`,
            [docId, p.pageNo, p.text]
          );
        }
      }

      // Extract vendor, doc number, date for updating header
      const vendorField = ocrResult.fields.find((f) =>
        ['vendor', 'vendor_name', 'VENDOR_NAME'].includes(f.fieldName)
      )?.normalizedValue;
      const dateField = ocrResult.fields.find((f) =>
        ['document_date', 'DOCUMENT_DATE', 'date'].includes(f.fieldName)
      )?.normalizedValue;
      const numberField = ocrResult.fields.find((f) =>
        ['document_number', 'DOCUMENT_NUMBER', 'invoice_number', 'INVOICE_NUMBER'].includes(f.fieldName)
      )?.normalizedValue;

      let vendorId = null;
      if (vendorField) {
        let vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${vendorField}%`]);
        if (!vRes.rows[0]) {
          const firstWord = vendorField.split(' ')[0];
          if (firstWord && firstWord.length > 2) {
            vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${firstWord}%`]);
          }
        }
        if (vRes.rows[0]) {
          vendorId = vRes.rows[0].id;
        } else {
          const newV = await pool.query(
            `INSERT INTO vendors (canonical_name, category) VALUES ($1, 'SUBCONTRACT') RETURNING id`,
            [vendorField]
          );
          vendorId = newV.rows[0].id;
        }
      }

      await pool.query(
        `UPDATE documents
         SET classification_code = $1,
             destination_module = $2,
             destination_record_type = $3,
             ai_confidence = $4,
             document_date = $5,
             document_number = $6,
             vendor_id = $7,
             document_type = $8,
             page_count = $9
         WHERE id = $10`,
        [
          ocrResult.classificationCode,
          ocrResult.destinationModule,
          ocrResult.destinationRecordType,
          ocrResult.confidence,
          dateField || null,
          numberField || null,
          vendorId,
          mapToDocumentTypeEnum(ocrResult.documentType),
          ocrResult.pages?.length || 1,
          docId,
        ]
      );
    } catch (ocrErr: any) {
      console.warn('OCR extraction warning:', ocrErr);
      await pool.query(
        `UPDATE documents SET rejection_reason = $1 WHERE id = $2`,
        [`OCR warning: ${ocrErr?.message || String(ocrErr)}`, docId]
      ).catch(() => {});
    }

    return json({ ok: true, documentId: docId });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return json({ error: error.message || 'Error processing document' }, { status: 500 });
  }
}

// Machine Matching Helper (Section 34 & CapEx routing for 7-8 specific workshop machines)
async function resolveMachineId(desc: string, vendorName: string, client: any): Promise<string | null> {
  const text = `${desc} ${vendorName}`.toLowerCase();
  let targetCode = 'MCH-CNC-01'; // Default CNC Turning Centre

  if (text.includes('chamfer')) {
    targetCode = 'MCH-CHAMF-01';
  } else if (text.includes('insert regrind') || text.includes('carbide regrind') || text.includes('insert grind')) {
    targetCode = 'MCH-REGR-01';
  } else if (text.includes('regrind') || text.includes('cutter grind') || text.includes('tool grind')) {
    targetCode = 'MCH-REGR-02';
  } else if (text.includes('tap') && (text.includes('m20') || text.includes('2') || text.includes('#2'))) {
    targetCode = 'MCH-TAP-02';
  } else if (text.includes('tap')) {
    targetCode = 'MCH-TAP-01';
  } else if (text.includes('cut') || text.includes('slitt')) {
    if (text.includes('3') || text.includes('#3')) targetCode = 'MCH-CUT-03';
    else if (text.includes('2') || text.includes('#2')) targetCode = 'MCH-CUT-02';
    else targetCode = 'MCH-CUT-01';
  } else if (text.includes('cnc') || text.includes('lathe') || text.includes('turning') || text.includes('micromatic') || text.includes('ace')) {
    targetCode = 'MCH-CNC-01';
  }

  const mRes = await client.query('SELECT id FROM machines WHERE machine_code = $1 LIMIT 1', [targetCode]);
  return mRes.rows[0]?.id || null;
}

// Tooling & Consumable Matching Helper (Auto-conversion to tools & inventory)
async function resolveToolAndInventory(desc: string, unitRate: number, lineUnit: string, client: any) {
  const text = desc.toLowerCase();
  let toolCode: string | null = null;
  let toolType = 'SPECIAL_TOOL';
  let defaultMachineCode = 'MCH-CNC-01';

  if (text.includes('slitt') || text.includes('saw') || text.includes('blade') || text.includes('4"')) {
    toolCode = 'TOOL-SLIT-4IN';
    toolType = 'SLITTING_SAW';
    defaultMachineCode = 'MCH-CUT-01';
  } else if (text.includes('m20')) {
    toolCode = 'TOOL-TAP-M20';
    toolType = 'THREAD_TAP';
    defaultMachineCode = 'MCH-TAP-02';
  } else if (text.includes('tap') || text.includes('m16')) {
    toolCode = 'TOOL-TAP-M16';
    toolType = 'THREAD_TAP';
    defaultMachineCode = 'MCH-TAP-01';
  } else if (text.includes('insert') || text.includes('carbide') || text.includes('turning') || text.includes('cnmg') || text.includes('wnmg')) {
    toolCode = 'TOOL-CNC-INSERT';
    toolType = 'TURNING_INSERT';
    defaultMachineCode = 'MCH-CNC-01';
  }

  // 1. Resolve Tool ID
  let toolId: string | null = null;
  if (toolCode) {
    const tRes = await client.query('SELECT id FROM tools WHERE tool_code = $1 LIMIT 1', [toolCode]);
    if (tRes.rows[0]) {
      toolId = tRes.rows[0].id;
    }
  }

  if (!toolId) {
    const genCode = `TOOL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const newTool = await client.query(
      `INSERT INTO tools (tool_code, tool_name, tool_type, standard_life_pieces, regrind_limit, unit_cost, active)
       VALUES ($1, $2, $3, 1000, 2, $4, true)
       RETURNING id`,
      [genCode, desc.substring(0, 100), toolType, unitRate || 0]
    );
    toolId = newTool.rows[0].id;
    toolCode = genCode;
  }

  // 2. Resolve Inventory Item ID
  let itemId: string | null = null;
  if (toolCode) {
    const iRes = await client.query('SELECT id FROM inventory_items WHERE item_code = $1 LIMIT 1', [toolCode]);
    if (iRes.rows[0]) {
      itemId = iRes.rows[0].id;
    }
  }

  if (!itemId) {
    const iRes2 = await client.query('SELECT id FROM inventory_items WHERE item_name ILIKE $1 LIMIT 1', [`%${desc.substring(0, 40)}%`]);
    if (iRes2.rows[0]) {
      itemId = iRes2.rows[0].id;
    } else {
      const newInv = await client.query(
        `INSERT INTO inventory_items (item_code, item_name, item_type, unit, reorder_level, active)
         VALUES ($1, $2, 'TOOLING', $3, 5, true)
         RETURNING id`,
        [toolCode || `TOOL-${Date.now()}`, desc.substring(0, 100), lineUnit || 'Nos']
      );
      itemId = newInv.rows[0].id;
    }
  }

  const mRes = await client.query('SELECT id FROM machines WHERE machine_code = $1 LIMIT 1', [defaultMachineCode]);
  const machineId = mRes.rows[0]?.id || null;

  return { toolId, itemId, machineId };
}

// Raw Material Inventory Resolver
async function resolveRawMaterialInventory(desc: string, lineUnit: string, client: any): Promise<string> {
  const text = desc.toLowerCase();
  let itemCode = 'RM-20MNCR5-25'; // Default 25mm

  if (text.includes('26mm') || text.includes('26 mm') || text.includes('bright')) {
    itemCode = 'RM-20MNCR5-26';
  }

  const iRes = await client.query('SELECT id FROM inventory_items WHERE item_code = $1 LIMIT 1', [itemCode]);
  if (iRes.rows[0]) return iRes.rows[0].id;

  const anyRm = await client.query("SELECT id FROM inventory_items WHERE item_type = 'RAW_MATERIAL' LIMIT 1");
  if (anyRm.rows[0]) return anyRm.rows[0].id;

  const newRm = await client.query(
    `INSERT INTO inventory_items (item_code, item_name, item_type, unit, reorder_level, active)
     VALUES ($1, $2, 'RAW_MATERIAL', $3, 1000, true)
     RETURNING id`,
    [itemCode, `20MnCr5 Round Bar (${itemCode})`, lineUnit || 'Kg']
  );
  return newRm.rows[0].id;
}

// Consumables Inventory Resolver
async function resolveConsumableInventory(desc: string, lineUnit: string, client: any): Promise<string> {
  const text = desc.toLowerCase();
  let itemCode = 'CONS-COOLANT-1305';

  if (text.includes('15.2') || (text.includes('spring') && text.includes('15'))) {
    itemCode = 'CONS-SPRING-152';
  } else if (text.includes('spring') || text.includes('12.7') || text.includes('wire')) {
    itemCode = 'CONS-SPRING-127';
  } else if (text.includes('circlip') || text.includes('retaining')) {
    itemCode = 'CONS-CIRCLIP-127';
  } else if (text.includes('poly') || text.includes('bag') || text.includes('packaging')) {
    itemCode = 'CONS-POLYBAG';
  } else if (text.includes('coolant') || text.includes('oil') || text.includes('1305')) {
    itemCode = 'CONS-COOLANT-1305';
  } else {
    const match = await client.query('SELECT id FROM inventory_items WHERE item_name ILIKE $1 LIMIT 1', [`%${desc.substring(0, 30)}%`]);
    if (match.rows[0]) return match.rows[0].id;

    const genCode = `CONS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const newCons = await client.query(
      `INSERT INTO inventory_items (item_code, item_name, item_type, unit, reorder_level, active)
       VALUES ($1, $2, 'CONSUMABLE', $3, 10, true)
       RETURNING id`,
      [genCode, desc.substring(0, 100), lineUnit || 'Nos']
    );
    return newCons.rows[0].id;
  }

  const iRes = await client.query('SELECT id FROM inventory_items WHERE item_code = $1 LIMIT 1', [itemCode]);
  if (iRes.rows[0]) return iRes.rows[0].id;

  const newCons = await client.query(
    `INSERT INTO inventory_items (item_code, item_name, item_type, unit, reorder_level, active)
     VALUES ($1, $2, 'CONSUMABLE', $3, 10, true)
     RETURNING id`,
    [itemCode, desc.substring(0, 100), lineUnit || 'Nos']
  );
  return newCons.rows[0].id;
}

// Complete Deletion Helper (Cascading delete of document and associated draft ledger records)
async function deleteDocumentById(id: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const docRes = await client.query('SELECT * FROM documents WHERE id = $1', [id]);
    const doc = docRes.rows[0];
    if (!doc) {
      await client.query('ROLLBACK');
      return { found: false };
    }

    // 1. Delete associated operational records
    await client.query('DELETE FROM capex WHERE document_id = $1', [id]);
    await client.query('DELETE FROM inventory_movements WHERE reference_document_id = $1', [id]);
    await client.query('DELETE FROM monthly_expenses WHERE document_id = $1', [id]);
    await client.query('DELETE FROM tool_life_events WHERE notes LIKE $1', [`%DocRef: ${id}%`]);

    // 2. Delete invoice items and invoice
    await client.query(
      'DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE document_id = $1)',
      [id]
    );
    await client.query('DELETE FROM invoices WHERE document_id = $1', [id]);

    // 3. Delete document extraction records
    await client.query('DELETE FROM document_pages WHERE document_id = $1', [id]);
    await client.query('DELETE FROM document_extractions WHERE document_id = $1', [id]);
    await client.query('DELETE FROM document_line_items WHERE document_id = $1', [id]);
    await client.query('DELETE FROM document_extraction_history WHERE document_id = $1', [id]);
    await client.query('DELETE FROM document_processing_events WHERE document_id = $1', [id]);

    // 4. Delete document record itself
    await client.query('DELETE FROM documents WHERE id = $1', [id]);

    // 5. Audit trail
    await client.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, old_value, changed_by)
       VALUES ('documents', $1, 'DOCUMENT_DELETED', $2, $3)`,
      [id, JSON.stringify({ filename: doc.original_filename, document_number: doc.document_number }), userId]
    );

    await client.query('COMMIT');

    // 6. Delete file from disk if present
    if (doc.storage_uri || doc.source_path) {
      try {
        const p = doc.storage_uri || doc.source_path;
        await fs.unlink(p).catch(() => {});
      } catch (_) {}
    }

    return { found: true, doc };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, action, classificationCode, reason } = body;

    if (!id) return json({ error: 'Document ID required' }, { status: 400 });

    // Explicit Document Deletion
    if (action === 'delete') {
      const res = await deleteDocumentById(id, user.id);
      if (!res.found) return json({ error: 'Document not found' }, { status: 404 });
      return json({ ok: true, message: `Document "${res.doc?.original_filename}" deleted successfully.` });
    }

    if (action === 'classify') {
      await pool.query('UPDATE documents SET classification_code = $1 WHERE id = $2', [classificationCode, id]);
      return json({ ok: true });
    }

    if (action === 'reject') {
      await pool.query(
        `UPDATE documents
         SET status = 'REJECTED', rejection_reason = $1, verified_by = $2, verified_at = now()
         WHERE id = $3`,
        [reason || 'Rejected by user', user.id, id]
      );
      return json({ ok: true });
    }

    if (action === 'reprocess' || action === 'REPROCESS') {
      const docRes = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
      const doc = docRes.rows[0];
      if (!doc) return json({ error: 'Document not found' }, { status: 404 });

      // Find file on disk
      let filePath = doc.source_path;
      const fsSync = await import('node:fs');
      if (!filePath || !fsSync.existsSync(/*turbopackIgnore: true*/ filePath)) {
        const baseName = path.basename(doc.storage_uri || doc.original_filename);
        const cand1 = path.join(storageRoot, baseName);
        if (fsSync.existsSync(/*turbopackIgnore: true*/ cand1)) filePath = cand1;
        const candTmp = path.join(os.tmpdir(), 'ucon_storage', 'documents', baseName);
        if (fsSync.existsSync(/*turbopackIgnore: true*/ candTmp)) filePath = candTmp;
      }
      // If file not found on disk, attempt to hydrate from base64 file_data stored in PostgreSQL
      if ((!filePath || !fsSync.existsSync(/*turbopackIgnore: true*/ filePath)) && doc.file_data) {
        try {
          const effectiveStorageRoot = path.join(os.tmpdir(), 'ucon_storage', 'documents');
          await fs.mkdir(effectiveStorageRoot, { recursive: true });
          const fname = `${doc.id}-${(doc.original_filename || 'doc.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
          const hydratedPath = path.join(effectiveStorageRoot, fname);
          const buf = Buffer.from(doc.file_data, 'base64');
          await fs.writeFile(hydratedPath, buf);
          filePath = hydratedPath;
        } catch (hydrateErr) {
          console.warn('Could not hydrate file from file_data:', hydrateErr);
        }
      }

      if (!filePath || !fsSync.existsSync(/*turbopackIgnore: true*/ filePath)) {
        return json({ error: 'Original scanned file not found on disk or database for re-processing' }, { status: 404 });
      }

      const isExcel =
        filePath.endsWith('.xlsx') ||
        filePath.endsWith('.xls') ||
        doc.mime_type?.includes('spreadsheet') ||
        doc.mime_type?.includes('excel') ||
        doc.source_kind === 'SPREADSHEET';

      const ocrResult = isExcel
        ? await processExcelDocument(filePath)
        : await processDocumentOCR(filePath, doc.mime_type || 'application/pdf');

      // Clear old extractions & line items
      await pool.query('DELETE FROM document_extractions WHERE document_id = $1', [id]);
      await pool.query('DELETE FROM document_line_items WHERE document_id = $1', [id]);

      // Save OCR extractions
      for (const field of ocrResult.fields) {
        await pool.query(
          `INSERT INTO document_extractions (
            document_id, page_no, field_name, extracted_value, normalized_value,
            confidence, confidence_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            field.pageNo || 1,
            field.fieldName,
            field.extractedValue,
            field.normalizedValue,
            field.confidence,
            field.confidence >= 0.85 ? 'HIGH' : field.confidence >= 0.6 ? 'MEDIUM' : 'LOW',
          ]
        );
      }

      // Save line items
      for (const line of ocrResult.lines) {
        await pool.query(
          `INSERT INTO document_line_items (
            document_id, line_no, description, part_number, hsn_code,
            quantity, unit, unit_rate, discount, taxable_amount,
            tax_rate, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
            category_code, sub_category, process_stage_code, destination_module,
            capex_or_opex, costing_head, confidence, confidence_status, source_page_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
          [
            id,
            line.lineNo,
            line.description,
            line.partNumber,
            line.hsnCode,
            line.quantity,
            line.unit,
            line.unitRate,
            line.discount || 0,
            line.taxableAmount,
            line.taxRate,
            line.cgstAmount || 0,
            line.sgstAmount || 0,
            line.igstAmount || 0,
            line.taxAmount || 0,
            line.totalAmount,
            line.categoryCode,
            line.subCategory,
            line.processStageCode,
            line.destinationModule,
            line.capexOrOpex,
            line.costingHead,
            line.confidence,
            line.confidenceStatus,
            line.sourcePageNumber || 1,
          ]
        );
      }

      // Save document pages
      if (Array.isArray(ocrResult.pages)) {
        await pool.query('DELETE FROM document_pages WHERE document_id = $1', [id]);
        for (const p of ocrResult.pages) {
          await pool.query(
            `INSERT INTO document_pages (document_id, page_no, ocr_text)
             VALUES ($1, $2, $3)`,
            [id, p.pageNo, p.text]
          );
        }
      }

      // Resolve vendor, doc number, date
      const vendorField = ocrResult.fields.find((f) =>
        ['vendor', 'vendor_name', 'VENDOR_NAME'].includes(f.fieldName)
      )?.normalizedValue;
      const dateField = ocrResult.fields.find((f) =>
        ['document_date', 'DOCUMENT_DATE', 'date'].includes(f.fieldName)
      )?.normalizedValue;
      const numberField = ocrResult.fields.find((f) =>
        ['document_number', 'DOCUMENT_NUMBER', 'invoice_number', 'INVOICE_NUMBER'].includes(f.fieldName)
      )?.normalizedValue;

      let vendorId = null;
      if (vendorField) {
        let vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${vendorField}%`]);
        if (!vRes.rows[0]) {
          const firstWord = vendorField.split(' ')[0];
          if (firstWord && firstWord.length > 2) {
            vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${firstWord}%`]);
          }
        }
        if (vRes.rows[0]) {
          vendorId = vRes.rows[0].id;
        } else {
          const newV = await pool.query(
            `INSERT INTO vendors (canonical_name, category) VALUES ($1, 'SUBCONTRACT') RETURNING id`,
            [vendorField]
          );
          vendorId = newV.rows[0].id;
        }
      }

      await pool.query(
        `UPDATE documents
         SET classification_code = $1,
             destination_module = $2,
             destination_record_type = $3,
             ai_confidence = $4,
             document_date = $5,
             document_number = $6,
             vendor_id = $7,
             document_type = $8,
             page_count = $9
         WHERE id = $10`,
        [
          ocrResult.classificationCode,
          ocrResult.destinationModule,
          ocrResult.destinationRecordType,
          ocrResult.confidence,
          dateField || null,
          numberField || null,
          vendorId,
          mapToDocumentTypeEnum(ocrResult.documentType),
          ocrResult.pages?.length || 1,
          id,
        ]
      );

      return json({ ok: true, message: 'Document re-scanned and extracted successfully!' });
    }

    // Controlled ERP Posting (Sections 51, 53, 78 & 86 requirement)
    if (action === 'verify' || action === 'post_to_erp') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const docRes = await client.query('SELECT * FROM documents WHERE id = $1', [id]);
        const doc = docRes.rows[0];
        if (!doc) throw new Error('Document not found');

        const { verifiedFields, verifiedLines } = body;

        // Helper to extract field value supporting snake_case, camelCase, and fieldCode
        const getVal = (names: string[]): string | undefined => {
          if (!verifiedFields || !Array.isArray(verifiedFields)) return undefined;
          for (const name of names) {
            const f = verifiedFields.find(
              (item: any) =>
                item.field_name === name ||
                item.fieldName === name ||
                item.fieldCode === name ||
                item.field_code === name ||
                (item.field_name && item.field_name.toLowerCase() === name.toLowerCase()) ||
                (item.fieldName && item.fieldName.toLowerCase() === name.toLowerCase()) ||
                (item.fieldCode && item.fieldCode.toLowerCase() === name.toLowerCase()) ||
                (item.field_code && item.field_code.toLowerCase() === name.toLowerCase())
            );
            if (f) {
              const val = f.reviewedValue ?? f.reviewed_value ?? f.normalizedValue ?? f.normalized_value ?? f.extractedValue ?? f.extracted_value;
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                return String(val).trim();
              }
            }
          }
          return undefined;
        };

        // 1. Update field extractions if provided
        if (Array.isArray(verifiedFields)) {
          for (const f of verifiedFields) {
            if (f.id) {
              await client.query(
                `UPDATE document_extractions
                 SET reviewed_value = $1, reviewed_by = $2, reviewed_at = now()
                 WHERE id = $3 AND document_id = $4`,
                [f.reviewedValue ?? f.reviewed_value ?? f.normalizedValue ?? f.normalized_value ?? f.extractedValue ?? f.extracted_value, user.id, f.id, id]
              );
            }
          }
        }

        // 2. Update line items if provided
        if (Array.isArray(verifiedLines)) {
          // Remove deleted line items
          const keepIds = verifiedLines
            .map((l: any) => l.id)
            .filter((lid: any) => lid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lid));
          if (keepIds.length > 0) {
            await client.query(
              `DELETE FROM document_line_items WHERE document_id = $1 AND id NOT IN (${keepIds.map((_, i) => `$${i + 2}`).join(',')})`,
              [id, ...keepIds]
            );
          }

          for (let idx = 0; idx < verifiedLines.length; idx++) {
            const l = verifiedLines[idx];
            const lineNo = l.line_no || l.lineNo || (idx + 1);
            const isExistingUuid = l.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(l.id);

            const qty = l.quantity !== '' && l.quantity !== null && l.quantity !== undefined
              ? Number(l.quantity)
              : Number(l.reviewed_quantity ?? 1);
            const rate = l.unitRate !== '' && l.unitRate !== null && l.unitRate !== undefined
              ? Number(l.unitRate)
              : Number(l.reviewed_unit_rate ?? l.unit_rate ?? 0);
            const total = l.totalAmount !== '' && l.totalAmount !== null && l.totalAmount !== undefined
              ? Number(l.totalAmount)
              : Number(l.reviewed_total_amount ?? l.total_amount ?? (qty * rate));

            const lPartNo = l.partNumber || l.part_number || l.reviewed_part_number || null;
            const lHsn = l.hsnCode || l.hsn_code || l.reviewed_hsn_code || null;
            const lDiscount = Number(l.discount ?? l.reviewed_discount ?? 0);
            const lTaxRate = Number(l.taxRate ?? l.tax_rate ?? l.reviewed_tax_rate ?? 0);
            const lTaxable = Number(l.taxableAmount ?? l.taxable_amount ?? l.reviewed_taxable_amount ?? (qty * rate - lDiscount));
            const lCgst = Number(l.cgstAmount ?? l.cgst_amount ?? l.reviewed_cgst_amount ?? 0);
            const lSgst = Number(l.sgstAmount ?? l.sgst_amount ?? l.reviewed_sgst_amount ?? 0);
            const lIgst = Number(l.igstAmount ?? l.igst_amount ?? l.reviewed_igst_amount ?? 0);
            const lTax = Number(l.taxAmount ?? l.tax_amount ?? l.reviewed_tax_amount ?? (lCgst + lSgst + lIgst));
            const lCategoryCode = l.categoryCode || l.category_code || l.reviewed_category_code || 'OTHER_EXPENSE';
            const lSubCat = l.subCategory || l.sub_category || l.reviewed_sub_category || null;
            const lDestination = l.destinationModule || l.destination_module || l.reviewed_destination_module || 'Purchase';
            const lCapexOpex = l.capexOrOpex || l.capex_or_opex || l.reviewed_capex_or_opex || (lCategoryCode.includes('MACHINE') ? 'CAPEX' : 'OPEX');
            const lCostingHead = l.costingHead || l.costing_head || l.reviewed_costing_head || 'OTHER EXPENSES';

            if (isExistingUuid) {
              await client.query(
                `UPDATE document_line_items
                 SET reviewed_description = $1,
                     reviewed_part_number = $2,
                     reviewed_hsn_code = $3,
                     reviewed_quantity = $4,
                     reviewed_unit = $5,
                     reviewed_unit_rate = $6,
                     reviewed_discount = $7,
                     reviewed_taxable_amount = $8,
                     reviewed_tax_rate = $9,
                     reviewed_cgst_amount = $10,
                     reviewed_sgst_amount = $11,
                     reviewed_igst_amount = $12,
                     reviewed_tax_amount = $13,
                     reviewed_total_amount = $14,
                     reviewed_category_code = $15,
                     reviewed_sub_category = $16,
                     reviewed_destination_module = $17,
                     reviewed_capex_or_opex = $18,
                     reviewed_costing_head = $19,
                     review_status = 'VERIFIED',
                     reviewed_by = $20,
                     reviewed_at = now()
                 WHERE id = $21 AND document_id = $22`,
                [
                  l.description,
                  lPartNo,
                  lHsn,
                  qty,
                  l.unit || 'Nos',
                  rate,
                  lDiscount,
                  lTaxable,
                  lTaxRate,
                  lCgst,
                  lSgst,
                  lIgst,
                  lTax,
                  total,
                  lCategoryCode,
                  lSubCat,
                  lDestination,
                  lCapexOpex,
                  lCostingHead,
                  user.id,
                  l.id,
                  id,
                ]
              );
            } else {
              await client.query(
                `INSERT INTO document_line_items (
                  document_id, line_no, description, reviewed_description,
                  part_number, reviewed_part_number, hsn_code, reviewed_hsn_code,
                  quantity, reviewed_quantity, unit, reviewed_unit,
                  unit_rate, reviewed_unit_rate, discount, reviewed_discount,
                  taxable_amount, reviewed_taxable_amount, tax_rate, reviewed_tax_rate,
                  cgst_amount, reviewed_cgst_amount, sgst_amount, reviewed_sgst_amount,
                  igst_amount, reviewed_igst_amount, tax_amount, reviewed_tax_amount,
                  total_amount, reviewed_total_amount,
                  category_code, reviewed_category_code, sub_category, reviewed_sub_category,
                  destination_module, reviewed_destination_module,
                  capex_or_opex, reviewed_capex_or_opex, costing_head, reviewed_costing_head,
                  review_status, confidence, confidence_status, reviewed_by, reviewed_at
                ) VALUES (
                  $1, $2, $3, $3, $4, $4, $5, $5, $6, $6, $7, $7, $8, $8, $9, $9,
                  $10, $10, $11, $11, $12, $12, $13, $13, $14, $14, $15, $15, $16, $16,
                  $17, $17, $18, $18, $19, $19, $20, $20, $21, $21, 'VERIFIED', 1.0, 'HIGH', $22, now()
                )`,
                [
                  id,
                  lineNo,
                  l.description || 'Line Item',
                  lPartNo,
                  lHsn,
                  qty,
                  l.unit || 'Nos',
                  rate,
                  lDiscount,
                  lTaxable,
                  lTaxRate,
                  lCgst,
                  lSgst,
                  lIgst,
                  lTax,
                  total,
                  lCategoryCode,
                  lSubCat,
                  lDestination,
                  lCapexOpex,
                  lCostingHead,
                  user.id,
                ]
              );
            }
          }
        }

        // 3. Resolve Vendor
        const vendorName =
          body.vendorName ||
          getVal(['vendor_name', 'vendor', 'supplier_name', 'supplier']) ||
          doc.vendor_name;

        let vendorId = doc.vendor_id;
        if (vendorName) {
          let vCheck = await client.query(
            'SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1',
            [`%${String(vendorName).trim()}%`]
          );
          if (!vCheck.rows[0]) {
            const firstTwo = String(vendorName).trim().split(' ').slice(0, 2).join(' ');
            if (firstTwo.length > 3) {
              vCheck = await client.query(
                'SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1',
                [`%${firstTwo}%`]
              );
            }
          }
          if (vCheck.rows[0]) {
            vendorId = vCheck.rows[0].id;
          } else {
            const newV = await client.query(
              `INSERT INTO vendors (canonical_name, category)
               VALUES ($1, 'SUBCONTRACT') RETURNING id`,
              [String(vendorName).trim()]
            );
            vendorId = newV.rows[0].id;
          }
        }

        // 4. Resolve Document Date & Number & Amounts
        const docNumber =
          body.documentNumber ||
          getVal(['document_number', 'invoice_number', 'invoice_no', 'bill_no']) ||
          doc.document_number ||
          `INV-${Date.now()}`;

        let docDate =
          body.documentDate ||
          getVal(['document_date', 'invoice_date', 'bill_date', 'date']) ||
          doc.document_date;

        if (!docDate || isNaN(new Date(docDate).getTime())) {
          docDate = new Date().toISOString().split('T')[0];
        } else {
          docDate = new Date(docDate).toISOString().split('T')[0];
        }

        const linesToPost = verifiedLines && verifiedLines.length > 0
          ? verifiedLines
          : (await client.query('SELECT * FROM document_line_items WHERE document_id = $1 ORDER BY line_no', [id])).rows;

        let lineSum = 0;
        for (const l of linesToPost) {
          const lQty = Number(l.reviewed_quantity ?? l.quantity ?? 1);
          const lRate = Number(l.reviewed_unit_rate ?? l.unitRate ?? l.unit_rate ?? 0);
          const lTotal = Number(l.reviewed_total_amount ?? l.totalAmount ?? l.total_amount ?? (lQty * lRate));
          lineSum += lTotal;
        }

        const totalFieldStr = getVal(['total_amount', 'total_invoice_amount', 'grand_total', 'invoice_total', 'total']);
        let totalAmount = Number(body.totalAmount || totalFieldStr || doc.total_amount || 0);
        if ((!totalAmount || totalAmount <= 0) && lineSum > 0) {
          totalAmount = lineSum;
        }

        const subtotalFieldStr = getVal(['subtotal_amount', 'taxable_value', 'subtotal']);
        let subtotal = Number(body.subtotal || subtotalFieldStr || 0);
        if (!subtotal || subtotal <= 0) {
          subtotal = totalAmount;
        }

        const cgstAmount = Number(getVal(['cgst_amount', 'cgst']) || 0);
        const sgstAmount = Number(getVal(['sgst_amount', 'sgst']) || 0);
        const igstAmount = Number(getVal(['igst_amount', 'igst']) || 0);
        const vehicleNumber = getVal(['vehicle_number', 'vehicle_no']);
        const transporterName = getVal(['transporter_name', 'transporter']);
        const lrNumber = getVal(['lr_number', 'lr_no']);
        const reverseCharge = getVal(['reverse_charge_applicable', 'reverse_charge']) || 'NO';
        const amountInWords = getVal(['amount_in_words']);

        // 5. Create or Update Invoices record with canonical fields
        const invRes = await client.query(
          `INSERT INTO invoices (
            vendor_id, invoice_number, invoice_date, subtotal, total_amount,
            cgst, sgst, igst, vehicle_number, transporter_name, lr_number, reverse_charge, amount_in_words,
            status, document_id, payment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'VERIFIED', $14, 'UNPAID')
          ON CONFLICT (invoice_number, vendor_id) DO UPDATE
          SET subtotal = EXCLUDED.subtotal,
              total_amount = EXCLUDED.total_amount,
              cgst = EXCLUDED.cgst,
              sgst = EXCLUDED.sgst,
              igst = EXCLUDED.igst,
              vehicle_number = EXCLUDED.vehicle_number,
              transporter_name = EXCLUDED.transporter_name,
              lr_number = EXCLUDED.lr_number,
              reverse_charge = EXCLUDED.reverse_charge,
              amount_in_words = EXCLUDED.amount_in_words,
              invoice_date = EXCLUDED.invoice_date,
              status = 'VERIFIED',
              document_id = EXCLUDED.document_id
          RETURNING id`,
          [
            vendorId || null,
            docNumber,
            docDate,
            subtotal,
            totalAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            vehicleNumber || null,
            transporterName || null,
            lrNumber || null,
            reverseCharge,
            amountInWords || null,
            id,
          ]
        );

        const invoiceId = invRes.rows[0].id;

        // 6. Delete previous operational and invoice records for this document to make posting clean & idempotent
        await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
        await client.query('DELETE FROM capex WHERE document_id = $1', [id]);
        await client.query('DELETE FROM inventory_movements WHERE reference_document_id = $1', [id]);
        await client.query('DELETE FROM tool_life_events WHERE notes LIKE $1', [`%DocRef: ${id}%`]);

        // Fallback: if linesToPost is empty but totalAmount > 0, generate single primary invoice item
        const effectiveLines = linesToPost.length > 0 ? linesToPost : [
          {
            description: `Invoice ${docNumber}`,
            quantity: 1,
            unit: 'Nos',
            unitRate: totalAmount,
            totalAmount: totalAmount,
            categoryCode: doc.classification_code || 'OTHER_EXPENSE',
            destinationModule: doc.destination_module || 'Purchase',
          }
        ];

        for (let i = 0; i < effectiveLines.length; i++) {
          const line = effectiveLines[i];
          const desc = String(line.reviewed_description || line.description || 'Line Item').trim();
          const qty = (Number(line.reviewed_quantity) > 0)
            ? Number(line.reviewed_quantity)
            : (Number(line.quantity) > 0 ? Number(line.quantity) : 1);

          const unit = String(line.reviewed_unit || line.unit || 'Nos').trim();

          const rate = (Number(line.reviewed_unit_rate) > 0)
            ? Number(line.reviewed_unit_rate)
            : (Number(line.unitRate) > 0 ? Number(line.unitRate) : Number(line.unit_rate || 0));

          const amount = (Number(line.reviewed_total_amount) > 0)
            ? Number(line.reviewed_total_amount)
            : (Number(line.totalAmount) > 0 ? Number(line.totalAmount) : (Number(line.total_amount) > 0 ? Number(line.total_amount) : (qty * rate)));
          const rawCat = String(line.reviewed_category_code || line.categoryCode || line.category_code || 'OTHER_EXPENSE').toUpperCase();

          const partNo = line.reviewed_part_number || line.partNumber || line.part_number || null;
          const hsnCode = line.reviewed_hsn_code || line.hsnCode || line.hsn_code || null;
          const taxRate = Number(line.reviewed_tax_rate ?? line.taxRate ?? line.tax_rate ?? 0);
          const taxableAmt = Number(line.reviewed_taxable_amount ?? line.taxableAmount ?? line.taxable_amount ?? (qty * rate));
          const taxAmt = Number(line.reviewed_tax_amount ?? line.taxAmount ?? line.tax_amount ?? 0);
          const cgstAmt = Number(line.reviewed_cgst_amount ?? line.cgstAmount ?? line.cgst_amount ?? 0);
          const sgstAmt = Number(line.reviewed_sgst_amount ?? line.sgstAmount ?? line.sgst_amount ?? 0);
          const igstAmt = Number(line.reviewed_igst_amount ?? line.igstAmount ?? line.igst_amount ?? 0);
          const capexOrOpex = line.reviewed_capex_or_opex || line.capexOrOpex || line.capex_or_opex || (rawCat.includes('MACHINE') ? 'CAPEX' : 'OPEX');
          const costingHead = line.reviewed_costing_head || line.costingHead || line.costing_head || 'OTHER EXPENSES';

          // 1. Record item in invoice_items with full canonical fields
          await client.query(
            `INSERT INTO invoice_items (
              invoice_id, description, part_number, hsn_code, quantity, unit,
              unit_rate, taxable_amount, tax_rate, cgst_amount, sgst_amount, igst_amount,
              tax_amount, line_total, capex_or_opex, costing_head
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              invoiceId,
              desc,
              partNo,
              hsnCode,
              qty,
              unit,
              rate,
              taxableAmt,
              taxRate,
              cgstAmt,
              sgstAmt,
              igstAmt,
              taxAmt,
              amount,
              capexOrOpex,
              costingHead,
            ]
          );

          // 2. Account routing
          const isMachine =
            capexOrOpex === 'CAPEX' ||
            rawCat.includes('MACHINE') ||
            rawCat.includes('CAPEX') ||
            /machine|lathe|turning\s*centre|grinder|chamfer|slitting\s*machine|tapping\s*machine|slot\s*cutt|slotting|preventive\s*maint/i.test(desc);

          const isTool =
            !isMachine &&
            (rawCat.includes('TOOL') ||
              /insert|carbide|slitting\s*(?:saw|blade)|cutter.*4|tap\b|threading\s*tap/i.test(desc));

          const isRawMaterial =
            !isMachine &&
            !isTool &&
            (rawCat.includes('RAW_MATERIAL') ||
              /20mncr5|round\s*bar|black\s*bar|steel|billet/i.test(desc));

          const isConsumable =
            !isMachine &&
            !isTool &&
            !isRawMaterial &&
            (rawCat.includes('CONSUMABLE') ||
              /coolant|oil|1305|spring|circlip|poly\s*bag|packaging|grease/i.test(desc));

          const isHeatTreatment =
            rawCat.includes('HEAT') || /heat\s*treat|case\s*hard|hardening|tempering/i.test(desc);

          if (isMachine) {
            const machineId = await resolveMachineId(desc, vendorName || '', client);
            await client.query(
              `INSERT INTO capex (
                machine_id, asset_name, asset_type, purchase_date, amount, vendor_id, document_id, notes
              ) VALUES ($1, $2, 'MACHINE', $3, $4, $5, $6, $7)`,
              [
                machineId,
                desc,
                docDate,
                taxableAmt > 0 ? taxableAmt : amount,
                vendorId || null,
                id,
                `Verified from invoice ${docNumber} (${vendorName || 'Vendor'}) · DocRef: ${id}`,
              ]
            );
          } else if (isTool) {
            const { toolId, itemId, machineId } = await resolveToolAndInventory(desc, rate, unit, client);
            await client.query(
              `INSERT INTO inventory_movements (
                item_id, movement_date, movement_type, quantity, unit_cost, reference_document_id, entered_by
              ) VALUES ($1, $2, 'RECEIPT', $3, $4, $5, $6)`,
              [itemId, docDate, qty, rate, id, user.id]
            );
            await client.query(
              `INSERT INTO tool_life_events (
                tool_id, machine_id, event_date, event_type, cost, notes, created_by
              ) VALUES ($1, $2, $3, 'NEW_TOOL_RECEIPT', $4, $5, $6)`,
              [toolId, machineId, docDate, amount, `Invoice ${docNumber} · DocRef: ${id}`, user.id]
            );
          } else if (isRawMaterial) {
            const itemId = await resolveRawMaterialInventory(desc, unit, client);
            await client.query(
              `INSERT INTO inventory_movements (
                item_id, movement_date, movement_type, quantity, unit_cost, reference_document_id, entered_by
              ) VALUES ($1, $2, 'RECEIPT', $3, $4, $5, $6)`,
              [itemId, docDate, qty, rate, id, user.id]
            );
          } else if (isConsumable) {
            const itemId = await resolveConsumableInventory(desc, unit, client);
            await client.query(
              `INSERT INTO inventory_movements (
                item_id, movement_date, movement_type, quantity, unit_cost, reference_document_id, entered_by
              ) VALUES ($1, $2, 'RECEIPT', $3, $4, $5, $6)`,
              [itemId, docDate, qty, rate, id, user.id]
            );
          } else if (isHeatTreatment) {
            await client.query(
              `INSERT INTO monthly_expenses (
                expense_month, category, subcategory, amount, vendor_id, document_id, notes
              ) VALUES (date_trunc('month', $1::date), 'MANUFACTURING', 'HEAT_TREATMENT', $2, $3, $4, $5)`,
              [docDate, amount, vendorId || null, id, `Heat Treatment Invoice ${docNumber} · DocRef: ${id}`]
            );
          }
        }

        // 7. Mark Document as VERIFIED and persist verified document type
        const docTypeVal = getVal(['document_type', 'document_sub_type']);
        const enumType = docTypeVal ? mapToDocumentTypeEnum(docTypeVal) : null;

        await client.query(
          `UPDATE documents
           SET status = 'VERIFIED',
               document_number = $1,
               document_date = $2,
               vendor_id = $3,
               classification_code = COALESCE($4, classification_code),
               document_type = COALESCE($5, document_type),
               verified_by = $6,
               verified_at = now()
           WHERE id = $7`,
          [docNumber, docDate, vendorId || null, docTypeVal || null, enumType, user.id, id]
        );

        // 8. Audit verification and controlled posting
        await client.query(
          `INSERT INTO audit_log (entity_type, entity_id, action, new_value, changed_by)
           VALUES ('documents', $1, 'CONTROLLED_ERP_POST', $2, $3)`,
          [
            id,
            JSON.stringify({
              invoiceId,
              invoiceNumber: docNumber,
              vendorId,
              totalAmount,
              lineCount: effectiveLines.length,
            }),
            user.id,
          ]
        );

        await client.query('COMMIT');
        return json({
          ok: true,
          invoiceId,
          message: `Document ${docNumber} successfully verified and posted to ERP!`,
        });
      } catch (postErr: any) {
        await client.query('ROLLBACK');
        console.error('Controlled ERP post error:', postErr);
        throw postErr;
      } finally {
        client.release();
      }
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Document PATCH error:', error);
    return json({ error: error.message || 'Error updating document' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Document ID required' }, { status: 400 });

    const result = await deleteDocumentById(id, user.id);
    if (!result.found) return json({ error: 'Document not found' }, { status: 404 });

    return json({ ok: true, message: `Document "${result.doc?.original_filename}" deleted successfully.` });
  } catch (error: any) {
    console.error('Document DELETE error:', error);
    return json({ error: error.message || 'Error deleting document' }, { status: 500 });
  }
}
