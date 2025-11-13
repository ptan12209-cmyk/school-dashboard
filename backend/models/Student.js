/**
 * Student Model
 * ==============
 * Sequelize model for students table
 *
 * Relations:
 * - belongsTo User (through user_id)
 * - belongsTo Class (through class_id)
 * - hasMany Grade (student grades)
 * - hasMany Attendance (attendance records)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique student identifier',
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
    comment: 'Student first name',
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
    comment: 'Student last name',
  },

  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: {
        msg: 'Date of birth must be a valid date',
      },
      isOldEnough(value) {
        const minAge = 10;
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (age < minAge) {
          throw new Error(`Student must be at least ${minAge} years old`);
        }
      },
      isNotTooOld(value) {
        const maxAge = 25;
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (age > maxAge) {
          throw new Error(`Student age cannot exceed ${maxAge} years`);
        }
      },
    },
    comment: 'Student date of birth',
  },

  gender: {
    type: DataTypes.ENUM('M', 'F', 'Other'),
    allowNull: true,
    validate: {
      isIn: {
        args: [['M', 'F', 'Other']],
        msg: 'Gender must be M, F, or Other',
      },
    },
    comment: 'Student gender',
  },

  // Class assignment
  class_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'classes',
      key: 'id',
    },
    onDelete: 'SET NULL',
    comment: 'Current class assignment (null for new students)',
  },

  // Contact information
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: {
        args: /^[0-9\s\-+()]*$/i,
        msg: 'Phone number can only contain numbers, spaces, and +-() characters',
      },
    },
    comment: 'Student contact phone',
  },

  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Student residential address',
  },

  // Parent/Guardian information
  parent_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Parent or guardian full name',
  },

  parent_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: {
        args: /^[0-9\s\-+()]*$/i,
        msg: 'Parent phone can only contain numbers, spaces, and +-() characters',
      },
    },
    comment: 'Parent or guardian contact phone',
  },

  parent_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Parent email must be a valid email address',
      },
    },
    comment: 'Parent or guardian email',
  },
}, {
  // Model options
  tableName: 'students',
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
      fields: ['class_id'],
    },
    {
      fields: ['first_name', 'last_name'],
    },
    {
      fields: ['date_of_birth'],
    },
    {
      fields: ['parent_email'],
    },
  ],
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get full name of student
 * @returns {string} Full name
 */
Student.prototype.getFullName = function () {
  return `${this.first_name} ${this.last_name}`;
};

/**
 * Calculate student age
 * @returns {number} Age in years
 */
Student.prototype.getAge = function () {
  const birthDate = new Date(this.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Check if student has parent contact
 * @returns {boolean} True if parent contact exists
 */
Student.prototype.hasParentContact = function () {
  return !!(this.parent_phone || this.parent_email);
};

/**
 * Get display info for UI
 * @returns {Object} Display information
 */
Student.prototype.getDisplayInfo = function () {
  return {
    id: this.id,
    fullName: this.getFullName(),
    age: this.getAge(),
    email: this.user?.email,
    class: this.class?.name,
    hasContact: this.hasParentContact(),
  };
};

// ============================================
// CLASS METHODS (STATIC)
// ============================================

/**
 * Find students by class
 * @param {string} classId - Class UUID
 * @returns {Promise<Student[]>} Array of students
 */
Student.findByClass = async function (classId) {
  return await this.findAll({
    where: { class_id: classId },
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
  });
};

/**
 * Find students by age range
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {Promise<Student[]>} Array of students
 */
Student.findByAgeRange = async function (minAge, maxAge) {
  // eslint-disable-next-line global-require
  const { Op } = require('sequelize');
  const today = new Date();

  // Calculate birth date range
  const maxBirthDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  const minBirthDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());

  return await this.findAll({
    where: {
      date_of_birth: {
        [Op.between]: [minBirthDate, maxBirthDate],
      },
    },
    order: [['date_of_birth', 'DESC']],
  });
};

/**
 * Find students without class assignment
 * @returns {Promise<Student[]>} Array of unassigned students
 */
Student.findUnassigned = async function () {
  return await this.findAll({
    where: { class_id: null },
    order: [['last_name', 'ASC']],
  });
};

/**
 * Search students by name
 * @param {string} searchTerm - Name to search
 * @returns {Promise<Student[]>} Array of matching students
 */
Student.searchByName = async function (searchTerm) {
  // eslint-disable-next-line global-require
  const { Op } = require('sequelize');
  return await this.findAll({
    where: {
      [Op.or]: [
        { first_name: { [Op.iLike]: `%${searchTerm}%` } },
        { last_name: { [Op.iLike]: `%${searchTerm}%` } },
      ],
    },
    order: [['last_name', 'ASC']],
  });
};

module.exports = Student;
