/**
 * Single source of truth for which tab an event belongs in.
 *
 *  PAST     - registration deadline gone (event may still be running) OR event has ended
 *  CURRENT  - registration is open, OR (no registration needed) event is live right now
 *  UPCOMING - registration has not opened yet, OR (no registration needed) event has not started
 *
 * Registration events: opens at registrationOpensAt (or immediately), closes at
 * registrationDeadline (or when the event ends if none was given).
 */
export function requiresRegistration(event) {
  if (typeof event.requiresRegistration === 'boolean') return event.requiresRegistration;
  return Boolean(event.registrationUrl); // events created before this feature
}

export function computePhase(event, now = new Date()) {
  const t = now.getTime();
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();

  if (t >= end) return 'PAST';

  if (!requiresRegistration(event)) {
    return t < start ? 'UPCOMING' : 'CURRENT';
  }

  const opens = event.registrationOpensAt ? new Date(event.registrationOpensAt).getTime() : null;
  const deadline = event.registrationDeadline ? new Date(event.registrationDeadline).getTime() : end;

  if (t >= deadline) return 'PAST';
  if (opens !== null && t < opens) return 'UPCOMING';
  return 'CURRENT';
}

export const withPhase = (event, now = new Date()) => ({
  ...event,
  requiresRegistration: requiresRegistration(event),
  phase: computePhase(event, now)
});
