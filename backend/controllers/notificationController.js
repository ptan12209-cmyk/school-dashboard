/**
 * Notification Controller
 * =======================
 * Handles notification CRUD operations and status management
 */

const { Notification } = require('../models');
const notificationService = require('../services/notificationService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Get user notifications with pagination
 * GET /api/notifications
 */
exports.getUserNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, filter } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // Apply filters
  if (filter === 'unread') {
    options.unreadOnly = true;
  } else if (filter === 'read') {
    options.readOnly = true;
  }

  const result = await notificationService.getUserNotifications(userId, options);

  res.json({
    success: true,
    data: result.notifications,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
});

/**
 * Get unread notification count
 * GET /api/notifications/unread/count
 */
exports.getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const count = await Notification.getUnreadCount(userId);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * Get single notification
 * GET /api/notifications/:id
 */
exports.getNotification = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const notification = await Notification.findOne({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông báo',
    });
  }

  res.json({
    success: true,
    data: notification,
  });
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
exports.markAsRead = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const notification = await notificationService.markAsRead(id, userId);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông báo',
    });
  }

  // Get updated unread count
  const count = await Notification.getUnreadCount(userId);

  // Emit real-time update
  const { io } = req.app.locals;
  if (io) {
    io.emitToUser(userId, 'notification_count', count);
  }

  res.json({
    success: true,
    data: notification,
    unreadCount: count,
  });
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const count = await notificationService.markAllAsRead(userId);

  // Emit real-time update
  const { io } = req.app.locals;
  if (io) {
    io.emitToUser(userId, 'notification_count', 0);
    io.emitToUser(userId, 'all_notifications_read');
  }

  res.json({
    success: true,
    data: {
      markedCount: count,
      unreadCount: 0,
    },
  });
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const notification = await Notification.findOne({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông báo',
    });
  }

  await notification.destroy();

  // Get updated unread count
  const count = await Notification.getUnreadCount(userId);

  // Emit real-time update
  const { io } = req.app.locals;
  if (io) {
    io.emitToUser(userId, 'notification_count', count);
    io.emitToUser(userId, 'notification_deleted', id);
  }

  res.json({
    success: true,
    message: 'Đã xóa thông báo',
    unreadCount: count,
  });
});

/**
 * Delete all read notifications
 * DELETE /api/notifications/read
 */
exports.deleteReadNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const result = await Notification.destroy({
    where: {
      user_id: userId,
      is_read: true,
    },
  });

  res.json({
    success: true,
    message: `Đã xóa ${result} thông báo đã đọc`,
    deletedCount: result,
  });
});

/**
 * Create test notification (for development/testing)
 * POST /api/notifications/test
 */
exports.createTestNotification = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { io } = req.app.locals;

  const notification = await notificationService.createNotification({
    user_id: userId,
    type: 'system',
    title: 'Thông Báo Test',
    message: 'Đây là thông báo test từ hệ thống',
    priority: 'medium',
  }, {
    io,
    sendEmail: false,
    sendPush: false,
  });

  res.json({
    success: true,
    message: 'Đã tạo thông báo test',
    data: notification,
  });
});
