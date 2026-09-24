import { Pool } from 'pg';
import { processDocumentOCR } from '../lib/ai/document-ocr';

async function main() {
  const pool = new Pool({ connectionString: 'postgresql://ucon:ucon_dev_password@localhost:5432/ucon_wedge' });
  const docId = '4abd1c9f-8ff1-4d59-80bf-260f82d0e63e';

  console.log('Fetching document from DB...');
  const docRes = await pool.query('SELECT * FROM documents WHERE id = $1', [docId]);
  const doc = docRes.rows[0];
  if (!doc) {
    throw new Error('Document not found');
  }

  const filePath = doc.source_path;
  console.log('Processing OCR on:', filePath);
  const ocrResult = await processDocumentOCR(filePath, doc.mime_type || 'application/pdf');

  console.log('Clearing old extractions & line items...');
  await pool.query('DELETE FROM document_extractions WHERE document_id = $1', [docId]);
  await pool.query('DELETE FROM document_line_items WHERE document_id = $1', [docId]);

  console.log('Inserting updated extractions...');
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

  console.log('Inserting updated line items...');
  for (const line of ocrResult.lines) {
    await pool.query(
      `INSERT INTO document_line_items (
        document_id, line_no, description, quantity, unit, unit_rate, total_amount,
        category_code, process_stage_code, destination_module, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        docId,
        line.lineNo,
        line.description,
        line.quantity,
        line.unit,
        line.unitRate,
        line.totalAmount,
        line.categoryCode,
        line.processStageCode,
        line.destinationModule,
        line.confidence,
      ]
    );
  }

  // Resolve vendor, doc number, date
  const vendorField = ocrResult.fields.find((f) => f.fieldName === 'vendor' || f.fieldName === 'vendor_name')?.normalizedValue;
  const dateField = ocrResult.fields.find((f) => f.fieldName === 'document_date')?.normalizedValue;
  const numberField = ocrResult.fields.find((f) => f.fieldName === 'document_number')?.normalizedValue;

  let vendorId = doc.vendor_id;
  if (vendorField) {
    const vRes = await pool.query('SELECT id FROM vendors WHERE canonical_name ILIKE $1 LIMIT 1', [`%${vendorField}%`]);
    if (vRes.rows[0]) {
      vendorId = vRes.rows[0].id;
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
      ocrResult.documentType || 'INVOICE',
      ocrResult.pages?.length || 1,
      docId,
    ]
  );

  console.log('Document updated with new OCR extractions!');

  // Verify what is now in DB
  const fieldsInDb = await pool.query('SELECT field_name, extracted_value, normalized_value FROM document_extractions WHERE document_id = $1 ORDER BY field_name', [docId]);
  console.log('\n--- VERIFIED DB FIELDS ---');
  for (const f of fieldsInDb.rows) {
    console.log(`${f.field_name}: "${f.extracted_value}" => norm: "${f.normalized_value}"`);
  }

  const linesInDb = await pool.query('SELECT * FROM document_line_items WHERE document_id = $1 ORDER BY line_no', [docId]);
  console.log('\n--- VERIFIED DB LINE ITEMS ---');
  for (const l of linesInDb.rows) {
    console.log(`Line ${l.line_no}: "${l.description}" | Qty: ${l.quantity} ${l.unit} | Rate: ₹${l.unit_rate} | Total: ₹${l.total_amount} | Cat: ${l.category_code} | Dest: ${l.destination_module}`);
  }

  await pool.end();
}

main().catch(err => console.error(err));
