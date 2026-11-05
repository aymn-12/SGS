import { Course } from '../models/Course.js';
import { clearCache } from '../middlewares/cache.js';

export const getCourses = async (req, res, next) => {
  try {
    const { department, stageId } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (stageId) filter.stage = stageId;

    const courses = await Course.find(filter)
      .populate('stage', 'name stageNumber')
      .populate('assignedDoctor', 'fullName email')
      .sort({ code: 1 })
      .lean();

    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    await clearCache('courses');
    res.status(201).json({ success: true, data: course, message: 'تم إضافة المادة الدراسية بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('stage', 'name stageNumber')
      .populate('assignedDoctor', 'fullName email')
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    }

    await clearCache('courses');
    res.status(200).json({ success: true, data: course, message: 'تم تعديل المادة بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    }

    await clearCache('courses');
    res.status(200).json({ success: true, message: 'تم حذف المادة بنجاح' });
  } catch (error) {
    next(error);
  }
};
