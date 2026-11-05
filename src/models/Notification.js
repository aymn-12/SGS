import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['LECTURE_REMINDER', 'RESCHEDULE', 'SCHEDULE_PUBLISHED', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    metadata: {
      timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      roomName: String,
      courseName: String,
      timeSlot: String,
      dayOfWeek: Number,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for querying unread notifications for a user quickly
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
