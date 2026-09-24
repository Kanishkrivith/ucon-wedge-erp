'use client';
import { useEffect, useState } from 'react';

export function useERP(resource: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = () => {
    setLoading(true);
    fetch('/api/erp?resource=' + encodeURIComponent(resource))
      .then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw Error(x.error || 'Failed to load resource');
        setData(x);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [resource]);

  return { data, loading, error, reload };
}

export function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: any;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Table({
  columns,
  rows,
  labels,
}: {
  columns: string[];
  rows: any[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{labels?.[c] || c.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c}>{String(r[c] ?? '—')}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty">No records found.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
