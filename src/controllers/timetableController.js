import { Timetable } from '../models/Timetable.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Room } from '../models/Room.js';
import { dispatchSolverTask } from '../services/queueService.js';
import { validateSlot, findAlternativeSlots } from '../services/conflictValidator.js';
import { clearCache } from '../middlewares/cache.js';
import { createAndEmitNotification } from './notificationController.js';
import { logAudit } from '../services/auditService.js';
import { sendLectureRescheduledEmail, sendTimetablePublishedEmail } from '../services/emailService.js';

// @desc Request Automatic Generation via Solver
// @route POST /api/timetables/generate
// @access Private (COORDINATOR, ADMIN)
export const generateTimetable = async (req, res, next) => {
  try {
    const { department, semester, academicYear } = req.body;

    if (!department || !semester || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تزويد القسم، الفصل الدراسي، والعام الأكاديمي',
      });
    }

    // Check if an existing draft exists or create one
    let timetable = await Timetable.findOne({ department, semester, academicYear });
    if (!timetable) {
      timetable = await Timetable.create({
        department,
        semester,
        academicYear,
        status: 'DRAFT',
        slots: [],
      });
    }

    // Dispatch background job to Redis for Celery & Google OR-Tools
    const jobResult = await dispatchSolverTask({
      timetableId: timetable._id.toString(),
      department,
      semester,
      academicYear,
    });

    res.status(202).json({
      success: true,
      message: 'تم إرسال طلب التوليد الآلي إلى محرك الجدولة (Google OR-Tools) بنجاح',
      data: {
        timetableId: timetable._id,
        taskId: jobResult.taskId,
        status: 'PROCESSING',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Timetables list
// @route GET /api/timetables
// @access Private
export const getTimetables = async (req, res, next) => {
  try {
    const { department, semester } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = semester;

    const timetables = await Timetable.find(filter)
      .select('department semester academicYear status createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: timetables.length, data: timetables });
  } catch (error) {
    next(error);
  }
};

// @desc Get single timetable populated
// @route GET /api/timetables/:id
// @access Private
export const getTimetableById = async (req, res, next) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('slots.course', 'name code type creditHours')
      .populate('slots.stage', 'name stageNumber studentCount shift')
      .populate('slots.doctor', 'fullName email')
      .populate('slots.room', 'roomNumber building roomType capacity')
      .lean();

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    }

    res.status(200).json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
};

// @desc Real-Time Conflict Validation (For Drag & Drop UI)
// @route POST /api/timetables/validate-slot
// @access Private
export const validateSlotChange = async (req, res, next) => {
  try {
    const {
      timetableId,
      slotId,
      doctorId,
      roomId,
      stageId,
      dayOfWeek,
      timeSlot,
      courseType,
      semester,
    } = req.body;

    const validationResult = await validateSlot({
      timetableId,
      slotId,
      doctorId,
      roomId,
      stageId,
      dayOfWeek,
      timeSlot,
      courseType,
      semester,
    });

    // Proactive Intelligence: If invalid, automatically calculate clash-free alternatives
    let suggestedAlternatives = [];
    if (!validationResult.isValid) {
      suggestedAlternatives = await findAlternativeSlots({
        timetableId,
        slotId,
        doctorId,
        stageId,
        courseType,
        semester,
      });
    }

    // Record in Audit Trail
    await logAudit({
      req,
      action: 'TIMETABLE_PUBLISHED',
      entityType: 'Timetable',
      entityId: timetable._id,
      description: `تم اعتماد ونشر الجدول الدراسي الرسمي لقسم ${timetable.department}`,
    });

    res.status(200).json({
      success: true,
      isValid: validationResult.isValid,
      conflicts: validationResult.conflicts,
      suggestedAlternatives,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update specific slot (Reschedule / Drag & Drop commit)
// @route PUT /api/timetables/:id/slots/:slotId
// @access Private (COORDINATOR, ADMIN)
export const updateSlot = async (req, res, next) => {
  try {
    const { id: timetableId, slotId } = req.params;
    const { roomId, dayOfWeek, timeSlot, status } = req.body;

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    }

    const slot = timetable.slots.id(slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'المحاضرة غير موجودة في الجدول' });
    }

    // Validate conflicts before committing
    if (dayOfWeek !== undefined && timeSlot) {
      const validation = await validateSlot({
        timetableId,
        slotId,
        doctorId: slot.doctor,
        roomId: roomId || slot.room,
        stageId: slot.stage,
        dayOfWeek,
        timeSlot,
        semester: timetable.semester,
      });

      if (!validation.isValid) {
        return res.status(409).json({
          success: false,
          message: 'لا يمكن نقل المحاضرة لوجود تعارضات مؤكدة',
          conflicts: validation.conflicts,
        });
      }
    }

    // Apply updates
    if (roomId) slot.room = roomId;
    if (dayOfWeek !== undefined) slot.dayOfWeek = dayOfWeek;
    if (timeSlot) slot.timeSlot = timeSlot;
    if (status) slot.status = status;

    await timetable.save();
    await clearCache('timetables');

    // Broadcast change via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('timetable_updated', {
        timetableId,
        slotId,
        updatedSlot: slot,
        message: 'تم تحديث موعد المحاضرة في الجدول الدراسي',
      });

      // Dispatch targeted notification to the doctor
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
      const dayName = dayNames[slot.dayOfWeek] || '';
      createAndEmitNotification(io, {
        recipientId: slot.doctor,
        title: 'تغيير في موعد أو مكان المحاضرة',
        message: `تم نقل موعد محاضرتك إلى يوم (${dayName}) التوقيت (${slot.timeSlot})`,
        type: 'RESCHEDULE',
        metadata: {
          timetableId,
          roomId: slot.room,
          slotId: slot._id,
          timeSlot: slot.timeSlot,
          dayOfWeek: slot.dayOfWeek,
        },
      });

      // Dispatch Brevo Email asynchronously to the doctor
      (async () => {
        try {
          const [docUser, courseObj, roomObj] = await Promise.all([
            User.findById(slot.doctor).select('fullName email').lean(),
            Course.findById(slot.course).select('name').lean(),
            Room.findById(slot.room).select('roomNumber').lean(),
          ]);

          if (docUser && docUser.email) {
            await sendLectureRescheduledEmail({
              doctorEmail: docUser.email,
              doctorName: docUser.fullName,
              courseName: courseObj?.name || 'مادتك الدراسية',
              roomName: roomObj?.roomNumber || 'القاعة المحددة',
              dayName,
              timeSlot: slot.timeSlot,
            });
          }
        } catch (err) {
          console.error('[Brevo Reschedule Email Error]:', err.message);
        }
      })();
    }

    // Record in Audit Trail
    await logAudit({
      req,
      action: 'SLOT_RESCHEDULED',
      entityType: 'Timetable',
      entityId: timetableId,
      description: `تم نقل المحاضرة إلى يوم (${dayNames[slot.dayOfWeek] || ''}) التوقيت (${slot.timeSlot})`,
      changes: {
        slotId,
        newDayOfWeek: slot.dayOfWeek,
        newTimeSlot: slot.timeSlot,
        newRoomId: slot.room,
      },
    });

    res.status(200).json({
      success: true,
      data: slot,
      message: 'تم تحديث موعد المحاضرة بنجاح',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Publish Timetable
// @route PUT /api/timetables/:id/publish
// @access Private (COORDINATOR, ADMIN)
export const publishTimetable = async (req, res, next) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { status: 'PUBLISHED' },
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    }

    await clearCache('timetables');

    // Broadcast publish event to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('timetable_published', {
        timetableId: timetable._id,
        department: timetable.department,
        semester: timetable.semester,
        message: `تم اعتماد ونشر الجدول الدراسي الرسمي لقسم ${timetable.department}`,
      });
    }

    // Send Email to all doctors in this department via Brevo
    (async () => {
      try {
        const doctorIds = [...new Set(timetable.slots.map((s) => s.doctor.toString()))];
        const doctors = await User.find({ _id: { $in: doctorIds } }).select('fullName email').lean();
        for (const doc of doctors) {
          if (doc.email) {
            await sendTimetablePublishedEmail({
              doctorEmail: doc.email,
              doctorName: doc.fullName,
              department: timetable.department,
              semester: timetable.semester,
            });
          }
        }
      } catch (err) {
        console.error('[Brevo Publish Email Error]:', err.message);
      }
    })();

    // Record in Audit Trail
    await logAudit({
      req,
      action: 'TIMETABLE_PUBLISHED',
      entityType: 'Timetable',
      entityId: timetable._id,
      description: `تم اعتماد ونشر الجدول الدراسي الرسمي لقسم ${timetable.department}`,
    });

    res.status(200).json({
      success: true,
      data: timetable,
      message: 'تم نشر واعتماد الجدول بنجاح وإشعار الكادر الأكاديمي',
    });
  } catch (error) {
    next(error);
  }
};
