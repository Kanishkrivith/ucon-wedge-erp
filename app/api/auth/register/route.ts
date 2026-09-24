import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

const ROLE_MAP: Record<string, string> = {
  'Production Staff': 'PRODUCTION_STAFF',
  'Purchase Manager': 'PURCHASE_MANAGER',
  'Document Admin': 'DOCUMENT_ADMIN',
  'Director': 'DIRECTOR',
  'MD': 'MD',
  'PRODUCTION_STAFF': 'PRODUCTION_STAFF',
  'PURCHASE_MANAGER': 'PURCHASE_MANAGER',
  'DOCUMENT_ADMIN': 'DOCUMENT_ADMIN',
  'DIRECTOR': 'DIRECTOR',
};

export async function POST(req: Request) {
  try {
    const { name, email, password, confirmPassword, requestedRole } = await req.json();

    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    const cleanConfirm = String(confirmPassword || '');
    const targetRole = ROLE_MAP[String(requestedRole || 'Production Staff').trim()] || 'PRODUCTION_STAFF';

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return NextResponse.json(
        { error: 'Please provide your full name, email, and password.' },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters long.' },
        { status: 400 }
      );
    }

    if (cleanPassword !== cleanConfirm) {
      return NextResponse.json(
        { error: 'Passwords do not match. Please verify and re-enter.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id, account_status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [cleanEmail]
    );

    if (existing.rows[0]) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    // Securely hash the password using scrypt
    const passwordHash = hashPassword(cleanPassword);

    // Insert user in PENDING state awaiting Super Admin approval
    const result = await pool.query(
      `INSERT INTO users (
        name, email, password_hash, role, active, account_status, requested_at, password_changed_at
      ) VALUES ($1, $2, $3, $4, false, 'PENDING', now(), now())
      RETURNING id, name, email, role, account_status`,
      [cleanName, cleanEmail, passwordHash, targetRole]
    );

    const newUser = result.rows[0];

    // Audit log
    try {
      await pool.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, new_value)
         VALUES ('users', $1, 'REGISTER_REQUEST', $2)`,
        [newUser.id, JSON.stringify({ name: cleanName, email: cleanEmail, role: targetRole, status: 'PENDING' })]
      );
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return NextResponse.json({
      ok: true,
      message: 'Account request submitted successfully. Awaiting Super Admin approval.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.account_status,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Unable to process account registration at this time.' },
      { status: 500 }
    );
  }
}
