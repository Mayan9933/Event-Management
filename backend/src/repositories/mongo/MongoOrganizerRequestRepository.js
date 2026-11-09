import OrganizerRequest from '../../models/OrganizerRequest.js';
import { OrganizerRequestRepository } from '../contracts.js';
import { translateMongoError } from './translateError.js';

export class MongoOrganizerRequestRepository extends OrganizerRequestRepository {
  async create(data) {
    try { return (await OrganizerRequest.create(data)).toObject(); } catch (e) { throw translateMongoError(e); }
  }
  listWithoutPassword() { return OrganizerRequest.find().select('-passwordHash').sort({ createdAt: -1 }).lean(); }
  findByIdWithPassword(id) { return OrganizerRequest.findById(id).select('+passwordHash').lean(); }
  update(id, patch) { return OrganizerRequest.findByIdAndUpdate(id, patch, { new: true }).lean(); }
  async deleteByEmail(email) { await OrganizerRequest.deleteMany({ email }); }
  countPending() { return OrganizerRequest.countDocuments({ status: 'PENDING' }); }
}
