const { sequelize, Sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Teacher = require('./Teacher');
const Student = require('./Student');
const Class = require('./Class');
const Course = require('./Course');
const Grade = require('./Grade');
const Attendance = require('./Attendance');
const Notification = require('./Notification');
const Assignment = require('./Assignment');
const Question = require('./Question');
const Submission = require('./Submission');

// Model Associations
// User ↔ Teacher (One-to-One)
// ─────────────────────────────────────────────
User.hasOne(Teacher, {
  foreignKey: 'user_id',
  as: 'teacherProfile',
  onDelete: 'CASCADE',
});

Teacher.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// ─────────────────────────────────────────────
// 2. User ↔ Student (One-to-One)
// ─────────────────────────────────────────────
User.hasOne(Student, {
  foreignKey: 'user_id',
  as: 'studentProfile',
  onDelete: 'CASCADE',
});

Student.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// ─────────────────────────────────────────────
// 3. Teacher ↔ Class (One-to-Many)
// ─────────────────────────────────────────────
Teacher.hasMany(Class, {
  foreignKey: 'teacher_id',
  as: 'homeroomClasses',
  onDelete: 'SET NULL',
});

Class.belongsTo(Teacher, {
  foreignKey: 'teacher_id',
  as: 'homeroomTeacher',
});

// ─────────────────────────────────────────────
// 4. Class ↔ Student (One-to-Many)
// ─────────────────────────────────────────────
Class.hasMany(Student, {
  foreignKey: 'class_id',
  as: 'students',
  onDelete: 'SET NULL',
});

Student.belongsTo(Class, {
  foreignKey: 'class_id',
  as: 'class',
});

// ─────────────────────────────────────────────
// 5. Class ↔ Course (One-to-Many)
// ─────────────────────────────────────────────
Class.hasMany(Course, {
  foreignKey: 'class_id',
  as: 'courses',
  onDelete: 'CASCADE',
});

Course.belongsTo(Class, {
  foreignKey: 'class_id',
  as: 'class',
});

// ─────────────────────────────────────────────
// 6. Teacher ↔ Course (One-to-Many)
// ─────────────────────────────────────────────
Teacher.hasMany(Course, {
  foreignKey: 'teacher_id',
  as: 'courses',
  onDelete: 'RESTRICT',
});

Course.belongsTo(Teacher, {
  foreignKey: 'teacher_id',
  as: 'teacher',
});

// ─────────────────────────────────────────────
// 7. Student ↔ Grade (One-to-Many)
// ─────────────────────────────────────────────
Student.hasMany(Grade, {
  foreignKey: 'student_id',
  as: 'grades',
  onDelete: 'CASCADE',
});

Grade.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// ─────────────────────────────────────────────
// 8. Course ↔ Grade (One-to-Many)
// ─────────────────────────────────────────────
Course.hasMany(Grade, {
  foreignKey: 'course_id',
  as: 'grades',
  onDelete: 'CASCADE',
});

Grade.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

// ─────────────────────────────────────────────
// 9. Student ↔ Attendance (One-to-Many)
// ─────────────────────────────────────────────
Student.hasMany(Attendance, {
  foreignKey: 'student_id',
  as: 'attendance',
  onDelete: 'CASCADE',
});

Attendance.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// ─────────────────────────────────────────────
// 10. Course ↔ Attendance (One-to-Many, optional)
// ─────────────────────────────────────────────
Course.hasMany(Attendance, {
  foreignKey: 'course_id',
  as: 'attendance',
  onDelete: 'SET NULL',
});

Attendance.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

// ─────────────────────────────────────────────
// 11. User ↔ Attendance (marked_by)
// ─────────────────────────────────────────────
User.hasMany(Attendance, {
  foreignKey: 'marked_by',
  as: 'markedAttendance',
  onDelete: 'SET NULL',
});

Attendance.belongsTo(User, {
  foreignKey: 'marked_by',
  as: 'marker',
});

// ─────────────────────────────────────────────
// 12. User ↔ Notification (One-to-Many)
// ─────────────────────────────────────────────
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
  onDelete: 'CASCADE',
});

Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// ─────────────────────────────────────────────
// 13. Course ↔ Assignment (One-to-Many)
// ─────────────────────────────────────────────
Course.hasMany(Assignment, {
  foreignKey: 'course_id',
  as: 'assignments',
  onDelete: 'CASCADE',
});

Assignment.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course',
});

// ─────────────────────────────────────────────
// 14. Teacher ↔ Assignment (One-to-Many)
// ─────────────────────────────────────────────
Teacher.hasMany(Assignment, {
  foreignKey: 'teacher_id',
  as: 'assignments',
  onDelete: 'RESTRICT',
});

Assignment.belongsTo(Teacher, {
  foreignKey: 'teacher_id',
  as: 'teacher',
});

// ─────────────────────────────────────────────
// 15. Assignment ↔ Question (One-to-Many)
// ─────────────────────────────────────────────
Assignment.hasMany(Question, {
  foreignKey: 'assignment_id',
  as: 'questions',
  onDelete: 'CASCADE',
});

Question.belongsTo(Assignment, {
  foreignKey: 'assignment_id',
  as: 'assignment',
});

// ─────────────────────────────────────────────
// 16. Assignment ↔ Submission (One-to-Many)
// ─────────────────────────────────────────────
Assignment.hasMany(Submission, {
  foreignKey: 'assignment_id',
  as: 'submissions',
  onDelete: 'CASCADE',
});

Submission.belongsTo(Assignment, {
  foreignKey: 'assignment_id',
  as: 'assignment',
});

// ─────────────────────────────────────────────
// 17. Student ↔ Submission (One-to-Many)
// ─────────────────────────────────────────────
Student.hasMany(Submission, {
  foreignKey: 'student_id',
  as: 'submissions',
  onDelete: 'CASCADE',
});

Submission.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student',
});

// ─────────────────────────────────────────────
// 18. Teacher ↔ Submission (graded_by)
// ─────────────────────────────────────────────
Teacher.hasMany(Submission, {
  foreignKey: 'graded_by',
  as: 'gradedSubmissions',
  onDelete: 'SET NULL',
});

Submission.belongsTo(Teacher, {
  foreignKey: 'graded_by',
  as: 'grader',
});

module.exports = {
  sequelize,
  Sequelize,

  // Core Models
  User,
  Teacher,
  Student,

  // Academic Models
  Class,
  Course,
  Grade,
  Attendance,

  // Assignment Models
  Assignment,
  Question,
  Submission,

  // Notification Model
  Notification,
};
