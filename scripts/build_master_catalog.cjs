const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const root = 'D:\\Ucon Wedge Unit\\all scan';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push({ full, rel: path.relative(root, full), name: file, size: stat.size, mtime: stat.mtime });
    }
  });
  return results;
}

function assignPhase(rel) {
  const norm = rel.toUpperCase().replace(/\\/g, '/');
  if (norm.includes('BHAVYA') || norm.includes('PMT') || norm.includes('INDUSTRIAL MACHINES') || norm.includes('SYSCON') || norm.includes('ACE MICROMATIC')) {
    return { id: 1, name: 'CAPEX_AND_MACHINERY', priority: 1 };
  }
  if (norm.includes('THIRUPATHI') || norm.includes('STEEL MAGIC') || norm.includes('MATERIALS POINT') || norm.includes('NG SALES')) {
    return { id: 2, name: 'RAW_MATERIALS_STEEL', priority: 2 };
  }
  if (norm.includes('UNIQUE MEASUREMENT') || norm.includes('OVS') || norm.includes('MICRO TECH') || norm.includes('NATIONAL TOOLS') || norm.includes('ROYAL TOOLS') || norm.includes('TRU TEC')) {
    return { id: 3, name: 'TOOLS_GAUGES_CUTTERS', priority: 3 };
  }
  if (norm.includes('SATHISH LUBRICANTS')) {
    return { id: 4, name: 'LUBRICANTS_COOLANTS', priority: 4 };
  }
  if (norm.includes('UNITHERM') || norm.includes('AMBATTUR') || norm.includes('OERLIKON')) {
    return { id: 5, name: 'HEAT_TREATMENT_COATING', priority: 5 };
  }
  if (norm.includes('GRACE') || norm.includes('VIKING') || norm.includes('NU TECH')) {
    return { id: 6, name: 'SPRINGS_HARDWARE', priority: 6 };
  }
  if (norm.startsWith('24.09.2026/')) {
    return { id: 7, name: 'DAILY_MACHINING_2026', priority: 7 };
  }
  if (norm.startsWith('DC/')) {
    return { id: 9, name: 'DELIVERY_CHALLANS', priority: 9 };
  }
  if (norm.includes('TECHMAT')) {
    return { id: 10, name: 'TEST_REPORTS_TECHMAT', priority: 10 };
  }
  return { id: 8, name: 'SUBCONTRACT_JOB_WORK', priority: 8 };
}

async function buildMasterCatalog() {
  const allPdfs = walk(root);
  console.log(`Found total ${allPdfs.length} PDFs.`);

  const existingRes = await pool.query('SELECT file_sha256, id, original_filename, ai_confidence, document_number FROM documents');
  const existingMap = new Map();
  existingRes.rows.forEach(r => existingMap.set(r.file_sha256, r));

  const catalog = allPdfs.map((p, idx) => {
    const buf = fs.readFileSync(p.full);
    const hash = sha256(buf);
    const phase = assignPhase(p.rel);
    const inDb = existingMap.get(hash);
    const isCompleted = inDb && Number(inDb.ai_confidence) >= 0.95;

    return {
      index: idx + 1,
      name: p.name,
      rel: p.rel,
      full: p.full,
      sizeKb: Math.round(p.size / 1024),
      phaseId: phase.id,
      phaseName: phase.name,
      priority: phase.priority,
      hash,
      inDb: !!inDb,
      docId: inDb ? inDb.id : null,
      docNum: inDb ? inDb.document_number : null,
      isCompleted: !!isCompleted
    };
  });

  // Sort by priority, then by rel path
  catalog.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.rel.localeCompare(b.rel);
  });

  const catalogPath = path.join(__dirname, 'master_scan_catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

  console.log(`Master catalog written to ${catalogPath}`);

  // Summary by phase
  const summary = {};
  catalog.forEach(c => {
    if (!summary[c.phaseName]) {
      summary[c.phaseName] = { total: 0, completed: 0, pending: 0 };
    }
    summary[c.phaseName].total++;
    if (c.isCompleted) summary[c.phaseName].completed++;
    else summary[c.phaseName].pending++;
  });

  console.log('\n=== INGESTION STATUS SUMMARY BY PHASE ===');
  console.table(summary);

  await pool.end();
}

buildMasterCatalog();
