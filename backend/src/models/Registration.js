import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  formData: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['COMPLETE', 'INCOMPLETE'],
    default: 'COMPLETE'
  }
}, { timestamps: true });

registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
export default mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
