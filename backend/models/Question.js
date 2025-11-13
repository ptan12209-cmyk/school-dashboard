/**
 * Question Model
 * ==============
 * Represents individual questions in assignments
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Relationship
  assignment_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'assignments',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  // Question Content
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Câu hỏi không được để trống' },
    },
  },

  question_type: {
    type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'),
    allowNull: false,
    defaultValue: 'multiple_choice',
  },

  // Multiple Choice Options
  options: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of choices for multiple choice questions: [{id, text, isCorrect}]',
  },

  // Correct Answer(s)
  correct_answer: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Đáp án đúng (option id for MC, text for others)',
  },

  // Alternative Answers (for flexible grading)
  alternative_answers: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Các đáp án chấp nhận được khác',
  },

  // Points
  points: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: { args: [0], msg: 'Điểm phải >= 0' },
    },
  },

  // Order
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Thứ tự hiển thị câu hỏi',
  },

  // Explanation
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Giải thích đáp án (hiển thị sau khi nộp bài)',
  },

  // Settings
  case_sensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Phân biệt chữ hoa/thường (cho short answer)',
  },

  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Dữ liệu bổ sung (hints, images, etc.)',
  },

  // Difficulty
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: true,
    comment: 'Độ khó của câu hỏi',
  },

  // Statistics
  times_answered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số lần được trả lời',
  },

  times_correct: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Số lần trả lời đúng',
  },
}, {
  tableName: 'questions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['assignment_id'] },
    { fields: ['question_type'] },
    { fields: ['order'] },
  ],
});

/**
 * Instance Methods
 */

// Check if answer is correct (for auto-gradable questions)
Question.prototype.checkAnswer = function (studentAnswer) {
  if (!studentAnswer) return false;

  switch (this.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return studentAnswer === this.correct_answer;

    case 'short_answer':
    case 'fill_blank': {
      const correctAnswers = [
        this.correct_answer,
        ...(this.alternative_answers || []),
      ];

      if (this.case_sensitive) {
        return correctAnswers.includes(studentAnswer);
      }
      const lowerAnswer = studentAnswer.toLowerCase().trim();
      return correctAnswers.some((ans) => ans.toLowerCase().trim() === lowerAnswer);
    }

    case 'essay':
      // Essays require manual grading
      return null;

    default:
      return false;
  }
};

// Get success rate
Question.prototype.getSuccessRate = function () {
  if (this.times_answered === 0) return 0;
  return ((this.times_correct / this.times_answered) * 100).toFixed(2);
};

// Update statistics
Question.prototype.updateStatistics = async function (isCorrect) {
  this.times_answered += 1;
  if (isCorrect) {
    this.times_correct += 1;
  }
  await this.save();
};

// Is auto-gradable
Question.prototype.isAutoGradable = function () {
  return ['multiple_choice', 'true_false', 'short_answer', 'fill_blank'].includes(this.question_type);
};

/**
 * Static Methods
 */

// Get questions by assignment with order
Question.getByAssignment = async function (assignmentId, shuffle = false) {
  const questions = await Question.findAll({
    where: { assignment_id: assignmentId },
    order: shuffle ? [sequelize.fn('RANDOM')] : [['order', 'ASC']],
  });

  return questions;
};

// Get difficult questions (success rate < 50%)
Question.getDifficultQuestions = async function (assignmentId) {
  const questions = await Question.findAll({
    where: {
      assignment_id: assignmentId,
      times_answered: {
        [sequelize.Sequelize.Op.gt]: 0,
      },
    },
  });

  return questions.filter((q) => parseFloat(q.getSuccessRate()) < 50);
};

module.exports = Question;
