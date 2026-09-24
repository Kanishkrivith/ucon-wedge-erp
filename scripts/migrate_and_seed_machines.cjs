const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://ucon:ucon_dev_password@localhost:5432/ucon_wedge' });

async function migrate() {
  console.log('--- STEP 1: Running Database Schema Enhancements ---');

  // 1. Add machine_id to capex
  await pool.query(`
    ALTER TABLE capex
    ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES machines(id);
  `);
  console.log('✓ Added machine_id to capex table');

  // 2. Add machine_id to tool_life_events
  await pool.query(`
    ALTER TABLE tool_life_events
    ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES machines(id);
  `);
  console.log('✓ Added machine_id to tool_life_events table');

  // 3. Seed Workshop Machines (Sections 14, 15, 17, 34)
  // 1 x CNC, 2 x Tapping, 3 x Cutting, 1 x Insert Regrinding, 1 x Normal Regrinding, 1 x Chamfering
  console.log('--- STEP 2: Seeding Workshop Machines ---');
  const WORKSHOP_MACHINES = [
    {
      code: 'MCH-CNC-01',
      name: 'CNC Turning Centre (Wedge Turning)',
      type: 'CNC_LATHE',
      manufacturer: 'Ace Micromatic / PMT',
      model: 'Jobber XL / LT-20',
      status: 'ACTIVE',
      power_kw: 15.0,
      capacity_per_month: 25000,
      notes: 'Primary CNC turning wedge blanks, outer taper, and flange OD profiles.',
    },
    {
      code: 'MCH-TAP-01',
      name: 'Automated Tapping Machine #1 (M16 Internal Threading)',
      type: 'TAPPING_MACHINE',
      manufacturer: 'Accurate Auto Lathe / National',
      model: 'ATM-16-A',
      status: 'ACTIVE',
      power_kw: 3.5,
      capacity_per_month: 20000,
      notes: 'Dedicated to internal thread tapping for 12.7mm & 15.2mm wedge segments.',
    },
    {
      code: 'MCH-TAP-02',
      name: 'Automated Tapping Machine #2 (M20 Internal Threading)',
      type: 'TAPPING_MACHINE',
      manufacturer: 'Accurate Auto Lathe / National',
      model: 'ATM-20-B',
      status: 'ACTIVE',
      power_kw: 3.5,
      capacity_per_month: 20000,
      notes: 'High-speed automated internal tapping station for wedge components.',
    },
    {
      code: 'MCH-CUT-01',
      name: '3-Blade Slitting / Cutting Machine #1',
      type: 'SLITTING_MACHINE',
      manufacturer: 'Accurate Engineering Works',
      model: 'CS-3B-01',
      status: 'ACTIVE',
      power_kw: 5.5,
      capacity_per_month: 30000,
      notes: 'Heavy-duty 4" slitting saw station dividing turned rounds into 3 identical wedge segments.',
    },
    {
      code: 'MCH-CUT-02',
      name: '3-Blade Slitting / Cutting Machine #2',
      type: 'SLITTING_MACHINE',
      manufacturer: 'Accurate Engineering Works',
      model: 'CS-3B-02',
      status: 'ACTIVE',
      power_kw: 5.5,
      capacity_per_month: 30000,
      notes: 'Secondary 3-blade slitting saw machine maintaining balanced cutting throughput.',
    },
    {
      code: 'MCH-CUT-03',
      name: '3-Blade Slitting / Cutting Machine #3',
      type: 'SLITTING_MACHINE',
      manufacturer: 'Accurate Engineering Works',
      model: 'CS-3B-03',
      status: 'ACTIVE',
      power_kw: 5.5,
      capacity_per_month: 30000,
      notes: 'Tertiary high-precision 3-blade cutting station for wedge segmentation.',
    },
    {
      code: 'MCH-REGR-01',
      name: 'Carbide Insert Regrinding Machine',
      type: 'TOOL_GRINDER',
      manufacturer: 'Industrial Machines & Tools',
      model: 'IRG-CNC-01',
      status: 'ACTIVE',
      power_kw: 2.2,
      capacity_per_month: 5000,
      notes: 'Specialized diamond-wheel regrinding machine restoring turning insert cutting edges.',
    },
    {
      code: 'MCH-REGR-02',
      name: 'Normal Tool & Cutter Grinder',
      type: 'TOOL_GRINDER',
      manufacturer: 'Industrial Machines & Tools',
      model: 'TCG-STD-02',
      status: 'ACTIVE',
      power_kw: 2.2,
      capacity_per_month: 5000,
      notes: 'Universal workshop tool and cutter grinder for taps, reamers, and drill bits.',
    },
    {
      code: 'MCH-CHAMF-01',
      name: 'Precision Wedge Chamfering Machine',
      type: 'CHAMFERING_MACHINE',
      manufacturer: 'Syscon Electro Tech',
      model: 'CHM-WEDGE-01',
      status: 'ACTIVE',
      power_kw: 1.5,
      capacity_per_month: 35000,
      notes: 'Automated deburring and chamfering station creating exact front & rear entry angles.',
    },
  ];

  for (const m of WORKSHOP_MACHINES) {
    const existing = await pool.query('SELECT id FROM machines WHERE machine_code = $1', [m.code]);
    if (!existing.rows[0]) {
      await pool.query(
        `INSERT INTO machines (
          machine_code, machine_name, machine_type, manufacturer, model,
          status, power_kw, capacity_per_month, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [m.code, m.name, m.type, m.manufacturer, m.model, m.status, m.power_kw, m.capacity_per_month, m.notes]
      );
      console.log(`+ Seeded machine: ${m.code} (${m.name})`);
    } else {
      console.log(`✓ Machine exists: ${m.code}`);
    }
  }

  // 4. Seed Standard Inventory Items (Raw Material, Tooling, Consumables)
  console.log('--- STEP 3: Seeding Core Inventory Items ---');
  const INVENTORY_SEEDS = [
    { code: 'RM-20MNCR5-25', name: '20MnCr5 Round Bar 25mm (Rolled/Forged)', type: 'RAW_MATERIAL', unit: 'Kg', reorder: 500 },
    { code: 'RM-20MNCR5-26', name: '20MnCr5 Round Bar 26mm (Bright Bar)', type: 'RAW_MATERIAL', unit: 'Kg', reorder: 500 },
    { code: 'TOOL-SLIT-4IN', name: 'Slitting Cutter Saw Blade 4" (Accurate Engineering)', type: 'TOOLING', unit: 'Nos', reorder: 6 },
    { code: 'TOOL-TAP-M16', name: 'HSS Tap M16 x 1.5 (National/Accurate)', type: 'TOOLING', unit: 'Nos', reorder: 10 },
    { code: 'TOOL-TAP-M20', name: 'HSS Tap M20 x 1.5 (National/Accurate)', type: 'TOOLING', unit: 'Nos', reorder: 10 },
    { code: 'TOOL-CNC-INSERT', name: 'Carbide Turning Insert (CNMG/WNMG)', type: 'TOOLING', unit: 'Nos', reorder: 20 },
    { code: 'CONS-COOLANT-1305', name: 'Industrial Coolant Oil 1305 (210L Barrel)', type: 'CONSUMABLE', unit: 'Barrels', reorder: 2 },
    { code: 'CONS-SPRING-127', name: 'Spring Retainer Wire 12.7mm (Viking/Grace)', type: 'CONSUMABLE', unit: 'Nos', reorder: 5000 },
    { code: 'CONS-SPRING-152', name: 'Spring Retainer Wire 15.2mm (Viking/Grace)', type: 'CONSUMABLE', unit: 'Nos', reorder: 5000 },
    { code: 'CONS-CIRCLIP-127', name: 'Retaining Ring Circlip 12.7mm (Super Fasteners)', type: 'CONSUMABLE', unit: 'Nos', reorder: 5000 },
    { code: 'CONS-POLYBAG', name: 'Heavy Duty Packaging Poly Bag (Industrial Poly)', type: 'CONSUMABLE', unit: 'Nos', reorder: 1000 },
  ];

  for (const item of INVENTORY_SEEDS) {
    const existing = await pool.query('SELECT id FROM inventory_items WHERE item_code = $1', [item.code]);
    if (!existing.rows[0]) {
      await pool.query(
        `INSERT INTO inventory_items (item_code, item_name, item_type, unit, reorder_level, active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [item.code, item.name, item.type, item.unit, item.reorder]
      );
      console.log(`+ Seeded inventory item: ${item.code} (${item.name})`);
    } else {
      console.log(`✓ Inventory item exists: ${item.code}`);
    }
  }

  // 5. Seed Core Tool Definitions in tools table
  console.log('--- STEP 4: Seeding Tool Master Records ---');
  const TOOL_SEEDS = [
    { code: 'TOOL-SLIT-4IN', name: '4" Slitting Saw Cutter', type: 'SLITTING_SAW', mfr: 'Accurate Engineering', cost: 1850.0, life: 1200, regrind: 4 },
    { code: 'TOOL-TAP-M16', name: 'HSS Spiral Flute Tap M16', type: 'THREAD_TAP', mfr: 'Accurate Auto Lathe', cost: 650.0, life: 800, regrind: 2 },
    { code: 'TOOL-TAP-M20', name: 'HSS Spiral Flute Tap M20', type: 'THREAD_TAP', mfr: 'National Tools', cost: 750.0, life: 800, regrind: 2 },
    { code: 'TOOL-CNC-INSERT', name: 'CNMG 120408 Carbide Insert', type: 'TURNING_INSERT', mfr: 'Prewo / Pioneer', cost: 280.0, life: 450, regrind: 1 },
  ];

  for (const t of TOOL_SEEDS) {
    const existing = await pool.query('SELECT id FROM tools WHERE tool_code = $1', [t.code]);
    if (!existing.rows[0]) {
      await pool.query(
        `INSERT INTO tools (tool_code, tool_name, tool_type, manufacturer, unit_cost, standard_life_pieces, regrind_limit, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [t.code, t.name, t.type, t.mfr, t.cost, t.life, t.regrind]
      );
      console.log(`+ Seeded tool record: ${t.code} (${t.name})`);
    } else {
      console.log(`✓ Tool record exists: ${t.code}`);
    }
  }

  console.log('--- MIGRATION & SEED COMPLETED SUCCESSFULLY ---');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
