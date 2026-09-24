const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const root = path.resolve(__dirname, '..');
const srcStatic = path.join(root, '.next', 'static');
const destStatic = path.join(root, '.next', 'standalone', '.next', 'static');

const srcPublic = path.join(root, 'public');
const destPublic = path.join(root, '.next', 'standalone', 'public');

console.log('[Assets] Copying .next/static to standalone...');
copyDirSync(srcStatic, destStatic);

console.log('[Assets] Copying public to standalone...');
copyDirSync(srcPublic, destPublic);

console.log('[Assets] Done copying standalone static assets.');
