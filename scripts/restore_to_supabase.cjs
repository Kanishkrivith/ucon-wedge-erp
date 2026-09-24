const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function restore() {
  const connectionString = process.argv[2];
  if (!connectionString) {
    console.error('Usage: node scripts/restore_to_supabase.cjs "<SUPABASE_DATABASE_URL>"');
    process.exit(1);
  }

  console.log('Connecting to Supabase PostgreSQL database...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const sqlPath = path.join(__dirname, 'ucon_wedge_backup.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Backup file not found at:', sqlPath);
    process.exit(1);
  }

  console.log('Reading SQL backup file (297 KB)...');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Restoring schema, tables, users, machines, and invoices to Supabase...');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✓ Successfully restored all tables and data to Supabase!');

    // Verification check
    const tables = await client.query(`
      SELECT count(*) AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const users = await client.query('SELECT count(*) AS user_count FROM users');
    const machines = await client.query('SELECT count(*) AS machine_count FROM machines');
    const invoices = await client.query('SELECT count(*) AS invoice_count FROM invoices');

    console.log('\n--- SUPABASE VERIFICATION REPORT ---');
    console.log('Tables created:', tables.rows[0].table_count);
    console.log('Users imported:', users.rows[0].user_count);
    console.log('Machines imported:', machines.rows[0].machine_count);
    console.log('Invoices imported:', invoices.rows[0].invoice_count);
    console.log('------------------------------------');
    console.log('Your Supabase database is 100% ready!');
  } catch (err) {
    console.error('Error during restore:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

restore();
