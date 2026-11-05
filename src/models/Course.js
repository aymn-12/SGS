import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Course code is required (e.g. CS101)'],
      trim: true,
      uppercase: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    creditHours: {
      type: Number,
      required: [true, 'Credit/Weekly hours are required'],
      min: 1,
    },
    type: {
      type: String,
      enum: ['THEORY', 'PRACTICAL'],
      default: 'THEORY',
      required: true,
    },
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      required: [true, 'Stage is required'],
      index: true,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for querying courses by department and stage
courseSchema.index({ department: 1, stage: 1 });

export const Course = mongoose.model('Course', courseSchema);
