const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * All routes require authentication
 */
router.use(verifyToken);

/**
 * @route   GET /api/students/stats
 * @desc    Get student statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  checkRole('admin'),
  studentController.getStudentStats,
);

/**
 * @route   GET /api/students/unassigned
 * @desc    Get students without a class
 * @access  Teacher, Admin
 */
router.get(
  '/unassigned',
  checkRole('admin', 'teacher'),
  studentController.getUnassignedStudents,
);

/**
 * @route   GET /api/students
 * @desc    Get all students (with pagination, filtering, search)
 * @access  Teacher, Admin
 * @query   page, limit, gender, class_id, unassigned, search, sort
 */
router.get(
  '/',
  checkRole('admin', 'teacher'),
  studentController.getAllStudents,
);

/**
 * @route   POST /api/students
 * @desc    Create new student
 * @access  Admin only
 */
router.post(
  '/',
  checkRole('admin'),
  [
    body('email')
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail(),

    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),

    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be 1-100 characters'),

    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be 1-100 characters'),

    body('dateOfBirth')
      .notEmpty()
      .withMessage('Date of birth is required')
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),

    body('gender')
      .optional()
      .isIn(['M', 'F', 'Other'])
      .withMessage('Gender must be M, F, or Other'),

    body('phone')
      .optional()
      .matches(/^[0-9\s\-+()]*$/)
      .withMessage('Phone number contains invalid characters'),

    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address must be less than 255 characters'),

    body('parentName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Parent name must be 1-100 characters'),

    body('parentPhone')
      .optional()
      .matches(/^[0-9\s\-+()]*$/)
      .withMessage('Parent phone contains invalid characters'),

    body('parentEmail')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail(),

    body('classId')
      .optional()
      .isUUID()
      .withMessage('Class ID must be a valid UUID'),
  ],
  validate,
  studentController.createStudent,
);

/**
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  Teacher, Admin, or Self
 */
router.get(
  '/:id',
  studentController.getStudentById,
);

/**
 * @route   PUT /api/students/:id
 * @desc    Update student
 * @access  Admin or Self (limited fields for self)
 */
router.put(
  '/:id',
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be 1-100 characters'),

    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be 1-100 characters'),

    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),

    body('gender')
      .optional()
      .isIn(['M', 'F', 'Other'])
      .withMessage('Gender must be M, F, or Other'),

    body('phone')
      .optional()
      .matches(/^[0-9\s\-+()]*$/)
      .withMessage('Phone number contains invalid characters'),

    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address must be less than 255 characters'),

    body('parentName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Parent name must be 1-100 characters'),

    body('parentPhone')
      .optional()
      .matches(/^[0-9\s\-+()]*$/)
      .withMessage('Parent phone contains invalid characters'),

    body('parentEmail')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail(),

    body('classId')
      .optional()
      .isUUID()
      .withMessage('Class ID must be a valid UUID'),
  ],
  validate,
  studentController.updateStudent,
);

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  checkRole('admin'),
  studentController.deleteStudent,
);

/**
 * @route   GET /api/students/:id/grade
 * @desc    Get student's grades
 * @access  Student (self), Teacher, Admin
 * @note    Will be implemented in Day 5
 */
router.get(
  '/:id/grade',
  studentController.getStudentGrades,
);

module.exports = router;
