import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Sparkles, GraduationCap, CalendarDays } from 'lucide-react';

export default function AuthLayout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="auth-portal-root">
      {/* Precision grid pattern background */}
      <div className="auth-grid-bg" aria-hidden="true" />
      <div className="auth-ambient-glow" aria-hidden="true" />

      {/* Top Portal Navigation Bar */}
      <header className="auth-header">
        <div className="auth-header-inner">
          <Link to="/login" className="auth-brand">
            <div className="auth-brand-logo">
              <span className="brand-logo-text">iiit</span>
              <span className="brand-logo-dot" />
            </div>
            <div className="auth-brand-info">
              <div className="brand-title-wrap">
                <span className="brand-title">IIITA CONNECT</span>
                <span className="brand-badge">OFFICIAL PORTAL</span>
              </div>
              <span className="brand-subtitle">Indian Institute of Information Technology, Allahabad</span>
            </div>
          </Link>

          <div className="auth-header-actions">
            <div className="auth-status-pill">
              <span className="status-pulse-dot" />
              <span>Campus Gateway Active</span>
            </div>

            <nav className="auth-quick-nav">
              <Link
                to="/login"
                className={`quick-nav-link ${currentPath === '/login' ? 'active' : ''}`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className={`quick-nav-link ${currentPath === '/register' ? 'active' : ''}`}
              >
                Student Sign Up
              </Link>
              <Link
                to="/organizer-request"
                className={`quick-nav-link ${currentPath === '/organizer-request' ? 'active' : ''}`}
              >
                Organizer Desk
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Central Content Area */}
      <main className="auth-main-container">
        <div className="auth-card-wrapper">
          {children}
        </div>
      </main>

      {/* Portal Footer */}
      <footer className="auth-footer-bar">
        <div className="auth-footer-inner">
          <div className="footer-left">
            <span>© 2026 Indian Institute of Information Technology, Allahabad</span>
            <span className="footer-sep">•</span>
            <span>IIITA Connect Campus Event Gateway</span>
          </div>
          <div className="footer-right">
            <span className="security-tag">
              <ShieldCheck size={14} /> TLS 1.3 Certified Auth
            </span>
            <span className="footer-sep">•</span>
            <span className="footer-institute">Deoghat, Jhalwa, Prayagraj</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
