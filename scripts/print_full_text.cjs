const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const { createWorker } = require('tesseract.js');

async function testFullExtraction() {
  const filePath = 'D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf';
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const worker = await createWorker('eng');

  let fullText = '';
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    const imgBuffer = canvas.toBuffer('image/png');
    const result = await worker.recognize(imgBuffer);
    fullText += '\n' + result.data.text;
  }
  await worker.terminate();

  console.log('=== FULL EXTRACTED TEXT ===');
  console.log(fullText);
}

testFullExtraction();
