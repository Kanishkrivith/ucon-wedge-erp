const fs = require('fs');
const path = require('path');

const root = 'D:\\Ucon Wedge Unit\\all scan';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push({
        full,
        rel: path.relative(root, full),
        name: file,
        size: stat.size,
        mtime: stat.mtime
      });
    }
  });
  return results;
}

const allPdfs = walk(root);

// Categorize by manufacturing sequence and operational aspect:
// 1. CAPEX_MACHINERY: Ace Micromatic, Bhavya Machine Tools, PMT, Industrial Machines, Syscon
// 2. RAW_MATERIALS: Thirupathi Bright Steel, Steel Magic, Materials Point, NG Sales
// 3. TOOLS_GAUGES_CONSUMABLES: Unique Measurement, OVS Tools, Micro Tech, National Tools, Royal Tools, Tru Tec, 4-inch slitting cutters, buttress taps
// 4. LUBRICANTS_COOLANTS: Sathish Lubricants
// 5. JOB_WORK_MACHINING: Accurate Engineering, Accurate Auto Lathe, Everbright, Sri Murugan, Prema, DSM, Prewo, RC Ventures, AR Traders, Janani
// 6. HEAT_TREATMENT_COATING: Unitherm, Ambattur Heat Treaters, Oerlikon Balzers
// 7. TESTING_QC: Techmat test reports
// 8. SPRINGS_HARDWARE: Grace Springs, Viking Springs, Nu Tech Bearings
// 9. DELIVERY_CHALLANS: All DC folder files
// 10. DAILY_SHOPFLOOR: 24.09.2026 files

function classifyPdf(rel) {
  const norm = rel.toUpperCase().replace(/\\/g, '/');
  if (norm.startsWith('24.09.2026/')) return 'DAILY_SHOPFLOOR_2026';
  if (norm.startsWith('DC/')) return 'DELIVERY_CHALLAN';
  
  if (norm.includes('BHAVYA') || norm.includes('PMT') || norm.includes('INDUSTRIAL MACHINES') || norm.includes('SYSCON')) {
    return 'CAPEX_MACHINERY';
  }
  if (norm.includes('ACE MICROMATIC')) {
    return 'CAPEX_MACHINERY_SERVICE';
  }
  if (norm.includes('THIRUPATHI') || norm.includes('STEEL MAGIC') || norm.includes('MATERIALS POINT') || norm.includes('NG SALES')) {
    return 'RAW_MATERIALS_STEEL';
  }
  if (norm.includes('UNIQUE MEASUREMENT') || norm.includes('OVS') || norm.includes('MICRO TECH') || norm.includes('NATIONAL TOOLS') || norm.includes('ROYAL TOOLS') || norm.includes('TRU TEC')) {
    return 'TOOLS_GAUGES_CUTTERS';
  }
  if (norm.includes('SATHISH LUBRICANTS')) {
    return 'LUBRICANTS_OIL';
  }
  if (norm.includes('UNITHERM') || norm.includes('AMBATTUR') || norm.includes('OERLIKON')) {
    return 'HEAT_TREATMENT_COATING';
  }
  if (norm.includes('TECHMAT')) {
    return 'METALLURGICAL_TEST_REPORTS';
  }
  if (norm.includes('GRACE') || norm.includes('VIKING') || norm.includes('NU TECH')) {
    return 'SPRINGS_COMPONENTS';
  }
  return 'SUBCONTRACT_JOB_WORK';
}

const breakdown = {};
allPdfs.forEach(p => {
  const cat = classifyPdf(p.rel);
  if (!breakdown[cat]) breakdown[cat] = [];
  breakdown[cat].push(p);
});

console.log('=== CLASSIFICATION SUMMARY OF ALL 526 SCAN PDFS ===');
for (const [cat, list] of Object.entries(breakdown)) {
  console.log(`${cat.padEnd(30)}: ${list.length} files`);
}
