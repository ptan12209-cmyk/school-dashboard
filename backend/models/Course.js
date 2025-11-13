const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Course name cannot be empty' },
      len: {
        args: [1, 100],
        msg: 'Course name must be 1-100 characters',
      },
    },
  },

  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Course code cannot be empty' },
      is: {
        args: /^[A-Z0-9-]+$/i,
        msg: 'Course code can only contain letters, numbers, and hyphens',
      },
    },
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  class_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'classes',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  teacher_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'teachers',
      key: 'id',
    },
    onDelete: 'RESTRICT',
  },

  subject: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Subject cannot be empty' },
    },
  },

  credits: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: {
        args: [0.5],
        msg: 'Credits must be at least 0.5',
      },
      max: {
        args: [10.0],
        msg: 'Credits cannot exceed 10.0',
      },
    },
  },

  semester: {
    type: DataTypes.ENUM('1', '2', 'Full Year'),
    allowNull: false,
    defaultValue: 'Full Year',
  },

  school_year: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '2024-2025',
    validate: {
      is: {
        args: /^\d{4}-\d{4}$/,
        msg: 'School year must be in format YYYY-YYYY',
      },
    },
  },

  schedule: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Schedule in format: [{day: "Monday", time: "08:00-09:00"}]',
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'courses',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['code'],
    },
    {
      unique: false,
      fields: ['class_id'],
    },
    {
      unique: false,
      fields: ['teacher_id'],
    },
    {
      unique: false,
      fields: ['subject'],
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
 * Get student count enrolled in course
 */
Course.prototype.getEnrollmentCount = async function () {
  const Class = require('./Class');
  const Student = require('./Student');

  const classData = await Class.findByPk(this.class_id, {
    include: [{
      model: Student,
      as: 'students',
      attributes: ['id'],
    }],
  });

  return classData && classData.students ? classData.students.length : 0;
};

/**
 * Get average grade for course
 */
Course.prototype.getAverageGrade = async function () {
  const Grade = require('./Grade');

  const result = await Grade.findOne({
    where: { course_id: this.id },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
    ],
    raw: true,
  });

  return result && result.avgScore ? parseFloat(result.avgScore).toFixed(2) : null;
};

/**
 * Get course statistics
 */
Course.prototype.getStatistics = async function () {
  const Grade = require('./Grade');

  const grades = await Grade.findAll({
    where: { course_id: this.id },
    attributes: ['score'],
    raw: true,
  });

  if (grades.length === 0) {
    return {
      totalGrades: 0,
      average: null,
      highest: null,
      lowest: null,
      passRate: null,
    };
  }

  const scores = grades.map((g) => parseFloat(g.score));
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const passed = scores.filter((s) => s >= 60).length;

  return {
    totalGrades: grades.length,
    average: average.toFixed(2),
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    passRate: ((passed / grades.length) * 100).toFixed(1),
  };
};

/**
 * Class Methods (Static)
 */

/**
 * Find courses by subject
 */
Course.findBySubject = function (subject) {
  return this.findAll({
    where: {
      subject,
      is_active: true,
    },
    order: [['name', 'ASC']],
  });
};

/**
 * Find courses by teacher
 */
Course.findByTeacher = function (teacherId) {
  return this.findAll({
    where: {
      teacher_id: teacherId,
      is_active: true,
    },
    order: [['name', 'ASC']],
  });
};

/**
 * Find courses by class
 */
Course.findByClass = function (classId) {
  return this.findAll({
    where: {
      class_id: classId,
      is_active: true,
    },
    order: [['subject', 'ASC']],
  });
};

/**
 * Find courses by school year
 */
Course.findBySchoolYear = function (schoolYear) {
  return this.findAll({
    where: {
      school_year: schoolYear,
      is_active: true,
    },
    order: [['subject', 'ASC'], ['name', 'ASC']],
  });
};

/**
 * Get all unique subjects
 */
Course.getAllSubjects = async function () {
  const subjects = await this.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('subject')), 'subject'],
    ],
    where: { is_active: true },
    order: [['subject', 'ASC']],
    raw: true,
  });

  return subjects.map((s) => s.subject);
};

/**
 * Get course statistics
 */
Course.getStats = async function () {
  const total = await this.count();
  const active = await this.count({ where: { is_active: true } });

  const bySubject = await this.findAll({
    attributes: [
      'subject',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: { is_active: true },
    group: ['subject'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    raw: true,
  });

  const bySemester = await this.findAll({
    attributes: [
      'semester',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: { is_active: true },
    group: ['semester'],
    raw: true,
  });

  return {
    total,
    active,
    bySubject: bySubject.map((item) => ({
      subject: item.subject,
      count: parseInt(item.count, 10),
    })),
    bySemester: bySemester.map((item) => ({
      semester: item.semester,
      count: parseInt(item.count, 10),
    })),
  };
};

module.exports = Course;
