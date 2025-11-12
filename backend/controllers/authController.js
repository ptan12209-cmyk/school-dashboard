const { User, Teacher, Student } = require('../models');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      department,
      phone,
      parentName,
      parentPhone,
      parentEmail,
    } = req.body;

    // Validate required fields first
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }
    // Normalize email to lowercase and trim whitespace to prevent duplicates
    const trimmedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: trimmedEmail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Validate password strength
    const passwordValidation = User.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors,
      });
    }

    // Create user
    const user = await User.create({
      email: trimmedEmail,
      password_hash: password, // Will be hashed by beforeCreate hook
      role: role || 'student',
      is_active: true,
    });

    // Create profile based on role
    let profile = null;

    try {
      if (role === 'teacher' && firstName && lastName) {
        profile = await Teacher.create({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          department: department || null,
          phone: phone || null,
          hire_date: new Date(),
        });
      } else if (role === 'student' && firstName && lastName && dateOfBirth) {
        profile = await Student.create({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          gender: gender || null,
          phone: phone || null,
          parent_name: parentName || null,
          parent_phone: parentPhone || null,
          parent_email: parentEmail || null,
        });
      }
    } catch (profileError) {
      // Rollback user creation if profile creation fails
      await user.destroy();

      return res.status(400).json({
        success: false,
        message: profileError.message || 'Failed to create user profile',
      });
    }

    // Generate token
    const token = user.generateToken();

    // ✅ SECURITY FIX: Set token as httpOnly cookie (prevents XSS)
    res.cookie('accessToken', token, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // lax for dev, strict for prod
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        profile,
        // ✅ Token is now in httpOnly cookie, not in response body
      },
    });
  } catch (error) {
    console.error('Register error:', error);

    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return token
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // âœ… COMPREHENSIVE VALIDATION
    // Return 400 (validation error) for missing fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with password (using withPassword scope)
    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      // Return 401 for invalid credentials (user not found)
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.',
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Get user profile based on role
    let profile = null;

    if (user.role === 'teacher') {
      profile = await Teacher.findOne({ where: { user_id: user.id } });
    } else if (user.role === 'student') {
      profile = await Student.findOne({ where: { user_id: user.id } });
    }

    // Generate token
    const token = user.generateToken();

    // ✅ SECURITY FIX: Set token as httpOnly cookie (prevents XSS)
    res.cookie('accessToken', token, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // lax for dev, strict for prod
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
        },
        profile: profile ? {
          id: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          fullName: profile.getFullName ? profile.getFullName() : `${profile.first_name} ${profile.last_name}`,
        } : null,
        // ✅ Token is now in httpOnly cookie, not in response body
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    // User is already attached to req by authMiddleware
    const userId = req.user.id;

    // Fetch user with profile
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'role', 'is_active', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get profile based on role
    let profile = null;

    if (user.role === 'teacher') {
      profile = await Teacher.findOne({
        where: { user_id: user.id },
      });
    } else if (user.role === 'student') {
      profile = await Student.findOne({
        where: { user_id: user.id },
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        profile: profile ? profile.toJSON() : null,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side should delete token)
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    // ✅ SECURITY FIX: Clear httpOnly cookie on logout
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    res.json({
      success: true,
      message: 'Logout successful',
      data: {
        loggedOut: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Private
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // User is already authenticated via authMiddleware
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Generate new token
    const token = user.generateToken();

    // ✅ SECURITY FIX: Set refreshed token as httpOnly cookie
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      // ✅ Token is now in httpOnly cookie
    });
  } catch (error) {
    console.error('Refresh token error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = exports;
