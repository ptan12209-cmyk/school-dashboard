const { Op } = require('sequelize');
const { User, Student } = require('../models');
const {
  catchAsync, NotFoundError, ValidationError, ConflictError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/students
 * @desc    Get all students with pagination and filtering
 * @access  Teacher, Admin
 */
exports.getAllStudents = catchAsync(async (req, res) => {
  // Check permissions
  if (!['admin', 'teacher'].includes(req.user.role)) {
    throw new AuthorizationError('Only admins and teachers can view all students');
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Filtering
  const where = {};

  if (req.query.gender) {
    where.gender = req.query.gender;
  }

  if (req.query.class_id) {
    where.class_id = req.query.class_id;
  }

  // Unassigned students (no class)
  if (req.query.unassigned === 'true') {
    where.class_id = null;
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
    const allowedSortFields = ['student_id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'grade_level', 'enrollment_date', 'created_at', 'updated_at'];

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
      where: req.user.role === 'admin'
        ? {}
        : { is_active: true }, // Non-admins only see active students
    },
  ];

  // Query
  const { count, rows } = await Student.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order,
  });

  res.json({
    success: true,
    data: {
      students: rows,
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
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  Teacher, Admin, or Self
 */
exports.getStudentById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'is_active'],
      },
    ],
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Check permissions
  const isAdmin = req.user.role === 'admin';
  const isTeacher = req.user.role === 'teacher';
  const isSelf = student.user_id === req.user.id;

  if (!isAdmin && !isTeacher && !isSelf) {
    throw new AuthorizationError('Access denied');
  }

  res.json({
    success: true,
    data: { student },
  });
});

/**
 * @route   POST /api/students
 * @desc    Create new student
 * @access  Admin only
 */
exports.createStudent = catchAsync(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    phone,
    address,
    parentName,
    parentPhone,
    parentEmail,
    classId,
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'First name and last name are required',
    });
  }

  if (!dateOfBirth) {
    return res.status(400).json({
      success: false,
      message: 'Date of birth is required',
    });
  }

  // Validate date of birth is in the past
  const birthDate = new Date(dateOfBirth);
  if (birthDate >= new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Date of birth must be in the past',
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
    role: 'student',
    is_active: true,
  });

  // Create student profile
  const student = await Student.create({
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: dateOfBirth,
    gender: gender || null,
    phone: phone || null,
    address: address || null,
    parent_name: parentName || null,
    parent_phone: parentPhone || null,
    parent_email: parentEmail || null,
    class_id: classId || null,
  });

  return res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: {
      student: {
        id: student.id,
        user_id: user.id,
        first_name: student.first_name,
        last_name: student.last_name,
        date_of_birth: student.date_of_birth,
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
 * @route   PUT /api/students/:id
 * @desc    Update student
 * @access  Admin or Self (limited fields)
 */
exports.updateStudent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'admin';

  const student = await Student.findByPk(id, {
    include: [{ model: User, as: 'user' }],
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Check permissions
  const isSelf = student.user_id === req.user.id;
  if (!isAdmin && !isSelf) {
    throw new AuthorizationError('You can only update your own profile');
  }

  // Fields that can be updated - handle both camelCase and snake_case
  const updates = {};

  if (isAdmin) {
    // Admin can update all fields
    if (req.body.firstName !== undefined) updates.first_name = req.body.firstName;
    if (req.body.first_name !== undefined) updates.first_name = req.body.first_name;
    if (req.body.lastName !== undefined) updates.last_name = req.body.lastName;
    if (req.body.last_name !== undefined) updates.last_name = req.body.last_name;
    if (req.body.dateOfBirth !== undefined) updates.date_of_birth = req.body.dateOfBirth;
    if (req.body.date_of_birth !== undefined) updates.date_of_birth = req.body.date_of_birth;
    if (req.body.gender !== undefined) updates.gender = req.body.gender;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.parentName !== undefined) updates.parent_name = req.body.parentName;
    if (req.body.parent_name !== undefined) updates.parent_name = req.body.parent_name;
    if (req.body.parentPhone !== undefined) updates.parent_phone = req.body.parentPhone;
    if (req.body.parent_phone !== undefined) updates.parent_phone = req.body.parent_phone;
    if (req.body.parentEmail !== undefined) updates.parent_email = req.body.parentEmail;
    if (req.body.parent_email !== undefined) updates.parent_email = req.body.parent_email;
    if (req.body.classId !== undefined) updates.class_id = req.body.classId;
    if (req.body.class_id !== undefined) updates.class_id = req.body.class_id;
  } else {
    // Students can only update contact info
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.address !== undefined) updates.address = req.body.address;
  }

  await student.update(updates);

  res.json({
    success: true,
    message: 'Student updated successfully',
    data: { student },
  });
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student (soft delete by deactivating user)
 * @access  Admin only
 */
exports.deleteStudent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id, {
    include: [{ model: User, as: 'user' }],
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Prevent deleting yourself
  if (student.user_id === req.user.id) {
    throw new ValidationError('You cannot delete your own account');
  }

  // Soft delete by deactivating user account
  await student.user.update({ is_active: false });

  res.json({
    success: true,
    message: 'Student deleted successfully',
    data: { deletedStudentId: id },
  });
});

/**
 * @route   GET /api/students/:id/grades
 * @desc    Get student's grades
 * @access  Student (self), Teacher, Admin
 * @note    Will be implemented in Day 5 when Grade model is ready
 */
exports.getStudentGrades = catchAsync(async (req, res) => {
  const { id } = req.params;

  const student = await Student.findByPk(id);

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Check permissions
  const isAdmin = req.user.role === 'admin';
  const isTeacher = req.user.role === 'teacher';
  const isSelf = student.user_id === req.user.id;

  if (!isAdmin && !isTeacher && !isSelf) {
    throw new AuthorizationError('Access denied');
  }

  res.json({
    success: true,
    message: 'Grade feature will be implemented in Day 5',
    data: {
      grades: [],
    },
  });
});

/**
 * @route   GET /api/students/unassigned
 * @desc    Get students without a class
 * @access  Teacher, Admin
 */
exports.getUnassignedStudents = catchAsync(async (req, res) => {
  // Check permissions
  if (!['admin', 'teacher'].includes(req.user.role)) {
    throw new AuthorizationError('Only admins and teachers can view unassigned students');
  }

  const students = await Student.findUnassigned();

  res.json({
    success: true,
    data: {
      student: students,
      count: students.length,
    },
  });
});

/**
 * @route   GET /api/students/stats
 * @desc    Get student statistics
 * @access  Admin only
 */
exports.getStudentStats = catchAsync(async (req, res) => {
  const [total, active, assigned, unassigned, byGender] = await Promise.all([
    Student.count(),
    Student.count({
      include: [{
        model: User,
        as: 'user',
        where: { is_active: true },
      }],
    }),
    Student.count({
      where: { class_id: { [Op.ne]: null } },
    }),
    Student.count({
      where: { class_id: null },
    }),
    Student.findAll({
      attributes: [
        'gender',
        [Student.sequelize.fn('COUNT', Student.sequelize.col('id')), 'count'],
      ],
      where: {
        gender: { [Op.ne]: null },
      },
      group: ['gender'],
    }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      active,
      assigned,
      unassigned,
      byGender: byGender.map((g) => ({
        gender: g.gender,
        count: parseInt(g.dataValues.count),
      })),
    },
  });
});
