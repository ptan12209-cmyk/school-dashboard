/**
 * Notification Model
 * ==================
 * Manages system notifications for users
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Recipient user ID
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  // Notification type
  type: {
    type: DataTypes.ENUM(
      'grade_posted', // Điểm số mới
      'attendance_marked', // Điểm danh
      'assignment_due', // Hạn nộp bài
      'announcement', // Thông báo chung
      'message', // Tin nhắn
      'alert', // Cảnh báo
      'system', // Hệ thống
    ),
    allowNull: false,
    defaultValue: 'system',
  },

  // Notification title
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Title cannot be empty' },
    },
  },

  // Notification message
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Message cannot be empty' },
    },
  },

  // Related entity (optional)
  related_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of related entity: student, grade, attendance, etc.',
  },

  related_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of related entity',
  },

  // Priority level
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
  },

  // Read status
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // Read at timestamp
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Email sent status
  email_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Push notification sent
  push_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  push_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Additional metadata (JSON)
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },

  // Expiry date (optional)
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['type'],
    },
    {
      fields: ['is_read'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['user_id', 'is_read'],
    },
  ],
});

/**
 * Mark notification as read
 */
Notification.prototype.markAsRead = async function () {
  this.is_read = true;
  this.read_at = new Date();
  await this.save();
  return this;
};

/**
 * Mark notification as sent via email
 */
Notification.prototype.markEmailSent = async function () {
  this.email_sent = true;
  this.email_sent_at = new Date();
  await this.save();
  return this;
};

/**
 * Mark notification as sent via push
 */
Notification.prototype.markPushSent = async function () {
  this.push_sent = true;
  this.push_sent_at = new Date();
  await this.save();
  return this;
};

/**
 * Check if notification is expired
 */
Notification.prototype.isExpired = function () {
  if (!this.expires_at) return false;
  return new Date() > new Date(this.expires_at);
};

/**
 * Static method: Get unread count for user
 */
Notification.getUnreadCount = async function (userId) {
  return await this.count({
    where: {
      user_id: userId,
      is_read: false,
    },
  });
};

/**
 * Static method: Mark all as read for user
 */
Notification.markAllAsRead = async function (userId) {
  return await this.update(
    {
      is_read: true,
      read_at: new Date(),
    },
    {
      where: {
        user_id: userId,
        is_read: false,
      },
    },
  );
};

/**
 * Static method: Delete old notifications
 */
Notification.deleteOldNotifications = async function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.destroy({
    where: {
      created_at: {
        [sequelize.Sequelize.Op.lt]: cutoffDate,
      },
      is_read: true,
    },
  });
};

module.exports = Notification;
