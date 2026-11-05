import { Notification } from '../models/Notification.js';

// @desc Get current user notifications
// @route GET /api/notifications
// @access Private
export const getMyNotifications = async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Mark notification as read
// @route PUT /api/notifications/:id/read
// @access Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc Mark all notifications as read
// @route PUT /api/notifications/read-all
// @access Private
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'تم تعيين جميع الإشعارات كمقروءة' });
  } catch (error) {
    next(error);
  }
};

// Helper: Create notification and emit via Socket.io
export const createAndEmitNotification = async (io, { recipientId, title, message, type, metadata }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      title,
      message,
      type,
      metadata,
    });

    if (io) {
      io.emit(`notification_${recipientId}`, notification);
    }
    return notification;
  } catch (error) {
    console.error('[Notification Helper Error]', error.message);
  }
};
