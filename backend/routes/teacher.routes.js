const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * Public routes (no authentication required)
 */

/**
 * @route   GET /api/teachers/departments/list
 * @desc    Get list of all departments
 * @access  Public
 * @note    MUST be before /:id route to avoid conflict
 */
router.get('/departments/list', teacherController.getDepartmentsList);

/**
 * @route   GET /api/teachers/departments
 * @desc    Get list of all departments (alias for /departments/list)
 * @access  Public
 * @note    Added for frontend compatibility
 */
router.get('/departments', teacherController.getDepartmentsList);

/**
 * @route   GET /api/teachers/subjects
 * @desc    Get list of all subjects taught by teachers
 * @access  Public
 * @note    Returns unique subjects from courses
 */
router.get('/subjects', teacherController.getSubjectsList);

/**
 * Protected routes (authentication required)
 */
router.use(verifyToken);

/**
 * @route   GET /api/teachers/stats
 * @desc    Get teacher statistics
 * @access  Admin only
 * @note    MUST be before /:id route to avoid treating 'stats' as an ID
 */
router.get(
  '/stats',
  checkRole('admin'),
  teacherController.getTeacherStats,
);

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers (with pagination, filtering, search)
 * @access  Authenticated users (filtered by active status for non-admins)
 * @query   page, limit, department, search, sort
 */
router.get('/', teacherController.getAllTeachers);

/**
 * @route   POST /api/teachers
 * @desc    Create new teacher
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

    body('department')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Department must be 1-100 characters'),

    body('phone')
      .optional()
      .matches(/^[0-9\s\-\+\(\)]*$/)
      .withMessage('Phone number contains invalid characters'),

    body('hireDate')
      .optional()
      .isISO8601()
      .withMessage('Hire date must be a valid date'),
  ],
  validate,
  teacherController.createTeacher,
);

/**
 * @route   GET /api/teachers/:id
 * @desc    Get teacher by ID
 * @access  Authenticated users
 */
router.get('/:id', teacherController.getTeacherById);

/**
 * @route   PUT /api/teachers/:id
 * @desc    Update teacher
 * @access  Admin or Self
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

    body('department')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Department must be 1-100 characters'),

    body('phone')
      .optional()
      .matches(/^[0-9\s\-\+\(\)]*$/)
      .withMessage('Phone number contains invalid characters'),

    body('hireDate')
      .optional()
      .isISO8601()
      .withMessage('Hire date must be a valid date'),
  ],
  validate,
  teacherController.updateTeacher,
);

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete teacher (soft delete by deactivating user)
 * @access  Admin only
 */
router.delete(
  '/:id',
  checkRole('admin'),
  teacherController.deleteTeacher,
);

/**
 * @route   GET /api/teachers/:id/course
 * @desc    Get teacher's courses
 * @access  Authenticated users
 * @note    Will be implemented in Day 5
 */
router.get('/:id/course', teacherController.getTeacherCourses);

module.exports = router;
