'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('kanishkrivith@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please verify credentials.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  function fillCred(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('');
    setError('');
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
          <span className="auth-hero-kicker">MANUFACTURING COMMAND CENTER</span>
          <h1>One secure platform for your entire production operation.</h1>
          <p>
            Complete end-to-end visibility: 15-stage manufacturing sequence, live inventory movements,
            purchase order tracking, CapEx segregation, tool regrinding history, and AI document processing.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <span className="bullet">✓</span>
              <span><b>15-Stage Manufacturing:</b> Bar shearing to final zinc-plating and dispatch yield tracking</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">✓</span>
              <span><b>Real-Time Costing:</b> Monthly business snapshot &amp; live cost-per-wedge formula</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">✓</span>
              <span><b>AI Document Processing:</b> Automatic HSN, GSTIN, vendor invoice verification</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">✓</span>
              <span><b>Role-Based Access:</b> Super Admin, Director, MD, Purchase &amp; Production roles</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-foot">
          <span>Private Business System · Audit-First Architecture</span>
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
            <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 900 }}>Manufacturing System</h2>
          </div>

          <div className="auth-kicker">SECURE ACCESS</div>
          <h1 className="auth-title">Sign In</h1>
          <p className="auth-muted">Enter your registered credentials to access your ERP workspace.</p>

          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Email Address
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Password
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
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

            <div className="auth-row">
              <label className="remember">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In to UCON ERP'}
            </button>
          </form>

          {/* Quick Demo Access Pills */}
          <div className="quick-creds">
            <div className="quick-creds-title">
              <span>Quick Account Selector</span>
              <span>Click to auto-fill</span>
            </div>
            <div className="quick-creds-chips">
              <button
                type="button"
                className="quick-cred-chip"
                onClick={() => fillCred('kanishkrivith@gmail.com')}
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                className="quick-cred-chip"
                onClick={() => fillCred('logesh71994@gmail.com')}
              >
                ⚙️ Production Staff
              </button>
              <button
                type="button"
                className="quick-cred-chip"
                onClick={() => fillCred('equiments@ucon.co.in')}
              >
                📄 Document Admin
              </button>
            </div>
          </div>

          <div className="auth-footer">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="auth-link">
              Create Account
            </Link>
          </div>

          <div className="auth-security-badge">
            <span>🔒 Protected with scrypt password hashing &amp; role-based access control</span>
          </div>
        </div>
      </section>
    </main>
  );
}
