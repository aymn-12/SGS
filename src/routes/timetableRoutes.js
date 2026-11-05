import express from 'express';
import {
  generateTimetable,
  getTimetables,
  getTimetableById,
  validateSlotChange,
  updateSlot,
  publishTimetable,
} from '../controllers/timetableController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(cacheMiddleware('timetables', 300), getTimetables)
  .post(authorize('COORDINATOR', 'ADMIN'), generateTimetable);

router.post('/validate-slot', validateSlotChange);

router
  .route('/:id')
  .get(getTimetableById);

router.put('/:id/publish', authorize('COORDINATOR', 'ADMIN'), publishTimetable);
router.put('/:id/slots/:slotId', authorize('COORDINATOR', 'ADMIN'), updateSlot);

export default router;
