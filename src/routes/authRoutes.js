import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, authorize('ADMIN'), register);
router.get('/me', protect, getMe);

export default router;
