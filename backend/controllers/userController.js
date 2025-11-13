const { Op } = require('sequelize');
const { User, Teacher, Student } = require('../models');
const {
  catchAsync, NotFoundError, ConflictError, ValidationError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination, filtering, and search
 * @access  Admin only
 */
exports.getAllUsers = catchAsync(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Filtering
  const where = {};

  if (req.query.role) {
    where.role = req.query.role;
  }

  if (req.query.is_active !== undefined) {
    where.is_active = req.query.is_active === 'true';
  }

  // Search by email
  if (req.query.search) {
    where.email = {
      [Op.iLike]: `%${req.query.search}%`,
    };
  }

  // Sorting with whitelist validation to prevent SQL injection
  const order = [];
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-')
      ? req.query.sort.substring(1)
      : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';

    // Whitelist of allowed sort fields
    const allowedSortFields = ['email', 'role', 'is_active', 'created_at', 'updated_at'];

    if (allowedSortFields.includes(sortField)) {
      order.push([sortField, sortOrder]);
    } else {
      // If invalid sort field, use default
      order.push(['created_at', 'DESC']);
    }
  } else {
    order.push(['created_at', 'DESC']);
  }

  // Query
  const { count, rows } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order,
    attributes: { exclude: ['password_hash'] },
  });

  res.json({
    success: true,
    data: {
      users: rows,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    },
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID with profile
 * @access  Admin, Teacher (limited), or Self
 */
exports.getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError('Invalid user ID format');
  }

  // ✅ IMPROVED: Convert IDs to string for comparison (handles UUID better)
  const isAdmin = req.user.role === 'admin';
  const isSelf = String(req.user.id) === String(id);

  if (!isAdmin && !isSelf) {
    throw new AuthorizationError('You can only view your own profile');
  }

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get profile based on role
  let profile = null;

  if (user.role === 'teacher') {
    profile = await Teacher.findOne({ where: { user_id: id } });
  } else if (user.role === 'student') {
    profile = await Student.findOne({ where: { user_id: id } });
  }

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      profile: profile ? profile.toJSON() : null,
    },
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin or Self (limited fields)
 */
exports.updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'admin';

  // ✅ IMPROVED: Convert IDs to string for comparison
  const isSelf = String(req.user.id) === String(id);

  if (!isAdmin && !isSelf) {
    throw new AuthorizationError('You can only update your own profile');
  }

  const user = await User.findByPk(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Fields that can be updated
  const allowedFields = isAdmin
    ? ['email', 'role', 'is_active']
    : ['email']; // Non-admin can only update email

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Check email uniqueness if changing email
  if (updates.email && updates.email !== user.email) {
    const existingUser = await User.findOne({
      where: {
        email: updates.email,
        id: { [Op.ne]: id },
      },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }
  }

  await user.update(updates);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    },
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
exports.deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  // ✅ IMPROVED: Convert IDs to string for comparison
  // Prevent deleting yourself
  if (String(req.user.id) === String(id)) {
    throw new ValidationError('You cannot delete your own account');
  }

  const user = await User.findByPk(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Soft delete by setting is_active to false
  await user.update({ is_active: false });

  res.json({
    success: true,
    message: 'User deleted successfully',
    data: { deletedUserId: id },
  });
});

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Activate user account
 * @access  Admin only
 */
exports.activateUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.is_active) {
    throw new ValidationError('User is already active');
  }

  await user.update({ is_active: true });

  res.json({
    success: true,
    message: 'User activated successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
    },
  });
});

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Deactivate user account
 * @access  Admin only
 */
exports.deactivateUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  // ✅ IMPROVED: Convert IDs to string for comparison
  // Prevent deactivating yourself
  if (String(req.user.id) === String(id)) {
    throw new ValidationError('You cannot deactivate your own account');
  }

  const user = await User.findByPk(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.is_active) {
    throw new ValidationError('User is already inactive');
  }

  await user.update({ is_active: false });

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
      },
    },
  });
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
exports.getUserStats = catchAsync(async (req, res) => {
  const [total, active, inactive, admins, teachers, students] = await Promise.all([
    User.count(),
    User.count({ where: { is_active: true } }),
    User.count({ where: { is_active: false } }),
    User.count({ where: { role: 'admin' } }),
    User.count({ where: { role: 'teacher' } }),
    User.count({ where: { role: 'student' } }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      active,
      inactive,
      byRole: {
        admin: admins,
        teacher: teachers,
        student: students,
      },
    },
  });
});

module.exports = exports;
