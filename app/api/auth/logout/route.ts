import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { hashToken } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ucon_session')?.value;
    if (token) {
      await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(token)]);
      cookieStore.delete('ucon_session');
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: true });
  }
}
