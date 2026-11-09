import { randomBytes } from 'node:crypto';
import { ConflictError } from '../src/domain/errors/DomainError.js';
import {
  UserRepository, OrganizerRequestRepository, EventRepository, RegistrationRepository
} from '../src/repositories/contracts.js';

const oid = () => randomBytes(12).toString('hex');
const clone = o => (o ? structuredClone(o) : o);

/** In-memory implementations prove services depend only on the contracts (DIP / LSP). */
export class FakeUsers extends UserRepository {
  rows = [];
  async findById(id) { return clone(this.rows.find(r => r._id === String(id))) ?? null; }
  async findByEmail(email) { return clone(this.rows.find(r => r.email === email)) ?? null; }
  async existsByEmail(email) { return this.rows.some(r => r.email === email); }
  async create(data) {
    if (this.rows.some(r => r.email === data.email)) throw new ConflictError('dup', 'DUPLICATE');
    const row = { _id: oid(), ...data }; this.rows.push(row); return clone(row);
  }
  async listManaged() { return clone(this.rows.filter(r => r.role !== 'ADMIN')); }
  async deleteById(id) { this.rows = this.rows.filter(r => r._id !== String(id)); }
  async countStudents() { return this.rows.filter(r => r.role === 'STUDENT').length; }
  async countActiveOrganizers() { return this.rows.filter(r => r.role === 'ORGANIZER' && r.status === 'ACTIVE').length; }
}

export class FakeRequests extends OrganizerRequestRepository {
  rows = [];
  async create(data) {
    if (this.rows.some(r => r.email === data.email)) throw new ConflictError('dup', 'DUPLICATE');
    const row = { _id: oid(), status: 'PENDING', ...data }; this.rows.push(row); return clone(row);
  }
  async listWithoutPassword() { return this.rows.map(({ passwordHash, ...r }) => r); }
  async findByIdWithPassword(id) { return clone(this.rows.find(r => r._id === String(id))) ?? null; }
  async update(id, patch) { Object.assign(this.rows.find(r => r._id === String(id)), patch); }
  async deleteByEmail(email) { this.rows = this.rows.filter(r => r.email !== email); }
  async countPending() { return this.rows.filter(r => r.status === 'PENDING').length; }
}

export class FakeEvents extends EventRepository {
  rows = [];
  async create(data) { const row = { _id: oid(), ...clone(data) }; this.rows.push(row); return clone(row); }
  async findById(id) { return clone(this.rows.find(r => r._id === String(id))) ?? null; }
  async findByIds(ids) { const s = new Set(ids.map(String)); return clone(this.rows.filter(r => s.has(r._id))); }
  async findPublished() { return clone(this.rows.filter(r => r.status === 'PUBLISHED')); }
  async findByOrganizer(id) { return clone(this.rows.filter(r => String(r.organizerId) === String(id))); }
  async findAll() { return clone(this.rows); }
  async update(id, data) { const r = this.rows.find(x => x._id === String(id)); Object.assign(r, clone(data)); return clone(r); }
  async setStatus(id, status) { this.rows.find(r => r._id === String(id)).status = status; }
  async countPublished() { return this.rows.filter(r => r.status === 'PUBLISHED').length; }
  async idsByOrganizer(id) { return this.rows.filter(r => String(r.organizerId) === String(id)).map(r => r._id); }
  async deleteById(id) { this.rows = this.rows.filter(r => r._id !== String(id)); }
  async deleteByOrganizer(id) { this.rows = this.rows.filter(r => String(r.organizerId) !== String(id)); }
}

export class FakeRegistrations extends RegistrationRepository {
  rows = [];
  async countComplete(eventId) { return this.rows.filter(r => String(r.eventId) === String(eventId) && r.status === 'COMPLETE').length; }
  async findOne(eventId, studentId) {
    return clone(this.rows.find(r => String(r.eventId) === String(eventId) && String(r.studentId) === String(studentId))) ?? null;
  }
  async create(data) { const row = { _id: oid(), ...clone(data) }; this.rows.push(row); return clone(row); }
  async update(id, patch) { const r = this.rows.find(x => x._id === String(id)); Object.assign(r, clone(patch)); return clone(r); }
  async findByStudent(id) { return clone(this.rows.filter(r => String(r.studentId) === String(id))); }
  async findByEvent(id) { return clone(this.rows.filter(r => String(r.eventId) === String(id))); }
  async deleteByEvent(id) { this.rows = this.rows.filter(r => String(r.eventId) !== String(id)); }
  async deleteByEvents(ids) { const s = new Set(ids.map(String)); this.rows = this.rows.filter(r => !s.has(String(r.eventId))); }
  async deleteByStudent(id) { this.rows = this.rows.filter(r => String(r.studentId) !== String(id)); }
  async countAll() { return this.rows.length; }
}
