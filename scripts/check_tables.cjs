const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('Tables in database:', res.rows.map(r => r.table_name));

    // Also check row counts in primary tables
    for (const row of res.rows) {
      try {
        const countRes = await pool.query(`SELECT count(*) FROM "${row.table_name}"`);
        console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await pool.end();
  }
}
check();
