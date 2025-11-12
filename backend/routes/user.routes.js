const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * Apply authentication to all routes
 */
router.use(verifyToken);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get(
  '/stats',
  checkRole('admin'),
  userController.getUserStats,
);

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination, filtering, search)
 * @access  Admin only
 * @query   page, limit, role, is_active, search, sort
 */
router.get(
  '/',
  checkRole('admin'),
  userController.getAllUsers,
);

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Activate user account
 * @access  Admin only
 */
router.patch(
  '/:id/activate',
  checkRole('admin'),
  userController.activateUser,
);

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Deactivate user account
 * @access  Admin only
 */
router.patch(
  '/:id/deactivate',
  checkRole('admin'),
  userController.deactivateUser,
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin or Self
 */
router.get(
  '/:id',
  userController.getUserById,
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin or Self (limited fields for self)
 */
router.put(
  '/:id',
  [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Must be a valid email')
      .normalizeEmail(),

    body('role')
      .optional()
      .isIn(['admin', 'teacher', 'student'])
      .withMessage('Role must be admin, teacher, or student'),

    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],
  validate,
  userController.updateUser,
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  checkRole('admin'),
  userController.deleteUser,
);

module.exports = router;
