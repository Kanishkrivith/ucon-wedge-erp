'use client';

import { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!token) {
      setError('Password reset token is missing from the URL.');
      setLoading(false);
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setMessage('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-wrap">
      {/* Mobile Header */}
      <div className="auth-mobile-header">
        <div className="auth-brand-logo" style={{ margin: '0 auto 10px' }}>UW</div>
        <div className="auth-kicker">UCON WEDGE ERP</div>
        <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 900 }}>Reset Password</h2>
      </div>

      <div className="auth-kicker">SECURITY CREDENTIALS</div>
      <h1 className="auth-title">Create New Password</h1>
      <p className="auth-muted">
        Choose a strong, unique password with at least 12 characters.
      </p>

      {!token && (
        <div className="error-box" style={{ marginBottom: 14 }}>
          No reset token found in link. Please request a new link from the{' '}
          <Link href="/forgot-password" style={{ textDecoration: 'underline' }}>
            Forgot Password
          </Link>{' '}
          page.
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          New Password (min 12 characters)
          <div className="password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={12}
              placeholder="Enter new strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="eye-button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <label>
          Confirm New Password
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={12}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        {error && <div className="error-box">{error}</div>}
        {message && <div className="notice">{message}</div>}

        <button type="submit" className="auth-submit" disabled={loading || !token}>
          {loading ? 'Updating Password…' : 'Set New Password'}
        </button>
      </form>

      <div className="auth-footer">
        Back to{' '}
        <Link href="/login" className="auth-link">
          Sign In
        </Link>
      </div>

      <div className="auth-security-badge">
        <span>🔒 Secure one-way hashing with scryptSync</span>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      {/* Left Branding Hero Panel */}
      <section className="auth-brand-panel">
        <div className="auth-brand-top">
          <div className="auth-brand-logo">UW</div>
          <div className="auth-brand-text">
            <b>UCON WEDGE ERP</b>
            <span>Manufacturing Management System</span>
          </div>
        </div>

        <div className="auth-brand-hero">
          <span className="auth-hero-kicker">PASSWORD OVERHAUL</span>
          <h1>Establish your updated security key.</h1>
          <p>
            Your new password will immediately replace all prior credentials, terminate any orphaned
            sessions across all devices, and be written as an encrypted hash to the secure users vault.
          </p>
        </div>

        <div className="auth-brand-foot">
          <span>Private Business System · Security Tier 1</span>
          <span>PostgreSQL 17</span>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="auth-form-panel">
        <Suspense fallback={<div className="empty">Loading reset parameters…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
