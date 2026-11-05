import express from 'express';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../controllers/roomController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(cacheMiddleware('rooms', 600), getRooms)
  .post(authorize('ADMIN'), createRoom);

router
  .route('/:id')
  .put(authorize('ADMIN'), updateRoom)
  .delete(authorize('ADMIN'), deleteRoom);

export default router;
