const fs = require('fs');
const path = require('path');
const { getDocumentProxy, extractText } = require('unpdf');

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

async function checkSample() {
  const pdfs = walk(root);
  console.log(`Checking text extraction for all ${pdfs.length} PDFs...`);

  let digitalCount = 0;
  let scannedCount = 0;
  const sampleResults = [];

  for (let i = 0; i < pdfs.length; i++) {
    const p = pdfs[i];
    try {
      const buf = fs.readFileSync(p.full);
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      const trimmed = (text || '').trim();
      const isDigital = trimmed.length > 80;
      if (isDigital) digitalCount++;
      else scannedCount++;

      if (i < 20 || i % 50 === 0) {
        sampleResults.push({
          file: p.rel,
          pages: pdf.numPages,
          charCount: trimmed.length,
          type: isDigital ? 'DIGITAL_TEXT' : 'SCANNED_IMAGE',
          sampleSnippet: trimmed.replace(/\s+/g, ' ').substring(0, 60)
        });
      }
    } catch (e) {
      scannedCount++;
      sampleResults.push({
        file: p.rel,
        pages: 0,
        charCount: 0,
        type: 'ERROR_OR_SCAN',
        sampleSnippet: e.message
      });
    }
  }

  console.log(`\nSummary:`);
  console.log(`Digital text PDFs (fast extraction): ${digitalCount}`);
  console.log(`Scanned raster PDFs (need OCR/Vision): ${scannedCount}`);
  console.log('\nSample breakdown:');
  console.table(sampleResults);
}

checkSample();
