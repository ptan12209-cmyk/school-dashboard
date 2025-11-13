/**
 * Teacher Model - FIXED VERSION
 * ==============================
 * Sequelize model for teachers table
 *
 * ✅ FIXED: hire_date validation now uses dynamic check
 *
 * Relations:
 * - belongsTo User (through user_id)
 * - hasMany Class (homeroom classes)
 * - hasMany Course (teaching assignments)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Teacher = sequelize.define('Teacher', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique teacher identifier',
  },

  // Foreign key to users
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    comment: 'Links to users table for authentication',
  },

  // Personal information
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'First name cannot be empty',
      },
      len: {
        args: [1, 100],
        msg: 'First name must be between 1 and 100 characters',
      },
    },
    comment: 'Teacher first name',
  },

  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Last name cannot be empty',
      },
      len: {
        args: [1, 100],
        msg: 'Last name must be between 1 and 100 characters',
      },
    },
    comment: 'Teacher last name',
  },

  // Professional information
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Teaching department/subject area',
  },

  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: {
        args: /^[0-9\s\-+()]*$/i,
        msg: 'Phone number can only contain numbers, spaces, and +-() characters',
      },
    },
    comment: 'Contact phone number',
  },

  // ✅ FIXED: Dynamic validation instead of static date
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: {
        msg: 'Hire date must be a valid date',
      },
      notFuture(value) {
        const inputDate = new Date(value);
        const today = new Date();

        // Compare only dates, ignore time
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (inputDate > today) {
          throw new Error('Hire date cannot be in the future');
        }
      },
    },
    comment: 'Date when teacher was hired',
  },
}, {
  // Model options
  tableName: 'teachers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,

  // Indexes
  indexes: [
    {
      unique: true,
      fields: ['user_id'],
    },
    {
      fields: ['department'],
    },
    {
      fields: ['first_name', 'last_name'],
    },
    {
      fields: ['hire_date'],
    },
  ],
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get full name of teacher
 * @returns {string} Full name
 */
Teacher.prototype.getFullName = function () {
  return `${this.first_name} ${this.last_name}`;
};

/**
 * Get years of service
 * @returns {number|null} Years since hire date
 */
Teacher.prototype.getYearsOfService = function () {
  if (!this.hire_date) return null;

  const hireDate = new Date(this.hire_date);
  const today = new Date();
  const years = today.getFullYear() - hireDate.getFullYear();

  return years;
};

// ============================================
// CLASS METHODS (STATIC)
// ============================================

/**
 * Find teachers by department
 * @param {string} department - Department name
 * @returns {Promise<Teacher[]>} Array of teachers
 */
Teacher.findByDepartment = async function (department) {
  return await this.findAll({
    where: { department },
    order: [['last_name', 'ASC']],
  });
};

/**
 * Find senior teachers (hired before certain date)
 * @param {Date} beforeDate - Cutoff date
 * @returns {Promise<Teacher[]>} Array of senior teachers
 */
Teacher.findSenior = async function (beforeDate) {
  const { Op } = require('sequelize');
  return await this.findAll({
    where: {
      hire_date: {
        [Op.lt]: beforeDate,
      },
    },
    order: [['hire_date', 'ASC']],
  });
};

module.exports = Teacher;
