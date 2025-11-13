require('dotenv').config();

const { Sequelize } = require('sequelize');

const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'school_dashboard',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log, // Enable SQL query logging in development
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'school_dashboard_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },

  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Disable logging in production
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: true, // ✅ SECURITY FIX: Enforce SSL validation
        // Provide CA certificate if using self-signed cert
        ca: process.env.DB_SSL_CA || undefined,
      },
    },
  },
};

/**
 * Get current environment configuration
 */
const env = process.env.NODE_ENV || 'development';
const currentConfig = config[env];

/**
 * Initialize Sequelize instance
 */
const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  currentConfig,
);

/**
 * Test database connection on startup
 */
sequelize.authenticate()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => console.error('❌ Database connection error:', err.message));

/**
 * ✅ SECURITY FIX: Validate required production environment variables
 */
if (process.env.NODE_ENV === 'production') {
  const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`❌ FATAL: Missing required production env vars: ${missing.join(', ')}`);
  }
}

module.exports = {
  config: currentConfig,
  sequelize,
  Sequelize,
};
