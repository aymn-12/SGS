import express from 'express';
import {
  getStages,
  createStage,
  updateStage,
  deleteStage,
} from '../controllers/stageController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(cacheMiddleware('stages', 600), getStages)
  .post(authorize('ADMIN', 'COORDINATOR'), createStage);

router
  .route('/:id')
  .put(authorize('ADMIN', 'COORDINATOR'), updateStage)
  .delete(authorize('ADMIN', 'COORDINATOR'), deleteStage);

export default router;
