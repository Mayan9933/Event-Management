import { DomainError, ForbiddenError, ValidationError } from '../errors/DomainError.js';

/**
 * Abstract account in the IIITA Connect domain.
 * Encapsulation: identity and role are held in private fields.
 * Abstraction: the base class cannot be instantiated and declares role behaviour
 * (getWorkspaceSummary) that every subclass must implement.
 * Polymorphism: services ask the object for its capabilities instead of switching on role strings.
 */
export class Account {
  #id;
  #name;
  #email;
  #role;
  #status;

  constructor({ id, _id, name, email, role, status = 'ACTIVE' }) {
    if (new.target === Account) {
      throw new DomainError('Account is abstract; create a role-specific account.');
    }
    if (!name || !email || !role) {
      throw new ValidationError('Account name, email and role are required.');
    }
    this.#id = String(id ?? _id ?? '');
    this.#name = name.trim();
    this.#email = email.trim().toLowerCase();
    this.#role = role;
    this.#status = status;
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get email() { return this.#email; }
  get role() { return this.#role; }
  get status() { return this.#status; }
  get isActive() { return this.#status === 'ACTIVE'; }

  ensureActive() {
    if (!this.isActive) throw new ForbiddenError('This account is not active.', 'ACCOUNT_INACTIVE');
  }

  /** Abstract operation: each role implements its own summary (polymorphism). */
  getWorkspaceSummary() {
    throw new DomainError('Role workspace summary must be implemented by a subclass.');
  }

  // Capability hooks (Template Method style): subclasses override only what differs.
  canCreateEvents() { return false; }
  canManagePlatform() { return false; }
  canRegisterForEvents() { return false; }

  /** True when this account is the owner identified by ownerId. */
  owns(ownerId) { return this.#id !== '' && this.#id === String(ownerId); }

  /** Admin manages everything; an active Organizer manages only what they own. */
  canManage(ownerId) {
    return this.canManagePlatform() || (this.canCreateEvents() && this.owns(ownerId));
  }

  /** Safe, serialisable view of the account (no private state leaks). */
  toPublic() {
    return {
      id: this.#id, name: this.#name, email: this.#email, role: this.#role,
      status: this.#status, workspaceSummary: this.getWorkspaceSummary()
    };
  }
}

export class Student extends Account {
  constructor(data) { super({ ...data, role: 'STUDENT' }); }
  getWorkspaceSummary() { return 'Discover campus events and manage your participation.'; }
  canRegisterForEvents() { return this.isActive; }
}

export class Organizer extends Account {
  #clubName;
  constructor(data) {
    super({ ...data, role: 'ORGANIZER' });
    this.#clubName = (data.clubName || 'IIITA Community').trim();
  }
  get clubName() { return this.#clubName; }
  getWorkspaceSummary() { return `Manage events for ${this.#clubName}.`; }
  canCreateEvents() { return this.isActive; }
  toPublic() { return { ...super.toPublic(), clubName: this.#clubName }; }
}

export class Admin extends Account {
  constructor(data) { super({ ...data, role: 'ADMIN' }); }
  getWorkspaceSummary() { return 'Oversee users, organizer approvals and campus events.'; }
  canManagePlatform() { return this.isActive; }
}
