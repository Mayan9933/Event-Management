import { DomainError, ValidationError } from '../errors/DomainError.js';

/**
 * Abstract form field owned by a RegistrationForm (composition).
 * Second inheritance hierarchy: every concrete field type overrides `type` and
 * `validateValue` (polymorphism) so the form never needs an if/else on field types.
 */
export class RegistrationField {
  #fieldId;
  #label;
  #required;
  #order;

  constructor({ fieldId, label, required, order } = {}, index = 0) {
    if (new.target === RegistrationField) {
      throw new DomainError('RegistrationField is abstract; use a concrete field type.');
    }
    const cleanLabel = String(label ?? '').trim();
    if (!cleanLabel) throw new ValidationError(`Registration field #${index + 1} must have a label.`);
    this.#fieldId = fieldId || `field_${index}`;
    this.#label = cleanLabel;
    this.#required = required !== false;
    this.#order = typeof order === 'number' ? order : index;
  }

  get fieldId() { return this.#fieldId; }
  get label() { return this.#label; }
  get required() { return this.#required; }
  get order() { return this.#order; }

  /** Abstract: the persisted type name. */
  get type() { throw new DomainError('Field type must be implemented by a subclass.'); }

  /** Template method hook: throw ValidationError if a non-empty value is invalid. */
  validateValue(_value) { /* any text is acceptable by default */ }

  extraPersistence() { return { options: [] }; }

  toPersistence() {
    return {
      fieldId: this.#fieldId, label: this.#label, type: this.type,
      required: this.#required, order: this.#order, ...this.extraPersistence()
    };
  }
}

export class TextField extends RegistrationField {
  get type() { return 'text'; }
}

export class TextAreaField extends RegistrationField {
  get type() { return 'textarea'; }
}

export class EmailField extends RegistrationField {
  get type() { return 'email'; }
  validateValue(value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new ValidationError(`"${this.label}" must be a valid email address.`);
    }
  }
}

export class NumberField extends RegistrationField {
  get type() { return 'number'; }
  validateValue(value) {
    if (Number.isNaN(Number(value))) {
      throw new ValidationError(`"${this.label}" must be a valid number.`);
    }
  }
}

export class SelectField extends RegistrationField {
  #options;
  constructor(def = {}, index = 0) {
    super(def, index);
    this.#options = (def.options || []).map(o => String(o).trim()).filter(Boolean);
  }
  get type() { return 'select'; }
  get options() { return [...this.#options]; }
  validateValue(value) {
    if (this.#options.length > 0 && !this.#options.includes(value)) {
      throw new ValidationError(`"${this.label}" must be one of: ${this.#options.join(', ')}.`);
    }
  }
  extraPersistence() { return { options: [...this.#options] }; }
}

/** Factory pattern for the field hierarchy. Unknown types fall back to a plain text field. */
export class RegistrationFieldFactory {
  static #types = new Map([
    ['text', TextField], ['textarea', TextAreaField], ['email', EmailField],
    ['number', NumberField], ['select', SelectField]
  ]);

  static register(type, fieldClass) { RegistrationFieldFactory.#types.set(type, fieldClass); }

  static create(definition, index = 0) {
    const def = definition ?? {};
    const FieldClass = RegistrationFieldFactory.#types.get(def.type) ?? TextField;
    return new FieldClass(def, index);
  }
}
