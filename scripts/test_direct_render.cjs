const fs = require('fs');
const { createWorker } = require('tesseract.js');

async function testDirect(filePath) {
  console.log('Testing file:', filePath);
  try {
    const { renderPageAsImage } = await import('unpdf');
    const buffer = new Uint8Array(fs.readFileSync(filePath));
    console.log('Buffer read, size:', buffer.length);

    const worker = await createWorker('eng');
    console.log('Worker created');

    let pageNo = 1;
    while (pageNo <= 20) {
      try {
        console.log('Rendering page', pageNo);
        const img = await renderPageAsImage(buffer, pageNo, {
          canvasImport: () => import('@napi-rs/canvas'),
          scale: 1.5,
        });
        if (!img || !img.byteLength) {
          console.log('No more pages, stopping at page', pageNo);
          break;
        }
        console.log('Page', pageNo, 'rendered, byteLength:', img.byteLength);
        const result = await worker.recognize(Buffer.from(img));
        console.log('Page', pageNo, 'recognized, text length:', result.data.text.length);
        console.log('--- Sample text page', pageNo, '---');
        console.log(result.data.text.slice(0, 300));
        pageNo++;
      } catch (pageErr) {
        console.log('Page', pageNo, 'not found or end of PDF:', pageErr.message);
        break;
      }
    }

    await worker.terminate();
    console.log('Finished processing pages! Total pages:', pageNo - 1);
  } catch (err) {
    console.error('testDirect error:', err);
  }
}

testDirect('D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf');
