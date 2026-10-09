const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('Fetching active master vendors...');
    const vendorsRes = await pool.query(`
      SELECT id, canonical_name, vendor_type, category, gstin, pan, address, email, phone, contact_name,
             material_supplied, inward_stock_type, conversion_rule, scrap_applicable
      FROM vendors
      WHERE active = true
    `);
    const vendors = vendorsRes.rows;
    console.log(`Loaded ${vendors.length} active master vendors.`);

    const gstinMap = new Map();
    const panMap = new Map();
    for (const v of vendors) {
      if (v.gstin) gstinMap.set(v.gstin.toUpperCase().trim(), v);
      if (v.pan) panMap.set(v.pan.toUpperCase().trim(), v);
      if (v.gstin && v.gstin.length === 15) {
        panMap.set(v.gstin.substring(2, 12).toUpperCase(), v);
      }
    }

    console.log('Fetching document extraction fields for all documents...');
    const extRes = await pool.query(`
      SELECT document_id, field_name, extracted_value, normalized_value
      FROM document_extractions
      WHERE field_name IN ('vendor_name', 'VENDOR_NAME', 'gstin', 'GSTIN', 'vendor_gstin', 'pan', 'PAN')
    `);

    // Group extractions by document_id
    const docFields = new Map();
    for (const r of extRes.rows) {
      if (!docFields.has(r.document_id)) docFields.set(r.document_id, {});
      const f = docFields.get(r.document_id);
      const val = r.normalized_value || r.extracted_value;
      if (r.field_name.toLowerCase().includes('gstin')) f.gstin = val;
      else if (r.field_name.toLowerCase().includes('pan')) f.pan = val;
      else if (r.field_name.toLowerCase().includes('vendor')) f.vendor = val;
    }

    console.log('Fetching all documents...');
    const docsRes = await pool.query(`SELECT id, original_filename, source_path, vendor_id FROM documents`);

    let matchedCount = 0;
    let updatedCount = 0;

    for (const doc of docsRes.rows) {
      const f = docFields.get(doc.id) || {};
      let matchedVendor = null;

      // 1. Check GSTIN
      if (f.gstin && gstinMap.has(String(f.gstin).toUpperCase().trim())) {
        matchedVendor = gstinMap.get(String(f.gstin).toUpperCase().trim());
      }

      // 2. Check PAN
      if (!matchedVendor && f.pan && panMap.has(String(f.pan).toUpperCase().trim())) {
        matchedVendor = panMap.get(String(f.pan).toUpperCase().trim());
      }

      // 3. Check extracted vendor name
      if (!matchedVendor && f.vendor) {
        const vUpper = String(f.vendor).toUpperCase();
        for (const v of vendors) {
          const cUpper = v.canonical_name.toUpperCase();
          const firstWord = cUpper.split(' ')[0];
          if (vUpper.includes(cUpper) || cUpper.includes(vUpper) || (firstWord.length >= 4 && vUpper.includes(firstWord))) {
            matchedVendor = v;
            break;
          }
        }
      }

      // 4. Fallback check source_path / original_filename for known folder names
      if (!matchedVendor) {
        const pathUpper = (String(doc.source_path || '') + ' ' + String(doc.original_filename || '')).toUpperCase();
        for (const v of vendors) {
          const cUpper = v.canonical_name.toUpperCase();
          const firstWord = cUpper.split(' ')[0];
          if (pathUpper.includes(cUpper) || (firstWord.length >= 4 && pathUpper.includes(firstWord))) {
            matchedVendor = v;
            break;
          }
        }
      }

      if (matchedVendor) {
        matchedCount++;
        if (doc.vendor_id !== matchedVendor.id) {
          await pool.query(`UPDATE documents SET vendor_id = $1 WHERE id = $2`, [matchedVendor.id, doc.id]);
          updatedCount++;
        }
      }
    }

    console.log(`=== DOCUMENT VENDOR ENRICHMENT COMPLETE ===`);
    console.log(`- Total Documents: ${docsRes.rows.length}`);
    console.log(`- Matched to Registered Vendors: ${matchedCount}`);
    console.log(`- Updated Document vendor_id pointers: ${updatedCount}`);

  } catch (err) {
    console.error('Error in doc-vendor link:', err);
  } finally {
    await pool.end();
  }
}

main();
