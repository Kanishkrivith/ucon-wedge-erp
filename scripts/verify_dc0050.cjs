const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve('.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
for (const line of envText.split('\n')) {
  if (line.trim().startsWith('DATABASE_URL=')) {
    dbUrl = line.trim().substring('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
  }
}
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function verify() {
  const doc = await pool.query("SELECT id, original_filename, document_number, document_type, document_date, status, ai_confidence FROM documents WHERE original_filename ILIKE '%DC-0050%'");
  console.log('Document:', doc.rows[0]);

  const fields = await pool.query('SELECT field_name, extracted_value, confidence FROM document_extractions WHERE document_id = $1', [doc.rows[0].id]);
  console.log('\nExtractions count:', fields.rows.length);
  console.table(fields.rows);

  const lines = await pool.query('SELECT line_no, description, quantity, unit, unit_rate, taxable_amount, total_amount, category_code, destination_module FROM document_line_items WHERE document_id = $1', [doc.rows[0].id]);
  console.log('\nLine items count:', lines.rows.length);
  console.table(lines.rows);

  await pool.end();
}

verify().catch(console.error);
