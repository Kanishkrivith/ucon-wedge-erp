const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

async function testProcess(filePath) {
  console.log('Testing file:', filePath);
  try {
    const { definePDFJSModule, getDocumentProxy, renderPageAsImage } = await import('unpdf');
    await definePDFJSModule(() => import('pdfjs-dist'));
    const buffer = new Uint8Array(fs.readFileSync(filePath));
    console.log('Buffer read, size:', buffer.length);
    const pdf = await getDocumentProxy(buffer);
    console.log('Num pages:', pdf.numPages);

    const worker = await createWorker('eng');
    console.log('Worker created');

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      console.log('Rendering page', pageNo);
      const img = await renderPageAsImage(buffer, pageNo, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: 1.5,
      });
      console.log('Page', pageNo, 'rendered, byteLength:', img.byteLength);
      const result = await worker.recognize(Buffer.from(img));
      console.log('Page', pageNo, 'recognized, text length:', result.data.text.length);
      console.log('Sample text:', result.data.text.slice(0, 300));
    }
    await worker.terminate();
  } catch (err) {
    console.error('testProcess error:', err);
  }
}

testProcess('D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf');
