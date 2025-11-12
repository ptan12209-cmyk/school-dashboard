/**
 * Assignment Model
 * ================
 * Represents homework, quizzes, and exams
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Basic Information
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Tiêu đề không được để trống' },
      len: { args: [3, 255], msg: 'Tiêu đề phải từ 3-255 ký tự' },
    },
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Hướng dẫn chi tiết cho học sinh',
  },

  // Type & Category
  type: {
    type: DataTypes.ENUM('homework', 'quiz', 'exam', 'practice'),
    allowNull: false,
    defaultValue: 'homework',
    comment: 'Loại bài tập',
  },

  // Relationships
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
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

  // Grading
  total_points: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 100,
    validate: {
      min: { args: [0], msg: 'Điểm tối đa phải >= 0' },
      max: { args: [1000], msg: 'Điểm tối đa phải <= 1000' },
    },
  },

  passing_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Điểm đạt phải >= 0' },
    },
    comment: 'Điểm tối thiểu để đạt',
  },

  // Timing
  available_from: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian bắt đầu có thể làm bài',
  },

  due_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hạn nộp bài',
  },

  time_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Thời gian làm bài (phút), null = không giới hạn',
  },

  // Late Submission
  allow_late_submission: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Cho phép nộp muộn',
  },

  late_penalty_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 10,
    validate: {
      min: { args: [0], msg: 'Phần trăm phạt phải >= 0' },
      max: { args: [100], msg: 'Phần trăm phạt phải <= 100' },
    },
    comment: 'Phần trăm trừ điểm khi nộp muộn (mỗi ngày)',
  },

  // Settings
  max_attempts: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    validate: {
      min: { args: [1], msg: 'Số lần làm tối thiểu là 1' },
    },
    comment: 'Số lần làm bài tối đa',
  },

  shuffle_questions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Xáo trộn thứ tự câu hỏi',
  },

  show_correct_answers: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Hiển thị đáp án đúng sau khi nộp',
  },

  auto_grade: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Tự động chấm điểm (cho multiple choice)',
  },

  // Status
  status: {
    type: DataTypes.ENUM('draft', 'published', 'closed', 'archived'),
    defaultValue: 'draft',
    allowNull: false,
  },

  // Statistics
  total_submissions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Tổng số bài nộp',
  },

  avg_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Điểm trung bình',
  },

  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Dữ liệu bổ sung (attachments, settings, etc.)',
  },
}, {
  tableName: 'assignments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['course_id'] },
    { fields: ['teacher_id'] },
    { fields: ['status'] },
    { fields: ['due_date'] },
    { fields: ['type'] },
  ],
});

/**
 * Instance Methods
 */

// Check if assignment is available
Assignment.prototype.isAvailable = function () {
  const now = new Date();

  if (this.status !== 'published') return false;

  if (this.available_from && now < new Date(this.available_from)) {
    return false;
  }

  return true;
};

// Check if assignment is overdue
Assignment.prototype.isOverdue = function () {
  if (!this.due_date) return false;
  return new Date() > new Date(this.due_date);
};

// Calculate late penalty
Assignment.prototype.calculateLatePenalty = function (submittedAt) {
  if (!this.due_date || !this.allow_late_submission) return 0;

  const dueDate = new Date(this.due_date);
  const submitDate = new Date(submittedAt);

  if (submitDate <= dueDate) return 0;

  const daysLate = Math.ceil((submitDate - dueDate) / (1000 * 60 * 60 * 24));
  const penalty = daysLate * (this.late_penalty_percent || 0);

  return Math.min(penalty, 100); // Max 100% penalty
};

// Update statistics
Assignment.prototype.updateStatistics = async function () {
  const { Submission } = require('./index');

  const submissions = await Submission.findAll({
    where: { assignment_id: this.id, status: 'graded' },
    attributes: ['score'],
  });

  this.total_submissions = submissions.length;

  if (submissions.length > 0) {
    const totalScore = submissions.reduce((sum, sub) => sum + parseFloat(sub.score || 0), 0);
    this.avg_score = (totalScore / submissions.length).toFixed(2);
  } else {
    this.avg_score = null;
  }

  await this.save();
};

/**
 * Static Methods
 */

// Get upcoming assignments
Assignment.getUpcoming = async function (courseId, limit = 5) {
  return await Assignment.findAll({
    where: {
      course_id: courseId,
      status: 'published',
      due_date: {
        [sequelize.Sequelize.Op.gte]: new Date(),
      },
    },
    order: [['due_date', 'ASC']],
    limit,
  });
};

// Get overdue assignments
Assignment.getOverdue = async function (courseId) {
  return await Assignment.findAll({
    where: {
      course_id: courseId,
      status: 'published',
      due_date: {
        [sequelize.Sequelize.Op.lt]: new Date(),
      },
    },
    order: [['due_date', 'DESC']],
  });
};

module.exports = Assignment;
