import mongoose from 'mongoose';

const organizerRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
  passwordHash: { type: String, required: true, select: false },
  clubName: { type: String, required: true, trim: true, maxlength: 140 },
  reason: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.models.OrganizerRequest || mongoose.model('OrganizerRequest', organizerRequestSchema);
