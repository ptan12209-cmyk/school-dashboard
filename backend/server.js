const http = require('http');
const app = require('./app');
require('dotenv').config();
require('./config/validate-env');
// Database connection
const { sequelize } = require('./config/database');
const { initializeSocket } = require('./config/socket');

/**
 * Server Configuration
 */
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start Server Function
 * =====================
 */
async function startServer() {
  try {
    /**
     * Step 1: Test Database Connection
     */
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    /**
     * Step 2: Sync Database Models (Development only)
     * WARNING: Use migrations in production!
     */
    if (NODE_ENV === 'development') {
      // Sync database models (non-destructive in development)
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized');
      console.log('⚠️  NOTE: For schema changes, use migrations in production');
    } else if (NODE_ENV === 'production') {
      // In production, verify models match database schema
      // Do not sync - use migrations instead
      console.log('✅ Production mode: Using existing database schema');
      console.log('⚠️  Run migrations before deployment: npx sequelize-cli db:migrate');
    }

    /**
     * Step 3: Initialize Socket.io
     */
    const httpServer = http.createServer(app);
    const io = initializeSocket(httpServer);

    // Make io available to app
    app.locals.io = io;

    /**
     * Step 4: Start HTTP Server
     */
    const server = httpServer.listen(PORT, HOST, () => {
      console.log('');
      console.log('========================================');
      console.log('🎓 AI SCHOOL DASHBOARD API SERVER');
      console.log('========================================');
      console.log(`📡 Server running on: http://${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
      console.log('========================================');
      console.log('');
      console.log('📚 Available endpoints:');
      console.log(`   - Health check: http://${HOST}:${PORT}/health`);
      console.log(`   - API base: http://${HOST}:${PORT}/api`);
      console.log(`   - WebSocket: ws://${HOST}:${PORT}`);
      console.log('');
      console.log('💡 Press Ctrl+C to stop the server');
      console.log('');
    });

    /**
     * Graceful Shutdown Handlers
     * ==========================
     * Handle server shutdown gracefully
     */

    // Handle SIGTERM signal (e.g., from Heroku)
    process.on('SIGTERM', () => {
      console.log('');
      console.log('⚠️  SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');

        // Close database connection
        sequelize.close()
          .then(() => {
            console.log('✅ Database connection closed');
            process.exit(0);
          })
          .catch((err) => {
            console.error('❌ Error closing database connection:', err);
            process.exit(1);
          });
      });
    });

    // Handle SIGINT signal (e.g., Ctrl+C)
    process.on('SIGINT', () => {
      console.log('');
      console.log('⚠️  SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');

        // Close database connection
        sequelize.close()
          .then(() => {
            console.log('✅ Database connection closed');
            process.exit(0);
          })
          .catch((err) => {
            console.error('❌ Error closing database connection:', err);
            process.exit(1);
          });
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('');
      console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Stack trace:', err.stack);
      console.error('');

      // Close server and exit
      server.close(() => {
        process.exit(1);
      });

      // Force exit if server doesn't close in 1 second
      setTimeout(() => {
        console.error('❌ Forcing shutdown...');
        process.exit(1);
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('');
      console.error('💥 UNHANDLED REJECTION! Shutting down...');
      console.error('Reason:', reason);
      console.error('Promise:', promise);
      console.error('');

      // Close server and exit
      server.close(() => {
        process.exit(1);
      });

      // Force exit if server doesn't close in 1 second
      setTimeout(() => {
        console.error('❌ Forcing shutdown...');
        process.exit(1);
      }, 1000);
    });
  } catch (error) {
    console.error('');
    console.error('❌ Failed to start server:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('');

    // Exit with failure code
    process.exit(1);
  }
}

/**
 * Start the server
 */
startServer();

/**
 * Export server for testing purposes
 */
module.exports = app;
