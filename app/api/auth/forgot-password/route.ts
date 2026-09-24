import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { pool } from '@/lib/db';
import { hashToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();

    const genericResponse = {
      ok: true,
      message: 'If an active account exists for that email, password reset instructions have been generated.',
    };

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 });
    }

    // Look up user
    const res = await pool.query(
      'SELECT id, name, email, active, account_status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [cleanEmail]
    );

    const user = res.rows[0];

    // If no user or user is not active, return generic response to prevent user enumeration
    if (!user || !user.active || user.account_status !== 'ACTIVE') {
      return NextResponse.json(genericResponse);
    }

    // Generate 32-byte secure random token
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);

    // Invalidate prior unused tokens
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < now()',
      [user.id]
    );

    // Insert new token valid for 30 minutes
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '30 minutes')`,
      [user.id, tokenHash]
    );

    const resetUrl = `/reset-password?token=${token}`;
    console.log(`[UCON ERP] Password Reset requested for ${cleanEmail}. Direct link: ${resetUrl}`);

    // In local development, return resetUrl to assist immediate testing
    return NextResponse.json({
      ...genericResponse,
      resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Unable to process password reset request at this time.' },
      { status: 500 }
    );
  }
}
