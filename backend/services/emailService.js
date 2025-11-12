/**
 * Email Service
 * ==============
 * Handles email sending with templates
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      console.log('✅ Email transporter initialized');
    } catch (error) {
      console.error('❌ Error initializing email transporter:', error);
    }
  }

  /**
   * Send email
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        console.warn('Email transporter not initialized');
        return false;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'AI School Dashboard <noreply@school.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Send notification email with template
   */
  async sendNotificationEmail(data) {
    const {
      to, subject, type, data: notificationData,
    } = data;

    const html = this.generateNotificationTemplate(type, notificationData);
    const text = this.generateTextVersion(notificationData);

    return await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML email template
   */
  generateNotificationTemplate(type, data) {
    const priorityColors = {
      low: '#52c41a',
      medium: '#1890ff',
      high: '#faad14',
      urgent: '#f5222d',
    };

    const priorityColor = priorityColors[data.priority] || '#1890ff';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                🎓 AI School Dashboard
              </h1>
            </td>
          </tr>

          <!-- Priority Badge -->
          <tr>
            <td style="padding: 20px 30px 0;">
              <div style="display: inline-block; background-color: ${priorityColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                ${this.getPriorityLabel(data.priority)}
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 30px;">
              <h2 style="color: #333; margin: 0 0 15px; font-size: 20px;">
                ${data.title}
              </h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Xin chào <strong>${data.userName}</strong>,
              </p>
              <div style="background-color: #f9f9f9; border-left: 4px solid ${priorityColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${data.message}
                </p>
              </div>
            </td>
          </tr>

          <!-- Call to Action -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5001'}/dashboard"
                 style="display: inline-block; background-color: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 10px;">
                Xem Chi Tiết
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 30px; border-top: 1px solid #e8e8e8;">
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
                Email này được gửi tự động từ AI School Dashboard.<br>
                Vui lòng không trả lời email này.<br>
                <br>
                <strong>AI School Dashboard</strong> © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate text version for email
   */
  generateTextVersion(data) {
    return `
🎓 AI School Dashboard

${data.title}

Xin chào ${data.userName},

${data.message}

---
Email này được gửi tự động từ AI School Dashboard.
Vui lòng không trả lời email này.

AI School Dashboard © ${new Date().getFullYear()}
    `.trim();
  }

  /**
   * Get priority label in Vietnamese
   */
  getPriorityLabel(priority) {
    const labels = {
      low: 'Thấp',
      medium: 'Trung Bình',
      high: 'Cao',
      urgent: 'Khẩn Cấp',
    };
    return labels[priority] || 'Trung Bình';
  }

  /**
   * Send grade notification email
   */
  async sendGradeNotification(to, studentName, gradeData) {
    return await this.sendNotificationEmail({
      to,
      subject: `Thông Báo Điểm Số Mới - ${gradeData.subject}`,
      type: 'grade_posted',
      data: {
        title: 'Điểm Số Mới',
        message: `Học sinh ${studentName} nhận được điểm ${gradeData.score} cho môn ${gradeData.subject}.`,
        userName: studentName,
        priority: 'medium',
        createdAt: new Date(),
      },
    });
  }

  /**
   * Send attendance notification email
   */
  async sendAttendanceNotification(to, studentName, attendanceData) {
    const isAbsent = attendanceData.status === 'absent';

    return await this.sendNotificationEmail({
      to,
      subject: isAbsent ? 'Thông Báo Vắng Mặt' : 'Thông Báo Điểm Danh',
      type: 'attendance_marked',
      data: {
        title: isAbsent ? 'Thông Báo Vắng Mặt' : 'Điểm Danh',
        message: isAbsent
          ? `Học sinh ${studentName} đã vắng mặt buổi học ${attendanceData.subject} ngày ${attendanceData.date}.`
          : `Học sinh ${studentName} đã có mặt buổi học ${attendanceData.subject} ngày ${attendanceData.date}.`,
        userName: studentName,
        priority: isAbsent ? 'high' : 'low',
        createdAt: new Date(),
      },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, userName) {
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Chào Mừng Đến AI School Dashboard</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎓 Chào Mừng!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333; margin: 0 0 20px;">Xin chào ${userName}!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Chào mừng bạn đến với <strong>AI School Dashboard</strong> - nền tảng quản lý giáo dục thông minh.
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Bạn có thể bắt đầu khám phá các tính năng của hệ thống ngay bây giờ!
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5001'}/dashboard"
                   style="display: inline-block; background-color: #1890ff; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Truy Cập Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #e8e8e8;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                AI School Dashboard © ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return await this.sendEmail({
      to,
      subject: 'Chào Mừng Đến AI School Dashboard',
      html,
      text: `Chào mừng ${userName} đến với AI School Dashboard!`,
    });
  }
}

module.exports = new EmailService();
