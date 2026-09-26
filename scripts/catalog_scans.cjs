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
        path: full,
        rel: path.relative(root, full),
        name: file,
        size: stat.size,
        mtime: stat.mtime
      });
    }
  });
  return results;
}

const pdfs = walk(root);
console.log('Total PDFs:', pdfs.length);

const byVendor = {};
pdfs.forEach(p => {
  const parts = p.rel.split(path.sep);
  const topCategory = parts[0]; // e.g. INVOICE, DC, 24.09.2026
  const vendor = parts.length > 2 ? parts[1] : (parts.length > 1 ? parts[0] : 'ROOT');
  const group = `${topCategory} -> ${vendor}`;
  if (!byVendor[group]) byVendor[group] = [];
  byVendor[group].push(p);
});

console.log('\nBreakdown of PDFs by Category -> Vendor:');
for (const [k, v] of Object.entries(byVendor)) {
  console.log(`${k.padEnd(45)} : ${v.length} PDFs`);
}
