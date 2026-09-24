const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const { createWorker } = require('tesseract.js');

async function testLegacy(filePath) {
  console.log('Testing legacy pdfjs on:', filePath);
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({
      data,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;
    console.log('Num pages:', pdf.numPages);

    const worker = await createWorker('eng');
    console.log('Worker ready');

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      console.log('Rendering page', pageNo);
      const page = await pdf.getPage(pageNo);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const imgBuffer = canvas.toBuffer('image/png');
      console.log('Page', pageNo, 'rendered image bytes:', imgBuffer.length);

      const result = await worker.recognize(imgBuffer);
      console.log('Page', pageNo, 'recognized text length:', result.data.text.length);
      console.log('--- Page', pageNo, 'Sample ---');
      console.log(result.data.text.slice(0, 300));
    }

    await worker.terminate();
    console.log('SUCCESS! ALL PAGES RENDERED AND OCR-PROCESSED WITH ZERO ERRORS!');
  } catch (err) {
    console.error('testLegacy error:', err);
  }
}

testLegacy('D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf');
