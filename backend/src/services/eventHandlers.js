import { DomainEvents } from '../domain/events/DomainEventBus.js';

/** Observers subscribed to the DomainEventBus. */
export function registerEventHandlers(bus, { registrations, log = console.log }) {
  // Cancelling an event clears its internal registrations (lifecycle ownership).
  bus.subscribe(DomainEvents.EVENT_CANCELLED, ({ eventId }) => registrations.deleteByEvent(eventId));

  // Lightweight audit trail.
  for (const name of Object.values(DomainEvents)) {
    bus.subscribe(name, payload => log(`[domain-event] ${name}`, JSON.stringify(payload)));
  }
}
