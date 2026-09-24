const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://ucon:ucon_dev_password@localhost:5432/ucon_wedge' });

async function run() {
  const tables = ['capex', 'machines', 'tools', 'inventory_items', 'inventory_movements', 'invoices', 'invoice_items', 'vendors'];
  const res = await pool.query(
    `SELECT table_name, column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = ANY($1) 
     ORDER BY table_name, ordinal_position`,
    [tables]
  );
  const grouped = {};
  for (const row of res.rows) {
    if (!grouped[row.table_name]) grouped[row.table_name] = [];
    grouped[row.table_name].push(row.column_name + ' (' + row.data_type + ')');
  }
  console.log(JSON.stringify(grouped, null, 2));

  // Also check existing machine records
  const m = await pool.query('SELECT * FROM machines');
  console.log('\n--- EXISTING MACHINES IN DB ---');
  console.table(m.rows);

  // Also check tools
  const t = await pool.query('SELECT id, tool_code, tool_name, tool_type FROM tools');
  console.log('\n--- EXISTING TOOLS IN DB ---');
  console.table(t.rows);

  // Also check inventory_items
  const inv = await pool.query('SELECT id, item_code, item_name, item_type, unit FROM inventory_items');
  console.log('\n--- EXISTING INVENTORY ITEMS IN DB ---');
  console.table(inv.rows);

  const tleCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tool_life_events'");
  console.log('\n--- TOOL_LIFE_EVENTS COLS ---');
  console.table(tleCols.rows);

  await pool.end();
}

run().catch(console.error);
