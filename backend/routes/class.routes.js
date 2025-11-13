const express = require('express');

const router = express.Router();
const { body, param, query } = require('express-validator');
const classController = require('../controllers/classController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * @route   GET /api/classes
 * @desc    Get all classes with pagination and filtering
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('grade_level').optional().isInt({ min: 1, max: 12 }).withMessage('Grade level must be between 1 and 12'),
    query('school_year').optional().matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    validate,
  ],
  classController.getAllClasses,
);

/**
 * @route   GET /api/classes/stats
 * @desc    Get class statistics
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
  classController.getClassStats,
);

/**
 * @route   GET /api/classes/available
 * @desc    Get classes with available seats
 * @access  Admin only
 */
router.get(
  '/available',
  verifyToken,
  checkRole('admin'),
  [
    query('grade_level').optional().isInt({ min: 1, max: 12 }).withMessage('Grade level must be between 1 and 12'),
    query('school_year').optional().matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    validate,
  ],
  classController.getAvailableClasses,
);

/**
 * @route   GET /api/classes/:id
 * @desc    Get class by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid class ID'),
    validate,
  ],
  classController.getClassById,
);

/**
 * @route   POST /api/classes
 * @desc    Create new class
 * @access  Admin only
 */
router.post(
  '/',
  verifyToken,
  checkRole('admin'),
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Class name is required')
      .isLength({ max: 100 })
      .withMessage('Class name must not exceed 100 characters'),
    body('grade_level')
      .notEmpty().withMessage('Grade level is required')
      .isInt({ min: 1, max: 12 })
      .withMessage('Grade level must be between 1 and 12'),
    body('teacher_id')
      .optional()
      .custom((value) => {
        if (value === null || value === undefined || value === '') {
          return true; // Allow null/empty values
        }
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      }).withMessage('Invalid teacher ID'),
    body('capacity')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1 and 100'),
    body('room_number')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Room number must not exceed 20 characters'),
    body('school_year')
      .optional()
      .matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    validate,
  ],
  classController.createClass,
);

/**
 * @route   PUT /api/classes/:id
 * @desc    Update class
 * @access  Admin only
 */
router.put(
  '/:id',
  verifyToken,
  checkRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid class ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Class name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Class name must not exceed 100 characters'),
    body('grade_level')
      .optional()
      .isInt({ min: 1, max: 12 }).withMessage('Grade level must be between 1 and 12'),
    body('teacher_id')
      .optional()
      .custom((value) => {
        if (value === null || value === undefined || value === '') {
          return true; // Allow null/empty values
        }
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      }).withMessage('Invalid teacher ID'),
    body('capacity')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1 and 100'),
    body('room_number')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Room number must not exceed 20 characters'),
    body('school_year')
      .optional()
      .matches(/^\d{4}-\d{4}$/).withMessage('School year must be in format YYYY-YYYY'),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active must be boolean'),
    validate,
  ],
  classController.updateClass,
);

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete class (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  verifyToken,
  checkRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid class ID'),
    validate,
  ],
  classController.deleteClass,
);

/**
 * @route   GET /api/classes/:id/student
 * @desc    Get all students in a class
 * @access  Teacher, Admin
 */
router.get(
  '/:id/student',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid class ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate,
  ],
  classController.getClassStudents,
);

/**
 * @route   GET /api/classes/:id/course
 * @desc    Get all courses for a class
 * @access  Teacher, Admin
 */
router.get(
  '/:id/course',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid class ID'),
    validate,
  ],
  classController.getClassCourses,
);

module.exports = router;
