import { AccountFactory } from '../domain/factories/AccountFactory.js';
import { CampusEvent } from '../domain/entities/CampusEvent.js';
import { RegistrationForm } from '../domain/entities/RegistrationForm.js';
import { EventCatalog } from '../domain/aggregates/EventCatalog.js';
import { DomainEvents } from '../domain/events/DomainEventBus.js';
import { computePhase, requiresRegistration, withPhase } from '../domain/eventPhase.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../domain/errors/DomainError.js';

const isValidId = id => /^[a-f\d]{24}$/i.test(String(id));
const assertId = (id, label) => { if (!isValidId(id)) throw new ValidationError(`Invalid ${label} ID.`); };

/**
 * Application service: coordinates domain objects and repositories.
 * Single Responsibility: business rules live in the domain layer, persistence in repositories.
 * Dependency Inversion: only abstractions (repositories, event bus, hasher) are injected.
 */
export class PlatformService {
  #users; #requests; #events; #registrations; #bus; #hasher;

  constructor({ users, requests, events, registrations, bus, hasher }) {
    this.#users = users; this.#requests = requests; this.#events = events;
    this.#registrations = registrations; this.#bus = bus; this.#hasher = hasher;
  }

  // ---------------------------------------------------------------- ORGANIZER REQUESTS

  async createOrganizerRequest({ name, email, password, clubName, reason } = {}) {
    if (![name, email, password, clubName, reason].every(v => typeof v === 'string' && v.trim())) {
      throw new ValidationError('Please complete every field.');
    }
    if (password.length < 8) throw new ValidationError('Password must contain at least 8 characters.');
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@iiita.ac.in')) throw new ValidationError('Please use your IIITA institute email.');
    if (await this.#users.existsByEmail(normalizedEmail)) {
      throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
    }
    const passwordHash = await this.#hasher.hash(password, 12);
    try {
      const request = await this.#requests.create({
        name: name.trim(), email: normalizedEmail, passwordHash, clubName: clubName.trim(), reason: reason.trim()
      });
      return { message: 'Organizer request submitted. The Admin can now review it.', requestId: request._id };
    } catch (error) {
      if (error instanceof ConflictError) throw new ConflictError('A request for this email already exists.', 'REQUEST_EXISTS');
      throw error;
    }
  }

  listOrganizerRequests() { return this.#requests.listWithoutPassword(); }

  async reviewOrganizerRequest(requestId, decision, adminId) {
    assertId(requestId, 'request');
    if (!['APPROVE', 'REJECT'].includes(decision)) throw new ValidationError('Choose approve or reject.');

    const request = await this.#requests.findByIdWithPassword(requestId);
    if (!request) throw new NotFoundError('Organizer request not found.');
    if (request.status !== 'PENDING') throw new ConflictError('This request has already been reviewed.', 'ALREADY_REVIEWED');

    let status = 'REJECTED';
    if (decision === 'APPROVE') {
      if (!request.passwordHash) {
        throw new ValidationError('This request has no saved password. Ask the applicant to submit a new request.');
      }
      if (await this.#users.existsByEmail(request.email)) {
        throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
      }
      await this.#users.create({
        name: request.name, email: request.email, passwordHash: request.passwordHash,
        role: 'ORGANIZER', status: 'ACTIVE', clubName: request.clubName
      });
      status = 'APPROVED';
    }
    await this.#requests.update(requestId, { status, reviewedAt: new Date(), reviewedBy: adminId });
    return { message: decision === 'APPROVE' ? 'Organizer approved. They can now sign in.' : 'Organizer request rejected.' };
  }

  // ---------------------------------------------------------------- EVENTS

  async createEvent(input, auth) {
    const account = AccountFactory.create(auth);
    account.ensureActive();
    if (!account.canCreateEvents()) throw new ForbiddenError('Only an active Organizer can publish events.');

    const organizer = await this.#users.findById(auth.id, 'name clubName role status');
    if (!organizer || organizer.role !== 'ORGANIZER' || organizer.status !== 'ACTIVE') {
      throw new ForbiddenError('Active organizer account required.');
    }

    // CampusEvent owns input validation, private state and lifecycle rules.
    const entity = new CampusEvent({
      ...(input || {}), organizerId: auth.id, organizerName: organizer.name,
      clubName: organizer.clubName || 'IIITA Community'
    });
    const event = await this.#events.create(entity.toPersistence());
    await this.#bus.publish(DomainEvents.EVENT_PUBLISHED, { eventId: String(event._id), organizerId: auth.id });
    return { message: 'Event published. It is now visible to students.', event };
  }

  async listPublishedEvents() { return this.#withPhases(await this.#events.findPublished()); }
  async listOrganizerEvents(organizerId) { return this.#withPhases(await this.#events.findByOrganizer(organizerId)); }
  async listAllEvents() { return this.#withPhases(await this.#events.findAll()); }

  #withPhases(events) {
    const now = new Date();
    return events.map(e => withPhase(e, now));
  }

  async updateEvent(eventId, input, auth) {
    assertId(eventId, 'event');
    const event = await this.#events.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');

    const account = AccountFactory.create(auth);
    account.ensureActive();
    if (!(account.canCreateEvents() && account.owns(event.organizerId))) {
      throw new ForbiddenError('You can only edit your own events.');
    }
    if (event.status === 'CANCELLED') throw new ConflictError('Cancelled events cannot be edited.', 'EVENT_CANCELLED');

    const entity = CampusEvent.forEdit(event, input || {});
    const updated = await this.#events.update(eventId, entity.toPersistence());
    return { message: 'Event updated.', event: withPhase(updated) };
  }

  async cancelEvent(eventId, auth) {
    assertId(eventId, 'event');
    const event = await this.#events.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');

    const account = AccountFactory.create(auth);
    account.ensureActive();
    const entity = CampusEvent.fromDocument(event);
    if (!entity.isManagedBy(account)) throw new ForbiddenError('You can only manage your own events.');

    entity.cancel();                                   // domain rule + state transition
    await this.#events.setStatus(eventId, entity.status);
    await this.#bus.publish(DomainEvents.EVENT_CANCELLED, { eventId, cancelledBy: auth.id });

    return { message: 'Event cancelled. It is no longer visible to students and its internal registrations were cleared.' };
  }

  // ---------------------------------------------------------------- REGISTRATIONS

  async registerForEvent(eventId, auth, formData, isDraft = false) {
    assertId(eventId, 'event');
    const event = await this.#events.findById(eventId);
    if (!event || event.status !== 'PUBLISHED') throw new NotFoundError('This event is not available.');

    const account = AccountFactory.create(auth);
    account.ensureActive();
    if (!account.canRegisterForEvents()) throw new ForbiddenError('Only students can register for events.');

    if (!requiresRegistration(event)) throw new ValidationError('This event does not require registration.');
    const form = new RegistrationForm(event.registrationFields);   // composed form rebuilt from storage
    if (form.isEmpty && event.registrationUrl) {
      throw new ValidationError('This event uses external registration. Please use the registration link.');
    }
    // Enforce the registration window (opens / deadline) on the server, not only in the UI.
    if (computePhase(event) !== 'CURRENT') {
      throw new ConflictError('Registration is not open for this event.', 'REGISTRATION_CLOSED');
    }

    const existing = await this.#registrations.findOne(eventId, auth.id);
    const completeCount = await this.#registrations.countComplete(eventId);
    const takenByOthers = completeCount - (existing?.status === 'COMPLETE' ? 1 : 0);
    if (!isDraft && takenByOthers >= event.capacity) throw new ConflictError('This event is full.', 'EVENT_FULL');

    const { data, complete } = form.process(formData, { isDraft });
    const status = (!isDraft && complete) ? 'COMPLETE' : 'INCOMPLETE';
    const identity = { studentName: auth.name, studentEmail: auth.email };

    const saved = existing
      ? await this.#registrations.update(existing._id, { formData: data, status, ...identity })
      : await this.#registrations.create({ eventId, studentId: auth.id, ...identity, formData: data, status });

    await this.#bus.publish(DomainEvents.REGISTRATION_SAVED, { eventId, studentId: auth.id, status });
    return {
      message: status === 'COMPLETE'
        ? (existing ? 'Registration completed successfully.' : 'You are registered for this event!')
        : (existing
          ? 'Registration saved as incomplete. You can complete it anytime before registration closes.'
          : 'Registration progress saved as incomplete. Please complete all required fields.'),
      status: saved.status,
      formData: saved.formData
    };
  }

  async myRegistrations(studentId) {
    const regs = await this.#registrations.findByStudent(studentId);
    const events = await this.#events.findByIds(regs.map(r => r.eventId));
    const byId = new Map(events.map(e => [String(e._id), e]));
    const now = new Date();
    return regs.map(r => {
      const event = byId.get(String(r.eventId));
      return { ...r, event: event ? withPhase(event, now) : null };
    });
  }

  async eventRegistrations(eventId, auth) {
    assertId(eventId, 'event');
    const event = await this.#events.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');

    const account = AccountFactory.create(auth);
    if (!account.canManage(event.organizerId)) {
      throw new ForbiddenError('You can only view registrations for your own events.');
    }
    const registrations = await this.#registrations.findByEvent(eventId);
    const complete = registrations.filter(r => r.status === 'COMPLETE').length;
    return {
      event: { id: event._id, title: event.title, registrationFields: event.registrationFields || [] },
      registrations,
      summary: { total: registrations.length, complete, incomplete: registrations.length - complete }
    };
  }

  async studentRegistrationStatus(eventId, studentId) {
    assertId(eventId, 'event');
    const registration = await this.#registrations.findOne(eventId, studentId);
    if (!registration) return { registered: false, status: null, formData: {} };
    return { registered: true, status: registration.status, formData: registration.formData || {} };
  }

  // ---------------------------------------------------------------- ADMIN

  async platformStats() {
    const [students, organizers, publishedEvents, pendingOrganizerRequests, registrations, published] = await Promise.all([
      this.#users.countStudents(), this.#users.countActiveOrganizers(), this.#events.countPublished(),
      this.#requests.countPending(), this.#registrations.countAll(), this.#events.findPublished()
    ]);
    // Aggregation: the catalog groups events (it does not own them) to report phase counts.
    const catalog = EventCatalog.fromDocuments(published, { CampusEvent });
    return {
      students, organizers, publishedEvents, pendingOrganizerRequests, registrations,
      eventPhases: catalog.countByPhase()
    };
  }

  listManagedUsers() { return this.#users.listManaged(); }

  async deleteManagedUser(userId) {
    assertId(userId, 'user');
    const user = await this.#users.findById(userId, 'role name email');
    if (!user) throw new NotFoundError('User not found.');
    if (AccountFactory.create(user).canManagePlatform()) throw new ForbiddenError('The main Admin account cannot be deleted.');
    if (!['STUDENT', 'ORGANIZER'].includes(user.role)) throw new ForbiddenError('This account cannot be deleted here.');

    if (user.role === 'ORGANIZER') {
      const eventIds = await this.#events.idsByOrganizer(user._id);
      await Promise.all([
        this.#registrations.deleteByEvents(eventIds),
        this.#events.deleteByOrganizer(user._id),
        this.#requests.deleteByEmail(user.email)
      ]);
    } else {
      await this.#registrations.deleteByStudent(user._id);
    }
    await this.#users.deleteById(user._id);
    return { message: `${user.role.toLowerCase()} account and its related platform data were deleted.` };
  }

  async deleteEvent(eventId, auth, confirmTitle) {
    assertId(eventId, 'event');
    const event = await this.#events.findById(eventId);
    if (!event) throw new NotFoundError('Event not found.');

    // Permanent delete is an Admin-only capability. Organizers cancel or edit instead.
    if (!AccountFactory.create(auth).canManagePlatform()) {
      throw new ForbiddenError('Only the Admin can permanently delete events.');
    }
    if (typeof confirmTitle !== 'string' || confirmTitle.trim() !== event.title.trim()) {
      throw new ValidationError('Confirmation failed. Type the exact event title to delete it.');
    }
    await this.#registrations.deleteByEvent(event._id);
    await this.#events.deleteById(event._id);
    return { message: 'Event and its internal registrations were permanently deleted.' };
  }
}
