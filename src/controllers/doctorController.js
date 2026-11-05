import { User } from '../models/User.js';
import { DoctorAvailability } from '../models/DoctorAvailability.js';
import { Timetable } from '../models/Timetable.js';

// @desc Get all doctors in department
export const getDoctors = async (req, res, next) => {
  try {
    const { department } = req.query;
    const filter = { role: 'DOCTOR', isActive: true };
    if (department) filter.department = department;

    const doctors = await User.find(filter).select('-password').lean();
    res.status(200).json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    next(error);
  }
};

// @desc Set / Update doctor weekly availability
export const setAvailability = async (req, res, next) => {
  try {
    const doctorId = req.user.role === 'DOCTOR' ? req.user._id : req.body.doctorId;
    const { semester, availability } = req.body;

    if (!semester || !availability) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تزويد الفصل الدراسي ومصفوفة التفرغ',
      });
    }

    const docAvail = await DoctorAvailability.findOneAndUpdate(
      { doctor: doctorId, semester },
      { availability },
      { new: true, upsert: true }
    ).lean();

    res.status(200).json({
      success: true,
      data: docAvail,
      message: 'تم حفظ تفضيلات التفرغ بنجاح',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get doctor availability
export const getAvailability = async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId || req.user._id;
    const { semester } = req.query;

    const docAvail = await DoctorAvailability.findOne({
      doctor: doctorId,
      ...(semester && { semester }),
    }).lean();

    res.status(200).json({
      success: true,
      data: docAvail ? docAvail.availability : [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Doctor Personal Timetable
export const getMySchedule = async (req, res, next) => {
  try {
    const doctorId = req.user._id;
    const { semester } = req.query;

    const filter = { status: 'PUBLISHED' };
    if (semester) filter.semester = semester;

    const timetables = await Timetable.find(filter)
      .populate('slots.course', 'name code type')
      .populate('slots.room', 'roomNumber building roomType')
      .populate('slots.stage', 'name stageNumber')
      .lean();

    // Filter only slots that belong to this doctor
    const mySlots = [];
    for (const tt of timetables) {
      for (const slot of tt.slots) {
        if (slot.doctor.toString() === doctorId.toString()) {
          mySlots.push({
            timetableId: tt._id,
            semester: tt.semester,
            ...slot,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: mySlots.length,
      data: mySlots,
    });
  } catch (error) {
    next(error);
  }
};
