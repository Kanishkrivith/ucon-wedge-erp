const fs = require('fs');

async function run() {
  const filePath = 'D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf';

  try {
    // Dynamic import of TS file via tsx or bundle or let's test directly
    console.log('Testing processDocumentOCR on:', filePath);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
