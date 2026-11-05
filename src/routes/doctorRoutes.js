import express from 'express';
import {
  getDoctors,
  setAvailability,
  getAvailability,
  getMySchedule,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getDoctors);
router.get('/my-schedule', getMySchedule);
router.post('/availability', setAvailability);
router.get('/:doctorId/availability', getAvailability);

export default router;
