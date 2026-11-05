import mongoose from 'mongoose';

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
    },
    semester: {
      type: String,
      required: [true, 'Semester identifier is required (e.g. Fall-2026)'],
      trim: true,
    },
    availability: [
      {
        dayOfWeek: {
          type: Number,
          required: true,
          min: 0,
          max: 6, // 0 = Sunday, 1 = Monday, etc.
        },
        timeSlot: {
          type: String,
          required: true,
          trim: true, // e.g. "08:30-10:00"
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

doctorAvailabilitySchema.index({ doctor: 1, semester: 1 }, { unique: true });

export const DoctorAvailability = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
