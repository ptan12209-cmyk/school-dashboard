const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// mport middleware (sẽ tạo sau)
const { verifyToken } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký người dùng mới
 * @access  Public
 */
router.post(
  '/register',
  [
    // Validate email
    body('email')
      .isEmail()
      .withMessage('Phải là email hợp lệ')
      .normalizeEmail(),

    // Validate password
    body('password')
      .isLength({ min: 8 })
      .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
      .matches(/[A-Z]/)
      .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa')
      .matches(/[a-z]/)
      .withMessage('Mật khẩu phải có ít nhất 1 chữ thường')
      .matches(/[0-9]/)
      .withMessage('Mật khẩu phải có ít nhất 1 số'),

    // Validate role
    body('role')
      .isIn(['admin', 'teacher', 'parent', 'student'])
      .withMessage('Vai trò phải là admin, teacher, parent, hoặc student'),

    // Validate firstName (optional nhưng nếu có thì phải đúng)
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Tên phải có từ 1-100 ký tự'),

    // Validate lastName
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Họ phải có từ 1-100 ký tự'),

    // Validate dateOfBirth
    body('dateOfBirth')
      .optional()
      .isDate()
      .withMessage('Ngày sinh phải là ngày hợp lệ'),

    // Validate gender
    body('gender')
      .optional()
      .isIn(['M', 'F', 'Other'])
      .withMessage('Giới tính phải là M, F, hoặc Other'),

    // Validate phone
    body('phone')
      .optional()
      .matches(/^[0-9\s\-\+\(\)]*$/)
      .withMessage('Số điện thoại chỉ chứa số và ký tự +-() '),
  ],
  validate, // Sẽ uncomment sau khi tạo middleware
  authController.register,
);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Phải là email hợp lệ')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Mật khẩu là bắt buộc'),
  ],
  validate, // Enable validation for login
  authController.login,
);

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin user hiện tại
 * @access  Private (cần token)
 */
router.get(
  '/me',
  verifyToken, // Sẽ uncomment sau khi tạo middleware
  authController.getCurrentUser,
);

/**
 * @route   POST /api/auth/logout
 * @desc    Đăng xuất
 * @access  Private (cần token)
 */
router.post(
  '/logout',
  verifyToken, // Sẽ uncomment sau
  authController.logout,
);

module.exports = router;
