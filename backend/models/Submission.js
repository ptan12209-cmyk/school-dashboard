/**
 * Submission Model
 * ================
 * Represents student submissions for assignments
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Relationships
  assignment_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'assignments',
      key: 'id',
    },
    onDelete: 'CASCADE',
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

  // Attempt tracking
  attempt_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Lần làm bài thứ mấy',
  },

  // Answers
  answers: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Object mapping question_id to answer: {question_id: {answer, is_correct, points_earned}}',
  },

  // Grading
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Điểm đạt được',
  },

  max_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Điểm tối đa',
  },

  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Phần trăm điểm (%)',
  },

  // Status
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'grading', 'graded', 'returned'),
    defaultValue: 'draft',
    allowNull: false,
  },

  // Timing
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian bắt đầu làm bài',
  },

  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian nộp bài',
  },

  graded_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian chấm xong',
  },

  time_spent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Thời gian làm bài (giây)',
  },

  // Late submission
  is_late: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Nộp muộn hay không',
  },

  late_penalty: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Phần trăm trừ điểm do nộp muộn',
  },

  // Feedback
  teacher_feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Nhận xét của giáo viên',
  },

  graded_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'teachers',
      key: 'id',
    },
    comment: 'Giáo viên chấm bài',
  },

  // Auto-grade flag
  auto_graded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Được chấm tự động hay không',
  },

  needs_manual_grading: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Cần chấm tay (có câu essay/short answer)',
  },

  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'File đính kèm, ghi chú, etc.',
  },
}, {
  tableName: 'submissions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['assignment_id'] },
    { fields: ['student_id'] },
    { fields: ['status'] },
    { fields: ['submitted_at'] },
    { unique: true, fields: ['assignment_id', 'student_id', 'attempt_number'] },
  ],
});

/**
 * Instance Methods
 */

// Calculate score
Submission.prototype.calculateScore = function () {
  if (!this.answers || Object.keys(this.answers).length === 0) {
    this.score = 0;
    this.percentage = 0;
    return;
  }

  let totalEarned = 0;

  Object.values(this.answers).forEach((answer) => {
    if (answer.points_earned !== undefined) {
      totalEarned += parseFloat(answer.points_earned);
    }
  });

  // Apply late penalty
  if (this.is_late && this.late_penalty > 0) {
    const penalty = (totalEarned * this.late_penalty) / 100;
    totalEarned = Math.max(0, totalEarned - penalty);
  }

  this.score = totalEarned.toFixed(2);
  this.percentage = ((totalEarned / this.max_score) * 100).toFixed(2);
};

// Mark as submitted
Submission.prototype.submit = async function () {
  this.status = 'submitted';
  this.submitted_at = new Date();

  if (this.started_at) {
    const timeSpent = Math.floor((this.submitted_at - new Date(this.started_at)) / 1000);
    this.time_spent = timeSpent;
  }

  // Check if needs manual grading
  const hasManualQuestions = Object.values(this.answers).some(
    (answer) => answer.needs_manual_grading,
  );

  if (hasManualQuestions) {
    this.needs_manual_grading = true;
    this.status = 'grading';
  } else {
    this.status = 'graded';
    this.graded_at = new Date();
    this.auto_graded = true;
  }

  this.calculateScore();
  await this.save();
};

// Complete grading
Submission.prototype.completeGrading = async function (gradedBy) {
  this.status = 'graded';
  this.graded_at = new Date();
  this.graded_by = gradedBy;
  this.needs_manual_grading = false;

  this.calculateScore();
  await this.save();
};

// Get attempt summary
Submission.prototype.getSummary = function () {
  const totalQuestions = Object.keys(this.answers).length;
  const correctAnswers = Object.values(this.answers).filter((a) => a.is_correct).length;

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers: totalQuestions - correctAnswers,
    score: this.score,
    maxScore: this.max_score,
    percentage: this.percentage,
    status: this.status,
    timeSpent: this.time_spent,
    isLate: this.is_late,
  };
};

/**
 * Static Methods
 */

// Get student's best attempt
Submission.getBestAttempt = async function (assignmentId, studentId) {
  return await Submission.findOne({
    where: {
      assignment_id: assignmentId,
      student_id: studentId,
      status: 'graded',
    },
    order: [['score', 'DESC']],
  });
};

// Get student's attempts count
Submission.getAttemptsCount = async function (assignmentId, studentId) {
  return await Submission.count({
    where: {
      assignment_id: assignmentId,
      student_id: studentId,
    },
  });
};

// Get submissions needing grading
Submission.getNeedingGrading = async function (teacherId) {
  const { Assignment } = require('./index');

  return await Submission.findAll({
    where: {
      status: 'grading',
      needs_manual_grading: true,
    },
    include: [
      {
        model: Assignment,
        as: 'assignment',
        where: { teacher_id: teacherId },
      },
    ],
    order: [['submitted_at', 'ASC']],
  });
};

// Get assignment statistics
Submission.getAssignmentStats = async function (assignmentId) {
  const submissions = await Submission.findAll({
    where: {
      assignment_id: assignmentId,
      status: 'graded',
    },
  });

  if (submissions.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      avgPercentage: 0,
    };
  }

  const scores = submissions.map((s) => parseFloat(s.score));
  const percentages = submissions.map((s) => parseFloat(s.percentage));

  return {
    total: submissions.length,
    avgScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
    maxScore: Math.max(...scores).toFixed(2),
    minScore: Math.min(...scores).toFixed(2),
    avgPercentage: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2),
  };
};

module.exports = Submission;
