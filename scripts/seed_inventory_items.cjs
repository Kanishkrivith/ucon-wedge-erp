const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const items = [
  {
    code: 'RM-STEEL-20MNCR5-TONS',
    name: '20MnCr5H Raw Steel Round Bars (25mm / 26mm)',
    type: 'RAW_MATERIAL',
    unit: 'Tons',
    reorder: 5,
    yield_factor: 325, // ~325 rods of 780mm per ton
    scrap_rate: 0
  },
  {
    code: 'WIP-ROD-780MM',
    name: 'Cut Steel Rods 780mm Length (Murugan Cutting)',
    type: 'WIP',
    unit: 'Nos',
    reorder: 1000,
    yield_factor: 20, // 1 Rod of 780mm = 20 CNC Wedge pieces
    scrap_rate: 0
  },
  {
    code: 'WIP-CNC-WEDGE-PART',
    name: 'CNC Machined Wedge Components (Un-tapped)',
    type: 'WIP',
    unit: 'Nos',
    reorder: 5000,
    yield_factor: 1,
    scrap_rate: 0.12 // ~120g scrap swarf per piece in CNC turning
  },
  {
    code: 'WIP-TAPPED-WEDGE',
    name: 'Tapped Wedge Components (Bore & Thread Checked)',
    type: 'WIP',
    unit: 'Nos',
    reorder: 5000,
    yield_factor: 1,
    scrap_rate: 0.01
  },
  {
    code: 'WIP-SLIT-WEDGE',
    name: 'Slitted Wedge Segments (3-Piece Wedges)',
    type: 'WIP',
    unit: 'Sets',
    reorder: 5000,
    yield_factor: 1,
    scrap_rate: 0.02
  },
  {
    code: 'WIP-HT-WEDGE',
    name: 'Heat Treated Wedges (Unitherm SQF 54-64 HRC)',
    type: 'WIP',
    unit: 'Nos',
    reorder: 5000,
    yield_factor: 1,
    scrap_rate: 0
  },
  {
    code: 'FG-WEDGE-ASSEMBLY',
    name: 'Finished Tested Wedges with Spring (190kN Approved)',
    type: 'FINISHED_GOOD',
    unit: 'Nos',
    reorder: 10000,
    yield_factor: 1,
    scrap_rate: 0
  },
  {
    code: 'BYPROD-STEEL-SCRAP',
    name: 'In-House CNC Steel Scrap / Swarf (For External Sale)',
    type: 'SCRAP',
    unit: 'Kg',
    reorder: 500,
    yield_factor: 1,
    scrap_rate: 0
  }
];

async function seed() {
  try {
    console.log('Seeding WIP and FG inventory items...');
    for (const it of items) {
      const exist = await pool.query('SELECT id FROM inventory_items WHERE item_code = $1', [it.code]);
      if (exist.rows.length === 0) {
        await pool.query(
          `INSERT INTO inventory_items (item_code, item_name, item_type, unit, reorder_level, active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [it.code, it.name, it.type, it.unit, it.reorder]
        );
        console.log(`Created inventory item: ${it.code} - ${it.name}`);
      } else {
        await pool.query(
          `UPDATE inventory_items
           SET item_name = $1, item_type = $2, unit = $3, reorder_level = $4, active = true
           WHERE id = $5`,
          [it.name, it.type, it.unit, it.reorder, exist.rows[0].id]
        );
        console.log(`Updated inventory item: ${it.code}`);
      }
    }
  } catch (err) {
    console.error('Error seeding inventory items:', err);
  } finally {
    await pool.end();
  }
}

seed();
