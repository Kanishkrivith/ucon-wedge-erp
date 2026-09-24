import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword, hashToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { token, password, confirmPassword } = await req.json();

    const cleanToken = String(token || '').trim();
    const cleanPassword = String(password || '');
    const cleanConfirm = String(confirmPassword || '');

    if (!cleanToken) {
      return NextResponse.json({ error: 'Reset token is missing or invalid.' }, { status: 400 });
    }

    if (cleanPassword.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters long.' },
        { status: 400 }
      );
    }

    if (cleanConfirm && cleanPassword !== cleanConfirm) {
      return NextResponse.json(
        { error: 'Passwords do not match. Please verify and re-enter.' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(cleanToken);

    // Verify token validity
    const res = await pool.query(
      `SELECT id, user_id, expires_at
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       LIMIT 1`,
      [tokenHash]
    );

    const tokenRecord = res.rows[0];
    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'This password reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const newPasswordHash = hashPassword(cleanPassword);

      // Update password
      await client.query(
        `UPDATE users
         SET password_hash = $1, password_changed_at = now(), updated_at = now()
         WHERE id = $2`,
        [newPasswordHash, tokenRecord.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used_at = now() WHERE id = $1',
        [tokenRecord.id]
      );

      // Invalidate existing sessions for security
      await client.query(
        'DELETE FROM auth_sessions WHERE user_id = $1',
        [tokenRecord.user_id]
      );

      // Record audit trail
      await client.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, new_value)
         VALUES ('users', $1, 'PASSWORD_RESET', $2)`,
        [tokenRecord.user_id, JSON.stringify({ resetAt: new Date().toISOString() })]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        ok: true,
        message: 'Password reset successfully. You can now sign in with your new password.',
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Unable to reset password at this time.' },
      { status: 500 }
    );
  }
}
