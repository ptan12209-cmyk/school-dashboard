const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const gradeController = require('../controllers/gradeController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * @route   GET /api/grades
 * @desc    Get all grades with pagination and filtering
 * @access  Admin, Teacher (own courses), Student (own grades only)
 */
router.get(
  '/',
  verifyToken,
  // ✅ FIXED: Removed checkRole to allow students to access their own grades
  // Controller will filter grades based on role
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('student_id').optional().isUUID().withMessage('Invalid student ID'),
    query('course_id').optional().isUUID().withMessage('Invalid course ID'),
    query('semester').optional().isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    query('grade_type').optional().isIn(['Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final', 'Participation']).withMessage('Invalid grade type'),
    query('is_published').optional().isBoolean().withMessage('is_published must be boolean'),
    query('start_date').optional().isDate().withMessage('Invalid start date'),
    query('end_date').optional().isDate().withMessage('Invalid end date'),
    validate
  ],
  gradeController.getAllGrades
);

/**
 * @route   GET /api/grades/stats
 * @desc    Get grade statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  verifyToken,
  checkRole('admin'),
  [
    query('semester').optional().isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    validate
  ],
  gradeController.getGradeStats
);

/**
 * @route   GET /api/grades/student/:studentId
 * @desc    Get all grades for a specific student
 * @access  Student (self), Teacher, Admin
 */
router.get(
  '/student/:studentId',
  verifyToken,
  [
    param('studentId').isUUID().withMessage('Invalid student ID'),
    query('semester').optional().isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    query('course_id').optional().isUUID().withMessage('Invalid course ID'),
    validate
  ],
  gradeController.getStudentGrades
);

/**
 * @route   GET /api/grades/course/:courseId
 * @desc    Get all grades for a specific course
 * @access  Teacher (own courses), Admin
 */
router.get(
  '/course/:courseId',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('courseId').isUUID().withMessage('Invalid course ID'),
    query('semester').optional().isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    query('grade_type').optional().isIn(['Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final', 'Participation']).withMessage('Invalid grade type'),
    validate
  ],
  gradeController.getCourseGrades
);

/**
 * @route   GET /api/grades/:id
 * @desc    Get grade by ID
 * @access  Student (self), Teacher (own courses), Admin
 */
router.get(
  '/:id',
  verifyToken,
  [
    param('id').isUUID().withMessage('Invalid grade ID'),
    validate
  ],
  gradeController.getGradeById
);

/**
 * @route   POST /api/grades
 * @desc    Create new grade
 * @access  Teacher (own courses), Admin
 */
router.post(
  '/',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    body('student_id')
      .notEmpty().withMessage('Student ID is required')
      .isUUID().withMessage('Invalid student ID'),
    body('course_id')
      .notEmpty().withMessage('Course ID is required')
      .isUUID().withMessage('Invalid course ID'),
    body('score')
      .notEmpty().withMessage('Score is required')
      .isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    body('grade_type')
      .notEmpty().withMessage('Grade type is required')
      .isIn(['Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final', 'Participation']).withMessage('Invalid grade type'),
    body('semester')
      .notEmpty().withMessage('Semester is required')
      .isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    body('graded_date')
      .optional()
      .isDate().withMessage('Invalid graded date')
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error('Graded date cannot be in the future');
        }
        return true;
      }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
    body('is_published')
      .optional()
      .isBoolean().withMessage('is_published must be boolean'),
    validate
  ],
  gradeController.createGrade
);

/**
 * @route   POST /api/grades/bulk
 * @desc    Create multiple grades at once
 * @access  Teacher (own courses), Admin
 */
router.post(
  '/bulk',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    body('grades')
      .isArray({ min: 1 }).withMessage('Grades array is required and must not be empty'),
    body('grades.*.student_id')
      .notEmpty().withMessage('Student ID is required')
      .isUUID().withMessage('Invalid student ID'),
    body('grades.*.course_id')
      .notEmpty().withMessage('Course ID is required')
      .isUUID().withMessage('Invalid course ID'),
    body('grades.*.score')
      .notEmpty().withMessage('Score is required')
      .isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    body('grades.*.grade_type')
      .notEmpty().withMessage('Grade type is required')
      .isIn(['Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final', 'Participation']).withMessage('Invalid grade type'),
    body('grades.*.semester')
      .notEmpty().withMessage('Semester is required')
      .isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    body('grades.*.graded_date')
      .optional()
      .isDate().withMessage('Invalid graded date'),
    body('grades.*.notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
    body('grades.*.is_published')
      .optional()
      .isBoolean().withMessage('is_published must be boolean'),
    validate
  ],
  gradeController.bulkCreateGrades
);

/**
 * @route   PUT /api/grades/:id
 * @desc    Update grade
 * @access  Teacher (own courses), Admin
 */
router.put(
  '/:id',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid grade ID'),
    body('score')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    body('grade_type')
      .optional()
      .isIn(['Quiz', 'Test', 'Assignment', 'Project', 'Midterm', 'Final', 'Participation']).withMessage('Invalid grade type'),
    body('semester')
      .optional()
      .isIn(['1', '2', 'Final']).withMessage('Semester must be 1, 2, or Final'),
    body('graded_date')
      .optional()
      .isDate().withMessage('Invalid graded date')
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error('Graded date cannot be in the future');
        }
        return true;
      }),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
    body('is_published')
      .optional()
      .isBoolean().withMessage('is_published must be boolean'),
    validate
  ],
  gradeController.updateGrade
);

/**
 * @route   DELETE /api/grades/:id
 * @desc    Delete grade
 * @access  Teacher (own courses), Admin
 */
router.delete(
  '/:id',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid grade ID'),
    validate
  ],
  gradeController.deleteGrade
);

module.exports = router;
