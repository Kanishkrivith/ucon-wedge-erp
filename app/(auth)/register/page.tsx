'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    requestedRole: 'Production Staff',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (form.password.length < 12) {
      setError('Password must be at least 12 characters long.');
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setMessage(data.message || 'Account created successfully! Awaiting Super Admin approval.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Unable to submit account request.');
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
          <span className="auth-hero-kicker">ACCOUNT REQUEST</span>
          <h1>Join the UCON Wedge Manufacturing Team.</h1>
          <p>
            Request access to the central manufacturing system. In accordance with Section 4 and 77 of
            the Project Source of Truth, all new accounts are registered in pending status and verified by
            the Super Admin before authorization.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <span className="bullet">🔒</span>
              <span><b>Controlled Approvals:</b> Super Admin verifies all employee profiles</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">🛡️</span>
              <span><b>Strict Role Separation:</b> Access scoped to designated shop floor or management responsibilities</span>
            </div>
            <div className="auth-feature-item">
              <span className="bullet">📋</span>
              <span><b>Comprehensive Audit Trail:</b> Every login and record update is permanently attributed</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-foot">
          <span>Private Business System</span>
          <span>Security Level: Tier 1</span>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          {/* Mobile Header */}
          <div className="auth-mobile-header">
            <div className="auth-brand-logo" style={{ margin: '0 auto 10px' }}>UW</div>
            <div className="auth-kicker">UCON WEDGE ERP</div>
            <h2 style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 900 }}>Create Account</h2>
          </div>

          <div className="auth-kicker">NEW USER REGISTRATION</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-muted">Submit your details to request access to the UCON Wedge ERP.</p>

          <form onSubmit={handleRegister} className="auth-form">
            <label>
              Full Name
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@uconwedge.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label>
              Requested Operational Role
              <select
                value={form.requestedRole}
                onChange={(e) => setForm({ ...form, requestedRole: e.target.value })}
              >
                <option value="Production Staff">Production Staff (15 Stages, Daily Logs)</option>
                <option value="Purchase Manager">Purchase Manager (Vendors, POs, Invoices)</option>
                <option value="Document Admin">Document Admin (OCR Review &amp; Posting)</option>
                <option value="Director">Director (Management &amp; Financials)</option>
                <option value="MD">Managing Director (Full Unit Oversight)</option>
              </select>
            </label>

            <label>
              Password (minimum 12 characters)
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={12}
                  placeholder="Enter strong password (12+ chars)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              Confirm Password
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                placeholder="Re-enter password to verify"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </label>

            {error && <div className="error-box">{error}</div>}
            {message && <div className="notice">{message}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Submitting Request…' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link href="/login" className="auth-link">
              Sign In
            </Link>
          </div>

          <div className="auth-security-badge">
            <span>🔒 New accounts are reviewed and activated by Super Admin before ERP access</span>
          </div>
        </div>
      </section>
    </main>
  );
}
