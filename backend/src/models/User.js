import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
  passwordHash: { type: String, required: true },
  clubName: { type: String, trim: true, maxlength: 140 },
  role: { type: String, enum: ['ADMIN', 'ORGANIZER', 'STUDENT'], required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED'], default: 'ACTIVE' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Enforce exactly one Admin account at the database level.
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'ADMIN' } });

export default mongoose.models.User || mongoose.model('User', userSchema);
