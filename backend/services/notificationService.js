/**
 * Notification Service
 * ====================
 * Handles creation and delivery of notifications
 */

const Notification = require('../models/Notification');
const emailService = require('./emailService');

class NotificationService {
  /**
   * Create and send a notification
   * @param {Object} data - Notification data
   * @param {String} data.userId - Recipient user ID
   * @param {String} data.type - Notification type
   * @param {String} data.title - Notification title
   * @param {String} data.message - Notification message
   * @param {Object} options - Additional options
   */
  async createNotification(data, options = {}) {
    try {
      const {
        userId,
        type = 'system',
        title,
        message,
        relatedType,
        relatedId,
        priority = 'medium',
        metadata = {},
        expiresAt,
      } = data;

      // Create notification in database
      const notification = await Notification.create({
        user_id: userId,
        type,
        title,
        message,
        related_type: relatedType,
        related_id: relatedId,
        priority,
        metadata,
        expires_at: expiresAt,
      });

      // Send email if requested
      if (options.sendEmail) {
        await this.sendEmailNotification(notification, options.user);
      }

      // Emit real-time notification via Socket.io
      if (options.io && options.io.to) {
        this.emitRealTimeNotification(options.io, userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(userIds, data, options = {}) {
    const notifications = [];

    for (const userId of userIds) {
      const notification = await this.createNotification(
        { ...data, userId },
        options,
      );
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification, user) {
    try {
      if (!user || !user.email) {
        console.warn('Cannot send email: user or email not provided');
        return false;
      }

      const emailData = {
        to: user.email,
        subject: notification.title,
        type: notification.type,
        data: {
          title: notification.title,
          message: notification.message,
          userName: `${user.firstName} ${user.lastName}`,
          priority: notification.priority,
          createdAt: notification.created_at,
        },
      };

      await emailService.sendNotificationEmail(emailData);
      await notification.markEmailSent();

      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  /**
   * Emit real-time notification via Socket.io
   */
  emitRealTimeNotification(io, userId, notification) {
    try {
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        createdAt: notification.created_at,
        metadata: notification.metadata,
      });

      console.log(`✅ Real-time notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error emitting real-time notification:', error);
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null,
    } = options;

    const where = { user_id: userId };

    if (unreadOnly) {
      where.is_read = false;
    }

    if (type) {
      where.type = type;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      notifications: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId) {
    return await Notification.markAllAsRead(userId);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const result = await Notification.destroy({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    return result > 0;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return await Notification.getUnreadCount(userId);
  }

  /**
   * Notification type helpers
   */

  // Grade posted notification
  async notifyGradePosted(studentId, gradeData, options = {}) {
    return await this.createNotification({
      userId: studentId,
      type: 'grade_posted',
      title: 'Điểm Số Mới',
      message: `Bạn nhận được điểm ${gradeData.score} cho môn ${gradeData.subject}`,
      relatedType: 'grade',
      relatedId: gradeData.gradeId,
      priority: 'medium',
      metadata: { grade: gradeData.score, subject: gradeData.subject },
    }, options);
  }

  // Attendance marked notification
  async notifyAttendanceMarked(studentId, attendanceData, options = {}) {
    const isAbsent = attendanceData.status === 'absent';

    return await this.createNotification({
      userId: studentId,
      type: 'attendance_marked',
      title: isAbsent ? 'Thông Báo Vắng Mặt' : 'Điểm Danh',
      message: isAbsent
        ? `Bạn đã vắng mặt buổi học ${attendanceData.subject} ngày ${attendanceData.date}`
        : `Điểm danh buổi học ${attendanceData.subject} ngày ${attendanceData.date}`,
      relatedType: 'attendance',
      relatedId: attendanceData.attendanceId,
      priority: isAbsent ? 'high' : 'low',
      metadata: attendanceData,
    }, options);
  }

  // Assignment due notification
  async notifyAssignmentDue(studentId, assignmentData, options = {}) {
    return await this.createNotification({
      userId: studentId,
      type: 'assignment_due',
      title: 'Nhắc Nhở Nộp Bài',
      message: `Bài tập ${assignmentData.name} sắp đến hạn: ${assignmentData.dueDate}`,
      relatedType: 'assignment',
      relatedId: assignmentData.assignmentId,
      priority: 'high',
      metadata: assignmentData,
    }, options);
  }

  // System announcement
  async notifyAnnouncement(userIds, announcementData, options = {}) {
    return await this.createBulkNotifications(
      userIds,
      {
        type: 'announcement',
        title: announcementData.title,
        message: announcementData.message,
        priority: announcementData.priority || 'medium',
        metadata: announcementData,
      },
      options,
    );
  }

  // Alert notification
  async notifyAlert(userId, alertData, options = {}) {
    return await this.createNotification({
      userId,
      type: 'alert',
      title: alertData.title,
      message: alertData.message,
      priority: 'urgent',
      metadata: alertData,
    }, { ...options, sendEmail: true });
  }
}

module.exports = new NotificationService();
