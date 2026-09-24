'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit reset request.');
      }

      setMessage(
        data.message ||
          'If an active account exists for that email, password reset instructions have been generated.'
      );

      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  }

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
          <span className="auth-hero-kicker">ACCOUNT RECOVERY</span>
          <h1>Reset your access credential safely.</h1>
          <p>
            Self-service credential recovery is secured using cryptographically generated single-use
            tokens that automatically expire after 30 minutes.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <span className="bullet">⏱️</span>
              <span><b>Time-Bounded:</b> Reset tokens expire automatically in 30 minutes</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">🔑</span>
              <span><b>Single-Use Token:</b> Invalidated immediately upon password update</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">🚪</span>
              <span><b>Session Revocation:</b> All existing active sessions are terminated upon reset</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-foot">
          <span>Private Business System · Security Tier 1</span>
          <span>PostgreSQL 17</span>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          {/* Mobile Header */}
          <div className="auth-mobile-header">
            <div className="auth-brand-logo" style={{ margin: '0 auto 10px' }}>UW</div>
            <div className="auth-kicker">UCON WEDGE ERP</div>
            <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 900 }}>Account Recovery</h2>
          </div>

          <div className="auth-kicker">PASSWORD RECOVERY</div>
          <h1 className="auth-title">Forgot Password</h1>
          <p className="auth-muted">
            Enter your registered email address and we&apos;ll generate a secure reset link.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email Address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {error && <div className="error-box">{error}</div>}
            {message && <div className="notice">{message}</div>}

            {resetUrl && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: 14,
                  marginTop: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                  🔧 Local Dev Direct Reset Link
                </div>
                <p style={{ fontSize: 12, color: '#14532d', margin: '4px 0 10px' }}>
                  Since external SMTP is in test mode, you can immediately reset your password using the link below:
                </p>
                <Link
                  href={resetUrl}
                  className="primary"
                  style={{ display: 'inline-block', width: '100%', textAlign: 'center', padding: '10px' }}
                >
                  Proceed to Reset Password →
                </Link>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Generating link…' : 'Send Reset Instructions'}
            </button>
          </form>

          <div className="auth-footer">
            Remember your password?{' '}
            <Link href="/login" className="auth-link">
              ← Back to Sign In
            </Link>
          </div>

          <div className="auth-security-badge">
            <span>🔒 Cryptographically hashed single-use token valid for 30 minutes</span>
          </div>
        </div>
      </section>
    </main>
  );
}
