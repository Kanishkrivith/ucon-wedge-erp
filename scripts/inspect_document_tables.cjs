const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspectCols() {
  const tables = ['documents', 'document_extractions', 'document_line_items'];
  for (const t of tables) {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\nColumns of ${t}:`);
    console.table(res.rows);
  }
  await pool.end();
}

inspectCols();
