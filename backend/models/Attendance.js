const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  course_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'courses',
      key: 'id',
    },
    onDelete: 'SET NULL',
    comment: 'NULL means general attendance (not for specific course)',
  },

  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Late', 'Excused'),
    allowNull: false,
    defaultValue: 'Present',
  },

  check_in_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },

  check_out_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  marked_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'SET NULL',
    comment: 'Teacher/admin who marked attendance',
  },
}, {
  tableName: 'attendance',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: false,
      fields: ['student_id'],
    },
    {
      unique: false,
      fields: ['course_id'],
    },
    {
      unique: false,
      fields: ['date'],
    },
    {
      unique: false,
      fields: ['status'],
    },
    {
      // Prevent duplicate attendance records for same student/course/date
      unique: true,
      fields: ['student_id', 'course_id', 'date'],
    },
  ],
});

/**
 * Instance Methods
 */

/**
 * Check if student was present
 */
Attendance.prototype.wasPresent = function () {
  return this.status === 'Present';
};

/**
 * Check if attendance is problematic
 */
Attendance.prototype.isProblematic = function () {
  return ['Absent', 'Late'].includes(this.status);
};

/**
 * Get duration if check-in/out times exist
 */
Attendance.prototype.getDuration = function () {
  if (!this.check_in_time || !this.check_out_time) {
    return null;
  }

  const checkIn = new Date(`2000-01-01T${this.check_in_time}`);
  const checkOut = new Date(`2000-01-01T${this.check_out_time}`);

  const diffMs = checkOut - checkIn;
  const diffMins = Math.round(diffMs / 60000);

  return {
    minutes: diffMins,
    hours: (diffMins / 60).toFixed(2),
  };
};

/**
 * Class Methods (Static)
 */

/**
 * Find attendance by student
 */
Attendance.findByStudent = function (studentId, options = {}) {
  const where = { student_id: studentId };

  if (options.courseId) {
    where.course_id = options.courseId;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.startDate && options.endDate) {
    where.date = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate],
    };
  }

  return this.findAll({
    where,
    order: [['date', 'DESC']],
  });
};

/**
 * Find attendance by course
 */
Attendance.findByCourse = function (courseId, options = {}) {
  const where = { course_id: courseId };

  if (options.date) {
    where.date = options.date;
  }

  if (options.status) {
    where.status = options.status;
  }

  return this.findAll({
    where,
    order: [['date', 'DESC']],
  });
};

/**
 * Find attendance by date
 */
Attendance.findByDate = function (date, options = {}) {
  const where = { date };

  if (options.courseId) {
    where.course_id = options.courseId;
  }

  if (options.status) {
    where.status = options.status;
  }

  return this.findAll({
    where,
    order: [['student_id', 'ASC']],
  });
};

/**
 * Calculate attendance rate for student
 */
Attendance.calculateAttendanceRate = async function (studentId, options = {}) {
  const where = { student_id: studentId };

  if (options.courseId) {
    where.course_id = options.courseId;
  }

  if (options.startDate && options.endDate) {
    where.date = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate],
    };
  }

  const total = await this.count({ where });

  if (total === 0) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      rate: 0,
    };
  }

  const present = await this.count({ where: { ...where, status: 'Present' } });
  const absent = await this.count({ where: { ...where, status: 'Absent' } });
  const late = await this.count({ where: { ...where, status: 'Late' } });
  const excused = await this.count({ where: { ...where, status: 'Excused' } });

  const rate = ((present / total) * 100).toFixed(1);

  return {
    total,
    present,
    absent,
    late,
    excused,
    rate: parseFloat(rate),
  };
};

/**
 * Get attendance statistics for a course
 */
Attendance.getCourseStats = async function (courseId, options = {}) {
  const where = { course_id: courseId };

  if (options.date) {
    where.date = options.date;
  }

  const total = await this.count({ where });

  if (total === 0) {
    return {
      total: 0,
      byStatus: {},
      rate: 0,
    };
  }

  const byStatus = await this.findAll({
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where,
    group: ['status'],
    raw: true,
  });

  const present = byStatus.find((s) => s.status === 'Present');
  const presentCount = present ? parseInt(present.count) : 0;
  const rate = ((presentCount / total) * 100).toFixed(1);

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {}),
    rate: parseFloat(rate),
  };
};

/**
 * Get overall attendance statistics
 */
Attendance.getStats = async function (options = {}) {
  const where = {};

  if (options.startDate && options.endDate) {
    where.date = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate],
    };
  }

  const total = await this.count({ where });

  const byStatus = await this.findAll({
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where,
    group: ['status'],
    raw: true,
  });

  const present = byStatus.find((s) => s.status === 'Present');
  const presentCount = present ? parseInt(present.count) : 0;
  const overallRate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;

  return {
    total,
    overallRate: parseFloat(overallRate),
    byStatus: byStatus.map((item) => ({
      status: item.status,
      count: parseInt(item.count),
      percentage: ((parseInt(item.count) / total) * 100).toFixed(1),
    })),
  };
};

/**
 * Get students with poor attendance
 */
Attendance.getPoorAttendance = async function (threshold = 80, options = {}) {
  const Student = require('./Student');

  const where = {};

  if (options.courseId) {
    where.course_id = options.courseId;
  }

  if (options.startDate && options.endDate) {
    where.date = {
      [sequelize.Sequelize.Op.between]: [options.startDate, options.endDate],
    };
  }

  // Get all students with attendance records
  const studentIds = await this.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('student_id')), 'student_id']],
    where,
    raw: true,
  });

  const poorAttendance = [];

  for (const { student_id } of studentIds) {
    const stats = await this.calculateAttendanceRate(student_id, options);

    if (stats.rate < threshold) {
      const student = await Student.findByPk(student_id, {
        attributes: ['id', 'first_name', 'last_name'],
      });

      poorAttendance.push({
        student,
        attendance: stats,
      });
    }
  }

  return poorAttendance;
};

module.exports = Attendance;
