const fs = require('fs');
const path = require('path');

async function testOCRLogic() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = await import('@napi-rs/canvas');
  const { createWorker } = require('tesseract.js');

  const filePath = 'D:/Ucon Wedge Unit/all scan/INVOICE/ACE MICROMATIC/INVOICE/253310011130.pdf';
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const worker = await createWorker('eng');

  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const res = await worker.recognize(canvas.toBuffer('image/png'));
    pages.push({ pageNo, text: res.data.text || '' });
  }
  await worker.terminate();

  const fullText = pages.map(p => p.text).join('\n');

  // Test field extraction
  function findFirst(text, regexList) {
    for (const r of regexList) {
      const m = text.match(r);
      if (m && m[1]) return m[1].trim();
    }
    return null;
  }

  const INVALID_WORDS = new Set(['issued', 'under', 'dated', 'date', 'copy', 'original', 'duplicate', 'triplicate', 'tax', 'invoice', 'gst', 'cgst', 'sgst', 'igst', 'total', 'bill', 'page']);

  let docNo = findFirst(fullText, [
    /(?:gst\s*)?(?:tax\s*)?invoice\s*(?:no\.?|number|#|\:)\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
    /(?:billing\s*document\s*(?:no\.?|number|#|\:))\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
    /(?:inv(?:oice)?\.?\s*(?:no\.?|number|#|\:))\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
    /(?:challan\s*(?:no\.?|number|#|\:))\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
    /(?:bill\s*(?:no\.?|number|#|\:))\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
  ]);
  if (docNo && INVALID_WORDS.has(docNo.toLowerCase())) docNo = null;

  const rawDate = findFirst(fullText, [
    /(?:gst\s*)?(?:tax\s*)?invoice\s*dat[e]?\s*[:.-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:invoice\s*date|bill\s*date|challan\s*date|dated?)\s*[:.-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /\bdate\s*[:.-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\b/,
  ]);

  let poNo = findFirst(fullText, [
    /(?:purchase\s*order|p\.?o\.?)\s*(?:no\.?|number|#|ref\.?)\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/_-]{3,})/i,
    /(?:p\.?o\.?\s*#?)\s*[:.-]?\s*([A-Z0-9][A-Z0-9\/_-]{3,})/i,
  ]);
  if (poNo && (/^(?:date|dated|dt)/i.test(poNo) || INVALID_WORDS.has(poNo.toLowerCase()))) poNo = null;

  const poDate = findFirst(fullText, [
    /(?:purchase\s*order|p\.?o\.?)\s*(?:date|dated)\s*[:.-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:p\.?o\.?\s*date|order\s*date)\s*[:.-]?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
  ]);

  const gstin = findFirst(fullText, [/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i]);
  const pan = findFirst(fullText, [/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i]);
  const eway = findFirst(fullText, [/(?:e-?way\s*bill\s*(?:no|number)?)\s*[:.-]?\s*([0-9]{12})/i]);
  const total = findFirst(fullText, [
    /(?:total\s*invoice\s*value|grand\s*total|invoice\s*total|net\s*amount|total\s*amount|invoice\s*value)\s*[:.-]?\s*(?:rs\.?|₹)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
  ]);

  console.log('--- TEST FIELD RESULTS ---');
  console.log({ docNo, rawDate, poNo, poDate, gstin, pan, eway, total });

  // Test line items extraction
  function numberFrom(val) {
    if (!val) return null;
    const n = Number(String(val).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }

  const rows = fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const lines = [];
  let inTable = false;

  for (const row of rows) {
    if (row.length < 5 || row.length > 250) continue;

    if (/(?:material\s*description|description\s*of\s*goods|particulars|item\s*description|hsn\s*sac|item\s*name)/i.test(row)) {
      inTable = true;
      continue;
    }

    if (/^(?:total|grand\s*total|sub\s*total|amount\s*in\s*words|tax\s*payable|declaration|terms\s*&|bank\s*details)/i.test(row)) {
      if (inTable && lines.length > 0) inTable = false;
    }

    if (/(?:gstin|pan\b|tel\b|email|cin\b|ifsc|bank|account|place\s*of\s*(?:supply|delivery)|dispatch\s*from|bill\s*to|ship\s*to|consignee|receiver|declaration|terms|delay\s*in\s*receipt|total\s*invoice\s*value|total\s*tax|sgst|cgst|igst|billing\s*no|outbound\s*delivery|sale\s*order\s*no|payment\s*terms|e-way\s*bill|regd\s*office|plot\s*no|road|nagar|street|floor|chennai|tamil\s*nadu|karnataka|bengaluru)/i.test(row)) {
      continue;
    }

    const hasPipe = row.includes('|');
    const hasHsn = row.match(/\b((?:72|82|84|40|39|27|99|73|83|85)\d{2,6})\b/) || row.match(/\b([0-9]{4,8})\b/);
    const hasMoney = row.match(/(?:₹|rs\.?\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]{2,}\.[0-9]{2})/i);
    const hasQty = row.match(/\b([0-9]{1,4})\s*(?:nos?|pcs?|pieces?|ea|set|kg|kgs?|mm|m|mtrs?|barrels?)?\b/i);
    const hasProductWords = /(?:kit|belt|boot|rubber|saw|blade|tap|tool|holder|collet|carbide|insert|oil|grease|coolant|steel|bar|spring|circlip|maintenance|spare|bearing|filter|service|labour)/i.test(row);

    if ((inTable && hasMoney) || (hasProductWords && (hasMoney || hasHsn || hasPipe))) {
      let desc = row;
      if (hasPipe) {
        const parts = row.split('|').map(p => p.trim()).filter(Boolean);
        const letterParts = parts.filter(p => /[A-Za-z]{3,}/.test(p));
        if (letterParts.length > 0) desc = letterParts.join(' ');
      }
      desc = desc.replace(/[\|\(\)\{\}\[\]"']/g, ' ').replace(/\s+/g, ' ').trim();

      const lineTotal = hasMoney ? numberFrom(hasMoney[1]) : null;
      const quantity = hasQty ? numberFrom(hasQty[1]) : 1;
      let unitRate = null;
      if (lineTotal && quantity && quantity > 0) {
        unitRate = Number((lineTotal / quantity).toFixed(2));
      }

      lines.push({
        lineNo: lines.length + 1,
        description: desc.slice(0, 100),
        hsnCode: hasHsn ? hasHsn[1] : null,
        quantity: quantity || 1,
        unitRate: unitRate || lineTotal,
        totalAmount: lineTotal || 0,
      });
    }
  }

  console.log('\n--- EXTRACTED LINES (' + lines.length + ') ---');
  console.table(lines);
}

testOCRLogic().catch(console.error);

