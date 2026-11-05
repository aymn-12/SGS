import express from 'express';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/courseController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(cacheMiddleware('courses', 600), getCourses)
  .post(authorize('ADMIN', 'COORDINATOR'), createCourse);

router
  .route('/:id')
  .put(authorize('ADMIN', 'COORDINATOR'), updateCourse)
  .delete(authorize('ADMIN', 'COORDINATOR'), deleteCourse);

export default router;
