import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  UserRound,
  Mail,
  LockKeyhole,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { api } from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await api('/auth/register/student', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      navigate('/login', { state: { message: 'Student account created successfully. Please sign in.' } });
    } catch (err) {
      setError(err.message || 'Account creation failed. Please try again.');
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
            <GraduationCap size={13} className="kicker-icon" />
            <span>STUDENT REGISTRATION GATEWAY</span>
          </div>
          <h1 className="auth-heading">Create your Student Account</h1>
          <p className="auth-subheading">
            Register with your institutional email to discover events, register with ease, and save progress.
          </p>
        </div>

        {/* Student Verification Note */}
        <div className="auth-role-banner">
          <ShieldCheck size={15} className="banner-icon" />
          <div className="banner-text">
            <strong>IIITA Student Clearance:</strong> Grants instant access to all campus event registrations, drafts, and tickets.
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="register-name">
              Full Name
            </label>
            <div className="auth-input-wrapper">
              <UserRound size={17} className="auth-input-icon" />
              <input
                id="register-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. Priyanshu Sharma"
                autoComplete="name"
                className="auth-text-input"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="register-email">
              <span>Institute Email Address</span>
              <span className="field-hint">@iiita.ac.in preferred</span>
            </label>
            <div className="auth-input-wrapper">
              <Mail size={17} className="auth-input-icon" />
              <input
                id="register-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="e.g. iit2023001@iiita.ac.in"
                autoComplete="email"
                className="auth-text-input"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="register-password">
              <span>Create Password</span>
              <span className="field-hint">Minimum 8 characters</span>
            </label>
            <div className="auth-input-wrapper">
              <LockKeyhole size={17} className="auth-input-icon" />
              <input
                id="register-password"
                name="password"
                type="password"
                minLength="8"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Choose a strong password"
                autoComplete="new-password"
                className="auth-text-input"
              />
            </div>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={busy}
          >
            {busy ? (
              <span className="btn-loading-state">
                <span className="spinner-dot" /> Creating Account...
              </span>
            ) : (
              <>
                <span>Create Student Account</span>
                <ArrowRight size={17} className="btn-arrow-icon" />
              </>
            )}
          </button>
        </form>

        {/* Footer / Switch link */}
        <div className="auth-card-footer">
          <div className="auth-nav-note">
            <span>Already have an account?</span>{' '}
            <Link to="/login" className="auth-action-link">
              Sign in to Portal <ArrowRight size={13} />
            </Link>
          </div>
          <div className="auth-sub-note">
            Looking for Club Organizer access?{' '}
            <Link to="/organizer-request" className="auth-dim-link">
              Apply via Organizer Desk
            </Link>
          </div>
        </div>

        {/* Security badges bar */}
        <div className="auth-security-strip">
          <div className="security-pill">
            <Lock size={12} />
            <span>Secure Student Data</span>
          </div>
          <div className="security-pill">
            <ShieldCheck size={12} />
            <span>Institutional Governance</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
