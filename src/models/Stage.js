import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stage name is required (e.g. المرحلة الأولى)'],
      trim: true,
    },
    stageNumber: {
      type: Number,
      required: [true, 'Stage number is required (1, 2, 3, 4)'],
      min: 1,
      max: 6,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    studentCount: {
      type: Number,
      required: [true, 'Student count is required'],
      min: 1,
    },
    shift: {
      type: String,
      enum: ['MORNING', 'EVENING'],
      default: 'MORNING',
    },
  },
  { timestamps: true }
);

// Compound index for department and stage
stageSchema.index({ department: 1, stageNumber: 1 });

export const Stage = mongoose.model('Stage', stageSchema);
