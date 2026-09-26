const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkDb() {
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Public tables in Supabase:');
  console.table(tables.rows);

  const docCount = await pool.query('SELECT count(*) FROM documents;');
  console.log('Current document count in documents table:', docCount.rows[0].count);

  const lineCount = await pool.query('SELECT count(*) FROM document_lines;');
  console.log('Current line items count in document_lines table:', lineCount.rows[0].count);

  await pool.end();
}

checkDb();
