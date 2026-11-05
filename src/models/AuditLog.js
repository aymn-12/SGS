import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'SLOT_RESCHEDULED',
        'TIMETABLE_PUBLISHED',
        'TIMETABLE_GENERATED',
        'ROOM_CREATED',
        'ROOM_UPDATED',
        'ROOM_DELETED',
        'USER_LOGIN',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true, // e.g. 'Timetable', 'Room', 'User'
      index: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// Compound index for querying user activity chronologically
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
