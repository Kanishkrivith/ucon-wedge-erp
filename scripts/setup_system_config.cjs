const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve('.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
let apiKey = '';
for (const line of envText.split('\n')) {
  if (line.trim().startsWith('DATABASE_URL=')) dbUrl = line.trim().substring('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
  if (line.trim().startsWith('GEMINI_API_KEY=')) apiKey = line.trim().substring('GEMINI_API_KEY='.length).replace(/^['"]|['"]$/g, '');
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function setup() {
  console.log('Setting up system_config table in Supabase...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  if (apiKey) {
    await pool.query(
      `INSERT INTO system_config (key, value, updated_at) 
       VALUES ('GEMINI_API_KEY', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [apiKey]
    );
    console.log(`Stored GEMINI_API_KEY in database (prefix: ${apiKey.substring(0, 6)}..., length: ${apiKey.length})`);
  } else {
    console.error('No GEMINI_API_KEY found in .env.local!');
  }

  const res = await pool.query("SELECT key, length(value) as len, updated_at FROM system_config");
  console.table(res.rows);

  await pool.end();
}

setup().catch(console.error);
