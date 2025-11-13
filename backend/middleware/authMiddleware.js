const jwt = require('jsonwebtoken');
const { jwtConfig } = require('../config/auth');
const { User, Teacher, Student } = require('../models');

const verifyToken = async (req, res, next) => {
  try {
    let token;

    // ✅ SECURITY FIX: Try to get token from httpOnly cookie first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else {
      // Fallback to Authorization header for backward compatibility
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided. Access denied.',
        });
      }

      // Extract token (format: "Bearer <token>")
      [, token] = authHeader.split(' ');
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Access denied.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // ✅ PERFORMANCE FIX: Use JOIN to load user with profile in one query (fixes N+1 problem)
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Teacher,
          as: 'teacherProfile',
          attributes: ['id', 'first_name', 'last_name', 'department'], // Only load essential fields
          required: false, // LEFT JOIN, not INNER JOIN
        },
        {
          model: Student,
          as: 'studentProfile',
          attributes: ['id', 'first_name', 'last_name', 'date_of_birth'],
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token invalid.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // ✅ Profile is already loaded via JOIN - no additional queries needed
    if (user.teacherProfile) {
      req.user.teacherProfile = user.teacherProfile;
    }
    if (user.studentProfile) {
      req.user.studentProfile = user.studentProfile;
    }

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const checkRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. Access denied.',
      required: allowedRoles,
      current: req.user.role,
    });
  }

  return next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, jwtConfig.secret);
        const user = await User.findByPk(decoded.id);

        if (user && user.is_active) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        }
      }
    }

    // Continue regardless of whether user was found
    return next();
  } catch (error) {
    // If token is invalid, continue without user
    return next();
  }
};

module.exports = {
  verifyToken,
  checkRole,
  optionalAuth,
};
