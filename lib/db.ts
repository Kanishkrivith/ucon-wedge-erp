import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://ucon:ucon_dev_password@localhost:5432/ucon_wedge';

const globalForPg = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForPg.pool ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pool = pool;
}
