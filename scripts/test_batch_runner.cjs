const path = require('path');
const { getApiKey, processSingleFile } = require('./process_single_scan.cjs');
const { pool } = require('./batch_utils.cjs');

const testFiles = [
  'D:\\Ucon Wedge Unit\\all scan\\INVOICE\\SATHISH LUBRICANTS\\179.pdf',
  'D:\\Ucon Wedge Unit\\all scan\\INVOICE\\UNIQUE MEASUREMENT\\8567-2526.pdf',
  'D:\\Ucon Wedge Unit\\all scan\\INVOICE\\PMT\\79-2627.pdf',
  'D:\\Ucon Wedge Unit\\all scan\\INVOICE\\OVS TOOLS\\OVS-2526-1323.pdf',
  'D:\\Ucon Wedge Unit\\all scan\\INVOICE\\STEEL MAGIC\\SM-2627-1198.pdf'
];

async function runTest() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('No Gemini API Key found in .env.local or system_config!');
    process.exit(1);
  }
  console.log('Gemini API key loaded. Starting test batch of 5 high-priority documents...');

  for (const f of testFiles) {
    try {
      await processSingleFile(f, apiKey);
    } catch (err) {
      console.error('Error on file:', f, err);
    }
  }

  await pool.end();
  console.log('\nTest batch completed!');
}

runTest();
