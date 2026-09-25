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
    "SELECT id, original_filename, document_number, ai_confidence, status, created_at, rejection_reason FROM documents WHERE original_filename = '118.pdf' ORDER BY created_at DESC"
  );
  console.log('--- 118.pdf DOCUMENTS ---');
  console.table(docs.rows);

  const recent = await pool.query(
    "SELECT id, original_filename, document_number, ai_confidence, status, created_at, rejection_reason FROM documents ORDER BY created_at DESC LIMIT 5"
  );
  console.log('\n--- 5 MOST RECENT DOCUMENTS ---');
  console.table(recent.rows);

  await pool.end();
}

check().catch(console.error);
