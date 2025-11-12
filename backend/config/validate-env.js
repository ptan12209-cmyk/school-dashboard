/**
 * Environment Variables Validation
 * ==================================
 * Validates that all required environment variables are set
 * and meets minimum security requirements
 *
 * Usage: require('./config/validate-env') at the top of server.js
 */

require('dotenv').config();

console.log('🔍 Validating environment variables...\n');

// ============================================
// REQUIRED VARIABLES
// ============================================

const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'NODE_ENV',
];

let hasErrors = false;

// Check each required variable
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

// ============================================
// SECURITY CHECKS
// ============================================

console.log('\n🔐 Running security checks...\n');

// 1. JWT_SECRET strength
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET is too short (minimum 32 characters required)');
    console.error('   Current length:', process.env.JWT_SECRET.length);
    console.error('   Generate strong secret with:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    hasErrors = true;
  } else if (process.env.JWT_SECRET === 'your_jwt_secret_key_minimum_32_characters_long_change_in_production') {
    console.error('❌ JWT_SECRET is still using default value!');
    console.error('   Please generate a new secret with:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    hasErrors = true;
  } else {
    console.log('✅ JWT_SECRET: Strong (length:', `${process.env.JWT_SECRET.length})`);
  }
}

// 2. Database password check
if (process.env.DB_PASSWORD) {
  if (process.env.DB_PASSWORD.length < 4) {
    console.warn('⚠️  DB_PASSWORD seems weak (less than 4 characters)');
  } else if (process.env.DB_PASSWORD === 'postgres' && process.env.NODE_ENV === 'production') {
    console.error('❌ DB_PASSWORD is using default "postgres" in production!');
    console.error('   Please use a strong password in production');
    hasErrors = true;
  } else {
    console.log('✅ DB_PASSWORD: Set');
  }
}

// 3. NODE_ENV check
if (process.env.NODE_ENV) {
  const validEnvs = ['development', 'test', 'production'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.warn(`⚠️  NODE_ENV="${process.env.NODE_ENV}" is not standard`);
    console.warn('   Expected: development, test, or production');
  } else {
    console.log(`✅ NODE_ENV: ${process.env.NODE_ENV}`);
  }
}

// 4. Port check
if (process.env.PORT) {
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ PORT must be a valid number between 1-65535');
    hasErrors = true;
  } else {
    console.log(`✅ PORT: ${port}`);
  }
}

// ============================================
// OPTIONAL BUT RECOMMENDED
// ============================================

console.log('\n📋 Checking optional variables...\n');

const optionalVars = {
  CORS_ORIGIN: 'CORS configuration',
  JWT_EXPIRATION: 'JWT token expiration time',
  BCRYPT_ROUNDS: 'Password hashing rounds',
  RATE_LIMIT_WINDOW_MS: 'Rate limiting window',
  RATE_LIMIT_MAX_REQUESTS: 'Rate limiting max requests',
};

Object.entries(optionalVars).forEach(([varName, description]) => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set (${description})`);
  } else {
    console.log(`ℹ️  ${varName}: Not set (${description}) - using defaults`);
  }
});

// ============================================
// FINAL RESULT
// ============================================

console.log(`\n${'='.repeat(50)}`);

if (hasErrors) {
  console.error('❌ ENVIRONMENT VALIDATION FAILED!');
  console.error('='.repeat(50));
  console.error('\n💡 Please fix the errors above before starting the server.\n');
  console.error('Check your .env file and ensure all required variables are set.\n');
  process.exit(1);
} else {
  console.log('✅ ENVIRONMENT VALIDATION PASSED!');
  console.log('='.repeat(50));
  console.log('\nAll required environment variables are properly configured.');
  console.log('Server can start safely.\n');
}

module.exports = {
  validated: true,
};
