const express = require('express');

const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * All notification routes require authentication
 */
router.use(verifyToken);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications (paginated)
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 * @query   filter - Filter: 'unread', 'read', or all (default: all)
 */
router.get('/', notificationController.getUserNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get unread notification count
 * @access  Private
 * @note    This route must be BEFORE /:id to avoid matching 'unread' as an id
 */
router.get('/unread/count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 * @note    This route must be BEFORE /:id/read to avoid route conflicts
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 * @note    This route must be BEFORE /:id to avoid matching 'read' as an id
 */
router.delete('/read', notificationController.deleteReadNotifications);

/**
 * @route   POST /api/notifications/test
 * @desc    Create a test notification (development only)
 * @access  Private
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', notificationController.createTestNotification);
}

/**
 * @route   GET /api/notifications/:id
 * @desc    Get single notification
 * @access  Private
 */
router.get('/:id', notificationController.getNotification);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
