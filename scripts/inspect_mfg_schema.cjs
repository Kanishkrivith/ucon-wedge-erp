const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const tables = ['materials', 'machines', 'maintenance_records', 'tools', 'tool_life_events', 'delivery_challans', 'production_batches', 'daily_production'];
  for (const t of tables) {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [t]);
    console.log('\n=== ' + t + ' ===');
    console.log(res.rows.map(r => r.column_name + ' (' + r.data_type + ')').join(', '));
  }
  await pool.end();
}

check();
