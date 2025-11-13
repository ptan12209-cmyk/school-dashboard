const { Op } = require('sequelize');
const { Teacher, User } = require('../models');
const {
  catchAsync, NotFoundError, ConflictError, ValidationError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers with pagination and filtering
 * @access  Public (filtered by active status for non-admins)
 */
exports.getAllTeachers = catchAsync(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Filtering
  const where = {};

  if (req.query.department) {
    where.department = req.query.department;
  }

  // Search by name
  if (req.query.search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${req.query.search}%` } },
      { last_name: { [Op.iLike]: `%${req.query.search}%` } },
    ];
  }

  // Sorting with whitelist validation to prevent SQL injection
  const order = [];
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-')
      ? req.query.sort.substring(1)
      : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';

    // Whitelist of allowed sort fields
    const allowedSortFields = ['teacher_id', 'first_name', 'last_name', 'department', 'hire_date', 'specialization', 'created_at', 'updated_at'];

    if (allowedSortFields.includes(sortField)) {
      order.push([sortField, sortOrder]);
    } else {
      // If invalid sort field, use default
      order.push(['last_name', 'ASC']);
    }
  } else {
    order.push(['last_name', 'ASC']);
  }

  // Include user data
  const include = [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'email', 'is_active'],
      where: req.user?.role === 'admin'
        ? {}
        : { is_active: true }, // Non-admins only see active teachers
    },
  ];

  // Query
  const { count, rows } = await Teacher.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order,
  });

  res.json({
    success: true,
    data: {
      teachers: rows,
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
 * @route   GET /api/teachers/:id
 * @desc    Get teacher by ID
 * @access  Public
 */
exports.getTeacherById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const teacher = await Teacher.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'is_active'],
      },
    ],
  });

  if (!teacher) {
    throw new NotFoundError('Teacher not found');
  }

  res.json({
    success: true,
    data: { teacher },
  });
});

/**
 * @route   POST /api/teachers
 * @desc    Create new teacher
 * @access  Admin only
 */
exports.createTeacher = catchAsync(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    department,
    phone,
    hireDate,
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'First name and last name are required',
    });
  }

  if (!department) {
    return res.status(400).json({
      success: false,
      message: 'Department is required',
    });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Email already exists');
  }

  // Validate password
  const passwordValidation = User.validatePassword(password);
  if (!passwordValidation.valid) {
    throw new ValidationError('Password does not meet requirements');
  }

  // Create user account
  const user = await User.create({
    email,
    password_hash: password,
    role: 'teacher',
    is_active: true,
  });

  // Create teacher profile
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const teacher = await Teacher.create({
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    department: department || null,
    phone: phone || null,
    hire_date: hireDate || today, // ← FIXED
  });

  return res.status(201).json({
    success: true,
    message: 'Teacher created successfully',
    data: {
      teacher: {
        id: teacher.id,
        user_id: teacher.user_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        department: teacher.department,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    },
  });
});

/**
 * @route   PUT /api/teachers/:id
 * @desc    Update teacher
 * @access  Admin or Self
 */
exports.updateTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'admin';

  const teacher = await Teacher.findByPk(id, {
    include: [{ model: User, as: 'user' }],
  });

  if (!teacher) {
    throw new NotFoundError('Teacher not found');
  }

  // Check permissions
  const isSelf = teacher.user_id === req.user.id;
  if (!isAdmin && !isSelf) {
    throw new AuthorizationError('You can only update your own profile');
  }

  // Fields that can be updated
  const updates = {};

  // Handle both camelCase and snake_case
  if (req.body.firstName !== undefined) updates.first_name = req.body.firstName;
  if (req.body.first_name !== undefined) updates.first_name = req.body.first_name;
  if (req.body.lastName !== undefined) updates.last_name = req.body.lastName;
  if (req.body.last_name !== undefined) updates.last_name = req.body.last_name;
  if (req.body.department !== undefined) updates.department = req.body.department;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;

  // Admin can update hire_date
  if (isAdmin && req.body.hireDate !== undefined) {
    updates.hire_date = req.body.hireDate;
  }
  if (isAdmin && req.body.hire_date !== undefined) {
    updates.hire_date = req.body.hire_date;
  }

  await teacher.update(updates);

  res.json({
    success: true,
    message: 'Teacher updated successfully',
    data: { teacher },
  });
});

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete teacher (soft delete by deactivating user)
 * @access  Admin only
 */
exports.deleteTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;

  const teacher = await Teacher.findByPk(id, {
    include: [{ model: User, as: 'user' }],
  });

  if (!teacher) {
    throw new NotFoundError('Teacher not found');
  }

  // Prevent deleting yourself
  if (teacher.user_id === req.user.id) {
    throw new ValidationError('You cannot delete your own account');
  }

  // Soft delete by deactivating user account
  await teacher.user.update({ is_active: false });

  res.json({
    success: true,
    message: 'Teacher deleted successfully',
    data: {
      teacher: {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
      },
    },
  });
});

/**
 * @route   GET /api/teachers/departments/list
 * @desc    Get list of all departments
 * @access  Public (no auth required)
 */
exports.getDepartmentsList = catchAsync(async (req, res) => {
  const { sequelize } = require('../models');

  // Get distinct departments
  const departments = await Teacher.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('department')), 'department'],
    ],
    where: {
      department: { [Op.ne]: null },
    },
    order: [['department', 'ASC']],
    raw: true,
  });

  // Extract department names into array
  const departmentList = departments.map((d) => d.department);

  res.json({
    success: true,
    data: {
      departments: departmentList,
    },
  });
});

/**
 * @route   GET /api/teachers/subjects
 * @desc    Get list of all subjects taught by teachers
 * @access  Public (no auth required)
 */
exports.getSubjectsList = catchAsync(async (req, res) => {
  const { sequelize } = require('../models');
  const Course = require('../models/Course');

  // Get distinct subjects from courses
  const subjects = await Course.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('subject')), 'subject'],
    ],
    where: {
      subject: { [Op.ne]: null },
    },
    order: [['subject', 'ASC']],
    raw: true,
  });

  // Extract subject names into array
  const subjectList = subjects.map((s) => s.subject);

  res.json({
    success: true,
    data: {
      subjects: subjectList,
    },
  });
});

/**
 * @route   GET /api/teachers/:id/courses
 * @desc    Get teacher's courses
 * @access  Public
 * @note    Will be implemented in Day 5 when Course model is ready
 */
exports.getTeacherCourses = catchAsync(async (req, res) => {
  const { id } = req.params;

  const teacher = await Teacher.findByPk(id);

  if (!teacher) {
    throw new NotFoundError('Teacher not found');
  }

  res.json({
    success: true,
    message: 'Course feature will be implemented in Day 5',
    data: {
      courses: [],
    },
  });
});

/**
 * @route   GET /api/teachers/stats
 * @desc    Get teacher statistics
 * @access  Admin only
 */
exports.getTeacherStats = catchAsync(async (req, res) => {
  const [total, active, byDepartment] = await Promise.all([
    Teacher.count(),
    Teacher.count({
      include: [{
        model: User,
        as: 'user',
        where: { is_active: true },
      }],
    }),
    Teacher.findAll({
      attributes: [
        'department',
        [Teacher.sequelize.fn('COUNT', Teacher.sequelize.col('id')), 'count'],
      ],
      where: {
        department: { [Op.ne]: null },
      },
      group: ['department'],
      order: [[Teacher.sequelize.fn('COUNT', Teacher.sequelize.col('id')), 'DESC']],
    }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      active,
      byDepartment: byDepartment.map((d) => ({
        department: d.department,
        count: parseInt(d.dataValues.count, 10),
      })),
    },
  });
});
