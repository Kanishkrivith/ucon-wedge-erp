const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.triqcnkwgyhioycidcxu:Kanishkrivith@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function report() {
  const docs = await pool.query(`
    SELECT count(*) as total_docs,
           count(*) FILTER (WHERE ai_confidence >= 0.95) as high_confidence_docs,
           count(DISTINCT vendor_id) as total_vendors
    FROM documents;
  `);
  
  const lines = await pool.query(`
    SELECT count(*) as total_lines,
           round(sum(total_amount)::numeric, 2) as total_extracted_value
    FROM document_line_items;
  `);

  const byCat = await pool.query(`
    SELECT coalesce(category_code, 'UNASSIGNED') as category_group,
           count(*) as items_count,
           round(sum(total_amount)::numeric, 2) as total_value
    FROM document_line_items
    GROUP BY category_code
    ORDER BY total_value DESC NULLS LAST;
  `);

  const byVendor = await pool.query(`
    SELECT v.canonical_name as vendor_name,
           count(DISTINCT d.id) as doc_count,
           count(l.id) as line_items_count,
           round(sum(l.total_amount)::numeric, 2) as vendor_total_spend
    FROM documents d
    JOIN vendors v ON v.id = d.vendor_id
    LEFT JOIN document_line_items l ON l.document_id = d.id
    WHERE d.ai_confidence >= 0.95
    GROUP BY v.canonical_name
    ORDER BY vendor_total_spend DESC NULLS LAST
    LIMIT 30;
  `);

  const timeline = await pool.query(`
    SELECT to_char(d.document_date, 'YYYY-MM') as month_year,
           count(DISTINCT d.id) as docs_count,
           round(sum(l.total_amount)::numeric, 2) as monthly_spend
    FROM documents d
    LEFT JOIN document_line_items l ON l.document_id = d.id
    WHERE d.document_date IS NOT NULL AND d.ai_confidence >= 0.95
    GROUP BY to_char(d.document_date, 'YYYY-MM')
    ORDER BY month_year ASC;
  `);

  console.log('=== OVERALL DATABASE STATS ===');
  console.table(docs.rows);
  console.table(lines.rows);

  console.log('\n=== LINE ITEMS BY CATEGORY (A-V) ===');
  console.table(byCat.rows);

  console.log('\n=== TOP VENDORS EXTRACTED ===');
  console.table(byVendor.rows);

  console.log('\n=== TIMELINE (CHRONOLOGICAL FROM OLDEST TO NEWEST) ===');
  console.table(timeline.rows);

  await pool.end();
}

report();
