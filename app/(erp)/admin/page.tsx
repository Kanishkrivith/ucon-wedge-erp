'use client';
import { useERP } from '../_components/ModulePage';
import { useState } from 'react';

export default function AdminPage() {
  const { data, loading, reload } = useERP('admin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const users = data?.users || [];
  const audit = data?.audit || [];

  async function updateStatus(userId: string, status: string) {
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'user_status', userId, status }),
      });
      const x = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${x.error || 'Failed to update user'}`);
      } else {
        setMessage(`User marked as ${status}.`);
        reload();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="section-intro">
        <div>
          <div className="eyebrow">SECURITY &amp; SYSTEM CONTROL</div>
          <h1>Super Admin Controls</h1>
          <p>Super Admin controls user activation, permissions, role hierarchy, and full audit logging.</p>
        </div>
        <button className="ghost" onClick={reload}>Refresh</button>
      </div>

      {message && (
        <div className={message.startsWith('Error') ? 'error-box' : 'notice'} style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      {/* Users Management */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>System Users &amp; Roles</h2>
            <small className="muted">Approve, activate, or deactivate accounts</small>
          </div>
        </div>

        {loading ? (
          <div className="empty">Loading users…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((u: any) => (
                    <tr key={u.id}>
                      <td><b>{u.name}</b></td>
                      <td>{u.email}</td>
                      <td><span className="badge">{u.role}</span></td>
                      <td>
                        <span
                          className={`badge ${
                            u.account_status === 'ACTIVE'
                              ? 'green'
                              : u.account_status === 'PENDING'
                              ? 'amber'
                              : 'red'
                          }`}
                        >
                          {u.account_status}
                        </span>
                      </td>
                      <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.account_status !== 'ACTIVE' && (
                            <button
                              className="ghost"
                              style={{ padding: '4px 8px', fontSize: 11, color: 'var(--green)' }}
                              disabled={submitting}
                              onClick={() => updateStatus(u.id, 'ACTIVE')}
                            >
                              Approve
                            </button>
                          )}
                          {u.account_status === 'ACTIVE' && (
                            <button
                              className="danger"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              disabled={submitting}
                              onClick={() => updateStatus(u.id, 'DEACTIVATED')}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}><div className="empty">No users found.</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit Log Table */}
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div>
            <h2>System Audit Trail</h2>
            <small className="muted">Immutable log of system changes and user actions</small>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Entity</th>
                <th>Action</th>
                <th>User</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {audit.length ? (
                audit.map((al: any) => {
                  const displayValue =
                    typeof al.new_value === 'object'
                      ? JSON.stringify(al.new_value)
                      : typeof al.old_value === 'object'
                      ? JSON.stringify(al.old_value)
                      : String(al.new_value || al.old_value || '—');
                  return (
                    <tr key={al.id}>
                      <td><b>{new Date(al.changed_at).toLocaleString()}</b></td>
                      <td><span className="badge">{al.entity_type}</span></td>
                      <td><b>{al.action}</b></td>
                      <td>{al.user_name || 'System'}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <code>{displayValue}</code>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5}><div className="empty">No audit events recorded yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
