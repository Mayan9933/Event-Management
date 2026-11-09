import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Mail,
  LockKeyhole,
  AlertCircle,
  CheckCircle2,
  User,
  Building2,
  FileText,
  CalendarDays,
  ShieldCheck,
  Lock
} from 'lucide-react';

import { api } from '../services/api';
import AuthLayout from '../components/AuthLayout';

export default function OrganizerRequest() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    clubName: '',
    reason: ''
  });

  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setDone(false);

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      await api('/auth/organizer-request', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          clubName: form.clubName.trim(),
          reason: form.reason.trim()
        })
      });

      setDone(true);
      setForm({ name: '', email: '', password: '', clubName: '', reason: '' });
    } catch (err) {
      setError(err.message || 'Unable to submit your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card auth-card-wide">
        {/* Card Header */}
        <div className="auth-card-header">
          <div className="auth-kicker">
            <CalendarDays size={13} className="kicker-icon" />
            <span>ORGANIZER ACCESS CLEARANCE</span>
          </div>
          <h1 className="auth-heading">Request Organizer Clearance</h1>
          <p className="auth-subheading">
            Submit your club lead credentials to gain access for creating events, custom forms, and managing attendees.
          </p>
        </div>

        {done ? (
          <div className="auth-success-card">
            <div className="success-icon-wrap">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="success-title">Application Submitted Successfully</h3>
            <p className="success-desc">
              Your request for <strong>Organizer Clearance</strong> has been delivered to the IIITA Connect System Administration. Once approved, you can log in directly using your registered credentials.
            </p>
            <Link to="/login" className="auth-primary-btn" style={{ textDecoration: 'none' }}>
              <span>Return to Portal Login</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-role-banner">
              <ShieldCheck size={15} className="banner-icon" />
              <div className="banner-text">
                <strong>Administrative Review:</strong> All organizer accounts undergo manual institutional verification before activation.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-grid-2col">
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="org-name">
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <User size={17} className="auth-input-icon" />
                    <input
                      id="org-name"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Yashvardhan Singhania"
                      required
                      maxLength={120}
                      autoComplete="name"
                      className="auth-text-input"
                    />
                  </div>
                </div>

                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="org-club">
                    Club / Society / Cell
                  </label>
                  <div className="auth-input-wrapper">
                    <Building2 size={17} className="auth-input-icon" />
                    <input
                      id="org-club"
                      type="text"
                      name="clubName"
                      value={form.clubName}
                      onChange={handleChange}
                      placeholder="e.g. GeekHaven, Aparoksha, Effervescence"
                      required
                      maxLength={140}
                      className="auth-text-input"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-grid-2col">
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="org-email">
                    <span>Institute Email Address</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail size={17} className="auth-input-icon" />
                    <input
                      id="org-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@iiita.ac.in"
                      required
                      autoComplete="email"
                      className="auth-text-input"
                    />
                  </div>
                </div>

                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="org-password">
                    <span>Choose Password</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <LockKeyhole size={17} className="auth-input-icon" />
                    <input
                      id="org-password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      required
                      autoComplete="new-password"
                      className="auth-text-input"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-field-label" htmlFor="org-reason">
                  <span>Reason for Organizer Privileges & Past Activities</span>
                  <span className="field-hint">Max 2,000 characters</span>
                </label>
                <div className="auth-textarea-wrapper">
                  <FileText size={17} className="auth-textarea-icon" />
                  <textarea
                    id="org-reason"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Briefly describe your position within the student club, upcoming events planned, and why organizer privileges are required..."
                    required
                    rows={3}
                    maxLength={2000}
                    className="auth-textarea-input"
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
                    <span className="spinner-dot" /> Submitting Request...
                  </span>
                ) : (
                  <>
                    <span>Submit Organizer Clearance Request</span>
                    <ArrowRight size={17} className="btn-arrow-icon" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer */}
        <div className="auth-card-footer">
          <div className="auth-nav-note">
            <span>Already have an active account?</span>{' '}
            <Link to="/login" className="auth-action-link">
              Sign in to Portal <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Security badges bar */}
        <div className="auth-security-strip">
          <div className="security-pill">
            <Lock size={12} />
            <span>Bcrypt Hashed Credentials</span>
          </div>
          <div className="security-pill">
            <ShieldCheck size={12} />
            <span>Admin Vetting Required</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
