const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const existing = await pool.query('SELECT id, canonical_name, category, gstin, phone, email, address FROM vendors LIMIT 10;');
    console.log('--- SAMPLE EXISTING VENDORS ---');
    console.table(existing.rows);

    const invCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position;
    `);
    console.log('--- INVENTORY_ITEMS COLUMNS ---');
    console.table(invCols.rows);

    const inv = await pool.query('SELECT * FROM inventory_items LIMIT 15;');
    console.log('--- SAMPLE INVENTORY ITEMS ---');
    console.table(inv.rows);

    const movCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_movements'
      ORDER BY ordinal_position;
    `);
    console.log('--- INVENTORY_MOVEMENTS COLUMNS ---');
    console.table(movCols.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
main();
