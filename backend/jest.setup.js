/**
 * Jest Setup File
 * ===============
 * Load environment variables before running tests
 * This file runs BEFORE all tests
 */

// Load environment variables from .env.test
require('dotenv').config({
  path: '.env.test',
});

// If .env.test doesn't exist, try .env
if (!process.env.DB_PASSWORD) {
  require('dotenv').config({
    path: '.env',
  });
}

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

// Log to verify (comment out in production)
console.log('✅ Jest Setup: Environment loaded');
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - DB_NAME:', process.env.DB_NAME);
console.log('   - DB_USER:', process.env.DB_USER);
console.log('   - DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
