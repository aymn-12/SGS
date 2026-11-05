import { BrevoClient } from '@getbrevo/brevo';

const getBrevoClient = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    return null;
  }
  return new BrevoClient({ apiKey });
};

/**
 * Base email sending function via Brevo Transactional Email API.
 */
export const sendEmail = async ({ to, toName, subject, htmlContent }) => {
  const senderName = process.env.BREVO_SENDER_NAME || 'نظام الجداول الأكاديمية - SGS';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'notifications@sgs-academic.edu';

  const client = getBrevoClient();

  if (!client) {
    console.log(`[Brevo Email - Mock Mode] Email would be sent to: ${to} (${toName})`);
    console.log(`  📧 Subject: ${subject}`);
    console.log(`  💡 Notice: Set a valid BREVO_API_KEY in .env for live transmission.`);
    return { success: true, mocked: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const response = await client.transactionalEmails.sendTransacEmail({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
    });

    console.log(`[Brevo Email] Successfully sent email to ${to} (MessageId: ${response?.messageId || 'OK'})`);
    return { success: true, messageId: response?.messageId };
  } catch (error) {
    console.error(`[Brevo Email Error] Failed to send email to ${to}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send Lecture Rescheduled Email Notification to Doctor.
 */
export const sendLectureRescheduledEmail = async ({
  doctorEmail,
  doctorName,
  courseName,
  roomName,
  dayName,
  timeSlot,
}) => {
  const subject = `⚠️ تنبيه هام: تعديل موعد محاضرة [${courseName}]`;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #ffffff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .badge { display: inline-block; background: #fef08a; color: #854d0e; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-top: 10px; }
        .content { padding: 30px 25px; line-height: 1.8; }
        .greeting { font-size: 17px; font-weight: 600; margin-bottom: 15px; color: #1e293b; }
        .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-right: 5px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
        .detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .detail-label { color: #64748b; font-weight: 600; }
        .detail-val { color: #0f172a; font-weight: 700; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>نظام الجداول الأكاديمية الذكي</h1>
          <div class="badge">إشعار إعادة جدولة محاضرة</div>
        </div>
        <div class="content">
          <div class="greeting">سعادة الدكتور / ${doctorName}، تحية طيبة وبعد،</div>
          <p>نحيطكم علماً بأنه قد تم تحديث موعد المحاضرة المذكورة أدناه بناءً على متطلبات القسم الأكاديمي، وتفاصيل الموعد والمكان الجديد هي كالتالي:</p>
          
          <div class="details-card">
            <div class="detail-row">
              <span class="detail-label">📚 المادة الدراسية:</span>
              <span class="detail-val">${courseName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📍 القاعة / المختبر الجديد:</span>
              <span class="detail-val" style="color: #2563eb;">${roomName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 اليوم:</span>
              <span class="detail-val">${dayName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">⏰ التوقيت الجديد:</span>
              <span class="detail-val" style="color: #16a34a;">${timeSlot}</span>
            </div>
          </div>

          <p style="font-size: 14px; color: #64748b;">يرجى التفضل بمراجعة جدولكم الدراسي عبر المنظومة أو تطبيق الهاتف للتأكد من المواعيد المحدثة.</p>
        </div>
        <div class="footer">
          تم إرسال هذا البريد تلقائياً عبر خدمة <strong>Brevo</strong> التابعة لمنظومة SGS الأكاديمية.<br>
          جميع الحقوق محفوظة &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: doctorEmail,
    toName: doctorName,
    subject,
    htmlContent,
  });
};

/**
 * Send Official Timetable Published Email.
 */
export const sendTimetablePublishedEmail = async ({
  doctorEmail,
  doctorName,
  department,
  semester,
}) => {
  const subject = `📢 اعتماد ونشر الجدول الدراسي الرسمي - قسم ${department}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #0f766e, #0d9488); color: #ffffff; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .content { padding: 30px 25px; line-height: 1.8; }
        .details-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>نظام الجداول الأكاديمية الذكي</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">إعلان رسمي بصدور الجدول الدراسي</p>
        </div>
        <div class="content">
          <p style="font-weight: 600; font-size: 16px;">حضرة الأستاذ / ${doctorName} المحترم،</p>
          <p>يسر عمادة الكلية ومقررية قسم <strong>${department}</strong> إعلامكم بأنه تم اعتماد ونشر الجدول الدراسي الرسمي للفصل الدراسي <strong>${semester}</strong> بنجاح.</p>
          
          <div class="details-box">
            <h3 style="margin: 0 0 10px; color: #0f766e;">الجدول الدراسي أصبح متاحاً الآن</h3>
            <p style="margin: 0; color: #475569;">يمكنكم الدخول إلى حسابكم واستعراض مواعيدكم وقاعاتكم وتصدير الجدول الخاص بكم بصيغة PDF.</p>
          </div>
        </div>
        <div class="footer">
          نظام الجداول الأكاديمية الذكي (SGS) &bull; عبر خدمة البريد Brevo
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: doctorEmail,
    toName: doctorName,
    subject,
    htmlContent,
  });
};
