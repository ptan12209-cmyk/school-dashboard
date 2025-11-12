const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Class name cannot be empty' },
      len: {
        args: [1, 100],
        msg: 'Class name must be 1-100 characters',
      },
    },
  },

  grade_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: 'Grade level must be at least 1',
      },
      max: {
        args: [12],
        msg: 'Grade level must not exceed 12',
      },
    },
  },

  teacher_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'teachers',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },

  room_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  max_students: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    validate: {
      min: {
        args: [1],
        msg: 'Max students must be at least 1',
      },
      max: {
        args: [100],
        msg: 'Max students cannot exceed 100',
      },
    },
  },

  school_year: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '2024-2025',
    validate: {
      is: {
        args: /^\d{4}-\d{4}$/,
        msg: 'School year must be in format YYYY-YYYY (e.g., 2024-2025)',
      },
    },
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'classes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: false,
      fields: ['teacher_id'],
    },
    {
      unique: false,
      fields: ['grade_level'],
    },
    {
      unique: false,
      fields: ['school_year'],
    },
  ],
});

/**
 * Instance Methods
 */

/**
 * Get student count in class
 */
Class.prototype.getStudentCount = async function () {
  const Student = require('./Student');
  return await Student.count({ where: { class_id: this.id } });
};

/**
 * Check if class is full
 */
Class.prototype.isFull = async function () {
  const count = await this.getStudentCount();
  return count >= this.max_students;
};

/**
 * Get class capacity info
 */
Class.prototype.getCapacityInfo = async function () {
  const count = await this.getStudentCount();
  return {
    current: count,
    max: this.max_students,
    available: this.max_students - count,
    isFull: count >= this.max_students,
    percentFull: Math.round((count / this.max_students) * 100),
  };
};

/**
 * Class Methods (Static)
 */

/**
 * Find classes by grade level
 */
Class.findByGradeLevel = async function (gradeLevel) {
  return await this.findAll({
    where: {
      grade_level: gradeLevel,
      is_active: true,
    },
    order: [['name', 'ASC']],
  });
};

/**
 * Find classes by school year
 */
Class.findBySchoolYear = function (schoolYear) {
  return this.findAll({
    where: {
      school_year: schoolYear,
      is_active: true,
    },
    order: [['grade_level', 'ASC'], ['name', 'ASC']],
  });
};

/**
 * Find classes with available space
 */
Class.findAvailable = async function () {
  const Student = require('./Student');

  const classes = await this.findAll({
    where: { is_active: true },
    include: [{
      model: Student,
      as: 'students',
      attributes: ['id'],
    }],
  });

  return classes.filter((cls) => {
    const studentCount = cls.students ? cls.students.length : 0;
    return studentCount < cls.max_students;
  });
};

/**
 * Get class statistics
 */
Class.getStats = async function () {
  const Student = require('./Student');

  const total = await this.count();
  const active = await this.count({ where: { is_active: true } });

  const byGradeLevel = await this.findAll({
    attributes: [
      'grade_level',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: { is_active: true },
    group: ['grade_level'],
    order: [['grade_level', 'ASC']],
    raw: true,
  });

  // Get total students across all classes
  const totalStudents = await Student.count({
    where: {
      class_id: { [sequelize.Sequelize.Op.ne]: null },
    },
  });

  return {
    total,
    active,
    byGradeLevel: byGradeLevel.map((item) => ({
      gradeLevel: item.grade_level,
      count: parseInt(item.count),
    })),
    totalStudents,
  };
};

module.exports = Class;
