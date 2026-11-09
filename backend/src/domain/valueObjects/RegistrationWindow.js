import { ValidationError } from '../errors/DomainError.js';

/**
 * Immutable value object describing when registration is open.
 * Composition: owned by one CampusEvent and validated against that event's end time.
 */
export class RegistrationWindow {
  #opensAt;
  #deadline;

  constructor(opensAt = null, deadline = null) {
    this.#opensAt = opensAt;
    this.#deadline = deadline;
    Object.freeze(this);
  }

  static create(rawOpensAt, rawDeadline, eventEnd) {
    const parse = (value, label) => {
      if (!String(value ?? '').trim()) return null;
      const d = new Date(value);
      if (!Number.isFinite(d.getTime())) throw new ValidationError(`${label} is not a valid date.`);
      return d;
    };
    const opensAt = parse(rawOpensAt, 'Registration opening time');
    const deadline = parse(rawDeadline, 'Registration deadline');
    if (deadline && deadline > eventEnd) {
      throw new ValidationError('Registration deadline cannot be after the event ends.');
    }
    if (opensAt && opensAt >= (deadline || eventEnd)) {
      throw new ValidationError('Registration must open before it closes.');
    }
    return new RegistrationWindow(opensAt, deadline);
  }

  get opensAt() { return this.#opensAt; }
  get deadline() { return this.#deadline; }

  toPersistence() {
    return { registrationOpensAt: this.#opensAt, registrationDeadline: this.#deadline };
  }
}
