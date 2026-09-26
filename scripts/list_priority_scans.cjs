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
      results.push({ full, rel: path.relative(root, full), name: file, size: stat.size });
    }
  });
  return results;
}

const all = walk(root);

function filterCategory(keyword) {
  return all.filter(f => f.rel.toUpperCase().includes(keyword.toUpperCase()));
}

console.log('=== CAPEX & MACHINERY ===');
filterCategory('BHAVYA').concat(filterCategory('PMT'), filterCategory('INDUSTRIAL MACHINES'), filterCategory('SYSCON'))
  .forEach(f => console.log(f.rel, f.size));

console.log('\n=== LUBRICANTS ===');
filterCategory('SATHISH LUBRICANTS').forEach(f => console.log(f.rel, f.size));

console.log('\n=== TOOLS, GAUGES & CUTTERS ===');
['UNIQUE MEASUREMENT', 'OVS TOOLS', 'MICRO TECH', 'NATIONAL TOOLS', 'ROYAL TOOLS', 'TRU TEC'].forEach(k => {
  filterCategory(k).forEach(f => console.log(f.rel, f.size));
});

console.log('\n=== RAW MATERIALS STEEL ===');
['THIRUPATHI', 'STEEL MAGIC', 'MATERIALS POINT', 'NG SALES'].forEach(k => {
  filterCategory(k).forEach(f => console.log(f.rel, f.size));
});
