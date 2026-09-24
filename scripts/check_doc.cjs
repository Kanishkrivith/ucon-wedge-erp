const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://ucon:ucon_dev_password@localhost:5432/ucon_wedge' });

async function check() {
  try {
    const res = await pool.query('SELECT id, document_number, document_type, classification_code, document_date, vendor_id, ai_confidence, status FROM documents WHERE id = $1', ['4d9522e0-8ce1-48b7-b01b-1ea103f332b8']);
    const doc = res.rows[0];
    if (!doc) {
      console.log('Doc not found!');
      return;
    }
    console.log('Document status:', doc.status);
    const inv = await pool.query('SELECT id, invoice_number, invoice_date, total_amount, status, payment_status FROM invoices WHERE document_id = $1', [doc.id]);
    console.log('\n--- POSTED INVOICE ---');
    console.table(inv.rows);
    if (inv.rows[0]) {
      const items = await pool.query('SELECT description, quantity, line_total FROM invoice_items WHERE invoice_id = $1', [inv.rows[0].id]);
      console.log('\n--- INVOICE ITEMS ---');
      console.table(items.rows);
    }

    const pages = await pool.query('SELECT page_no, length(ocr_text) as text_len FROM document_pages WHERE document_id = $1 ORDER BY page_no', [doc.id]);
    console.log('\n--- PAGES ---');
    console.table(pages.rows);

    const lines = await pool.query('SELECT line_no, description, quantity, unit, unit_rate, total_amount, category_code, destination_module FROM document_line_items WHERE document_id = $1 ORDER BY line_no', [doc.id]);
    console.log('\n--- LINE ITEMS ---');
    console.table(lines.rows);


    
    const fields = await pool.query('SELECT field_name, extracted_value, normalized_value, confidence FROM document_extractions WHERE document_id = $1', [doc.id]);
    console.log('\n--- FIELDS TABLE ---');
    console.table(fields.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
