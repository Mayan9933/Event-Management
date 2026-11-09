/**
 * AGGREGATION (hollow diamond): the catalog groups CampusEvent objects but does not own them.
 * Events are created, edited and deleted independently and continue to exist if the catalog is
 * discarded or rebuilt. Contrast with CampusEvent -> RegistrationForm, which is composition.
 */
export class EventCatalog {
  #events = [];

  constructor(events = []) { events.forEach(e => this.add(e)); }

  /** Builds a catalog from persisted records, skipping records that fail domain validation. */
  static fromDocuments(docs, { CampusEvent, onSkip = () => {} }) {
    const catalog = new EventCatalog();
    for (const doc of docs) {
      try { catalog.add(CampusEvent.fromDocument(doc)); } catch (error) { onSkip(doc, error); }
    }
    return catalog;
  }

  add(event) { this.#events.push(event); return this; }
  remove(event) { this.#events = this.#events.filter(e => e !== event); return this; }
  get size() { return this.#events.length; }
  [Symbol.iterator]() { return this.#events[Symbol.iterator](); }

  byPhase(phase, now = new Date()) { return this.#events.filter(e => e.getPhase(now) === phase); }

  countByPhase(now = new Date()) {
    const counts = { CURRENT: 0, UPCOMING: 0, PAST: 0 };
    for (const event of this.#events) counts[event.getPhase(now)] += 1;
    return counts;
  }
}
