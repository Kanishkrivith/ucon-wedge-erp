import { pool } from '@/lib/db';

export interface ResolvedVendor {
  id: string;
  canonical_name: string;
  vendor_type: string;
  category: string;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  material_supplied: string | null;
  inward_stock_type: string | null;
  conversion_rule: string | null;
  scrap_applicable: boolean;
}

/**
 * Resolves an extracted document's vendor information against the registered master vendor database.
 * Matches by exact GSTIN, PAN, or intelligent fuzzy name/alias matching.
 * Returns the complete registered vendor profile to auto-populate scanned documents.
 */
export async function resolveRegisteredVendor(
  rawName?: string | null,
  rawGstin?: string | null,
  rawPan?: string | null
): Promise<ResolvedVendor | null> {
  const gstin = rawGstin ? String(rawGstin).trim().toUpperCase() : null;
  const pan = rawPan
    ? String(rawPan).trim().toUpperCase()
    : gstin && gstin.length === 15
    ? gstin.substring(2, 12)
    : null;
  const name = rawName ? String(rawName).trim() : null;

  try {
    // 1. Match by GSTIN (15 chars)
    if (gstin && gstin.length === 15) {
      const res = await pool.query(
        `SELECT id, canonical_name, vendor_type, category, gstin, pan, address, email, phone, contact_name,
                material_supplied, inward_stock_type, conversion_rule, scrap_applicable
         FROM vendors
         WHERE UPPER(gstin) = $1 AND active = true
         LIMIT 1`,
        [gstin]
      );
      if (res.rows[0]) return res.rows[0];
    }

    // 2. Match by PAN (10 chars)
    if (pan && pan.length === 10) {
      const res = await pool.query(
        `SELECT id, canonical_name, vendor_type, category, gstin, pan, address, email, phone, contact_name,
                material_supplied, inward_stock_type, conversion_rule, scrap_applicable
         FROM vendors
         WHERE (UPPER(pan) = $1 OR SUBSTRING(UPPER(gstin) FROM 3 FOR 10) = $1) AND active = true
         LIMIT 1`,
        [pan]
      );
      if (res.rows[0]) return res.rows[0];
    }

    // 3. Match by Name / Alias
    if (name) {
      const cleanName = name
        .toUpperCase()
        .replace(/\b(PVT|LTD|PRIVATE|LIMITED|LLP|CORP|CORPORATION|INDIA|WORKS|ENGINEERING|INDUSTRIES|ENTERPRISES|TRADERS)\b/g, '')
        .replace(/[^A-Z0-9\s]/g, ' ')
        .trim();

      const firstSignificantWord = cleanName.split(/\s+/).find((w) => w.length >= 3) || cleanName;

      // Exact or ILIKE on canonical_name
      let res = await pool.query(
        `SELECT id, canonical_name, vendor_type, category, gstin, pan, address, email, phone, contact_name,
                material_supplied, inward_stock_type, conversion_rule, scrap_applicable
         FROM vendors
         WHERE active = true AND (
           UPPER(canonical_name) = UPPER($1)
           OR canonical_name ILIKE $2
           OR canonical_name ILIKE $3
         )
         LIMIT 1`,
        [name, `%${cleanName}%`, `%${firstSignificantWord}%`]
      );
      if (res.rows[0]) return res.rows[0];

      // Check vendor_aliases table
      res = await pool.query(
        `SELECT v.id, v.canonical_name, v.vendor_type, v.category, v.gstin, v.pan, v.address, v.email, v.phone, v.contact_name,
                v.material_supplied, v.inward_stock_type, v.conversion_rule, v.scrap_applicable
         FROM vendor_aliases va
         JOIN vendors v ON v.id = va.vendor_id
         WHERE v.active = true AND (
           UPPER(va.alias_name) = UPPER($1)
           OR va.alias_name ILIKE $2
         )
         LIMIT 1`,
        [name, `%${firstSignificantWord}%`]
      );
      if (res.rows[0]) return res.rows[0];
    }

    return null;
  } catch (err) {
    console.warn('Error resolving vendor against master registry:', err);
    return null;
  }
}
