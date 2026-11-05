import { Timetable } from '../models/Timetable.js';
import { DoctorAvailability } from '../models/DoctorAvailability.js';
import { Room } from '../models/Room.js';
import { Stage } from '../models/Stage.js';

const DAYS = [0, 1, 2, 3, 4];
const DAY_NAMES = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};
const TIME_SLOTS = ['08:30-10:00', '10:15-11:45', '12:00-13:30', '13:45-15:15'];

/**
 * Highly optimized in-memory conflict validator.
 * Target execution time: < 20ms using .lean() and parallel Promise queries.
 */
export const validateSlot = async ({
  timetableId,
  slotId,
  doctorId,
  roomId,
  stageId,
  dayOfWeek,
  timeSlot,
  courseType,
  semester,
}) => {
  const conflicts = [];

  // Run independent database lookups in parallel
  const [timetable, docAvail, room, stage] = await Promise.all([
    Timetable.findById(timetableId).select('slots semester').lean(),
    semester
      ? DoctorAvailability.findOne({ doctor: doctorId, semester }).select('availability').lean()
      : null,
    Room.findById(roomId).select('capacity roomType isAvailable').lean(),
    Stage.findById(stageId).select('studentCount').lean(),
  ]);

  // 1. Validate clashes against current timetable slots
  if (timetable && timetable.slots) {
    const stringDocId = doctorId.toString();
    const stringRoomId = roomId.toString();
    const stringStageId = stageId.toString();
    const currentSlotId = slotId ? slotId.toString() : null;

    for (let i = 0; i < timetable.slots.length; i++) {
      const slot = timetable.slots[i];

      // Skip the slot itself if editing, or cancelled slots
      if (currentSlotId && slot._id.toString() === currentSlotId) continue;
      if (slot.status === 'CANCELLED') continue;

      if (slot.dayOfWeek === dayOfWeek && slot.timeSlot === timeSlot) {
        // Hard Constraint 1: Doctor conflict
        if (slot.doctor.toString() === stringDocId) {
          conflicts.push({
            type: 'DOCTOR_CONFLICT',
            message: `تعارض أستاذ: الدكتور لديه محاضرة أخرى في نفس هذا الوقت (${timeSlot})`,
          });
        }

        // Hard Constraint 2: Room conflict
        if (slot.room.toString() === stringRoomId) {
          conflicts.push({
            type: 'ROOM_CONFLICT',
            message: `تعارض قاعة: القاعة محجوزة بالفعل في هذا الوقت (${timeSlot})`,
          });
        }

        // Hard Constraint 3: Stage conflict
        if (slot.stage.toString() === stringStageId) {
          conflicts.push({
            type: 'STAGE_CONFLICT',
            message: `تعارض مرحلة: طلاب هذه المرحلة لديهم مادة أخرى في هذا الوقت (${timeSlot})`,
          });
        }
      }
    }
  }

  // 2. Hard Constraint 4: Check Doctor Availability Preferences
  if (docAvail && docAvail.availability) {
    const slotPref = docAvail.availability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.timeSlot === timeSlot
    );
    if (slotPref && slotPref.isAvailable === false) {
      conflicts.push({
        type: 'DOCTOR_UNAVAILABLE',
        message: 'الأستاذ غير متوفر ومسجل اعتذار مسبق عن التدريس في هذه الفترة الزمنية',
      });
    }
  }

  // 3. Hard Constraint 5: Room capacity & suitability
  if (room && stage) {
    if (room.isAvailable === false) {
      conflicts.push({
        type: 'ROOM_UNAVAILABLE',
        message: 'القاعة مغلقة أو تحت الصيانة حالياً',
      });
    }

    if (room.capacity < stage.studentCount) {
      conflicts.push({
        type: 'ROOM_CAPACITY_EXCEEDED',
        message: `سعة القاعة (${room.capacity} مقعد) أصغر من عدد طلاب المرحلة (${stage.studentCount} طالب)`,
      });
    }

    if (courseType === 'PRACTICAL' && room.roomType !== 'LAB') {
      conflicts.push({
        type: 'ROOM_TYPE_MISMATCH',
        message: 'المادة العملية تتطلب مختبراً (LAB) وليست قاعة نظرية',
      });
    }
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
  };
};

/**
 * Smart Alternative Suggester:
 * Automatically finds the top clash-free (Day, Time, Room) alternatives
 * when a user encounters a conflict during manual rescheduling.
 */
export const findAlternativeSlots = async ({
  timetableId,
  slotId,
  doctorId,
  stageId,
  courseType,
  semester,
  maxSuggestions = 3,
}) => {
  const [timetable, docAvail, rooms, stage] = await Promise.all([
    Timetable.findById(timetableId).select('slots semester').lean(),
    semester
      ? DoctorAvailability.findOne({ doctor: doctorId, semester }).select('availability').lean()
      : null,
    Room.find({ isAvailable: true }).select('roomNumber building roomType capacity').lean(),
    Stage.findById(stageId).select('studentCount').lean(),
  ]);

  if (!timetable || !stage) return [];

  const stringDocId = doctorId.toString();
  const stringStageId = stageId.toString();
  const currentSlotId = slotId ? slotId.toString() : null;

  // 1. Filter rooms that can accommodate the course and student count
  const compatibleRooms = rooms.filter((r) => {
    if (r.capacity < stage.studentCount) return false;
    if (courseType === 'PRACTICAL') return r.roomType === 'LAB';
    return true;
  });

  // 2. Build quick lookup maps of booked resources
  const bookedDoctor = new Set();
  const bookedStage = new Set();
  const bookedRoom = new Set();

  for (const s of timetable.slots || []) {
    if (currentSlotId && s._id.toString() === currentSlotId) continue;
    if (s.status === 'CANCELLED') continue;

    const timeKey = `${s.dayOfWeek}_${s.timeSlot}`;
    bookedDoctor.add(`${s.doctor.toString()}_${timeKey}`);
    bookedStage.add(`${s.stage.toString()}_${timeKey}`);
    bookedRoom.add(`${s.room.toString()}_${timeKey}`);
  }

  // 3. Build doctor unavailable lookup set
  const unavailableDoctor = new Set();
  if (docAvail && docAvail.availability) {
    for (const item of docAvail.availability) {
      if (!item.isAvailable) {
        unavailableDoctor.add(`${item.dayOfWeek}_${item.timeSlot}`);
      }
    }
  }

  // 4. Scan available slots and assemble top recommendations
  const suggestions = [];

  for (const day of DAYS) {
    for (const slot of TIME_SLOTS) {
      const timeKey = `${day}_${slot}`;

      // Check doctor availability
      if (unavailableDoctor.has(timeKey)) continue;
      // Check doctor booked elsewhere
      if (bookedDoctor.has(`${stringDocId}_${timeKey}`)) continue;
      // Check stage booked elsewhere
      if (bookedStage.has(`${stringStageId}_${timeKey}`)) continue;

      // Find an available compatible room
      for (const room of compatibleRooms) {
        if (!bookedRoom.has(`${room._id.toString()}_${timeKey}`)) {
          suggestions.push({
            dayOfWeek: day,
            dayName: DAY_NAMES[day],
            timeSlot: slot,
            roomId: room._id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
          });
          break; // Found a room for this time slot, move to next slot for diversity
        }
      }

      if (suggestions.length >= maxSuggestions) {
        return suggestions;
      }
    }
  }

  return suggestions;
};
