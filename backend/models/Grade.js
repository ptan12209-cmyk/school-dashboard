const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  course_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Score cannot be negative'
      },
      max: {
        args: [10],
        msg: 'Score cannot exceed 10'
      }
    }
  },
  
  letter_grade: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  
  grade_type: {
    type: DataTypes.ENUM('Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final', 'Participation'),
    allowNull: false,
    defaultValue: 'Assignment'
  },
  
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: {
        args: [0],
        msg: 'Weight cannot be negative'
      },
      max: {
        args: [100],
        msg: 'Weight cannot exceed 100'
      }
    },
    comment: 'Weight percentage for this grade (e.g., 10 for 10%)'
  },
  
  semester: {
    type: DataTypes.ENUM('1', '2', 'Final'),
    allowNull: false
  },
  
  graded_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the grade is visible to students'
  }
}, {
  tableName: 'grades',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: false,
      fields: ['student_id']
    },
    {
      unique: false,
      fields: ['course_id']
    },
    {
      unique: false,
      fields: ['semester']
    },
    {
      unique: false,
      fields: ['graded_date']
    },
    {
      // Ensure one grade per student per course per type per semester
      unique: true,
      fields: ['student_id', 'course_id', 'grade_type', 'semester']
    }
  ],
  hooks: {
    /**
     * Before save hook - Calculate letter grade
     */
    beforeSave: (grade) => {
      grade.letter_grade = Grade.calculateLetterGrade(grade.score);
    }
  }
});

/**
 * Instance Methods
 */

/**
 * Check if grade is passing (0-10 scale)
 */
Grade.prototype.isPassing = function() {
  return parseFloat(this.score) >= 6;  // 6/10 = 60%
};

/**
 * Get grade status (0-10 scale)
 */
Grade.prototype.getStatus = function() {
  const score = parseFloat(this.score);

  if (score >= 9) return 'Excellent';      // 9/10 = 90%
  if (score >= 8) return 'Good';           // 8/10 = 80%
  if (score >= 7) return 'Satisfactory';   // 7/10 = 70%
  if (score >= 6) return 'Passing';        // 6/10 = 60%
  return 'Failing';
};

/**
 * Class Methods (Static)
 */

/**
 * Calculate letter grade from score (0-10 scale)
 */
Grade.calculateLetterGrade = function(score) {
  const numScore = parseFloat(score);

  if (numScore >= 9) return 'A';   // 9/10 = 90%
  if (numScore >= 8) return 'B';   // 8/10 = 80%
  if (numScore >= 7) return 'C';   // 7/10 = 70%
  if (numScore >= 6) return 'D';   // 6/10 = 60%
  return 'F';
};

/**
 * Calculate GPA from letter grade
 */
Grade.calculateGPA = function(letterGrade) {
  const gpaMap = {
    'A': 4.0,
    'B': 3.0,
    'C': 2.0,
    'D': 1.0,
    'F': 0.0
  };
  
  return gpaMap[letterGrade] || 0.0;
};

/**
 * Find grades by student
 */
Grade.findByStudent = function(studentId, options = {}) {
  const where = { student_id: studentId };
  
  if (options.semester) {
    where.semester = options.semester;
  }
  
  if (options.courseId) {
    where.course_id = options.courseId;
  }
  
  return this.findAll({
    where,
    order: [['graded_date', 'DESC']]
  });
};

/**
 * Find grades by course
 */
Grade.findByCourse = function(courseId, options = {}) {
  const where = { course_id: courseId };
  
  if (options.semester) {
    where.semester = options.semester;
  }
  
  if (options.isPublished !== undefined) {
    where.is_published = options.isPublished;
  }
  
  return this.findAll({
    where,
    order: [['graded_date', 'DESC']]
  });
};

/**
 * Calculate student's GPA
 */
Grade.calculateStudentGPA = async function(studentId, options = {}) {
  const Course = require('./Course');
  
  const where = { 
    student_id: studentId,
    is_published: true
  };
  
  if (options.semester) {
    where.semester = options.semester;
  }
  
  const grades = await this.findAll({
    where,
    include: [{
      model: Course,
      as: 'course',
      attributes: ['credits']
    }]
  });
  
  if (grades.length === 0) {
    return {
      gpa: 0.0,
      totalCredits: 0,
      gradeCount: 0
    };
  }
  
  let totalPoints = 0;
  let totalCredits = 0;
  
  grades.forEach(grade => {
    const gradePoints = this.calculateGPA(grade.letter_grade);
    const credits = parseFloat(grade.course.credits);
    totalPoints += gradePoints * credits;
    totalCredits += credits;
  });
  
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0.0;
  
  return {
    gpa: parseFloat(gpa),
    totalCredits,
    gradeCount: grades.length
  };
};

/**
 * Get grade distribution for a course
 */
Grade.getDistribution = async function(courseId) {
  const grades = await this.findAll({
    where: { 
      course_id: courseId,
      is_published: true
    },
    attributes: ['letter_grade'],
    raw: true
  });
  
  const distribution = {
    'A': 0,
    'B': 0,
    'C': 0,
    'D': 0,
    'F': 0
  };
  
  grades.forEach(grade => {
    if (distribution.hasOwnProperty(grade.letter_grade)) {
      distribution[grade.letter_grade]++;
    }
  });
  
  return distribution;
};

/**
 * Get grade statistics
 */
Grade.getStats = async function() {
  const total = await this.count();
  const published = await this.count({ where: { is_published: true } });
  
  const byLetterGrade = await this.findAll({
    attributes: [
      'letter_grade',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: { is_published: true },
    group: ['letter_grade'],
    order: [['letter_grade', 'ASC']],
    raw: true
  });
  
  const avgScore = await this.findOne({
    attributes: [
      [sequelize.fn('AVG', sequelize.col('score')), 'avgScore']
    ],
    where: { is_published: true },
    raw: true
  });
  
  return {
    total,
    published,
    averageScore: avgScore && avgScore.avgScore ? parseFloat(avgScore.avgScore).toFixed(2) : null,
    byLetterGrade: byLetterGrade.map(item => ({
      grade: item.letter_grade,
      count: parseInt(item.count)
    }))
  };
};

module.exports = Grade;
