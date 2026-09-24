import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';

const N = 16384;
const r = 8;
const p = 1;
const keyLength = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(password, salt, keyLength, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || stored.startsWith('PASSWORD_NOT_SET$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, rr, pp, salt, encoded] = parts;
  try {
    const expected = Buffer.from(encoded, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(rr),
      p: Number(pp),
    });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export const hashToken = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex');

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ucon_session')?.value;
  if (!token) return null;

  try {
    const res = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.account_status, s.expires_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()
       LIMIT 1`,
      [hashToken(token)]
    );

    if (!res.rows[0] || !res.rows[0].active || res.rows[0].account_status !== 'ACTIVE') {
      return null;
    }

    await pool.query(
      'UPDATE auth_sessions SET last_seen_at = now() WHERE token_hash = $1',
      [hashToken(token)]
    );

    return res.rows[0];
  } catch (err) {
    console.error('Session verification error:', err);
    return null;
  }
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  return u;
}

export async function requireSuperAdmin() {
  const u = await requireUser();
  if (u.role !== 'Super Admin') throw new Error('FORBIDDEN');
  return u;
}

export async function requirePermission(code: string) {
  const u = await requireUser();
  if (u.role === 'Super Admin') return u;
  const r = await pool.query(
    'SELECT 1 FROM role_permissions WHERE role = $1 AND permission_code = $2',
    [u.role, code]
  );
  if (!r.rows[0]) throw new Error('FORBIDDEN');
  return u;
}
