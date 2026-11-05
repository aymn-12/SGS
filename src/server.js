import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { connectRedis, redis, redisSubscriber } from './config/redis.js';

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Setup Socket.io for Real-time timetable notifications
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Store io on app instance to use inside controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start Server and Databases
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Connect to Redis and pass socket.io instance
  await connectRedis(io);

  server.listen(PORT, () => {
    console.log(`🚀 SGS Timetable Backend is running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  });
};

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP and Socket.io servers closed.');
    try {
      await mongoose.connection.close(false);
      console.log('[MongoDB] Connection closed.');

      if (redis.status === 'ready') await redis.quit();
      if (redisSubscriber.status === 'ready') await redisSubscriber.quit();
      console.log('[Redis] Connections closed.');

      console.log('[Server] Graceful shutdown completed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during shutdown:', err.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[Server] Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
