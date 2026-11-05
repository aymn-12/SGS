import mongoose from 'mongoose';

const timetableSlotSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  stage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage',
    required: true,
    index: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true,
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
    index: true,
  },
  timeSlot: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['THEORY', 'PRACTICAL'],
    default: 'THEORY',
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'RESCHEDULED'],
    default: 'ACTIVE',
  },
});

const timetableSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    slots: [timetableSlotSchema],
  },
  { timestamps: true }
);

// Compound indexes for fast timetable lookups
timetableSchema.index({ department: 1, semester: 1, academicYear: 1 });
timetableSchema.index({ status: 1, department: 1 });

// Subdocument indexes to accelerate conflict detection queries
timetableSchema.index({ 'slots.doctor': 1, 'slots.dayOfWeek': 1, 'slots.timeSlot': 1 });
timetableSchema.index({ 'slots.room': 1, 'slots.dayOfWeek': 1, 'slots.timeSlot': 1 });
timetableSchema.index({ 'slots.stage': 1, 'slots.dayOfWeek': 1, 'slots.timeSlot': 1 });

export const Timetable = mongoose.model('Timetable', timetableSchema);
