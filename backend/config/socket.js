/**
 * Socket.io Configuration
 * =======================
 * Real-time notification system setup
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Initialize Socket.io server
 */
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:5001'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      return next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`✅ User connected: ${socket.user.email} (${userId})`);

    // Join user-specific room
    socket.join(`user_${userId}`);

    // Join role-specific room
    socket.join(`role_${socket.user.role}`);

    // Handle client requesting notification count
    socket.on('request_notification_count', async () => {
      try {
        const { Notification } = require('../models');
        const count = await Notification.getUnreadCount(userId);
        socket.emit('notification_count', count);
      } catch (error) {
        console.error('Error getting notification count:', error);
      }
    });

    // Handle mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      try {
        const { Notification } = require('../models');
        const notification = await Notification.findOne({
          where: { id: notificationId, user_id: userId },
        });

        if (notification) {
          await notification.markAsRead();
          const count = await Notification.getUnreadCount(userId);
          socket.emit('notification_count', count);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    // Handle mark all as read
    socket.on('mark_all_read', async () => {
      try {
        const { Notification } = require('../models');
        await Notification.markAllAsRead(userId);
        socket.emit('notification_count', 0);
        socket.emit('all_notifications_read');
      } catch (error) {
        console.error('Error marking all as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`👋 User disconnected: ${socket.user.email}`);
    });
  });

  // Add helper method to emit to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  // Add helper method to emit to role
  io.emitToRole = (role, event, data) => {
    io.to(`role_${role}`).emit(event, data);
  };

  console.log('✅ Socket.io server initialized');
  return io;
}

module.exports = { initializeSocket };
