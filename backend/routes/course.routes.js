const express = require('express');

const router = express.Router();
const { body, param, query } = require('express-validator');
const courseController = require('../controllers/courseController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * @route   GET /api/courses
 * @desc    Get all courses with pagination and filtering
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('subject').optional().trim().isLength({ max: 50 })
      .withMessage('Subject must not exceed 50 characters'),
    query('semester').optional().isIn(['1', '2', 'Full Year']).withMessage('Semester must be 1, 2, or Full Year'),
    query('school_year').optional().matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    query('teacher_id').optional().isUUID().withMessage('Invalid teacher ID'),
    query('class_id').optional().isUUID().withMessage('Invalid class ID'),
    query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    validate,
  ],
  courseController.getAllCourses,
);

/**
 * @route   GET /api/courses/subjects
 * @desc    Get list of all subjects
 * @access  Public
 */
router.get(
  '/subjects',
  [
    query('school_year').optional().matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    validate,
  ],
  courseController.getAllSubjects,
);

/**
 * @route   GET /api/courses/stats
 * @desc    Get course statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  verifyToken,
  checkRole('admin'),
  [
    query('school_year').optional().matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    validate,
  ],
  courseController.getCourseStats,
);

/**
 * @route   GET /api/courses/:id
 * @desc    Get course by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid course ID'),
    validate,
  ],
  courseController.getCourseById,
);

/**
 * @route   POST /api/courses
 * @desc    Create new course
 * @access  Admin, Teacher
 */
router.post(
  '/',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Course name is required')
      .isLength({ max: 200 })
      .withMessage('Course name must not exceed 200 characters'),
    body('code')
      .trim()
      .notEmpty().withMessage('Course code is required')
      .isLength({ max: 20 })
      .withMessage('Course code must not exceed 20 characters')
      .matches(/^[A-Z0-9-]+$/)
      .withMessage('Course code must contain only uppercase letters, numbers, and hyphens'),
    body('subject')
      .trim()
      .notEmpty().withMessage('Subject is required')
      .isLength({ max: 50 })
      .withMessage('Subject must not exceed 50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('credits')
      .optional()
      .isFloat({ min: 0.5, max: 10.0 }).withMessage('Credits must be between 0.5 and 10.0'),
    body('teacher_id')
      .optional()
      .isUUID().withMessage('Invalid teacher ID'),
    body('class_id')
      .optional()
      .isUUID().withMessage('Invalid class ID'),
    body('semester')
      .optional()
      .isIn(['1', '2', 'Full Year']).withMessage('Semester must be 1, 2, or Full Year'),
    body('school_year')
      .optional()
      .matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    body('schedule')
      .optional()
      .isJSON().withMessage('Schedule must be valid JSON'),
    validate,
  ],
  courseController.createCourse,
);

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Admin, Teacher (own courses)
 */
router.put(
  '/:id',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid course ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Course name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Course name must not exceed 200 characters'),
    body('code')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Course code cannot be empty')
      .isLength({ max: 20 })
      .withMessage('Course code must not exceed 20 characters')
      .matches(/^[A-Z0-9-]+$/)
      .withMessage('Course code must contain only uppercase letters, numbers, and hyphens'),
    body('subject')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Subject cannot be empty')
      .isLength({ max: 50 })
      .withMessage('Subject must not exceed 50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('credits')
      .optional()
      .isFloat({ min: 0.5, max: 10.0 }).withMessage('Credits must be between 0.5 and 10.0'),
    body('teacher_id')
      .optional()
      .isUUID().withMessage('Invalid teacher ID'),
    body('class_id')
      .optional()
      .isUUID().withMessage('Invalid class ID'),
    body('semester')
      .optional()
      .isIn(['1', '2', 'Full Year']).withMessage('Semester must be 1, 2, or Full Year'),
    body('school_year')
      .optional()
      .matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    body('schedule')
      .optional()
      .isJSON().withMessage('Schedule must be valid JSON'),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active must be boolean'),
    validate,
  ],
  courseController.updateCourse,
);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  verifyToken,
  checkRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid course ID'),
    validate,
  ],
  courseController.deleteCourse,
);

/**
 * @route   GET /api/courses/:id/grade
 * @desc    Get all grades for a course
 * @access  Teacher (own courses), Admin
 */
router.get(
  '/:id/grade',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid course ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  courseController.getCourseGrades,
);

/**
 * @route   GET /api/courses/:id/student
 * @desc    Get enrolled students for a course
 * @access  Teacher (own courses), Admin
 */
router.get(
  '/:id/student',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid course ID'),
    validate,
  ],
  courseController.getCourseStudents,
);

module.exports = router;
