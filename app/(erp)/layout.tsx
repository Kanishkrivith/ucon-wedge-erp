'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const nav = [
  ['/dashboard', '⌂', 'Command Center'],
  ['/production', '⚙', 'Production (15 Stages)'],
  ['/inventory', '▦', 'Inventory & Stock'],
  ['/procurement', '◈', 'Purchase & Vendors'],
  ['/machines', '▣', 'Machines & CapEx'],
  ['/tools', '◇', 'Tools & Consumables'],
  ['/costing', '₹', 'Monthly Costing'],
  ['/documents', '▤', 'Documents & OCR'],
  ['/admin', '♙', 'Admin Controls'],
];

const mobileBottomNav = [
  ['/dashboard', '⌂', 'Home'],
  ['/production', '⚙', 'Production'],
  ['/inventory', '▦', 'Inventory'],
  ['/documents', '▤', 'Docs & AI'],
];

export default function ERPLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => {
        if (!x?.authenticated) {
          router.replace('/login');
        } else {
          setUser(x.user);
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  const activeNav = nav.find((x) => path.startsWith(x[0]));

  return (
    <div className="erp-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar desktop-only">
        <div className="brand">
          <div className="brand-mark">UW</div>
          <div>
            <b>UCON WEDGE</b>
            <span>Manufacturing ERP v2</span>
          </div>
        </div>

        <div className="nav-label">COMMAND CENTER</div>
        <nav>
          {nav.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className={path.startsWith(href) ? 'active' : ''}
            >
              <i>{icon}</i>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security">● System Online · PostgreSQL</div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-head">
          <div className="brand">
            <div className="brand-mark">UW</div>
            <div>
              <b>UCON WEDGE</b>
              <span>Manufacturing ERP v2</span>
            </div>
          </div>
          <button
            className="mobile-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="user-mobile-info">
          <span>{user?.name || 'Logged in user'}</span>
          <small>{user?.role || 'Staff'}</small>
        </div>

        <div className="nav-label">ALL MODULES</div>
        <nav className="mobile-nav-links">
          {nav.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className={path.startsWith(href) ? 'active' : ''}
              onClick={() => setDrawerOpen(false)}
            >
              <i>{icon}</i>
              {label}
            </Link>
          ))}
        </nav>

        <div className="mobile-drawer-foot">
          <button className="mobile-logout-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main ERP Area */}
      <main className="erp-main">
        <header className="erp-header">
          <div className="header-left">
            <button
              className="mobile-hamburger mobile-only"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Navigation Menu"
            >
              ☰
            </button>
            <div>
              <div className="header-kicker">UCON WEDGE MANUFACTURING MANAGEMENT SYSTEM</div>
              <div className="header-title">{activeNav?.[2] || 'ERP'}</div>
            </div>
          </div>
          <div className="user-pill">
            <span>{user?.name || 'Staff User'}</span>
            <small>{user?.role || 'User'}</small>
          </div>
        </header>

        <div className="erp-content-body">{children}</div>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-bar mobile-only">
          {mobileBottomNav.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className={`mobile-bottom-tab ${path.startsWith(href) ? 'active' : ''}`}
            >
              <span className="tab-icon">{icon}</span>
              <span className="tab-label">{label}</span>
            </Link>
          ))}
          <button
            className={`mobile-bottom-tab ${drawerOpen ? 'active' : ''}`}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            <span className="tab-icon">☰</span>
            <span className="tab-label">Menu</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
