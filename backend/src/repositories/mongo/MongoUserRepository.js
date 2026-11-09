import User from '../../models/User.js';
import { UserRepository } from '../contracts.js';
import { translateMongoError } from './translateError.js';

export class MongoUserRepository extends UserRepository {
  findById(id, fields = 'name email role status clubName') { return User.findById(id).select(fields).lean(); }
  findByEmail(email) { return User.findOne({ email }).lean(); }
  async existsByEmail(email) { return Boolean(await User.exists({ email })); }
  async create(data) {
    try { return (await User.create(data)).toObject(); } catch (e) { throw translateMongoError(e); }
  }
  listManaged() {
    return User.find({ role: { $in: ['STUDENT', 'ORGANIZER'] } })
      .select('name email role status clubName createdAt').sort({ role: 1, name: 1 }).lean();
  }
  async deleteById(id) { await User.deleteOne({ _id: id }); }
  countStudents() { return User.countDocuments({ role: 'STUDENT' }); }
  countActiveOrganizers() { return User.countDocuments({ role: 'ORGANIZER', status: 'ACTIVE' }); }
}
