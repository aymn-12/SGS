import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { Stage } from '../models/Stage.js';

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgs_timetable');
    console.log('[Seeder] Connected to MongoDB...');

    // Clear existing users and sample data
    await User.deleteMany();
    await Room.deleteMany();
    await Stage.deleteMany();

    // 1. Create Default Users
    const admin = await User.create({
      fullName: 'مدير النظام الأكاديمي',
      email: 'admin@university.edu',
      password: 'admin123456',
      role: 'ADMIN',
      department: 'عمادة الكلية',
    });

    const coordinator = await User.create({
      fullName: 'د. أسامة (مقرر قسم الحاسوب)',
      email: 'coordinator@university.edu',
      password: 'coord123456',
      role: 'COORDINATOR',
      department: 'علوم الحاسوب',
    });

    const doctor = await User.create({
      fullName: 'د. كريم عبد الله',
      email: 'doctor@university.edu',
      password: 'doctor123456',
      role: 'DOCTOR',
      department: 'علوم الحاسوب',
    });

    console.log('✅ Created Default Users:');
    console.log(`- Admin: admin@university.edu / admin123456`);
    console.log(`- Coordinator: coordinator@university.edu / coord123456`);
    console.log(`- Doctor: doctor@university.edu / doctor123456`);

    // 2. Create Sample Rooms
    await Room.create([
      {
        roomNumber: 'قاعة 101',
        building: 'المبنى الرئيسي',
        capacity: 60,
        roomType: 'LECTURE_HALL',
      },
      {
        roomNumber: 'مختبر البرمجيات 201',
        building: 'مبنى الحاسبات',
        capacity: 30,
        roomType: 'LAB',
        features: ['Computers', 'Projector'],
      },
    ]);
    console.log('✅ Created Sample Rooms & Labs');

    // 3. Create Sample Stages
    await Stage.create([
      {
        name: 'المرحلة الأولى',
        stageNumber: 1,
        department: 'علوم الحاسوب',
        studentCount: 50,
      },
      {
        name: 'المرحلة الثانية',
        stageNumber: 2,
        department: 'علوم الحاسوب',
        studentCount: 45,
      },
    ]);
    console.log('✅ Created Sample Stages');

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
