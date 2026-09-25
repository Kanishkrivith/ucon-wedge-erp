const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of env.split('\n')) {
  if (line.trim().startsWith('DATABASE_URL=')) dbUrl = line.trim().substring('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
}
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  const docs = await pool.query(
    `SELECT d.id, d.original_filename, d.document_number, d.document_type, d.document_date, 
            v.canonical_name as vendor, d.rejection_reason, d.status, d.ai_confidence,
            (SELECT count(*) FROM document_extractions WHERE document_id = d.id) as fields_count,
            (SELECT count(*) FROM document_line_items WHERE document_id = d.id) as lines_count,
            (SELECT length(ocr_text) FROM document_pages WHERE document_id = d.id LIMIT 1) as page_text_len
     FROM documents d
     LEFT JOIN vendors v ON v.id = d.vendor_id
     ORDER BY d.created_at DESC LIMIT 8`
  );
  console.log('--- RECENT DOCUMENTS IN DATABASE ---');
  console.table(docs.rows);
  await pool.end();
}

check().catch(console.error);
