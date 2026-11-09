import test from 'node:test';
import assert from 'node:assert/strict';
import { PlatformService } from '../src/services/PlatformService.js';
import { AuthService } from '../src/services/AuthService.js';
import { DomainEventBus } from '../src/domain/events/DomainEventBus.js';
import { registerEventHandlers } from '../src/services/eventHandlers.js';
import { DomainError } from '../src/domain/errors/DomainError.js';
import { FakeUsers, FakeRequests, FakeEvents, FakeRegistrations } from './fakes.js';

const day = 86400000;
const iso = d => new Date(Date.now() + d * day).toISOString();
const hasher = { hash: async p => `h:${p}`, compare: async (p, h) => h === `h:${p}` };
const tokens = { sign: (payload) => `tok:${payload.id}:${payload.role}` };

async function setup() {
  const users = new FakeUsers(), requests = new FakeRequests(), events = new FakeEvents(), registrations = new FakeRegistrations();
  const bus = new DomainEventBus();
  registerEventHandlers(bus, { registrations, log: () => {} });
  const platform = new PlatformService({ users, requests, events, registrations, bus, hasher });
  const auth = new AuthService({ users, hasher, tokens, config: () => ({ secret: 's', expiresIn: '1d' }) });
  const org = await users.create({ name: 'Org', email: 'org@iiita.ac.in', passwordHash: 'h:pw', role: 'ORGANIZER', status: 'ACTIVE', clubName: 'Robotics' });
  const org2 = await users.create({ name: 'Org2', email: 'org2@iiita.ac.in', passwordHash: 'h:pw', role: 'ORGANIZER', status: 'ACTIVE' });
  const stu = await users.create({ name: 'Stu', email: 'stu@iiita.ac.in', passwordHash: 'h:pw', role: 'STUDENT', status: 'ACTIVE' });
  const adm = await users.create({ name: 'Adm', email: 'adm@iiita.ac.in', passwordHash: 'h:pw', role: 'ADMIN', status: 'ACTIVE' });
  const as = u => ({ id: u._id, role: u.role, name: u.name, email: u.email });
  return { users, requests, events, registrations, platform, auth, org: as(org), org2: as(org2), stu: as(stu), adm: as(adm) };
}

const eventInput = (over = {}) => ({
  title: 'Workshop', description: 'd', category: 'Tech', venue: 'LHC', startsAt: iso(-1), endsAt: iso(2), capacity: 1,
  requiresRegistration: true, registrationFields: [{ label: 'Roll', type: 'text', fieldId: 'roll' }], ...over
});
const rejects = (p, status, code) => assert.rejects(p, e => e instanceof DomainError && e.statusCode === status && (!code || e.code === code));

test('auth: login success, wrong role, bad password; me() returns polymorphic summary', async () => {
  const { auth, org } = await setup();
  const r = await auth.login({ email: 'ORG@iiita.ac.in', password: 'pw', expectedRole: 'ORGANIZER' });
  assert.equal(r.token, `tok:${org.id}:ORGANIZER`);
  assert.match(r.user.workspaceSummary, /Robotics/);
  await rejects(auth.login({ email: 'org@iiita.ac.in', password: 'pw', expectedRole: 'STUDENT' }), 403, 'WRONG_ROLE');
  await rejects(auth.login({ email: 'org@iiita.ac.in', password: 'bad', expectedRole: 'ORGANIZER' }), 401);
  await rejects(auth.login({}), 400);
  assert.equal((await auth.currentUser(org.id)).role, 'ORGANIZER');
});

test('auth: student registration rules', async () => {
  const { auth } = await setup();
  await rejects(auth.registerStudent({ name: 'a', email: 'a@gmail.com', password: '12345678' }), 400);
  await auth.registerStudent({ name: 'a', email: 'a@iiita.ac.in', password: '12345678' });
  await rejects(auth.registerStudent({ name: 'a', email: 'a@iiita.ac.in', password: '12345678' }), 409, 'EMAIL_TAKEN');
});

test('organizer request -> admin approval creates ORGANIZER account', async () => {
  const { platform, users, adm } = await setup();
  const { requestId } = await platform.createOrganizerRequest({ name: 'N', email: 'new@iiita.ac.in', password: 'password1', clubName: 'Music', reason: 'r' });
  await rejects(platform.createOrganizerRequest({ name: 'N', email: 'new@iiita.ac.in', password: 'password1', clubName: 'Music', reason: 'r' }), 409);
  await platform.reviewOrganizerRequest(requestId, 'APPROVE', adm.id);
  const created = await users.findByEmail('new@iiita.ac.in');
  assert.equal(created.role, 'ORGANIZER'); assert.equal(created.clubName, 'Music');
  await rejects(platform.reviewOrganizerRequest(requestId, 'REJECT', adm.id), 409);
  await rejects(platform.reviewOrganizerRequest('bad', 'APPROVE', adm.id), 400);
});

test('events: only organizers publish; students/admins are refused by capability', async () => {
  const { platform, stu, adm, org } = await setup();
  await rejects(platform.createEvent(eventInput(), stu), 403);
  await rejects(platform.createEvent(eventInput(), adm), 403);
  const { event } = await platform.createEvent(eventInput(), org);
  assert.equal(event.clubName, 'Robotics');
  await rejects(platform.createEvent(eventInput({ title: '' }), org), 400);
});

test('events: edit own only; cancelled events cannot be edited', async () => {
  const { platform, org, org2 } = await setup();
  const { event } = await platform.createEvent(eventInput(), org);
  await rejects(platform.updateEvent(event._id, eventInput(), org2), 403);
  const updated = await platform.updateEvent(event._id, eventInput({ title: 'Renamed' }), org);
  assert.equal(updated.event.title, 'Renamed');
  await platform.cancelEvent(event._id, org);
  await rejects(platform.updateEvent(event._id, eventInput(), org), 409);
  await rejects(platform.cancelEvent(event._id, org), 409, 'EVENT_ALREADY_CANCELLED');
});

test('registration: complete, duplicate update, capacity, validation', async () => {
  const { platform, org, stu, users } = await setup();
  const { event } = await platform.createEvent(eventInput({ capacity: 1 }), org);
  const first = await platform.registerForEvent(event._id, stu, { roll: '123' });
  assert.equal(first.status, 'COMPLETE');
  const again = await platform.registerForEvent(event._id, stu, { roll: '124' });   // re-submit while full must still work
  assert.equal(again.status, 'COMPLETE'); assert.equal(again.formData.roll, '124');
  const s2 = await users.create({ name: 'S2', email: 's2@iiita.ac.in', passwordHash: 'x', role: 'STUDENT', status: 'ACTIVE' });
  await rejects(platform.registerForEvent(event._id, { id: s2._id, role: 'STUDENT', name: 'S2', email: s2.email }, { roll: '1' }), 409, 'EVENT_FULL');
  const draft = await platform.registerForEvent(event._id, { id: s2._id, role: 'STUDENT', name: 'S2', email: s2.email }, {}, true);
  assert.equal(draft.status, 'INCOMPLETE');
});

test('registration: organizers cannot register; window enforced; no-registration events refused', async () => {
  const { platform, org, stu } = await setup();
  const closed = (await platform.createEvent(eventInput({ registrationDeadline: iso(1), registrationOpensAt: iso(0.5), startsAt: iso(0.4) }), org)).event;
  await rejects(platform.registerForEvent(closed._id, stu, { roll: '1' }), 409, 'REGISTRATION_CLOSED');
  const open = (await platform.createEvent(eventInput(), org)).event;
  await rejects(platform.registerForEvent(open._id, org, { roll: '1' }), 403);
  const none = (await platform.createEvent(eventInput({ requiresRegistration: false, registrationFields: [] }), org)).event;
  await rejects(platform.registerForEvent(none._id, stu, {}), 400);
});

test('cancel event clears registrations via Observer; only owner/admin may view registrations', async () => {
  const { platform, org, org2, stu, adm, registrations } = await setup();
  const { event } = await platform.createEvent(eventInput({ capacity: 5 }), org);
  await platform.registerForEvent(event._id, stu, { roll: '1' });
  const view = await platform.eventRegistrations(event._id, org);
  assert.equal(view.summary.complete, 1);
  await platform.eventRegistrations(event._id, adm);
  await rejects(platform.eventRegistrations(event._id, org2), 403);
  await platform.cancelEvent(event._id, org);
  assert.equal(await registrations.countAll(), 0);
  assert.equal((await platform.listPublishedEvents()).length, 0);
});

test('admin: delete event needs exact title; delete users cascades; admin protected; stats', async () => {
  const { platform, org, stu, adm, users, events, registrations } = await setup();
  const { event } = await platform.createEvent(eventInput(), org);
  await platform.registerForEvent(event._id, stu, { roll: '1' });
  const stats = await platform.platformStats();
  assert.equal(stats.publishedEvents, 1); assert.equal(stats.eventPhases.CURRENT, 1);
  await rejects(platform.deleteEvent(event._id, org, 'Workshop'), 403);
  await rejects(platform.deleteEvent(event._id, adm, 'wrong'), 400);
  await platform.deleteEvent(event._id, adm, 'Workshop');
  assert.equal(events.rows.length, 0); assert.equal(registrations.rows.length, 0);
  await rejects(platform.deleteManagedUser(adm.id), 403);
  const e2 = (await platform.createEvent(eventInput(), org)).event;
  await platform.deleteManagedUser(org.id);
  assert.equal(events.rows.length, 0); assert.ok(!(await users.findById(org.id)));
  await platform.deleteManagedUser(stu.id);
  await rejects(platform.deleteManagedUser('nothex'), 400);
});
