const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  SELECT d.original_filename, d.document_number, to_char(d.document_date, 'YYYY-MM-DD') as doc_date, v.canonical_name as vendor,
         l.line_no, l.description, l.quantity, l.unit, l.unit_rate, l.total_amount, l.category_code, l.capex_or_opex, l.destination_module
  FROM documents d
  JOIN vendors v ON v.id = d.vendor_id
  JOIN document_line_items l ON l.document_id = d.id
  WHERE d.id IN ('4f7b112e-63f3-4ed0-8a2a-570c24075f86', '178c23a1-659f-40cb-a156-6ac67ef2abeb', '65ac688b-8f3c-464c-963c-e429a9faa765', 'bdde43d3-f664-4145-b4c6-f27109892427', 'b628767a-a42a-4c1c-841f-d2c1f9669a75')
  ORDER BY d.document_date ASC, l.line_no ASC;
`).then(r => {
  console.table(r.rows);
  pool.end();
});
