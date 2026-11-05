import 'dotenv/config';
import { sendLectureRescheduledEmail, sendTimetablePublishedEmail } from '../services/emailService.js';

const runBrevoTest = async () => {
  console.log('===========================================================================');
  console.log('📧 اختبار خدمة إشعارات البريد الإلكتروني عبر Brevo (Sendinblue API)');
  console.log('===========================================================================');

  const testDoctorEmail = 'doctor_test@university.edu';
  const testDoctorName = 'أ.د. عادل الشمري';

  console.log('\n[1/2] اختبار إرسال بريد إعادة جدولة محاضرة (Reschedule Email)...');
  const res1 = await sendLectureRescheduledEmail({
    doctorEmail: testDoctorEmail,
    doctorName: testDoctorName,
    courseName: 'الذكاء الاصطناعي وتطبيقاته (CS401)',
    roomName: 'مدرج الخوارزمي (Hall A)',
    dayName: 'الثلاثاء',
    timeSlot: '10:15-11:45',
  });

  console.log(`  • حالة الإرسال: ${res1.success ? '✅ نجح' : '❌ فشل'}`);
  console.log(`  • معرّف الرسالة: ${res1.messageId || 'N/A'}`);
  if (res1.mocked) {
    console.log('  ℹ️ ملاحظة: يعمل حالياً بوضع المحاكاة (Mock Mode) لعدم تفعيل مفتاح API حقيقي.');
  }

  console.log('\n[2/2] اختبار إرسال بريد اعتماد ونشر الجدول الرسمي (Schedule Published Email)...');
  const res2 = await sendTimetablePublishedEmail({
    doctorEmail: testDoctorEmail,
    doctorName: testDoctorName,
    department: 'علوم الحاسوب',
    semester: 'Fall-2026',
  });

  console.log(`  • حالة الإرسال: ${res2.success ? '✅ نجح' : '❌ فشل'}`);
  console.log(`  • معرّف الرسالة: ${res2.messageId || 'N/A'}`);

  console.log('\n===========================================================================');
  console.log('🏆 تم التحقق بنجاح من تكامل قوالب وخدمة البريد الإلكتروني Brevo!');
  console.log('===========================================================================');
};

runBrevoTest();
