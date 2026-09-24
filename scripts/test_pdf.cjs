const fs = require('fs');
const { createWorker } = require('tesseract.js');

async function testOCR() {
  const filePath = 'D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf';
  console.log('Testing OCR on:', filePath);

  try {
    const { renderPageAsImage } = await import('unpdf');
    const buffer = new Uint8Array(fs.readFileSync(filePath));
    const img = await renderPageAsImage(buffer, 1, {
      canvasImport: () => import('@napi-rs/canvas'),
      scale: 1.5
    });
    console.log('Rendered page 1 image bytes:', img.byteLength);

    console.log('Initializing Tesseract worker...');
    const worker = await createWorker('eng');
    console.log('Worker ready, running recognition...');
    const result = await worker.recognize(Buffer.from(img));
    console.log('OCR text length:', result.data.text.length);
    console.log('--- OCR Result Preview ---');
    console.log(result.data.text.slice(0, 1000));
    await worker.terminate();
  } catch (err) {
    console.error('OCR error:', err);
  }
}

testOCR();
