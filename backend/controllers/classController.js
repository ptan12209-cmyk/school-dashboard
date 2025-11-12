const { Op } = require('sequelize');
const {
  Class, Teacher, Student, User, Course,
} = require('../models');
const {
  catchAsync, NotFoundError, ValidationError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/classes
 * @desc    Get all classes with pagination and filtering
 * @access  Public
 */
exports.getAllClasses = catchAsync(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Filtering
  const where = {};

  if (req.query.grade_level) {
    const gradeLevel = parseInt(req.query.grade_level);
    if (!isNaN(gradeLevel)) {
      where.grade_level = gradeLevel;
    }
  }

  if (req.query.school_year) {
    where.school_year = req.query.school_year;
  }

  if (req.query.is_active !== undefined) {
    where.is_active = req.query.is_active === 'true';
  }

  // Search by name
  if (req.query.search) {
    where.name = { [Op.iLike]: `%${req.query.search}%` };
  }

  // Sorting with whitelist validation to prevent SQL injection
  const order = [];
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-')
      ? req.query.sort.substring(1)
      : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';

    // Whitelist of allowed sort fields
    const allowedSortFields = ['class_id', 'name', 'grade_level', 'room_number', 'academic_year', 'created_at', 'updated_at'];

    if (allowedSortFields.includes(sortField)) {
      order.push([sortField, sortOrder]);
    } else {
      // If invalid sort field, use default
      order.push(['grade_level', 'ASC'], ['name', 'ASC']);
    }
  } else {
    order.push(['grade_level', 'ASC'], ['name', 'ASC']);
  }

  // Include teacher data
  const include = [
    {
      model: Teacher,
      as: 'homeroomTeacher',
      attributes: ['id', 'first_name', 'last_name', 'phone'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'is_active'],
      }],
    },
  ];

  const { rows: classes, count } = await Class.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order,
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      classes,
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
 * @route   GET /api/classes/:id
 * @desc    Get class by ID with details
 * @access  Public
 */
exports.getClassById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const classData = await Class.findByPk(id, {
    include: [
      {
        model: Teacher,
        as: 'homeroomTeacher',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'department'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['email'],
        }],
      },
      {
        model: Student,
        as: 'students',
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['email', 'is_active'],
        }],
      },
    ],
  });

  if (!classData) {
    throw new NotFoundError('Class not found');
  }

  // Get additional statistics
  const stats = await classData.getCapacityInfo();

  res.json({
    success: true,
    data: {
      class: {
        ...classData.toJSON(),
        stats,
      },
    },
  });
});

/**
 * @route   POST /api/classes
 * @desc    Create new class
 * @access  Admin only
 */
exports.createClass = catchAsync(async (req, res) => {
  const {
    name,
    grade_level,
    teacher_id,
    capacity,
    room_number,
    school_year,
  } = req.body;

  // Validate required fields
  if (!name || !grade_level) {
    throw new ValidationError('Name and grade level are required');
  }

  // Check if class name already exists for the same school year
  const existingClass = await Class.findOne({
    where: {
      name,
      school_year: school_year || '2024-2025',
    },
  });

  if (existingClass) {
    throw new ValidationError('Class name already exists for this school year');
  }

  // Verify teacher exists if provided
  if (teacher_id) {
    const teacher = await Teacher.findByPk(teacher_id);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }
  }

  // Create class
  const newClass = await Class.create({
    name,
    grade_level,
    teacher_id: teacher_id || null,
    max_students: capacity || 40, // ✓ MATCH với model
    room_number,
    school_year: school_year || '2024-2025',
    is_active: true,
  });

  // Fetch complete class data
  const classData = await Class.findByPk(newClass.id, {
    include: [{
      model: Teacher,
      as: 'homeroomTeacher',
      attributes: ['id', 'first_name', 'last_name'],
    }],
  });

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: { class: classData },
  });
});

/**
 * @route   PUT /api/classes/:id
 * @desc    Update class
 * @access  Admin only
 */
exports.updateClass = catchAsync(async (req, res) => {
  const { id } = req.params;

  const classData = await Class.findByPk(id);

  if (!classData) {
    throw new NotFoundError('Class not found');
  }

  // Fields that can be updated
  const allowedFields = [
    'name', 'grade_level', 'teacher_id', 'max_students',
    'room_number', 'school_year', 'is_active',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Verify teacher exists if updating teacher_id
  if (updates.teacher_id) {
    const teacher = await Teacher.findByPk(updates.teacher_id);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }
  }

  // Check if new name conflicts with existing class
  if (updates.name && updates.name !== classData.name) {
    const existingClass = await Class.findOne({
      where: {
        name: updates.name,
        school_year: updates.school_year || classData.school_year,
        id: { [Op.ne]: id },
      },
    });

    if (existingClass) {
      throw new ValidationError('Class name already exists for this school year');
    }
  }

  await classData.update(updates);

  // Fetch updated data with associations
  const updatedClass = await Class.findByPk(id, {
    include: [{
      model: Teacher,
      as: 'homeroomTeacher',
      attributes: ['id', 'first_name', 'last_name'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email'],
      }],
    }],
  });

  res.json({
    success: true,
    message: 'Class updated successfully',
    data: { class: updatedClass },
  });
});

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete class (soft delete - set is_active to false)
 * @access  Admin only
 */
exports.deleteClass = catchAsync(async (req, res) => {
  const { id } = req.params;

  const classData = await Class.findByPk(id, {
    include: [{ model: Student, as: 'students' }],
  });

  if (!classData) {
    throw new NotFoundError('Class not found');
  }

  // Check if class has students
  if (classData.students && classData.students.length > 0) {
    throw new ValidationError(
      `Cannot delete class with ${classData.students.length} enrolled students. `
      + 'Please reassign students first.',
    );
  }

  // Soft delete
  await classData.update({ is_active: false });

  res.json({
    success: true,
    message: 'Class deleted successfully',
    data: { deletedClassId: id },
  });
});

/**
 * @route   GET /api/classes/:id/students
 * @desc    Get all students in a class
 * @access  Teacher, Admin
 */
exports.getClassStudents = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verify class exists
  const classData = await Class.findByPk(id);

  if (!classData) {
    throw new NotFoundError('Class not found');
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Get students with user data
  const { rows: students, count } = await Student.findAndCountAll({
    where: { class_id: id },
    include: [{
      model: User,
      as: 'user',
      attributes: ['email', 'is_active'],
    }],
    limit,
    offset,
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      class: {
        id: classData.id,
        name: classData.name,
        grade_level: classData.grade_level,
      },
      students,
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
 * @route   GET /api/classes/:id/courses
 * @desc    Get all courses for a class
 * @access  Teacher, Admin
 */
exports.getClassCourses = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verify class exists
  const classData = await Class.findByPk(id);

  if (!classData) {
    throw new NotFoundError('Class not found');
  }

  // Get courses with teacher data
  const courses = await Course.findAll({
    where: { class_id: id, is_active: true },
    include: [{
      model: Teacher,
      as: 'teacher',
      attributes: ['id', 'first_name', 'last_name', 'department'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email'],
      }],
    }],
    order: [['subject', 'ASC'], ['name', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      class: {
        id: classData.id,
        name: classData.name,
        grade_level: classData.grade_level,
      },
      courses,
    },
  });
});

/**
 * @route   GET /api/classes/stats
 * @desc    Get statistics about classes
 * @access  Admin only
 */
exports.getClassStats = catchAsync(async (req, res) => {
  const school_year = req.query.school_year || '2024-2025';

  // Get overall stats
  const [totalClasses, activeClasses, byGradeLevel, capacityStats] = await Promise.all([
    // Total classes
    Class.count({ where: { school_year } }),

    // Active classes
    Class.count({ where: { school_year, is_active: true } }),

    // Classes by grade level
    Class.findAll({
      where: { school_year, is_active: true },
      attributes: [
        'grade_level',
        [Class.sequelize.fn('COUNT', Class.sequelize.col('id')), 'count'],
      ],
      group: ['grade_level'],
      order: [['grade_level', 'ASC']],
    }),

    // Capacity statistics
    Class.findAll({
      where: { school_year, is_active: true },
      attributes: [
        [Class.sequelize.fn('SUM', Class.sequelize.col('max_students')), 'totalCapacity'],
      ],
    }),
  ]);

  // Get enrollment count
  const enrollmentCount = await Student.count({
    include: [{
      model: Class,
      as: 'class',
      where: { school_year, is_active: true },
      required: true,
    }],
  });

  res.json({
    success: true,
    data: {
      school_year,
      totalClasses,
      activeClasses,
      totalCapacity: parseInt(capacityStats[0]?.dataValues.totalCapacity || 0),
      enrolledStudents: enrollmentCount,
      availableSeats: parseInt(capacityStats[0]?.dataValues.totalCapacity || 0) - enrollmentCount,
      byGradeLevel: byGradeLevel.map((item) => ({
        grade_level: item.grade_level,
        count: parseInt(item.dataValues.count),
      })),
    },
  });
});

/**
 * @route   GET /api/classes/available
 * @desc    Get classes that are not full (have available seats)
 * @access  Admin
 */
exports.getAvailableClasses = catchAsync(async (req, res) => {
  const grade_level = req.query.grade_level ? parseInt(req.query.grade_level) : null;
  const school_year = req.query.school_year || '2024-2025';

  // Get all active classes with student count
  const where = { is_active: true, school_year };
  if (grade_level) {
    where.grade_level = grade_level;
  }

  const classes = await Class.findAll({
    where,
    include: [{
      model: Student,
      as: 'students',
      attributes: [],
    }, {
      model: Teacher,
      as: 'homeroomTeacher',
      attributes: ['id', 'first_name', 'last_name'],
    }],
    attributes: {
      include: [
        [Class.sequelize.fn('COUNT', Class.sequelize.col('students.id')), 'student_count'],
      ],
    },
    group: ['Class.id', 'homeroomTeacher.id'],
    order: [['grade_level', 'ASC'], ['name', 'ASC']],
  });

  // Filter classes that are not full
  const availableClasses = classes.filter((classData) => {
    const studentCount = parseInt(classData.dataValues.student_count || 0);
    return studentCount < classData.max_students;
  });

  res.json({
    success: true,
    data: {
      classes: availableClasses.map((classData) => ({
        ...classData.toJSON(),
        student_count: parseInt(classData.dataValues.student_count || 0),
        available_seats: classData.max_students - parseInt(classData.dataValues.student_count || 0),
        is_full: false,
      })),
    },
  });
});

module.exports = exports;
