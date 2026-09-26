const fs = require('fs');
const path = require('path');

const root = 'D:\\Ucon Wedge Unit\\all scan';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push({ full, size: stat.size, mtime: stat.mtime });
    }
  });
  return results;
}

const all = walk(root);
console.log('Total files found:', all.length);

const exts = {};
all.forEach(f => {
  const ext = path.extname(f.full).toLowerCase();
  exts[ext] = (exts[ext] || 0) + 1;
});
console.log('By extension:', exts);

const vendorDirs = {};
all.forEach(f => {
  const rel = path.relative(root, f.full);
  const parts = rel.split(path.sep);
  const top = parts.length > 1 ? parts.slice(0, 2).join(' / ') : parts[0];
  vendorDirs[top] = (vendorDirs[top] || 0) + 1;
});
console.log('\nDistribution by folder:');
console.table(vendorDirs);
