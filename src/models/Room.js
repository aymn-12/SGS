import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number or name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    building: {
      type: String,
      required: [true, 'Building name is required'],
      trim: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 1,
      index: true,
    },
    roomType: {
      type: String,
      enum: ['LECTURE_HALL', 'LAB'],
      default: 'LECTURE_HALL',
      required: true,
      index: true,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for finding available rooms matching type and capacity
roomSchema.index({ roomType: 1, capacity: 1, isAvailable: 1 });

export const Room = mongoose.model('Room', roomSchema);
