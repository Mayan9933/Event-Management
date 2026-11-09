import Event from '../../models/Event.js';
import { EventRepository } from '../contracts.js';

export class MongoEventRepository extends EventRepository {
  async create(data) { return (await Event.create(data)).toObject(); }
  findById(id) { return Event.findById(id).lean(); }
  findByIds(ids) { return Event.find({ _id: { $in: ids } }).lean(); }
  findPublished() { return Event.find({ status: 'PUBLISHED' }).sort({ startsAt: 1 }).lean(); }
  findByOrganizer(organizerId) { return Event.find({ organizerId }).sort({ createdAt: -1 }).lean(); }
  findAll() { return Event.find().sort({ createdAt: -1 }).lean(); }
  update(id, data) { return Event.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean(); }
  async setStatus(id, status) { await Event.updateOne({ _id: id }, { $set: { status } }); }
  countPublished() { return Event.countDocuments({ status: 'PUBLISHED' }); }
  async idsByOrganizer(organizerId) { return (await Event.find({ organizerId }).select('_id').lean()).map(e => e._id); }
  async deleteById(id) { await Event.deleteOne({ _id: id }); }
  async deleteByOrganizer(organizerId) { await Event.deleteMany({ organizerId }); }
}
