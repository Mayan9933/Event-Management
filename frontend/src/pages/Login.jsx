import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CalendarDays,
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  Mail,
  AlertCircle,
  Check,
  Sparkles,
  Info,
  Lock
} from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    subtitle: 'Event Registrations',
    description: 'Discover campus events, submit in-app custom registration forms, and track tickets.',
    emailPlaceholder: 'e.g. iit2023001@iiita.ac.in',
    Icon: GraduationCap,
    badgeText: 'STUDENT'
  },
  {
    id: 'ORGANIZER',
    label: 'Organizer',
    subtitle: 'Clubs & Societies',
    description: 'Publish campus events, build custom applicant forms, and track registrations.',
    emailPlaceholder: 'e.g. club.lead@iiita.ac.in',
    Icon: CalendarDays,
    badgeText: 'CLUB DESK'
  },
  {
    id: 'ADMIN',
    label: 'Administrator',
    subtitle: 'System Oversight',
    description: 'Platform administration, organizer approvals, audit logs, and governance.',
    emailPlaceholder: 'admin@iiita.ac.in',
    Icon: ShieldCheck,
    badgeText: 'RESTRICTED'
  }
];

export default function Login() {
  const [role, setRole] = useState('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const activeRoleData = ROLES.find(r => r.id === role) || ROLES[0];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const user = await login({ email: email.trim(), password, expectedRole: role });
      navigate(`/${user.role.toLowerCase()}/dashboard`);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        {/* Card Header */}
        <div className="auth-card-header">
          <div className="auth-kicker">
            <ShieldCheck size={13} className="kicker-icon" />
            <span>SECURE ACCESS GATEWAY</span>
          </div>
          <h1 className="auth-heading">Sign in to your account</h1>
          <p className="auth-subheading">
            Choose your campus role to enter your dedicated IIITA Connect portal.
          </p>
        </div>

        {/* Role Selector Grid */}
        <div className="auth-role-selector" role="radiogroup" aria-label="Select Account Role">
          {ROLES.map(({ id, label, subtitle, Icon, badgeText }) => {
            const isSelected = role === id;
            return (
              <button
                type="button"
                key={id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setRole(id);
                  setError('');
                }}
                className={`auth-role-card ${isSelected ? 'active' : ''}`}
              >
                <div className="role-card-top">
                  <div className="role-icon-box">
                    <Icon size={18} />
                  </div>
                  {isSelected && (
                    <span className="role-check-indicator" aria-hidden="true">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="role-card-body">
                  <span className="role-card-title">{label}</span>
                  <span className="role-card-subtitle">{subtitle}</span>
                </div>
                <span className="role-badge-tag">{badgeText}</span>
              </button>
            );
          })}
        </div>

        {/* Role Context Notification */}
        <div className="auth-role-banner">
          <Info size={15} className="banner-icon" />
          <div className="banner-text">
            <strong>{activeRoleData.label} Portal:</strong> {activeRoleData.description}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
          {/* Email Field */}
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="auth-email-input">
              <span>Institute Email</span>
              <span className="field-hint">@iiita.ac.in preferred</span>
            </label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-icon" />
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={activeRoleData.emailPlaceholder}
                required
                autoComplete="username"
                className="auth-text-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="auth-field-group">
            <div className="auth-field-label-row">
              <label className="auth-field-label" htmlFor="auth-password-input">
                Password
              </label>
            </div>
            <div className="auth-input-wrapper">
              <LockKeyhole size={17} className="auth-input-icon" />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="auth-text-input"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            className="auth-primary-btn"
            disabled={busy}
          >
            {busy ? (
              <span className="btn-loading-state">
                <span className="spinner-dot" /> Authenticating...
              </span>
            ) : (
              <>
                <span>Sign in as {activeRoleData.label}</span>
                <ArrowRight size={17} className="btn-arrow-icon" />
              </>
            )}
          </button>
        </form>

        {/* Secondary Role Actions */}
        <div className="auth-card-footer">
          {role === 'STUDENT' ? (
            <div className="auth-nav-note">
              <span>First time using the event portal?</span>{' '}
              <Link to="/register" className="auth-action-link">
                Create Student Account <ArrowRight size={13} />
              </Link>
            </div>
          ) : role === 'ORGANIZER' ? (
            <div className="auth-nav-note">
              <span>Leading a campus club or society?</span>{' '}
              <Link to="/organizer-request" className="auth-action-link">
                Request Organizer Desk <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="auth-admin-notice">
              <ShieldCheck size={15} />
              <span>
                System administrator credentials are provisioned strictly via server configuration. Public sign-up is disabled.
              </span>
            </div>
          )}
        </div>

        {/* Security badges bar */}
        <div className="auth-security-strip">
          <div className="security-pill">
            <Lock size={12} />
            <span>256-bit Encrypted</span>
          </div>
          <div className="security-pill">
            <GraduationCap size={12} />
            <span>IIITA IT Services</span>
          </div>
          <div className="security-pill">
            <Sparkles size={12} />
            <span>Real-time Sync</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
