import Registration from '../../models/Registration.js';
import { RegistrationRepository } from '../contracts.js';
import { translateMongoError } from './translateError.js';

export class MongoRegistrationRepository extends RegistrationRepository {
  countComplete(eventId) { return Registration.countDocuments({ eventId, status: 'COMPLETE' }); }
  findOne(eventId, studentId) { return Registration.findOne({ eventId, studentId }).lean(); }
  async create(data) {
    try { return (await Registration.create(data)).toObject(); } catch (e) { throw translateMongoError(e); }
  }
  update(id, patch) { return Registration.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean(); }
  findByStudent(studentId) { return Registration.find({ studentId }).sort({ createdAt: -1 }).lean(); }
  findByEvent(eventId) { return Registration.find({ eventId }).sort({ createdAt: -1 }).lean(); }
  async deleteByEvent(eventId) { await Registration.deleteMany({ eventId }); }
  async deleteByEvents(eventIds) { await Registration.deleteMany({ eventId: { $in: eventIds } }); }
  async deleteByStudent(studentId) { await Registration.deleteMany({ studentId }); }
  countAll() { return Registration.countDocuments(); }
}
