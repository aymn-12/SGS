import { Stage } from '../models/Stage.js';
import { clearCache } from '../middlewares/cache.js';

export const getStages = async (req, res, next) => {
  try {
    const { department } = req.query;
    const filter = department ? { department } : {};
    const stages = await Stage.find(filter).sort({ stageNumber: 1 }).lean();
    res.status(200).json({ success: true, count: stages.length, data: stages });
  } catch (error) {
    next(error);
  }
};

export const createStage = async (req, res, next) => {
  try {
    const stage = await Stage.create(req.body);
    await clearCache('stages');
    res.status(201).json({ success: true, data: stage, message: 'تم إضافة المرحلة بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const updateStage = async (req, res, next) => {
  try {
    const stage = await Stage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!stage) {
      return res.status(404).json({ success: false, message: 'المرحلة غير موجودة' });
    }

    await clearCache('stages');
    res.status(200).json({ success: true, data: stage, message: 'تم تحديث المرحلة بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const deleteStage = async (req, res, next) => {
  try {
    const stage = await Stage.findByIdAndDelete(req.params.id);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'المرحلة غير موجودة' });
    }

    await clearCache('stages');
    res.status(200).json({ success: true, message: 'تم حذف المرحلة بنجاح' });
  } catch (error) {
    next(error);
  }
};
