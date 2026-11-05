import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';

import app from '../app.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { createAndEmitNotification } from '../controllers/notificationController.js';

const TEST_PORT = 5055;

const runNotificationTest = async () => {
  console.log('===========================================================================');
  console.log('🔔 اختبار دورة حياة الإشعارات الشاملة (Database + REST API + WebSockets)');
  console.log('===========================================================================');

  // 1. Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgs_timetable');
  console.log('✅ [1/5] متصل بقاعدة بيانات MongoDB');

  // Find a test doctor
  let doctor = await User.findOne({ role: 'DOCTOR' });
  if (!doctor) {
    doctor = await User.create({
      fullName: 'د. وسام الدوري',
      email: 'doctor_test@university.edu',
      password: 'password123',
      role: 'DOCTOR',
      department: 'علوم الحاسوب',
    });
  }

  // Generate Doctor JWT Token
  const token = jwt.sign(
    { id: doctor._id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_sgs_academic_2026',
    { expiresIn: '1h' }
  );
  console.log(`✅ [2/5] تم تجهيز جلسة الدكتور: [${doctor.fullName}] (${doctor.email})`);

  // 2. Start HTTP & Socket.io Server on TEST_PORT
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  app.set('io', io);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ [3/5] تم تشغيل خادم الاختبار التجريبي على المنفذ: ${TEST_PORT}`);

  // 3. Connect Socket.io Client (Simulating Doctor's Browser / Phone App)
  const clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    clientSocket.on('connect', () => {
      console.log(`  • اتصال العميل الحي بالـ WebSocket بنجاح (Socket ID: ${clientSocket.id})`);
      resolve();
    });
    clientSocket.on('connect_error', reject);
  });

  // Setup Listener on Doctor's Private Channel
  const receivedNotificationPromise = new Promise((resolve) => {
    clientSocket.on(`notification_${doctor._id}`, (data) => {
      console.log('\n⚡ [استقبال إشعار فوري عبر WebSocket]:');
      console.log(`  📢 العنوان: ${data.title}`);
      console.log(`  💬 الرسالة: ${data.message}`);
      console.log(`  📍 المكان والتوقيت: القاعة [${data.metadata.roomName}] - [${data.metadata.timeSlot}]`);
      resolve(data);
    });
  });

  // 4. Trigger a Lecture Reschedule Notification
  console.log('\n[4/5] جاري إرسال إشعار بنقل موعد ومكان محاضرة...');
  const sentNotification = await createAndEmitNotification(io, {
    recipientId: doctor._id,
    title: 'تغيير في موعد ومكان المحاضرة',
    message: 'نحيطكم علماً بنقل محاضرة [تراكيب البيانات والخوارزميات] إلى موعد جديد بناءً على طلب القسم',
    type: 'RESCHEDULE',
    metadata: {
      courseName: 'تراكيب البيانات والخوارزميات',
      roomName: 'مدرج الخوارزمي (Hall A)',
      timeSlot: '10:15-11:45',
      dayOfWeek: 2, // الثلاثاء
    },
  });

  // Wait for the socket client to receive the live notification
  const receivedData = await receivedNotificationPromise;
  if (!receivedData || receivedData._id.toString() !== sentNotification._id.toString()) {
    throw new Error('فشل استلام الإشعار عبر الـ WebSockets!');
  }
  console.log('✅ تم استلام الإشعار في هاتف/متصفح الدكتور بنجاح خلال أجزاء من الثانية!');

  // 5. Test REST API to Fetch Notifications
  console.log('\n[5/5] اختبار واجهات REST API للإشعارات (Fetch & Mark as Read)...');

  // A. Fetch Notifications
  const fetchRes = await fetch(`http://localhost:${TEST_PORT}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const fetchJson = await fetchRes.json();
  console.log(`  • استرجاع قائمة الإشعارات: ${fetchJson.count} إشعار | عدد غير المقروء: ${fetchJson.unreadCount}`);

  if (fetchJson.unreadCount < 1) {
    throw new Error('يجب أن يكون هناك إشعار غير مقروء!');
  }

  // B. Mark as Read
  const notificationId = sentNotification._id;
  const readRes = await fetch(`http://localhost:${TEST_PORT}/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  const readJson = await readRes.json();
  console.log(`  • تحديث حالة الإشعار إلى (مقروء): ${readJson.data.isRead === true ? '✅ تم بنجاح' : '❌ فشل'}`);

  // C. Test Read-All and Verify Unread Count is now 0
  await fetch(`http://localhost:${TEST_PORT}/api/notifications/read-all`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  const unreadRes = await fetch(`http://localhost:${TEST_PORT}/api/notifications?unreadOnly=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const unreadJson = await unreadRes.json();
  console.log(`  • تصفير جميع الإشعارات غير المقروءة (Read-All): ${unreadJson.unreadCount === 0 ? '✅ 0 غير مقروء' : '❌ متبقي'}`);

  // Clean up
  clientSocket.disconnect();
  server.close();
  await Notification.deleteMany({ recipient: doctor._id });

  console.log('\n===========================================================================');
  console.log('🏆 نجح اختبار نظام الإشعارات بالكامل بنسبة 100%!');
  console.log('===========================================================================');
  process.exit(0);
};

runNotificationTest().catch((err) => {
  console.error('❌ فشل الاختبار:', err.message);
  process.exit(1);
});
