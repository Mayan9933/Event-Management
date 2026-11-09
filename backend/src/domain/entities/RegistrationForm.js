import { RegistrationFieldFactory } from './RegistrationField.js';

/**
 * COMPOSITION: a RegistrationForm exclusively owns its RegistrationField objects.
 * The fields are created inside the form, are never shared, and cannot outlive it.
 * The form (in turn) is owned by exactly one CampusEvent.
 */
export class RegistrationForm {
  #fields;

  constructor(definitions = []) {
    const list = Array.isArray(definitions) ? definitions : [];
    this.#fields = Object.freeze(list.map((d, i) => RegistrationFieldFactory.create(d, i)));
  }

  get fields() { return this.#fields; }
  get size() { return this.#fields.length; }
  get isEmpty() { return this.#fields.length === 0; }

  /**
   * Validates a student's answers. Drafts skip type validation and may be incomplete.
   * @returns {{data: Object<string,string>, complete: boolean}}
   */
  process(formData, { isDraft = false } = {}) {
    const data = {};
    let complete = true;
    for (const field of this.#fields) {
      const value = String(formData?.[field.fieldId] ?? '').trim();
      if (field.required && !value) complete = false;
      if (value) {
        if (!isDraft) field.validateValue(value); // polymorphic call
        data[field.fieldId] = value;
      }
    }
    return { data, complete };
  }

  toPersistence() { return this.#fields.map(f => f.toPersistence()); }
}
