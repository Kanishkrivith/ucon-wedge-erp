const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://ucon:ucon_dev_password@localhost:5432/ucon_wedge' });

async function check() {
  const docId = '4d9522e0-8ce1-48b7-b01b-1ea103f332b8';
  const [doc, fields, lines, pages] = await Promise.all([
    pool.query("SELECT * FROM documents WHERE id = $1", [docId]),
    pool.query("SELECT * FROM document_extractions WHERE document_id = $1", [docId]),
    pool.query("SELECT * FROM document_line_items WHERE document_id = $1", [docId]),
    pool.query("SELECT * FROM document_pages WHERE document_id = $1", [docId]),
  ]);

  console.log('Doc found:', doc.rows.length);
  console.log('Fields count:', fields.rows.length);
  console.log('Lines count:', lines.rows.length);
  console.log('Pages count:', pages.rows.length);

  // Check enum record_status
  const enumVals = await pool.query("SELECT enum_range(NULL::record_status)");
  console.log('record_status enum values:', enumVals.rows[0].enum_range);

  await pool.end();
}

check().catch(console.error);
