const fs = require('fs');
const path = require('path');
const { getApiKey, processSingleFile } = require('./process_single_scan.cjs');
const { pool } = require('./batch_utils.cjs');

const CATALOG_PATH = path.join(__dirname, 'master_scan_catalog.json');
const PROGRESS_LOG = path.join(__dirname, 'batch_run_log.json');

async function main() {
  const args = process.argv.slice(2);
  let targetPhase = null;
  let limit = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) targetPhase = args[i + 1].toUpperCase();
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('ERROR: No Gemini API Key found in .env.local or system_config!');
    process.exit(1);
  }

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`ERROR: ${CATALOG_PATH} does not exist. Run build_master_catalog.cjs first.`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  let itemsToProcess = catalog.filter(c => !c.isCompleted);

  if (targetPhase) {
    itemsToProcess = itemsToProcess.filter(c => c.phaseName === targetPhase);
  }

  if (limit && limit < itemsToProcess.length) {
    itemsToProcess = itemsToProcess.slice(0, limit);
  }

  console.log(`\n======================================================`);
  console.log(`[Batch Engine] Starting run for ${itemsToProcess.length} pending files...`);
  if (targetPhase) console.log(`Target Phase: ${targetPhase}`);
  console.log(`======================================================\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    console.log(`\n[${i + 1}/${itemsToProcess.length}] [${item.phaseName}] Processing: ${item.rel}...`);

    try {
      const res = await processSingleFile(item.full, apiKey);
      if (res && res.skipped) {
        skippedCount++;
        item.isCompleted = true;
      } else if (res && res.success) {
        successCount++;
        item.isCompleted = true;
        item.docId = res.docId;
        item.docNum = res.document_number;
        item.docDate = res.document_date;
        item.vendorName = res.vendor_name;
        item.totalAmount = res.total_amount;
        item.linesCount = res.lines_count;
      } else {
        failCount++;
      }
    } catch (err) {
      console.error(`Error on ${item.rel}:`, err.message);
      failCount++;
    }

    // Save progress to catalog after every file
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

    // Polite delay of 2.5 seconds between API requests to respect rate limits
    if (i < itemsToProcess.length - 1) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  console.log(`\n======================================================`);
  console.log(`Batch finished! Success: ${successCount}, Skipped: ${skippedCount}, Failed: ${failCount}`);
  console.log(`======================================================\n`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal batch error:', err);
  process.exit(1);
});
