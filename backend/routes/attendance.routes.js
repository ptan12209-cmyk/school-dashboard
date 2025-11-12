const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * @route   GET /api/attendance
 * @desc    Get all attendance records with pagination and filtering
 * @access  Teacher, Admin, Student (own records only)
 */
router.get(
  '/',
  verifyToken,
  // ✅ FIXED: Removed checkRole to allow students to access their own attendance
  // Controller will filter attendance based on role
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('student_id').optional().isUUID().withMessage('Invalid student ID'),
    query('course_id').optional().isUUID().withMessage('Invalid course ID'),
    query('status').optional().isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid status'),
    query('date').optional().isDate().withMessage('Invalid date'),
    query('start_date').optional().isDate().withMessage('Invalid start date'),
    query('end_date').optional().isDate().withMessage('Invalid end date'),
    validate
  ],
  attendanceController.getAllAttendance
);

/**
 * @route   GET /api/attendance/stats
 * @desc    Get attendance statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  verifyToken,
  checkRole('admin'),
  [
    query('start_date').optional().isDate().withMessage('Invalid start date'),
    query('end_date').optional().isDate().withMessage('Invalid end date'),
    validate
  ],
  attendanceController.getAttendanceStats
);

/**
 * @route   GET /api/attendance/student/:studentId
 * @desc    Get attendance records for a specific student
 * @access  Student (self), Teacher, Admin
 */
router.get(
  '/student/:studentId',
  verifyToken,
  [
    param('studentId').isUUID().withMessage('Invalid student ID'),
    query('course_id').optional().isUUID().withMessage('Invalid course ID'),
    query('start_date').optional().isDate().withMessage('Invalid start date'),
    query('end_date').optional().isDate().withMessage('Invalid end date'),
    validate
  ],
  attendanceController.getStudentAttendance
);

/**
 * @route   GET /api/attendance/course/:courseId
 * @desc    Get attendance records for a specific course
 * @access  Teacher (own courses), Admin
 */
router.get(
  '/course/:courseId',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('courseId').isUUID().withMessage('Invalid course ID'),
    query('date').optional().isDate().withMessage('Invalid date'),
    query('start_date').optional().isDate().withMessage('Invalid start date'),
    query('end_date').optional().isDate().withMessage('Invalid end date'),
    query('status').optional().isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid status'),
    validate
  ],
  attendanceController.getCourseAttendance
);

/**
 * @route   GET /api/attendance/date/:date
 * @desc    Get all attendance records for a specific date
 * @access  Teacher, Admin
 */
router.get(
  '/date/:date',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('date').isDate().withMessage('Invalid date'),
    query('course_id').optional().isUUID().withMessage('Invalid course ID'),
    query('status').optional().isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid status'),
    validate
  ],
  attendanceController.getAttendanceByDate
);

/**
 * @route   GET /api/attendance/:id
 * @desc    Get attendance record by ID
 * @access  Teacher (own courses), Admin
 */
router.get(
  '/:id',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid attendance ID'),
    validate
  ],
  attendanceController.getAttendanceById
);

/**
 * @route   POST /api/attendance
 * @desc    Mark attendance (create new record)
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
    body('date')
      .notEmpty().withMessage('Date is required')
      .isDate().withMessage('Invalid date')
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error('Date cannot be in the future');
        }
        return true;
      }),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Status must be Present, Absent, Late, or Excused'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
    body('check_in_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Invalid time format (HH:MM or HH:MM:SS)'),
    body('check_out_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Invalid time format (HH:MM or HH:MM:SS)'),
    validate
  ],
  attendanceController.markAttendance
);

/**
 * @route   POST /api/attendance/bulk
 * @desc    Mark attendance for multiple students at once
 * @access  Teacher (own courses), Admin
 */
router.post(
  '/bulk',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    body('course_id')
      .notEmpty().withMessage('Course ID is required')
      .isUUID().withMessage('Invalid course ID'),
    body('date')
      .notEmpty().withMessage('Date is required')
      .isDate().withMessage('Invalid date')
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error('Date cannot be in the future');
        }
        return true;
      }),
    body('records')
      .isArray({ min: 1 }).withMessage('Records array is required and must not be empty'),
    body('records.*.student_id')
      .notEmpty().withMessage('Student ID is required')
      .isUUID().withMessage('Invalid student ID'),
    body('records.*.status')
      .notEmpty().withMessage('Status is required')
      .isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Status must be Present, Absent, Late, or Excused'),
    body('records.*.notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
    body('records.*.check_in_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Invalid time format (HH:MM or HH:MM:SS)'),
    body('records.*.check_out_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Invalid time format (HH:MM or HH:MM:SS)'),
    validate
  ],
  attendanceController.bulkMarkAttendance
);

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance record
 * @access  Teacher (own courses), Admin
 */
router.put(
  '/:id',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid attendance ID'),
    body('status')
      .optional()
      .isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Status must be Present, Absent, Late, or Excused'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
    body('check_in_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Invalid time format (HH:MM or HH:MM:SS)'),
    body('check_out_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Invalid time format (HH:MM or HH:MM:SS)'),
    validate
  ],
  attendanceController.updateAttendance
);

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete attendance record
 * @access  Teacher (own courses), Admin
 */
router.delete(
  '/:id',
  verifyToken,
  checkRole('admin', 'teacher'),
  [
    param('id').isUUID().withMessage('Invalid attendance ID'),
    validate
  ],
  attendanceController.deleteAttendance
);

module.exports = router;
