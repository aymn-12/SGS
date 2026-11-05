import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sgs_timetable';

    const options = {
      maxPoolSize: 20, // Maintain up to 20 socket connections for concurrency
      minPoolSize: 5,  // Keep at least 5 connections open
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      autoIndex: process.env.NODE_ENV !== 'production', // Build indexes only in dev for performance
    };

    const conn = await mongoose.connect(mongoURI, options);
    console.log(`[MongoDB] Connected successfully (Pool: 5-20): ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
  }
};
