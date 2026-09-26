const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const ROOT_DIR = 'D:\\Ucon Wedge Unit\\all scan';
const PROGRESS_FILE = path.join(__dirname, 'ingestion_checkpoint.json');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sanitizeDateForPg(val) {
  if (!val) return null;
  const s = String(val).trim();
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]), m = Number(ymd[2]), d = Number(ymd[3]);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const dmy = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = `20${y}`;
    const yr = Number(y), m = Number(dmy[2]), d = Number(dmy[1]);
    if (yr >= 1970 && yr <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${yr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970 && parsed.getFullYear() <= 2100) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

function sanitizeTextForPg(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === 'NOT AVAILABLE' || s === 'NEEDS REVIEW' || s === 'null' || s === 'undefined' || s === 'N/A') return null;
  return s;
}

// Map manufacturing categories
function classifyPdfCategory(rel) {
  const norm = rel.toUpperCase().replace(/\\/g, '/');
  if (norm.startsWith('24.09.2026/')) return { group: 'DAILY_SHOPFLOOR', order: 8, label: 'Daily Machining & Shopfloor' };
  if (norm.startsWith('DC/')) return { group: 'DELIVERY_CHALLAN', order: 9, label: 'Delivery Challan / Subcontract Transfer' };
  if (norm.includes('BHAVYA') || norm.includes('PMT') || norm.includes('INDUSTRIAL MACHINES') || norm.includes('SYSCON')) {
    return { group: 'CAPEX_MACHINERY', order: 1, label: 'Machinery & Equipment CAPEX' };
  }
  if (norm.includes('ACE MICROMATIC')) {
    return { group: 'CAPEX_CNC_SERVICE', order: 2, label: 'Ace Micromatic CNC & Service' };
  }
  if (norm.includes('THIRUPATHI') || norm.includes('STEEL MAGIC') || norm.includes('MATERIALS POINT') || norm.includes('NG SALES')) {
    return { group: 'RAW_MATERIAL_STEEL', order: 3, label: '20MnCr5 Steel & Raw Materials' };
  }
  if (norm.includes('UNIQUE MEASUREMENT') || norm.includes('OVS') || norm.includes('MICRO TECH') || norm.includes('NATIONAL TOOLS') || norm.includes('ROYAL TOOLS') || norm.includes('TRU TEC')) {
    return { group: 'TOOLS_GAUGES_CUTTERS', order: 4, label: 'CNC Tools, Buttress Taps, 4-Inch Slitting Cutters & Gauges' };
  }
  if (norm.includes('SATHISH LUBRICANTS')) {
    return { group: 'LUBRICANTS_COOLANTS', order: 5, label: 'Lubricant Oil, Coolants & Chemicals' };
  }
  if (norm.includes('UNITHERM') || norm.includes('AMBATTUR') || norm.includes('OERLIKON')) {
    return { group: 'HEAT_TREATMENT_COATING', order: 6, label: 'Heat Treatment & Balzers Coating' };
  }
  if (norm.includes('GRACE') || norm.includes('VIKING') || norm.includes('NU TECH')) {
    return { group: 'SPRINGS_COMPONENTS', order: 7, label: 'Springs & Mechanical Components' };
  }
  if (norm.includes('TECHMAT')) {
    return { group: 'METALLURGICAL_TESTS', order: 10, label: 'Techmat Metallurgical Test Reports' };
  }
  return { group: 'SUBCONTRACT_JOB_WORK', order: 6, label: 'Subcontract Turning, Tapping & Machining' };
}

module.exports = {
  pool,
  ROOT_DIR,
  PROGRESS_FILE,
  sha256,
  sanitizeDateForPg,
  sanitizeTextForPg,
  classifyPdfCategory
};
