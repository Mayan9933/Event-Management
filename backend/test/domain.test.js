import test from 'node:test';
import assert from 'node:assert/strict';
import { Account, Student, Organizer, Admin } from '../src/domain/entities/Account.js';
import { AccountFactory } from '../src/domain/factories/AccountFactory.js';
import { CampusEvent } from '../src/domain/entities/CampusEvent.js';
import {
  RegistrationField, TextField, EmailField, NumberField, SelectField
} from '../src/domain/entities/RegistrationField.js';
import { RegistrationForm } from '../src/domain/entities/RegistrationForm.js';
import { RegistrationWindow } from '../src/domain/valueObjects/RegistrationWindow.js';
import { EventCatalog } from '../src/domain/aggregates/EventCatalog.js';
import { DomainEventBus } from '../src/domain/events/DomainEventBus.js';
import { DomainError, ValidationError, ConflictError, NotFoundError } from '../src/domain/errors/DomainError.js';
import { UserRepository } from '../src/repositories/contracts.js';

const day = 86400000;
const future = (d, h = 0) => new Date(Date.now() + d * day + h * 3600000).toISOString();
const base = (over = {}) => ({
  title: 'Hack Night', description: 'Build things', category: 'Tech', venue: 'LHC',
  startsAt: future(2), endsAt: future(3), capacity: 2, organizerId: 'o1', organizerName: 'Org', requiresRegistration: false, ...over
});
const fields = [{ label: 'Roll no', type: 'text' }, { label: 'Mail', type: 'email' }, { label: 'Year', type: 'select', options: ['1', '2'] }];

test('Classes/constructors: Account is abstract and validates input', () => {
  assert.throws(() => new Account({ name: 'x', email: 'x@y', role: 'STUDENT' }), DomainError);
  assert.throws(() => new Student({ name: '', email: 'a@b' }), ValidationError);
});

test('Encapsulation: state is private and not directly writable', () => {
  const s = new Student({ id: '1', name: ' Asha ', email: 'ASHA@iiita.ac.in' });
  assert.equal(s.name, 'Asha');
  assert.equal(s.email, 'asha@iiita.ac.in');
  assert.equal(s.role, 'STUDENT');
  assert.equal(Object.keys(s).length, 0);               // nothing public on the instance
  assert.throws(() => { 'use strict'; s.role = 'ADMIN'; }, TypeError); // getter only
});

test('Inheritance: subclasses are Accounts', () => {
  for (const [C, role] of [[Student, 'STUDENT'], [Organizer, 'ORGANIZER'], [Admin, 'ADMIN']]) {
    const a = new C({ id: '1', name: 'n', email: 'e@iiita.ac.in' });
    assert.ok(a instanceof Account); assert.equal(a.role, role);
  }
});

test('Polymorphism: same call, role-specific behaviour', () => {
  const accounts = ['STUDENT', 'ORGANIZER', 'ADMIN'].map(role => AccountFactory.create({ id: '1', name: 'n', email: 'e@iiita.ac.in', role, clubName: 'Robotics' }));
  assert.deepEqual(accounts.map(a => a.canCreateEvents()), [false, true, false]);
  assert.deepEqual(accounts.map(a => a.canManagePlatform()), [false, false, true]);
  assert.deepEqual(accounts.map(a => a.canRegisterForEvents()), [true, false, false]);
  assert.equal(new Set(accounts.map(a => a.getWorkspaceSummary())).size, 3);
  assert.match(accounts[1].getWorkspaceSummary(), /Robotics/);
});

test('Factory: creates correct type, rejects unknown role, is extensible (OCP)', () => {
  assert.ok(AccountFactory.create({ role: 'STUDENT', name: 'n', email: 'e@x' }) instanceof Student);
  assert.throws(() => AccountFactory.create({ role: 'ALIEN' }), e => e.code === 'UNKNOWN_ROLE');
  class Guest extends Account { constructor(d) { super({ ...d, role: 'GUEST' }); } getWorkspaceSummary() { return 'hi'; } }
  AccountFactory.register('GUEST', Guest);
  assert.ok(AccountFactory.create({ role: 'GUEST', name: 'g', email: 'g@x' }) instanceof Guest);
});

test('Access rules via capabilities (no role strings)', () => {
  const org = new Organizer({ id: 'o1', name: 'n', email: 'e@x' });
  const other = new Organizer({ id: 'o2', name: 'n', email: 'f@x' });
  const admin = new Admin({ id: 'a', name: 'n', email: 'g@x' });
  const ev = new CampusEvent(base());
  assert.ok(ev.isManagedBy(org)); assert.ok(!ev.isManagedBy(other)); assert.ok(ev.isManagedBy(admin));
  const blocked = new Organizer({ id: 'o1', name: 'n', email: 'e@x', status: 'BLOCKED' });
  assert.ok(!ev.isManagedBy(blocked));
  assert.throws(() => blocked.ensureActive(), e => e.statusCode === 403);
});

test('CampusEvent validation + lifecycle + exceptions', () => {
  assert.throws(() => new CampusEvent(base({ title: '' })), ValidationError);
  assert.throws(() => new CampusEvent(base({ endsAt: future(1) })), /End time/);
  assert.throws(() => new CampusEvent(base({ capacity: 0 })), /Capacity/);
  assert.throws(() => new CampusEvent(base({ requiresRegistration: true })), /registration form fields/);
  const ev = new CampusEvent(base());
  assert.equal(ev.status, 'PUBLISHED');
  ev.cancel();
  assert.equal(ev.status, 'CANCELLED');
  assert.throws(() => ev.cancel(), ConflictError);
  assert.ok(new CampusEvent(base({ capacity: 2 })).isFull(2));
});

test('Composition: event creates and owns its RegistrationForm, fields and window', () => {
  const ev = new CampusEvent(base({ requiresRegistration: true, registrationFields: fields, registrationDeadline: future(2, 12) }));
  assert.ok(ev.registrationForm instanceof RegistrationForm);
  assert.equal(ev.registrationForm.size, 3);
  assert.ok(ev.registrationWindow instanceof RegistrationWindow);
  const saved = ev.toPersistence();
  assert.equal(saved.registrationFields.length, 3);
  assert.ok(saved.registrationDeadline instanceof Date);
  assert.throws(() => { ev.registrationForm.fields.push(1); }, TypeError); // owned list is frozen
});

test('Field hierarchy: abstract base, polymorphic validation, factory fallback', () => {
  assert.throws(() => new RegistrationField({ label: 'x' }), DomainError);
  assert.throws(() => new TextField({ label: ' ' }), /must have a label/);
  assert.throws(() => new EmailField({ label: 'Mail' }).validateValue('nope'), /valid email/);
  assert.throws(() => new NumberField({ label: 'Age' }).validateValue('abc'), /valid number/);
  assert.throws(() => new SelectField({ label: 'Y', options: ['1'] }).validateValue('9'), /one of/);
  const form = new RegistrationForm([{ label: 'A', type: 'weird' }]);
  assert.ok(form.fields[0] instanceof TextField);
});

test('RegistrationForm.process: complete, incomplete drafts, validation', () => {
  const form = new RegistrationForm(fields.map((f, i) => ({ ...f, fieldId: `f${i}` })));
  assert.deepEqual(form.process({ f0: '1', f1: 'a@b.co', f2: '2' }), { data: { f0: '1', f1: 'a@b.co', f2: '2' }, complete: true });
  assert.equal(form.process({ f0: '1' }, { isDraft: true }).complete, false);
  assert.throws(() => form.process({ f0: '1', f1: 'bad', f2: '1' }), ValidationError);
  assert.doesNotThrow(() => form.process({ f1: 'bad' }, { isDraft: true }));
});

test('RegistrationWindow rules', () => {
  const end = new Date(future(3));
  assert.throws(() => RegistrationWindow.create('x', null, end), /not a valid date/);
  assert.throws(() => RegistrationWindow.create(null, future(4), end), /after the event ends/);
  assert.throws(() => RegistrationWindow.create(future(2), future(1), end), /open before/);
  assert.ok(Object.isFrozen(RegistrationWindow.create(null, null, end)));
});

test('Event phase and EventCatalog aggregation', () => {
  const upcoming = new CampusEvent(base());
  const current = new CampusEvent(base({ startsAt: future(-1), endsAt: future(1) }));
  const past = new CampusEvent(base({ startsAt: future(-3), endsAt: future(-2) }));
  assert.deepEqual([upcoming, current, past].map(e => e.getPhase()), ['UPCOMING', 'CURRENT', 'PAST']);
  const catalog = new EventCatalog([upcoming, current, past]);
  assert.deepEqual(catalog.countByPhase(), { CURRENT: 1, UPCOMING: 1, PAST: 1 });
  catalog.remove(past);
  assert.equal(catalog.size, 2);
  assert.equal(past.status, 'PUBLISHED');             // aggregation: member outlives its removal
  const skipped = [];
  const c2 = EventCatalog.fromDocuments([{ title: '' }, { ...base(), _id: 'e1' }], { CampusEvent, onSkip: d => skipped.push(d) });
  assert.equal(c2.size, 1); assert.equal(skipped.length, 1);
});

test('Observer: event bus delivers to all subscribers and unsubscribes', async () => {
  const bus = new DomainEventBus(); const seen = [];
  const off = bus.subscribe('X', p => seen.push(['a', p])); bus.subscribe('X', p => seen.push(['b', p]));
  await bus.publish('X', 1); off(); await bus.publish('X', 2);
  assert.deepEqual(seen, [['a', 1], ['b', 1], ['b', 2]]);
});

test('Exception hierarchy and repository contracts', () => {
  assert.equal(new NotFoundError('x').statusCode, 404);
  assert.ok(new ConflictError('x') instanceof DomainError);
  assert.throws(() => new UserRepository(), e => e.code === 'ABSTRACT_REPOSITORY');
  class Half extends UserRepository {}
  assert.throws(() => new Half().findById(), e => e.code === 'NOT_IMPLEMENTED');
});
