import { ConflictError, ValidationError } from '../errors/DomainError.js';
import { RegistrationForm } from './RegistrationForm.js';
import { RegistrationWindow } from '../valueObjects/RegistrationWindow.js';
import { computePhase } from '../eventPhase.js';

/**
 * Event aggregate root. It owns event validation and lifecycle rules.
 *
 * ASSOCIATION  : organizerId links the event to its Organizer (independent lifetimes).
 * COMPOSITION  : the event creates and exclusively owns its RegistrationForm
 *                (which owns the RegistrationFields) and its RegistrationWindow.
 * AGGREGATION  : an EventCatalog groups CampusEvent objects without owning them.
 */
export class CampusEvent {
  #id;
  #title;
  #description;
  #category;
  #venue;
  #startsAt;
  #endsAt;
  #capacity;
  #requiresRegistration;
  #form;     // composed RegistrationForm
  #window;   // composed RegistrationWindow
  #registrationUrl;
  #organizerId;
  #organizerName;
  #clubName;
  #status;

  constructor(data) {
    const required = ['title', 'description', 'category', 'venue', 'startsAt', 'endsAt'];
    if (!data || required.some(key => !String(data[key] ?? '').trim())) {
      throw new ValidationError('Complete all event details.');
    }

    // Registration is mandatory only when the organizer says the event needs it.
    const needsRegistration = data.requiresRegistration === undefined
      ? (Array.isArray(data.registrationFields) && data.registrationFields.length > 0) || Boolean(String(data.registrationUrl ?? '').trim())
      : data.requiresRegistration === true || data.requiresRegistration === 'true';

    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      throw new ValidationError('End time must be after start time.');
    }

    const capacity = Number(data.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
      throw new ValidationError('Capacity must be a positive whole number.');
    }

    let form = new RegistrationForm([]);
    let registrationUrl = '';
    let window = new RegistrationWindow();

    if (needsRegistration) {
      const hasFields = Array.isArray(data.registrationFields) && data.registrationFields.length > 0;
      const hasUrl = Boolean(String(data.registrationUrl ?? '').trim());
      if (!hasFields && !hasUrl) {
        throw new ValidationError('Please create registration form fields, or mark this event as not requiring registration.');
      }
      if (hasFields) form = new RegistrationForm(data.registrationFields);
      if (hasUrl) {
        try {
          const url = new URL(data.registrationUrl.trim());
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
          registrationUrl = url.toString();
        } catch {
          throw new ValidationError('Please enter a valid HTTP or HTTPS registration link.');
        }
      }
      window = RegistrationWindow.create(data.registrationOpensAt, data.registrationDeadline, end);
    }

    this.#id = String(data.id ?? data._id ?? '');
    this.#title = data.title.trim();
    this.#description = data.description.trim();
    this.#category = data.category.trim();
    this.#venue = data.venue.trim();
    this.#startsAt = start;
    this.#endsAt = end;
    this.#capacity = capacity;
    this.#requiresRegistration = needsRegistration;
    this.#form = form;
    this.#window = window;
    this.#registrationUrl = registrationUrl;
    this.#organizerId = String(data.organizerId);
    this.#organizerName = data.organizerName;
    this.#clubName = data.clubName || 'IIITA Community';
    this.#status = data.status || 'PUBLISHED';
  }

  get id() { return this.#id; }
  get title() { return this.#title; }
  get status() { return this.#status; }
  get capacity() { return this.#capacity; }
  get startsAt() { return this.#startsAt; }
  get endsAt() { return this.#endsAt; }
  get organizerId() { return this.#organizerId; }
  get requiresRegistration() { return this.#requiresRegistration; }
  get registrationForm() { return this.#form; }
  get registrationWindow() { return this.#window; }

  /** Rebuilds an entity from a persisted record (Mongo lean document or plain object). */
  static fromDocument(doc) {
    return new CampusEvent({ ...doc, id: doc._id ?? doc.id, organizerId: String(doc.organizerId) });
  }

  /** Re-validated data for an edit; status is never changed by editing. */
  static forEdit(existing, input) {
    return new CampusEvent({
      ...input,
      organizerId: String(existing.organizerId),
      organizerName: existing.organizerName,
      clubName: existing.clubName,
      status: existing.status
    });
  }

  cancel() {
    if (this.#status === 'CANCELLED') {
      throw new ConflictError('This event is already cancelled.', 'EVENT_ALREADY_CANCELLED');
    }
    this.#status = 'CANCELLED';
  }

  isFull(completedRegistrations) { return completedRegistrations >= this.#capacity; }

  /** Current / Upcoming / Past, computed by the single source of truth in eventPhase.js. */
  getPhase(now = new Date()) { return computePhase(this.toPersistence(), now); }

  /** Delegates to the account's own capability (polymorphism) instead of checking role strings. */
  isManagedBy(account) { return account.canManage(this.#organizerId); }

  toPersistence() {
    return {
      title: this.#title,
      description: this.#description,
      category: this.#category,
      venue: this.#venue,
      startsAt: this.#startsAt,
      endsAt: this.#endsAt,
      capacity: this.#capacity,
      requiresRegistration: this.#requiresRegistration,
      registrationFields: this.#form.toPersistence(),
      registrationUrl: this.#registrationUrl,
      ...this.#window.toPersistence(),
      organizerId: this.#organizerId,
      organizerName: this.#organizerName,
      clubName: this.#clubName,
      status: this.#status
    };
  }
}
