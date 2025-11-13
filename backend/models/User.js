/**
 * User Model - Authentication
 * ============================
 * Sequelize model for users table
 *
 * Features:
 * - Password hashing with bcrypt
 * - JWT token generation
 * - Instance methods (comparePassword, generateToken)
 * - Class methods (findByEmail)
 * - Automatic timestamp updates
 *
 * Relations:
 * - hasOne Student (through studentProfile)
 * - hasOne Teacher (through teacherProfile)
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');
const { jwtConfig, passwordConfig } = require('../config/auth');

const User = sequelize.define('User', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique user identifier',
  },

  // Authentication fields
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address',
      },
      notEmpty: {
        msg: 'Email cannot be empty',
      },
    },
    comment: 'User email for login',
  },

  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Bcrypt hashed password',
  },

  // Authorization
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'parent', 'student'),
    allowNull: false,
    defaultValue: 'student',
    validate: {
      isIn: {
        args: [['admin', 'teacher', 'parent', 'student']],
        msg: 'Role must be admin, teacher, parent, or student',
      },
    },
    comment: 'User role for access control',
  },

  // Account status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Account active status',
  },
}, {
  // Model options
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true, // Use snake_case for column names

  // Indexes
  indexes: [
    {
      unique: true,
      fields: ['email'],
    },
    {
      fields: ['role'],
    },
    {
      fields: ['is_active'],
    },
  ],

  // Hooks - Lifecycle events
  hooks: {
    // Hash password before creating user
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(passwordConfig.saltRounds);
        // eslint-disable-next-line no-param-reassign
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },

    // Hash password before updating if changed
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        const salt = await bcrypt.genSalt(passwordConfig.saltRounds);
        // eslint-disable-next-line no-param-reassign
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
  },

  // Exclude password_hash from default JSON output
  defaultScope: {
    attributes: {
      exclude: ['password_hash'],
    },
  },

  // Scope to include password (for authentication)
  scopes: {
    withPassword: {
      attributes: {},
    },
  },
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Compare password for login
 * @param {string} candidatePassword - Password to verify
 * @returns {Promise<boolean>} True if password matches
 */
User.prototype.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password_hash);
};
/**
 * Generate JWT token for authentication
 * @returns {string} JWT token
 */
User.prototype.generateToken = function () {
  return jwt.sign(
    {
      id: this.id,
      email: this.email,
      role: this.role,
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    },
  );
};

/**
 * Get user profile without sensitive data
 * @returns {Object} User profile object
 */
User.prototype.getProfile = function () {
  const { password_hash, ...profile } = this.toJSON();
  return profile;
};

/**
 * Check if user has specific role
 * @param {string|string[]} roles - Role or array of roles to check
 * @returns {boolean} True if user has any of the specified roles
 */
User.prototype.hasRole = function (roles) {
  if (Array.isArray(roles)) {
    return roles.includes(this.role);
  }
  return this.role === roles;
};

// ============================================
// CLASS METHODS (STATIC)
// ============================================

/**
 * Find user by email (with password for authentication)
 * @param {string} email - Email address
 * @returns {Promise<User|null>} User instance or null
 */
User.findByEmail = async function (email) {
  return await this.scope('withPassword').findOne({
    where: { email: email.toLowerCase() },
  });
};

/**
 * Find active users only
 * @param {Object} filters - Additional where conditions
 * @returns {Promise<User[]>} Array of active users
 */
User.findActive = async function (filters = {}) {
  return await this.findAll({
    where: {
      is_active: true,
      ...filters,
    },
  });
};

/**
 * Find users by role
 * @param {string} role - User role
 * @returns {Promise<User[]>} Array of users with specified role
 */
User.findByRole = async function (role) {
  return await this.findAll({
    where: {
      role,
      is_active: true,
    },
  });
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
User.validatePassword = function (password) {
  const errors = [];

  if (!password || password.length < passwordConfig.minLength) {
    errors.push(`Password must be at least ${passwordConfig.minLength} characters`);
  }

  if (passwordConfig.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordConfig.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordConfig.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordConfig.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = User;
