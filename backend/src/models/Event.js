
import mongoose from 'mongoose';

const registrationFieldSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['text', 'email', 'number', 'select', 'textarea'], default: 'text' },
  required: { type: Boolean, default: true },
  options: [{ type: String, trim: true }],
  order: { type: Number, default: 0 }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20000
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  venue: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  startsAt: {
    type: Date,
    required: true
  },
  endsAt: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    default: 100
  },

  // Some events (concerts, screenings...) only need attendance, no sign-up.
  requiresRegistration: {
    type: Boolean,
    default: true
  },
  // Custom registration form fields defined by organizer
  registrationFields: {
    type: [registrationFieldSchema],
    default: []
  },
  // Legacy: kept for backward-compat with old events that had an external link
  registrationUrl: {
    type: String,
    trim: true,
    default: ''
  },
  // Optional window. Open immediately if no opening time; closes at event start if no deadline.
  registrationOpensAt: { type: Date, default: null },
  registrationDeadline: { type: Date, default: null },

  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizerName: {
    type: String,
    required: true
  },
  clubName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PUBLISHED', 'CANCELLED'],
    default: 'PUBLISHED'
  }
}, { timestamps: true });

eventSchema.index({ status: 1, startsAt: 1 });

export default mongoose.models.Event ||
  mongoose.model('Event', eventSchema);
