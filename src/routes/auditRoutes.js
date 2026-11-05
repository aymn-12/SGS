import express from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('ADMIN', 'COORDINATOR'));

// @desc Get administrative audit logs
// @route GET /api/audit-logs
// @access Private (ADMIN, COORDINATOR)
router.get('/', async (req, res, next) => {
  try {
    const { action, entityType, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
