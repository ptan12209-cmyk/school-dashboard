require('dotenv').config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in production environment. Please set JWT_SECRET in your .env file.');
}

// Generate secure random secret for development if not provided
const getJWTSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // Only allow fallback in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be defined in production');
  }

  // Generate a random secret for development (warning logged)
  const crypto = require('crypto');
  const randomSecret = crypto.randomBytes(64).toString('hex');
  console.warn('⚠️  WARNING: Using auto-generated JWT_SECRET for development. Set JWT_SECRET in .env for production!');
  return randomSecret;
};

const jwtConfig = {
  // Secret key for signing tokens
  // IMPORTANT: Generate secure secret with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  secret: getJWTSecret(),

  // Token expiration time
  expiresIn: process.env.JWT_EXPIRATION || '24h', // Options: '15m', '1h', '24h', '7d'

  // Refresh token expiration (longer than access token)
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',

  // JWT algorithm
  algorithm: 'HS256',

  // Issuer (optional)
  issuer: 'ai-school-dashboard',

  // Audience (optional)
  audience: 'school-users',
};

/**
 * Password Hashing Configuration (bcrypt)
 */
const passwordConfig = {
  // Salt rounds for bcrypt (higher = more secure but slower)
  // Recommended: 10-12 for production
  saltRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,

  // Minimum password requirements
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

/**
 * Session Configuration (if using sessions)
 * ✅ SECURITY FIX: Require strong session secret in production
 */
const getSessionSecret = () => {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // Only allow fallback in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be defined in production');
  }

  // Generate a random secret for development (warning logged)
  const crypto = require('crypto');
  const randomSecret = crypto.randomBytes(64).toString('hex');
  console.warn('⚠️  WARNING: Using auto-generated SESSION_SECRET for development. Set SESSION_SECRET in .env for production!');
  return randomSecret;
};

const sessionConfig = {
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * CORS Configuration
 */
const corsConfig = {
  // Allowed origins (frontend URLs)
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization'],

  // How long to cache preflight requests (in seconds)
  maxAge: 86400, // 24 hours
};

/**
 * Rate Limiting Configuration
 */
const rateLimitConfig = {
  // Time window in milliseconds
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes

  // Maximum requests per window
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Error message
  message: 'Too many requests from this IP, please try again later.',

  // Return rate limit info in headers
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Role-based access control
 */
const roles = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
};

/**
 * Role hierarchy (for permission checks)
 * Higher level includes all lower level permissions
 */
const roleHierarchy = {
  admin: ['admin', 'teacher', 'parent', 'student'],
  teacher: ['teacher', 'student'],
  parent: ['parent'],
  student: ['student'],
};

module.exports = {
  jwtConfig,
  passwordConfig,
  sessionConfig,
  corsConfig,
  rateLimitConfig,
  roles,
  roleHierarchy,
};
