import { Room } from '../models/Room.js';
import { clearCache } from '../middlewares/cache.js';

export const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 }).lean();
    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    await clearCache('rooms');
    res.status(201).json({ success: true, data: room, message: 'تم إضافة القاعة بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!room) {
      return res.status(404).json({ success: false, message: 'القاعة غير موجودة' });
    }

    await clearCache('rooms');
    res.status(200).json({ success: true, data: room, message: 'تم تعديل بيانات القاعة' });
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'القاعة غير موجودة' });
    }

    await clearCache('rooms');
    res.status(200).json({ success: true, message: 'تم حذف القاعة بنجاح' });
  } catch (error) {
    next(error);
  }
};
