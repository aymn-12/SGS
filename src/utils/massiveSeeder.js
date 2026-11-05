import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { Stage } from '../models/Stage.js';
import { Course } from '../models/Course.js';
import { DoctorAvailability } from '../models/DoctorAvailability.js';

const seedMassiveData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sgs_timetable';
    console.log(`[Massive Seeder] Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);

    console.log('[Massive Seeder] Clearing old data...');
    await Promise.all([
      User.deleteMany(),
      Room.deleteMany(),
      Stage.deleteMany(),
      Course.deleteMany(),
      DoctorAvailability.deleteMany(),
    ]);

    // 1. Create Admins & Coordinators
    const admin = await User.create({
      fullName: 'مدير النظام الأكاديمي',
      email: 'admin@university.edu',
      password: 'admin123456',
      role: 'ADMIN',
      department: 'كلية علوم الحاسوب وتكنولوجيا المعلومات',
    });

    const coordinator = await User.create({
      fullName: 'د. أسامة التميمي (مقرر القسم)',
      email: 'coord@university.edu',
      password: 'coord123456',
      role: 'COORDINATOR',
      department: 'علوم الحاسوب',
    });

    // 2. Create 16 Professors / Doctors
    const doctorNames = [
      "أ.د. عادل الشمري", "د. سارة الراوي", "د. حيدر البصري", "د. ميساء الجبوري",
      "د. عمر العبيدي", "د. فاطمة الزهراء", "د. أحمد خليل", "د. زينب القيسي",
      "د. ياسر التميمي", "د. نور الهدى", "د. بلال الصالح", "د. ريم الحديثي",
      "د. طارق السعدون", "د. لمى الكرخي", "د. وسام الدوري", "د. مروة السهيل"
    ];

    const doctors = await Promise.all(
      doctorNames.map((name, idx) =>
        User.create({
          fullName: name,
          email: `doctor${idx + 1}@university.edu`,
          password: 'doctor123456',
          role: 'DOCTOR',
          department: 'علوم الحاسوب',
        })
      )
    );
    console.log(`✅ Created 1 Admin, 1 Coordinator, and ${doctors.length} Doctors.`);

    // 3. Create 4 Stages
    const stages = await Stage.create([
      { name: 'المرحلة الأولى', stageNumber: 1, department: 'علوم الحاسوب', studentCount: 65, shift: 'MORNING' },
      { name: 'المرحلة الثانية', stageNumber: 2, department: 'علوم الحاسوب', studentCount: 55, shift: 'MORNING' },
      { name: 'المرحلة الثالثة', stageNumber: 3, department: 'علوم الحاسوب', studentCount: 45, shift: 'MORNING' },
      { name: 'المرحلة الرابعة', stageNumber: 4, department: 'علوم الحاسوب', studentCount: 40, shift: 'MORNING' },
    ]);
    console.log(`✅ Created ${stages.length} Academic Stages.`);

    // 4. Create 10 Rooms & Specialized Labs
    const rooms = await Room.create([
      { roomNumber: 'مدرج الخوارزمي (Hall A)', building: 'المبنى الرئيسي', roomType: 'LECTURE_HALL', capacity: 80 },
      { roomNumber: 'مدرج ابن الهيثم (Hall B)', building: 'المبنى الرئيسي', roomType: 'LECTURE_HALL', capacity: 70 },
      { roomNumber: 'مدرج الكندي (Hall C)', building: 'المبنى الرئيسي', roomType: 'LECTURE_HALL', capacity: 60 },
      { roomNumber: 'قاعة 201 (Hall D)', building: 'مبنى الحاسبات', roomType: 'LECTURE_HALL', capacity: 55 },
      { roomNumber: 'قاعة 202 (Hall E)', building: 'مبنى الحاسبات', roomType: 'LECTURE_HALL', capacity: 50 },
      { roomNumber: 'قاعة 203 (Hall F)', building: 'مبنى الحاسبات', roomType: 'LECTURE_HALL', capacity: 45 },
      { roomNumber: 'مختبر البرمجيات المركزي (Lab 1)', building: 'مبنى المختبرات', roomType: 'LAB', capacity: 70, features: ['Computers', 'Smart Board'] },
      { roomNumber: 'مختبر الذكاء الاصطناعي (Lab 2)', building: 'مبنى المختبرات', roomType: 'LAB', capacity: 65, features: ['GPUs', 'Workstations'] },
      { roomNumber: 'مختبر الشبكات (Lab 3)', building: 'مبنى المختبرات', roomType: 'LAB', capacity: 60, features: ['Cisco Routers', 'Switches'] },
      { roomNumber: 'مختبر الأمن السيبراني (Lab 4)', building: 'مبنى المختبرات', roomType: 'LAB', capacity: 50, features: ['Security Servers'] },
    ]);
    console.log(`✅ Created ${rooms.length} Halls and Labs.`);

    // 5. Create 28 Courses across 4 stages
    const courseDefs = [
      // Stage 1 (CS101 - CS102 - MATH101 ...)
      { name: 'أسس البرمجة', code: 'CS101', creditHours: 3, type: 'THEORY', stage: stages[0]._id, doc: doctors[0]._id },
      { name: 'مختبر أسس البرمجة', code: 'CS101L', creditHours: 2, type: 'PRACTICAL', stage: stages[0]._id, doc: doctors[1]._id },
      { name: 'الرياضيات المتقطعة', code: 'MATH101', creditHours: 3, type: 'THEORY', stage: stages[0]._id, doc: doctors[2]._id },
      { name: 'تراكيب الحاسوب', code: 'CS102', creditHours: 2, type: 'THEORY', stage: stages[0]._id, doc: doctors[3]._id },
      { name: 'اللغة الإنجليزية الأكاديمية', code: 'ENG101', creditHours: 2, type: 'THEORY', stage: stages[0]._id, doc: doctors[4]._id },
      { name: 'مبادئ الإلكترونيات', code: 'EE101', creditHours: 2, type: 'THEORY', stage: stages[0]._id, doc: doctors[5]._id },
      { name: 'حقوق الإنسان والديمقراطية', code: 'HUM101', creditHours: 2, type: 'THEORY', stage: stages[0]._id, doc: doctors[6]._id },

      // Stage 2
      { name: 'تراكيب البيانات والخوارزميات', code: 'CS201', creditHours: 3, type: 'THEORY', stage: stages[1]._id, doc: doctors[7]._id },
      { name: 'مختبر تراكيب البيانات', code: 'CS201L', creditHours: 2, type: 'PRACTICAL', stage: stages[1]._id, doc: doctors[8]._id },
      { name: 'البرمجة كائنية التوجه OOP', code: 'CS202', creditHours: 3, type: 'THEORY', stage: stages[1]._id, doc: doctors[9]._id },
      { name: 'مختبر OOP', code: 'CS202L', creditHours: 2, type: 'PRACTICAL', stage: stages[1]._id, doc: doctors[10]._id },
      { name: 'قواعد البيانات', code: 'CS203', creditHours: 3, type: 'THEORY', stage: stages[1]._id, doc: doctors[11]._id },
      { name: 'معمارية الحاسوب', code: 'CS204', creditHours: 2, type: 'THEORY', stage: stages[1]._id, doc: doctors[12]._id },
      { name: 'الإحصاء والاحتمالات', code: 'MATH201', creditHours: 2, type: 'THEORY', stage: stages[1]._id, doc: doctors[13]._id },

      // Stage 3
      { name: 'هندسة البرمجيات', code: 'CS301', creditHours: 3, type: 'THEORY', stage: stages[2]._id, doc: doctors[0]._id },
      { name: 'نظم التشغيل', code: 'CS302', creditHours: 3, type: 'THEORY', stage: stages[2]._id, doc: doctors[1]._id },
      { name: 'مختبر نظم التشغيل', code: 'CS302L', creditHours: 2, type: 'PRACTICAL', stage: stages[2]._id, doc: doctors[2]._id },
      { name: 'شبكات الحاسوب', code: 'CS303', creditHours: 3, type: 'THEORY', stage: stages[2]._id, doc: doctors[3]._id },
      { name: 'مختبر الشبكات', code: 'CS303L', creditHours: 2, type: 'PRACTICAL', stage: stages[2]._id, doc: doctors[4]._id },
      { name: 'تصميم وتحليل الخوارزميات', code: 'CS304', creditHours: 3, type: 'THEORY', stage: stages[2]._id, doc: doctors[5]._id },
      { name: 'برمجة الويب المتكاملة', code: 'CS305', creditHours: 2, type: 'THEORY', stage: stages[2]._id, doc: doctors[6]._id },

      // Stage 4
      { name: 'الذكاء الاصطناعي وتطبيقاته', code: 'CS401', creditHours: 3, type: 'THEORY', stage: stages[3]._id, doc: doctors[7]._id },
      { name: 'مختبر الذكاء الاصطناعي', code: 'CS401L', creditHours: 2, type: 'PRACTICAL', stage: stages[3]._id, doc: doctors[8]._id },
      { name: 'الأمن السيبراني والتشفير', code: 'CS402', creditHours: 3, type: 'THEORY', stage: stages[3]._id, doc: doctors[9]._id },
      { name: 'مختبر الأمن السيبراني', code: 'CS402L', creditHours: 2, type: 'PRACTICAL', stage: stages[3]._id, doc: doctors[10]._id },
      { name: 'تعلم الآلة Machine Learning', code: 'CS403', creditHours: 3, type: 'THEORY', stage: stages[3]._id, doc: doctors[11]._id },
      { name: 'الحوسبة السحابية', code: 'CS404', creditHours: 2, type: 'THEORY', stage: stages[3]._id, doc: doctors[12]._id },
      { name: 'مشروع التخرج', code: 'CS499', creditHours: 2, type: 'THEORY', stage: stages[3]._id, doc: doctors[13]._id },
    ];

    await Promise.all(
      courseDefs.map((c) =>
        Course.create({
          name: c.name,
          code: c.code,
          creditHours: c.creditHours,
          type: c.type,
          department: 'علوم الحاسوب',
          stage: c.stage,
          assignedDoctor: c.doc,
        })
      )
    );
    console.log(`✅ Created ${courseDefs.length} Academic Courses.`);

    // 6. Create Realistic Doctor Availabilities
    for (let i = 0; i < doctors.length; i++) {
      const unavail = [];
      if (i % 3 === 0) unavail.push({ dayOfWeek: 0, timeSlot: '08:30-10:00', isAvailable: false });
      if (i % 4 === 0) unavail.push({ dayOfWeek: 2, timeSlot: '12:00-13:30', isAvailable: false });
      if (i % 5 === 0) unavail.push({ dayOfWeek: 4, timeSlot: '13:45-15:15', isAvailable: false });

      if (unavail.length > 0) {
        await DoctorAvailability.create({
          doctor: doctors[i]._id,
          semester: 'Fall-2026',
          availability: unavail,
        });
      }
    }
    console.log(`✅ Generated Doctor Availability Preferences.`);

    console.log('\n🎉 Massive Data Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Massive Seeding Failed: ${error.message}`);
    process.exit(1);
  }
};

seedMassiveData();
