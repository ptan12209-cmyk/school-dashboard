const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// Import middleware
const { verifyToken, verifyTokenForRefresh } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with role-based profile (student, teacher, admin)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Student@123
 *                 description: Must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number
 *               role:
 *                 type: string
 *                 enum: [admin, teacher, parent, student]
 *                 example: student
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 2005-01-15
 *               gender:
 *                 type: string
 *                 enum: [M, F, Other]
 *                 example: M
 *               department:
 *                 type: string
 *                 example: Mathematics
 *                 description: Required for teachers
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               parentName:
 *                 type: string
 *                 example: Jane Doe
 *                 description: Required for students
 *               parentPhone:
 *                 type: string
 *                 example: +1234567890
 *               parentEmail:
 *                 type: string
 *                 format: email
 *                 example: parent@example.com
 *     responses:
 *       201:
 *         description: User registered successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbG...; Path=/; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     profile:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/Student'
 *                         - $ref: '#/components/schemas/Teacher'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email already exists
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
      .matches(/^[0-9\s\-+()]*$/)
      .withMessage('Số điện thoại chỉ chứa số và ký tự +-() '),
  ],
  validate, // Sẽ uncomment sau khi tạo middleware
  authController.register,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return JWT token in httpOnly cookie
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Student@123
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbG...; Path=/; HttpOnly; Secure; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     profile:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/Student'
 *                         - $ref: '#/components/schemas/Teacher'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Account inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Account is inactive. Please contact administrator.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Refresh expired access token using existing valid token
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbG...; Path=/; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/refresh-token',
  verifyTokenForRefresh, // ✅ FIX: Use special middleware that accepts expired tokens
  authController.refreshToken,
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token (alias)
 *     description: Alias for /refresh-token for frontend compatibility
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/refresh',
  verifyTokenForRefresh, // ✅ FIX: Use special middleware that accepts expired tokens
  authController.refreshToken,
);

module.exports = router;
