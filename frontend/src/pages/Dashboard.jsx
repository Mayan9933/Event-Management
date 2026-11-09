import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

import {
  LogOut,
  CalendarDays,
  Ticket,
  Users,
  Plus,
  Check,
  X,
  RefreshCw,
  MapPin,
  Clock,
  UserCheck,
  BarChart3,
  ExternalLink,
  Trash2,
  Pencil,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Timer,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Sparkles,
  Search,
  Eye,
  ShieldCheck,
  Info
} from 'lucide-react';

const dateText = value =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

const defaultPresetFields = [
  { fieldId: 'field_name', label: 'Full Name', type: 'text', required: true, options: [], order: 0 },
  { fieldId: 'field_roll', label: 'Roll Number', type: 'text', required: true, options: [], order: 1 },
  { fieldId: 'field_branch', label: 'Branch / Specialization', type: 'select', required: true, options: ['IT', 'ECE', 'IT-BI', 'AIML', 'Other'], order: 2 }
];

const blankEvent = {
  title: '',
  description: '',
  category: 'Workshop',
  venue: '',
  startsAt: '',
  endsAt: '',
  capacity: 100,
  requiresRegistration: true,
  registrationFields: defaultPresetFields,
  registrationUrl: '',
  registrationOpensAt: '',
  registrationDeadline: ''
};

const PREVIEW_CHARS = 135;

// ISO -> value for <input type="datetime-local"> in the user's local timezone
const toLocalInput = value => {
  if (!value) return '';
  const d = new Date(value);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const hasCustomFields = e =>
  Array.isArray(e.registrationFields) && e.registrationFields.length > 0;

const needsRegistration = e =>
  typeof e.requiresRegistration === 'boolean' ? e.requiresRegistration : (hasCustomFields(e) || Boolean(e.registrationUrl));

function getPhase(e, now = Date.now()) {
  const start = new Date(e.startsAt).getTime();
  const end = new Date(e.endsAt).getTime();
  if (now >= end) return 'PAST';
  if (!needsRegistration(e)) return now < start ? 'UPCOMING' : 'CURRENT';
  const opens = e.registrationOpensAt ? new Date(e.registrationOpensAt).getTime() : null;
  const deadline = e.registrationDeadline ? new Date(e.registrationDeadline).getTime() : end;
  if (now >= deadline) return 'PAST';
  if (opens !== null && now < opens) return 'UPCOMING';
  return 'CURRENT';
}

function phaseNote(e, now) {
  if (e.status === 'CANCELLED') return { text: 'Cancelled', tone: 'past' };
  const phase = getPhase(e, now);
  const start = new Date(e.startsAt).getTime();
  const end = new Date(e.endsAt).getTime();
  if (!needsRegistration(e)) {
    if (phase === 'UPCOMING') return { text: 'Starts ' + dateText(e.startsAt), tone: 'upcoming' };
    if (phase === 'CURRENT') return { text: 'Live Now · Free Entry', tone: 'live' };
    return { text: 'Ended', tone: 'past' };
  }
  if (phase === 'UPCOMING') return { text: 'Registration opens ' + dateText(e.registrationOpensAt), tone: 'upcoming' };
  if (phase === 'CURRENT') return { text: 'Registration Open', tone: 'live' };
  if (now >= end) return { text: 'Ended', tone: 'past' };
  if (now >= start) return { text: 'Registration Closed · Event Ongoing', tone: 'past' };
  return { text: 'Registration Closed', tone: 'past' };
}

function canRegisterNow(e, now) {
  return needsRegistration(e) && getPhase(e, now) === 'CURRENT';
}

// Remaining milliseconds before registration closes, or null if past/not applicable
function msUntilDeadline(e, now) {
  if (!needsRegistration(e)) return null;
  const phase = getPhase(e, now);
  if (phase !== 'CURRENT') return null;

  const deadline = e.registrationDeadline
    ? new Date(e.registrationDeadline).getTime()
    : new Date(e.endsAt).getTime();
  const remaining = deadline - now;
  return remaining > 0 ? remaining : null;
}

// Prominent Countdown Timer: activates when < 1 hour (3600000 ms) remains before closing
function CountdownTimer({ event, now, large = false }) {
  const remaining = msUntilDeadline(event, now);
  if (remaining === null || remaining > 3600000) return null; // Only show when < 1 hour remaining

  const totalSec = Math.floor(remaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const pad = n => String(n).padStart(2, '0');

  return (
    <div className={`countdown-timer-box ${large ? 'countdown-large' : ''}`}>
      <div className="countdown-pulse-dot" />
      <Timer size={large ? 18 : 14} className="countdown-icon" />
      <span className="countdown-text">
        CLOSING IN <strong className="countdown-digits">{pad(mins)}:{pad(secs)}</strong>
      </span>
      <span className="countdown-sub">Hurry up!</span>
    </div>
  );
}

function Description({ text }) {
  const long = (text || '').length > PREVIEW_CHARS;
  return (
    <p className="event-desc">
      {long ? text.slice(0, PREVIEW_CHARS).trimEnd() + '…' : text}
      {long && <span className="view-more"> View details</span>}
    </p>
  );
}

function EventCard({ event, now, onOpen, onRegister, secondary, showPhase = true, regStatus }) {
  const note = phaseNote(event, now);
  const open = () => onOpen && onOpen(event);

  return (
    <article
      className={`event-card ${onOpen ? 'clickable' : ''}`}
      onClick={open}
      onKeyDown={e => { if (onOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="event-card-top">
        <span className="event-category">{event.category}</span>
        <span className={`status-pill ${event.status === 'PUBLISHED' ? 'published' : 'muted'}`}>
          {event.status}
        </span>
      </div>

      <h3 className="event-title">{event.title}</h3>

      <Description text={event.description} />

      <div className="event-meta">
        <span><MapPin size={15} /><strong>Venue:</strong> {event.venue}</span>
        <span><Clock size={15} /><strong>Date:</strong> {dateText(event.startsAt)}</span>
        {showPhase && <span className={`phase-note ${note.tone}`}>{note.text}</span>}
      </div>

      {/* Urgent 1-Hour Countdown Timer */}
      <CountdownTimer event={event} now={now} />

      <div className="event-footer" onClick={e => e.stopPropagation()}>
        <span className="event-organizer">
          By <strong>{event.clubName || event.organizerName}</strong>
        </span>

        {/* Student Registration Status Badges / Action */}
        {onRegister && needsRegistration(event) && hasCustomFields(event) && (
          regStatus === 'COMPLETE' ? (
            <span className="reg-badge reg-complete">
              <CheckCircle2 size={14} /> <strong>Registered</strong>
            </span>
          ) : regStatus === 'INCOMPLETE' ? (
            <button
              type="button"
              className="reg-badge reg-incomplete clickable"
              onClick={() => onRegister(event)}
              title="Click to resume and complete your registration"
            >
              <AlertCircle size={14} /> <strong>Complete Registration</strong>
            </button>
          ) : canRegisterNow(event, now) ? (
            <button type="button" className="btn-primary-small" onClick={() => onRegister(event)}>
              Register Now <FileText size={13} />
            </button>
          ) : (
            <button type="button" className="btn-disabled-small" disabled>
              {getPhase(event, now) === 'UPCOMING' ? 'Opens soon' : 'Closed'}
            </button>
          )
        )}

        {/* Legacy External Registration URL */}
        {onRegister && needsRegistration(event) && !hasCustomFields(event) && event.registrationUrl && (
          canRegisterNow(event, now) ? (
            <button type="button" className="btn-primary-small" onClick={() => onRegister(event)}>
              Register <ExternalLink size={13} />
            </button>
          ) : (
            <button type="button" className="btn-disabled-small" disabled>
              {getPhase(event, now) === 'UPCOMING' ? 'Opens soon' : 'Closed'}
            </button>
          )
        )}

        {onRegister && !needsRegistration(event) && (
          <span className="no-reg-label">No registration needed</span>
        )}

        {secondary && secondary(event)}
      </div>
    </article>
  );
}

// ———— Student In-App Registration Form Modal ————

function RegistrationFormModal({ event, now, existingData, onClose, onSubmit, busy }) {
  const [formValues, setFormValues] = useState(() => {
    const initial = {};
    (event.registrationFields || []).forEach(f => {
      initial[f.fieldId] = existingData?.[f.fieldId] || '';
    });
    return initial;
  });

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleChange = (fieldId, value) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const fields = event.registrationFields || [];
  const requiredCount = fields.filter(f => f.required).length;
  const filledRequiredCount = fields.filter(f => f.required && String(formValues[f.fieldId] || '').trim()).length;
  const isAllFilled = requiredCount > 0 ? filledRequiredCount === requiredCount : true;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel reg-form-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header-clean">
          <div>
            <span className="event-category">{event.category}</span>
            <h2 className="modal-title">Registration for <strong>{event.title}</strong></h2>
            <p className="modal-subtitle">
              Organized by <strong>{event.clubName || event.organizerName}</strong> · Complete the form below to register.
            </p>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Countdown warning if < 1 hour */}
        <CountdownTimer event={event} now={now} large />

        {/* Completion Progress Indicator */}
        <div className="form-progress-indicator">
          <div className="progress-text">
            <span><strong>{filledRequiredCount}</strong> of <strong>{requiredCount}</strong> required fields completed</span>
            <span className="progress-percent">{Math.round((filledRequiredCount / Math.max(requiredCount, 1)) * 100)}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(filledRequiredCount / Math.max(requiredCount, 1)) * 100}%` }}
            />
          </div>
        </div>

        <form
          className="reg-form-fields"
          onSubmit={e => {
            e.preventDefault();
            onSubmit(formValues, false);
          }}
        >
          {fields
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(field => (
              <label key={field.fieldId} className="reg-field-label">
                <span className="reg-field-name">
                  <strong>{field.label}</strong>
                  {field.required ? (
                    <span className="req-tag">Required</span>
                  ) : (
                    <span className="opt-tag">Optional</span>
                  )}
                </span>

                {field.type === 'textarea' ? (
                  <textarea
                    value={formValues[field.fieldId] || ''}
                    onChange={e => handleChange(field.fieldId, e.target.value)}
                    required={field.required}
                    rows={3}
                    placeholder={`Enter your ${field.label.toLowerCase()}...`}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formValues[field.fieldId] || ''}
                    onChange={e => handleChange(field.fieldId, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Select {field.label}...</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={formValues[field.fieldId] || ''}
                    onChange={e => handleChange(field.fieldId, e.target.value)}
                    required={field.required}
                    placeholder={`Enter your ${field.label.toLowerCase()}...`}
                  />
                )}
              </label>
            ))}

          <div className="reg-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSubmit(formValues, true)}
              disabled={busy}
              title="Save partially filled form as draft and complete it later"
            >
              Save as Draft (Incomplete)
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !isAllFilled}
            >
              {busy ? 'Submitting...' : 'Submit Full Registration'}
              <Check size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ———— Organizer Form Field Builder ————

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'email', label: 'Email Address' },
  { value: 'number', label: 'Numeric Value' },
  { value: 'textarea', label: 'Paragraph / Description' },
  { value: 'select', label: 'Dropdown Options' }
];

function FormFieldBuilder({ fields, onChange }) {
  const addField = (preset = null) => {
    const newField = preset || {
      fieldId: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: true,
      options: [],
      order: fields.length
    };
    onChange([...fields, newField]);
  };

  const updateField = (index, key, value) => {
    const updated = fields.map((f, i) => i === index ? { ...f, [key]: value } : f);
    onChange(updated);
  };

  const removeField = index => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (index, direction) => {
    const newFields = [...fields];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newFields.length) return;
    [newFields[index], newFields[swapIdx]] = [newFields[swapIdx], newFields[index]];
    newFields.forEach((f, i) => f.order = i);
    onChange(newFields);
  };

  return (
    <div className="form-builder-card">
      <div className="form-builder-header">
        <div>
          <h3 className="builder-title">
            <ClipboardList size={18} />
            <strong>Custom Registration Form Builder</strong>
          </h3>
          <p className="builder-subtitle">
            Create fields students must fill when registering for this event.
          </p>
        </div>

        {/* Quick Add Presets */}
        <div className="builder-presets">
          <span className="preset-label">Quick Add:</span>
          <button
            type="button"
            className="preset-btn"
            onClick={() => addField({ fieldId: `roll_${Date.now()}`, label: 'Roll Number', type: 'text', required: true, options: [], order: fields.length })}
          >
            + Roll No.
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => addField({ fieldId: `branch_${Date.now()}`, label: 'Branch', type: 'select', required: true, options: ['IT', 'ECE', 'IT-BI', 'AIML'], order: fields.length })}
          >
            + Branch
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => addField({ fieldId: `year_${Date.now()}`, label: 'Year of Study', type: 'select', required: true, options: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG/Ph.D'], order: fields.length })}
          >
            + Year
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => addField({ fieldId: `phone_${Date.now()}`, label: 'Phone Number', type: 'text', required: false, options: [], order: fields.length })}
          >
            + Phone
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="empty-builder-state">
          No fields added yet. Click "+ Add Custom Field" or use a quick preset above.
        </div>
      ) : (
        <div className="builder-field-list">
          {fields.map((field, idx) => (
            <div key={field.fieldId} className="builder-field-item">
              <div className="builder-row-top">
                <span className="field-number">#{idx + 1}</span>

                <input
                  type="text"
                  value={field.label}
                  onChange={e => updateField(idx, 'label', e.target.value)}
                  placeholder="Field Label (e.g. Roll Number)"
                  className="field-label-input"
                  required
                />

                <select
                  value={field.type}
                  onChange={e => updateField(idx, 'type', e.target.value)}
                  className="field-type-select"
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                <label className="field-required-checkbox">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => updateField(idx, 'required', e.target.checked)}
                  />
                  <span><strong>Required</strong></span>
                </label>

                <div className="field-reorder-group">
                  <button
                    type="button"
                    onClick={() => moveField(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                    className="reorder-btn"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(idx, 1)}
                    disabled={idx === fields.length - 1}
                    title="Move down"
                    className="reorder-btn"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="remove-field-btn"
                    title="Remove field"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {field.type === 'select' && (
                <div className="builder-options-row">
                  <label>
                    <span>Dropdown options (comma-separated):</span>
                    <input
                      type="text"
                      value={(field.options || []).join(', ')}
                      onChange={e => updateField(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. IT, ECE, IT-BI, AIML"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn-add-field" onClick={() => addField()}>
        <Plus size={15} /> <strong>Add Custom Field</strong>
      </button>
    </div>
  );
}

// ———— Registrations Viewer (Organizer & Admin: List of Complete and Incomplete Students) ————

function RegistrationsModal({ event, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      try {
        const path = `/auth/organizer/events/${event._id}/registrations`;
        const result = await api(path);
        setData(result);
      } catch (e) {
        try {
          const result = await api(`/auth/admin/events/${event._id}/registrations`);
          setData(result);
        } catch (e2) {
          setError(e2.message || e.message);
        }
      }
    })();
  }, [event._id]);

  const registrations = data?.registrations || [];
  const summary = data?.summary || { total: 0, complete: 0, incomplete: 0 };
  const eventInfo = data?.event || event;
  const regFields = eventInfo?.registrationFields || [];

  const filtered = filter === 'ALL'
    ? registrations
    : registrations.filter(r => r.status === filter);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel reg-list-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header-clean">
          <div>
            <h2 className="modal-title">
              Registrations for <strong>{event.title}</strong>
            </h2>
            <p className="modal-subtitle">
              Review full list of students who have registered and those with incomplete drafts.
            </p>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <div className="notice error-notice">{error}</div>}

        {data && (
          <>
            {/* Top Stat Summary Bar */}
            <div className="reg-stats-summary-bar">
              <div className="reg-summary-pill total">
                <Users size={18} />
                <div>
                  <span className="summary-label">Total Applicants</span>
                  <strong className="summary-value">{summary.total}</strong>
                </div>
              </div>

              <div className="reg-summary-pill complete">
                <CheckCircle2 size={18} />
                <div>
                  <span className="summary-label">Completed Registrations</span>
                  <strong className="summary-value">{summary.complete}</strong>
                </div>
              </div>

              <div className="reg-summary-pill incomplete">
                <AlertCircle size={18} />
                <div>
                  <span className="summary-label">Incomplete (Drafts)</span>
                  <strong className="summary-value">{summary.incomplete}</strong>
                </div>
              </div>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="reg-filter-nav">
              {[
                ['ALL', 'All Submissions', summary.total],
                ['COMPLETE', 'Completed', summary.complete],
                ['INCOMPLETE', 'Incomplete (Draft)', summary.incomplete]
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={`reg-filter-pill ${filter === key ? 'active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  <strong>{label}</strong>
                  <span className="filter-count">{count}</span>
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                No {filter === 'ALL' ? '' : filter.toLowerCase()} registrations found.
              </div>
            ) : (
              <div className="reg-table-container">
                <table className="reg-data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Registration Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const isExpanded = expandedId === r._id;
                      return (
                        <React.Fragment key={r._id}>
                          <tr className={`reg-row ${isExpanded ? 'expanded' : ''}`}>
                            <td className="cell-student">
                              <strong>{r.studentName}</strong>
                            </td>
                            <td className="cell-email">{r.studentEmail}</td>
                            <td>
                              <span className={`status-pill ${r.status === 'COMPLETE' ? 'registered' : 'pending'}`}>
                                {r.status === 'COMPLETE' ? '✓ COMPLETE' : '⚠ INCOMPLETE'}
                              </span>
                            </td>
                            <td className="cell-date">{dateText(r.createdAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn-view-answers"
                                onClick={() => setExpandedId(isExpanded ? null : r._id)}
                              >
                                <Eye size={13} />
                                {isExpanded ? 'Hide Details' : 'View Form Data'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Custom Form Answers Drawer */}
                          {isExpanded && (
                            <tr className="reg-answers-row">
                              <td colSpan={5}>
                                <div className="reg-answers-drawer">
                                  <h4 className="drawer-heading">
                                    Submitted Form Details:
                                  </h4>

                                  {regFields.length === 0 && (!r.formData || Object.keys(r.formData).length === 0) ? (
                                    <p className="no-fields-text">No custom form answers stored.</p>
                                  ) : (
                                    <div className="answers-grid">
                                      {regFields.map(field => {
                                        const val = r.formData?.[field.fieldId];
                                        const hasVal = Boolean(val && String(val).trim());
                                        return (
                                          <div key={field.fieldId} className={`answer-card ${hasVal ? 'filled' : 'missing'}`}>
                                            <span className="answer-label">
                                              <strong>{field.label}</strong>
                                              {field.required && <span className="req-star">*</span>}
                                            </span>
                                            <span className="answer-value">
                                              {hasVal ? val : <em>Not filled (Incomplete)</em>}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!data && !error && <div className="empty-state">Loading registrations...</div>}
      </div>
    </div>
  );
}

// ———— Event Details Modal ————

function EventDetailsModal({ event, now, onClose, onRegister, actions, regStatus }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const note = phaseNote(event, now);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel details-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header-clean">
          <div>
            <span className="event-category">{event.category}</span>
            <h2 className="modal-title"><strong>{event.title}</strong></h2>
            <span className={`phase-note ${note.tone}`}>{note.text}</span>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* 1-Hour Warning Timer */}
        <CountdownTimer event={event} now={now} large />

        <div className="details-meta-clean">
          <div className="meta-item">
            <MapPin size={16} />
            <span><strong>Venue:</strong> {event.venue}</span>
          </div>
          <div className="meta-item">
            <Clock size={16} />
            <span><strong>Event Duration:</strong> {dateText(event.startsAt)} → {dateText(event.endsAt)}</span>
          </div>
          <div className="meta-item">
            <Users size={16} />
            <span><strong>Capacity:</strong> {event.capacity} Attendees</span>
          </div>
          <div className="meta-item">
            <UserCheck size={16} />
            <span><strong>Organized by:</strong> {event.clubName || event.organizerName}</span>
          </div>

          {event.status === 'CANCELLED' && (
            <div className="meta-item text-danger">
              <X size={16} />
              <span><strong>Status:</strong> This event was cancelled</span>
            </div>
          )}

          {needsRegistration(event) && event.registrationOpensAt && (
            <div className="meta-item">
              <CalendarDays size={16} />
              <span><strong>Registration Opens:</strong> {dateText(event.registrationOpensAt)}</span>
            </div>
          )}

          {needsRegistration(event) && (
            <div className="meta-item">
              <CalendarDays size={16} />
              <span><strong>Registration Closes:</strong> {dateText(event.registrationDeadline || event.endsAt)}</span>
            </div>
          )}
        </div>

        <div className="details-desc-box">
          <h4 className="desc-heading">About This Event</h4>
          <p>{event.description}</p>
        </div>

        {actions && <div className="details-actions manage-actions">{actions}</div>}

        {onRegister && (
          <div className="details-actions">
            {hasCustomFields(event) ? (
              regStatus === 'COMPLETE' ? (
                <div className="reg-badge reg-complete" style={{ padding: '8px 16px', fontSize: 13 }}>
                  <CheckCircle2 size={16} /> <strong>You are registered for this event</strong>
                </div>
              ) : regStatus === 'INCOMPLETE' ? (
                <button type="button" className="btn-warning" onClick={() => onRegister(event)}>
                  <AlertCircle size={16} /> <strong>Complete Your Registration (Draft saved)</strong>
                </button>
              ) : canRegisterNow(event, now) ? (
                <button type="button" className="btn-primary" onClick={() => onRegister(event)}>
                  Register Now <FileText size={16} />
                </button>
              ) : (
                <span className="no-reg-label">
                  {needsRegistration(event) ? 'Registration is not open right now' : 'No registration needed — just show up!'}
                </span>
              )
            ) : (
              event.registrationUrl && canRegisterNow(event, now) ? (
                <button type="button" className="btn-primary" onClick={() => onRegister(event)}>
                  Register Online <ExternalLink size={16} />
                </button>
              ) : (
                <span className="no-reg-label">
                  {needsRegistration(event) ? 'Registration is closed' : 'No registration required'}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Second-step confirmation modal for deleting
function DeleteConfirmModal({ target, busy, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === target.confirmText.trim();

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel delete-panel" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="delete-icon"><AlertTriangle size={24} /></div>
        <h2 className="modal-title"><strong>{target.heading}</strong></h2>
        <p className="delete-warning">{target.warning}</p>
        <label className="delete-label">
          To confirm, type <strong>{target.confirmText}</strong> below:
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={target.confirmText}
            autoComplete="off"
            className="input-field"
          />
        </label>
        <div className="delete-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="btn-danger"
            disabled={!matches || busy}
            onClick={() => onConfirm(typed.trim())}
          >
            <Trash2 size={15} /> {busy ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ———— Main Dashboard Component ————

export default function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const role = user?.role || 'STUDENT';

  const [events, setEvents] = useState([]);
  const [studentRegistrations, setStudentRegistrations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [stats, setStats] = useState(null);

  const [form, setForm] = useState(blankEvent);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [eventSearch, setEventSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState('CURRENT');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Student registration tracking
  const [regFormEvent, setRegFormEvent] = useState(null);
  const [regStatuses, setRegStatuses] = useState({}); // { [eventId]: 'COMPLETE' | 'INCOMPLETE' }
  const [regFormData, setRegFormData] = useState({}); // { [eventId]: { fieldId: value } }
  const [viewRegsEvent, setViewRegsEvent] = useState(null);

  // Tick every second for live countdown timer and phase shifts
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const config = {
    ADMIN: {
      title: 'Administrator Portal',
      desc: 'Platform governance, access requests approval, campus events oversight, and registrant lists.'
    },
    ORGANIZER: {
      title: 'Organizer Management Hub',
      desc: 'Publish campus events with custom registration forms and manage attendee registrations.'
    },
    STUDENT: {
      title: 'Campus Events & Registrations',
      desc: 'Explore official club activities, register with ease, and track your attendance status.'
    }
  }[role];

  // Load Dashboard Data
  async function load() {
    setError('');

    try {
      if (role === 'ADMIN') {
        const [r, e, s, u] = await Promise.all([
          api('/auth/admin/organizer-requests'),
          api('/auth/admin/events'),
          api('/auth/admin/stats'),
          api('/auth/admin/users')
        ]);

        setRequests(r.requests || []);
        setEvents(e.events || []);
        setStats(s.stats || null);
        setManagedUsers(u.users || []);

      } else if (role === 'ORGANIZER') {
        const e = await api('/auth/organizer/events');
        setEvents(e.events || []);

      } else {
        const [e, regs] = await Promise.all([
          api('/auth/events'),
          api('/auth/student/registrations')
        ]);
        setEvents(e.events || []);
        setStudentRegistrations(regs.registrations || []);

        const statusMap = {};
        const dataMap = {};
        (regs.registrations || []).forEach(r => {
          const id = r.eventId?._id?.toString() || r.eventId?.toString();
          if (id) {
            statusMap[id] = r.status || 'COMPLETE';
            dataMap[id] = r.formData || {};
          }
        });
        setRegStatuses(statusMap);
        setRegFormData(dataMap);
      }

    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [role]);

  // Admin approval
  async function review(request, decision) {
    setBusy(true);
    setNotice('');
    setError('');

    try {
      const r = await api(
        `/auth/admin/organizer-requests/${request._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ decision })
        }
      );

      setNotice(r.message);
      await load();

    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Delete event / account
  function askDeleteEvent(event) {
    setDeleteTarget({
      kind: 'event',
      id: event._id,
      confirmText: event.title,
      heading: 'Delete this event?',
      warning: `"${event.title}" and its registered student records will be permanently removed. This cannot be undone.`
    });
  }

  function askDeleteUser(account) {
    setDeleteTarget({
      kind: 'user',
      id: account._id,
      confirmText: account.email,
      heading: 'Delete this account?',
      warning: `${account.name} (${account.email}) and related records will be permanently removed.` +
        (account.role === 'ORGANIZER' ? ' All events hosted by this organizer will also be deleted.' : '') +
        ' This cannot be undone.'
    });
  }

  async function confirmDelete(typed) {
    const t = deleteTarget;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      let path;
      if (t.kind === 'user') path = `/auth/admin/users/${t.id}`;
      else path = `/auth/${role === 'ADMIN' ? 'admin' : 'organizer'}/events/${t.id}`;

      const r = await api(path, {
        method: 'DELETE',
        body: JSON.stringify({ confirmTitle: typed })
      });
      setNotice(r.message);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  // Publish / Save Event
  async function publish(e) {
    e.preventDefault();

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        registrationFields: form.requiresRegistration ? form.registrationFields : [],
        registrationUrl: '',
        registrationOpensAt: form.requiresRegistration && form.registrationOpensAt
          ? new Date(form.registrationOpensAt).toISOString() : '',
        registrationDeadline: form.requiresRegistration && form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString() : ''
      };
      payload.startsAt = new Date(form.startsAt).toISOString();
      payload.endsAt = new Date(form.endsAt).toISOString();

      const r = await api(
        editingId ? `/auth/organizer/events/${editingId}` : '/auth/organizer/events',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        }
      );

      setNotice(r.message);
      setForm({ ...blankEvent, registrationFields: defaultPresetFields });
      setEditingId(null);
      setShowForm(false);

      await load();

    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(event) {
    setSelectedEvent(null);
    setError('');
    setNotice('');
    setEditingId(event._id);
    setForm({
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue,
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      capacity: event.capacity,
      requiresRegistration: needsRegistration(event),
      registrationFields: event.registrationFields?.length ? event.registrationFields : defaultPresetFields,
      registrationUrl: event.registrationUrl || '',
      registrationOpensAt: toLocalInput(event.registrationOpensAt),
      registrationDeadline: toLocalInput(event.registrationDeadline)
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...blankEvent, registrationFields: defaultPresetFields });
  }

  async function cancelEvent(event) {
    if (!window.confirm(`Are you sure you want to cancel "${event.title}"?`)) {
      return;
    }

    try {
      const r = await api(
        `/auth/organizer/events/${event._id}/cancel`,
        { method: 'PATCH' }
      );

      setNotice(r.message);
      setSelectedEvent(null);
      await load();

    } catch (e) {
      setError(e.message);
    }
  }

  // Register in-app or via external link
  function register(event) {
    setError('');

    if (hasCustomFields(event)) {
      setRegFormEvent(event);
      return;
    }

    if (!event.registrationUrl) {
      setError('Registration link is not available for this event.');
      return;
    }

    try {
      const url = new URL(event.registrationUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid URL');
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      setError('This event has an invalid registration link.');
    }
  }

  // Submit in-app registration (Complete or Draft)
  async function submitRegistration(formValues, isDraft = false) {
    if (!regFormEvent) return;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const r = await api(
        `/auth/student/events/${regFormEvent._id}/register`,
        {
          method: 'POST',
          body: JSON.stringify({ formData: formValues, isDraft })
        }
      );

      setNotice(r.message);
      setRegFormEvent(null);

      // Instantly update local registration state
      setRegStatuses(prev => ({
        ...prev,
        [regFormEvent._id]: r.status
      }));
      setRegFormData(prev => ({
        ...prev,
        [regFormEvent._id]: r.formData || formValues
      }));

      await load();

    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const updateForm = e => {
    const { name, type, checked, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Filter events based on search query and category
  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      const query = eventSearch.trim().toLowerCase();
      const matchesQuery = !query || [
        event.title, event.description, event.venue, event.clubName, event.category
      ].some(val => String(val || '').toLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'ALL' || event.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [events, eventSearch, categoryFilter]);

  // Tab counts
  const tabCounts = { CURRENT: 0, UPCOMING: 0, PAST: 0, MY_REGISTRATIONS: 0 };
  visibleEvents.forEach(e => {
    tabCounts[getPhase(e, now)] += 1;
  });
  tabCounts.MY_REGISTRATIONS = studentRegistrations.length;

  const tabEvents = useMemo(() => {
    if (tab === 'MY_REGISTRATIONS') {
      const regEventIds = new Set(studentRegistrations.map(r => r.eventId?._id?.toString() || r.eventId?.toString()));
      return visibleEvents.filter(e => regEventIds.has(e._id));
    }
    return visibleEvents
      .filter(e => getPhase(e, now) === tab)
      .sort((a, b) => tab === 'PAST'
        ? new Date(b.endsAt) - new Date(a.endsAt)
        : new Date(a.startsAt) - new Date(b.startsAt));
  }, [visibleEvents, tab, now, studentRegistrations]);

  const emptyText = {
    CURRENT: 'No events are actively open or live right now.',
    UPCOMING: 'No upcoming events scheduled yet. Check back soon.',
    PAST: 'No past campus events recorded.',
    MY_REGISTRATIONS: 'You have not registered for any events yet. Browse "Current" events to sign up!'
  }[tab];

  return (
    <div className="dash-shell">

      {/* TOP NAVIGATION BAR */}
      <header className="dash-nav">
        <div className="nav-brand-group">
          <div className="brand-badge">i.</div>
          <div>
            <b className="brand-title">IIITA Connect</b>
            <span className="brand-sub">CAMPUS PORTAL</span>
          </div>
        </div>

        <div className="nav-right">
          <div className="nav-user-pill">
            <span className="user-dot" />
            <span className="user-name"><strong>{user?.name}</strong></span>
            <span className="user-role-tag">{role}</span>
          </div>

          <button
            className="btn-signout"
            onClick={() => {
              logout();
              nav('/login');
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <main className="dash-content">

        {/* DASHBOARD HEADER */}
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow-tag">
              IIIT ALLAHABAD · <strong>{role} DASHBOARD</strong>
            </div>
            <h1 className="heading-main"><strong>{config.title}</strong></h1>
            <p className="heading-sub">{config.desc}</p>
          </div>

          <button className="btn-refresh" onClick={load}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {notice && (
          <div className="notice success-notice">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="notice error-notice">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================
            ADMIN DASHBOARD VIEW
            ========================================= */}
        {role === 'ADMIN' && <>

          {stats && (
            <div className="stats-grid">
              {[
                ['Active Students', stats.students, Users],
                ['Club Organizers', stats.organizers, UserCheck],
                ['Published Events', stats.publishedEvents, CalendarDays],
                ['Pending Requests', stats.pendingOrganizerRequests, BarChart3],
                ['Total Registrations', stats.registrations, FileText]
              ].map(([label, value, Icon]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-icon-wrap"><Icon size={20} /></div>
                  <div className="stat-info">
                    <span className="stat-label"><strong>{label}</strong></span>
                    <b className="stat-value">{value}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Organizer Requests Review */}
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2><strong>Organizer Access Requests</strong></h2>
                <p>Review and verify club representatives requesting organizer privileges.</p>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="empty-state">No pending organizer access requests.</div>
            ) : (
              <div className="request-list">
                {requests.map(r => (
                  <article className="request-card" key={r._id}>
                    <div className="request-main">
                      <div className="request-avatar">
                        {r.name?.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3><strong>{r.name}</strong></h3>
                        <p className="request-meta">
                          {r.email} · Club: <strong>{r.clubName}</strong>
                        </p>
                        <p className="request-reason">
                          "{r.reason}"
                        </p>
                        <span className={`status-pill ${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>

                    {r.status === 'PENDING' && (
                      <div className="request-actions">
                        <button
                          disabled={busy}
                          className="btn-approve"
                          onClick={() => review(r, 'APPROVE')}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          disabled={busy}
                          className="btn-reject"
                          onClick={() => review(r, 'REJECT')}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* All Campus Events (Admin can inspect any event's registrations) */}
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2><strong>All Published Events</strong></h2>
                <p>Monitor campus activities and inspect registered student lists.</p>
              </div>
            </div>

            {events.length ? (
              <div className="event-grid">
                {events.map(e => (
                  <EventCard
                    key={e._id}
                    event={e}
                    now={now}
                    onOpen={setSelectedEvent}
                    secondary={ev => (
                      <div className="footer-actions">
                        {needsRegistration(ev) && (
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setViewRegsEvent(ev)}
                          >
                            <ClipboardList size={13} /> <strong>Registrations</strong>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-danger-text"
                          disabled={busy}
                          onClick={() => askDeleteEvent(ev)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">No events published yet.</div>
            )}
          </section>

          {/* User Governance */}
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2><strong>User Account Management</strong></h2>
                <p>Manage registered student and club organizer credentials.</p>
              </div>
            </div>

            {managedUsers.length === 0 ? (
              <div className="empty-state">No student or organizer accounts found.</div>
            ) : (
              <div className="request-list">
                {managedUsers.map(account => (
                  <article className="request-card" key={account._id}>
                    <div className="request-main">
                      <div className="request-avatar">
                        {account.name?.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3><strong>{account.name}</strong></h3>
                        <p className="request-meta">
                          {account.email} · Role: <strong>{account.role}</strong>
                        </p>
                        {account.role === 'ORGANIZER' && account.clubName && (
                          <p className="request-meta">Club: <strong>{account.clubName}</strong></p>
                        )}
                        <span className={`status-pill ${account.status === 'ACTIVE' ? 'published' : 'muted'}`}>
                          {account.status}
                        </span>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        type="button"
                        className="btn-reject"
                        disabled={busy}
                        onClick={() => askDeleteUser(account)}
                      >
                        Delete Account
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </>}

        {/* =========================================
            ORGANIZER DASHBOARD VIEW
            ========================================= */}
        {role === 'ORGANIZER' && <>

          <section className="hero-banner">
            <div>
              <span className="hero-eyebrow">
                CLUB & SOCIETY EVENT PLATFORM
              </span>
              <h2 className="hero-title">
                <strong>Host your next campus event</strong>
              </h2>
              <p className="hero-desc">
                Create events with in-app registration forms to collect custom student details (roll no, branch, etc.) without external Google Forms.
              </p>
            </div>

            <button
              className="btn-hero-action"
              onClick={() => (showForm ? closeForm() : setShowForm(true))}
            >
              <Plus size={18} />
              <strong>{showForm ? 'Close Form' : 'Publish New Event'}</strong>
            </button>
          </section>

          {/* Event Creation & Custom Registration Form Builder */}
          {showForm && (
            <section className="form-panel">
              <div className="form-panel-header">
                <h2><strong>{editingId ? 'Edit Event Details' : 'Publish New Campus Event'}</strong></h2>
                <p>Configure event scheduling, capacity, and custom registration fields.</p>
              </div>

              <form className="event-form" onSubmit={publish}>
                <label className="wide-field">
                  <span><strong>Event Title *</strong></span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateForm}
                    required
                    maxLength={140}
                    placeholder="e.g. Annual Hackathon 2026 / Robotics Workshop"
                  />
                </label>

                <label>
                  <span><strong>Category *</strong></span>
                  <select name="category" value={form.category} onChange={updateForm}>
                    <option>Workshop</option>
                    <option>Technical</option>
                    <option>Cultural</option>
                    <option>Sports</option>
                    <option>Talk</option>
                    <option>Competition</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  <span><strong>Venue *</strong></span>
                  <input
                    name="venue"
                    value={form.venue}
                    onChange={updateForm}
                    required
                    placeholder="e.g. CC3 Auditorium / Open Air Theatre"
                  />
                </label>

                <label className="wide-field">
                  <span><strong>Event Description *</strong></span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    required
                    rows={5}
                    placeholder="Provide details about schedule, speakers, requirements, and takeaways..."
                    maxLength={20000}
                  />
                </label>

                <label>
                  <span><strong>Attendee Capacity *</strong></span>
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    max={100000}
                    value={form.capacity}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span><strong>Event Starts At *</strong></span>
                  <input
                    name="startsAt"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span><strong>Event Ends At *</strong></span>
                  <input
                    name="endsAt"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={updateForm}
                    required
                  />
                </label>

                {/* Registration Switch */}
                <div className="wide-field reg-toggle-box">
                  <label className="switch-label">
                    <input
                      name="requiresRegistration"
                      type="checkbox"
                      checked={form.requiresRegistration}
                      onChange={updateForm}
                    />
                    <div>
                      <strong>Enable Student Registration for this Event</strong>
                      <p>
                        When enabled, students must fill your custom registration form before attending. Uncheck for walk-in events (e.g. concerts, screenings).
                      </p>
                    </div>
                  </label>
                </div>

                {/* Custom Form Builder */}
                {form.requiresRegistration && (
                  <div className="wide-field">
                    <FormFieldBuilder
                      fields={form.registrationFields}
                      onChange={fields => setForm(prev => ({ ...prev, registrationFields: fields }))}
                    />
                  </div>
                )}

                {/* Registration Window */}
                {form.requiresRegistration && (
                  <>
                    <label>
                      <span>Registration Opens At (Optional)</span>
                      <input
                        name="registrationOpensAt"
                        type="datetime-local"
                        value={form.registrationOpensAt}
                        onChange={updateForm}
                      />
                      <small>Leave empty to open registrations immediately.</small>
                    </label>

                    <label>
                      <span>Registration Deadline (Optional)</span>
                      <input
                        name="registrationDeadline"
                        type="datetime-local"
                        value={form.registrationDeadline}
                        onChange={updateForm}
                      />
                      <small>When less than 1 hour remains, an urgent red ticking clock will alert students.</small>
                    </label>
                  </>
                )}

                <div className="wide-field form-submit-row">
                  <button type="button" className="btn-secondary" onClick={closeForm}>
                    Cancel
                  </button>
                  <button className="btn-primary" disabled={busy}>
                    {busy ? 'Saving Event...' : editingId ? 'Save Changes' : 'Publish Event'}
                    <Check size={16} />
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Active Events Hosted by this Organizer */}
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2><strong>Your Active Events</strong></h2>
                <p>Manage your events, view complete/incomplete registrations, and update schedules.</p>
              </div>
            </div>

            {events.filter(e => e.status !== 'CANCELLED').length ? (
              <div className="event-grid">
                {events.filter(e => e.status !== 'CANCELLED').map(e => (
                  <EventCard
                    key={e._id}
                    event={e}
                    now={now}
                    onOpen={setSelectedEvent}
                    secondary={ev => (
                      <div className="footer-actions">
                        {needsRegistration(ev) && (
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setViewRegsEvent(ev)}
                            title="Inspect complete and incomplete registrations"
                          >
                            <ClipboardList size={13} /> <strong>Registrations</strong>
                          </button>
                        )}
                      </div>
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                You have not published any events yet. Click "Publish New Event" to start!
              </div>
            )}
          </section>

          {/* Cancelled Events */}
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2><strong>Cancelled Events</strong></h2>
                <p>Archived events that are hidden from the student discovery feed.</p>
              </div>
            </div>

            {events.filter(e => e.status === 'CANCELLED').length ? (
              <div className="event-grid">
                {events.filter(e => e.status === 'CANCELLED').map(e => (
                  <EventCard key={e._id} event={e} now={now} onOpen={setSelectedEvent} />
                ))}
              </div>
            ) : (
              <div className="empty-state">No cancelled events.</div>
            )}
          </section>

        </>}

        {/* =========================================
            STUDENT DASHBOARD VIEW
            ========================================= */}
        {role === 'STUDENT' && <>

          <section className="hero-banner">
            <div>
              <span className="hero-eyebrow">
                IIIT ALLAHABAD · STUDENT ACTIVITIES
              </span>
              <h2 className="hero-title">
                <strong>Discover & Register for Campus Events</strong>
              </h2>
              <p className="hero-desc">
                Browse workshops, competitions, talks, and cultural festivals organized by official campus societies.
              </p>
            </div>

            <div className="hero-badge-ticket">
              <Ticket size={24} />
              <div>
                <b className="ticket-count">{events.length}</b>
                <span className="ticket-label">Events Live</span>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2><strong>Campus Events Feed</strong></h2>
                <p>Select an event to view full details, complete registration, or resume a draft.</p>
              </div>
            </div>

            {/* Filter Navigation Tabs */}
            <div className="event-tabs-nav" role="tablist">
              {[
                ['CURRENT', 'Open / Live', tabCounts.CURRENT],
                ['UPCOMING', 'Upcoming', tabCounts.UPCOMING],
                ['PAST', 'Past Events', tabCounts.PAST],
                ['MY_REGISTRATIONS', 'My Registrations', tabCounts.MY_REGISTRATIONS]
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  className={`tab-btn ${tab === key ? 'active' : ''}`}
                  onClick={() => setTab(key)}
                >
                  <strong>{label}</strong>
                  <span className="tab-pill">{count}</span>
                </button>
              ))}
            </div>

            <p className="tab-help-text">
              {{
                CURRENT: 'Events open for registration right now, or live events with open attendance.',
                UPCOMING: 'Events where registration has not yet opened or start dates are in the future.',
                PAST: 'Concluded events or events whose registration deadline has passed.',
                MY_REGISTRATIONS: 'Events you have registered for, including incomplete drafts awaiting your submission.'
              }[tab]}
            </p>

            {/* Search & Category Filter Bar */}
            <div className="event-search-bar">
              <div className="search-input-wrap">
                <Search size={16} />
                <input
                  type="search"
                  value={eventSearch}
                  onChange={e => setEventSearch(e.target.value)}
                  placeholder="Search by event title, organizer club, venue..."
                  aria-label="Search campus events"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                aria-label="Filter events by category"
                className="category-select"
              >
                <option value="ALL">All Categories</option>
                {[...new Set(events.map(event => event.category))].sort().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <span className="results-count">
                <strong>{tabEvents.length}</strong> event{tabEvents.length === 1 ? '' : 's'} displayed
              </span>
            </div>

            {/* Grid of Event Cards */}
            {tabEvents.length ? (
              <div className="event-grid">
                {tabEvents.map(e => (
                  <EventCard
                    key={e._id}
                    event={e}
                    now={now}
                    onOpen={setSelectedEvent}
                    onRegister={register}
                    regStatus={regStatuses[e._id]}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">{emptyText}</div>
            )}
          </section>

        </>}

      </main>

      {/* MODALS */}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          now={now}
          onClose={() => setSelectedEvent(null)}
          onRegister={role === 'STUDENT' ? register : null}
          regStatus={regStatuses[selectedEvent._id]}
          actions={
            role === 'ORGANIZER' && selectedEvent.status === 'PUBLISHED' ? (
              <>
                <button type="button" className="btn-secondary" onClick={() => startEdit(selectedEvent)}>
                  <Pencil size={14} /> <strong>Edit Event</strong>
                </button>
                {needsRegistration(selectedEvent) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setSelectedEvent(null); setViewRegsEvent(selectedEvent); }}
                  >
                    <ClipboardList size={14} /> <strong>View Registrations</strong>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => cancelEvent(selectedEvent)}
                >
                  <X size={14} /> Cancel Event
                </button>
              </>
            ) : role === 'ADMIN' ? (
              needsRegistration(selectedEvent) ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setSelectedEvent(null); setViewRegsEvent(selectedEvent); }}
                >
                  <ClipboardList size={14} /> <strong>Inspect Registrations</strong>
                </button>
              ) : null
            ) : null
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* In-App Registration Form Modal */}
      {regFormEvent && (
        <RegistrationFormModal
          event={regFormEvent}
          now={now}
          existingData={regFormData[regFormEvent._id] || {}}
          onClose={() => setRegFormEvent(null)}
          onSubmit={submitRegistration}
          busy={busy}
        />
      )}

      {/* Registrations List Viewer Modal (Complete & Incomplete Students) */}
      {viewRegsEvent && (
        <RegistrationsModal
          event={viewRegsEvent}
          onClose={() => setViewRegsEvent(null)}
        />
      )}
    </div>
  );
}
