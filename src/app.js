import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { sanitizeNoSQL } from './middlewares/mongoSanitize.js';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import stageRoutes from './routes/stageRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// 1. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Next.js frontend flexibility
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Response Compression (Gzip / Brotli) - Optimization
app.use(compression());

// 3. CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('غير مسموح بهذا النطاق بواسطة سياسة CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 4. HTTP Request Logger (Dev mode only)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 5. Body Parsers with Payload Size Limits (Prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. NoSQL Injection Sanitization (Removes $ and . from inputs)
app.use(sanitizeNoSQL);

// 7. Prevent HTTP Parameter Pollution
app.use(hpp());

// 8. Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد 15 دقيقة',
  },
});
app.use('/api/', apiLimiter);

// 9. Strict Rate Limiter for Authentication (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد محاولات تسجيل الدخول كثيرة جداً، يرجى الانتظار 15 دقيقة',
  },
});
app.use('/api/auth/login', authLimiter);

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    service: 'Smart Academic Timetable Backend',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);

// 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `المسار المطلوب غير موجود: ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
