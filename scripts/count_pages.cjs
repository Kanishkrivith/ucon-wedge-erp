const fs = require('fs');
const path = require('path');
const { getDocumentProxy } = require('unpdf');

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
      results.push({ full, rel: path.relative(root, full), name: file });
    }
  });
  return results;
}

async function countPages() {
  const pdfs = walk(root);
  let totalPages = 0;
  const pageDist = {};

  for (const p of pdfs) {
    try {
      const buf = fs.readFileSync(p.full);
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      totalPages += pdf.numPages;
      pageDist[pdf.numPages] = (pageDist[pdf.numPages] || 0) + 1;
    } catch (e) {
      console.error('Error on', p.rel, e.message);
    }
  }

  console.log(`Total PDFs: ${pdfs.length}`);
  console.log(`Total Pages: ${totalPages}`);
  console.log('Page count distribution:', pageDist);
}

countPages();
