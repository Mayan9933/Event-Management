/**
 * Observer pattern: services publish domain events; independent handlers subscribe.
 * The publisher never knows who reacts (loose coupling, Open/Closed Principle).
 */
export const DomainEvents = Object.freeze({
  EVENT_PUBLISHED: 'EVENT_PUBLISHED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  REGISTRATION_SAVED: 'REGISTRATION_SAVED'
});

export class DomainEventBus {
  #handlers = new Map();

  subscribe(eventName, handler) {
    const list = this.#handlers.get(eventName) ?? [];
    this.#handlers.set(eventName, [...list, handler]);
    return () => this.#handlers.set(eventName, (this.#handlers.get(eventName) ?? []).filter(h => h !== handler));
  }

  async publish(eventName, payload = {}) {
    for (const handler of this.#handlers.get(eventName) ?? []) await handler(payload);
  }
}
