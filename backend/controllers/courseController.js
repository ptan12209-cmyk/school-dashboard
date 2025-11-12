const { Op } = require('sequelize');
const {
  Course, Teacher, Class, Student, Grade, User,
} = require('../models');
const {
  catchAsync, NotFoundError, ValidationError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/courses
 * @desc    Get all courses with pagination and filtering
 * @access  Public
 */
exports.getAllCourses = catchAsync(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Filtering
  const where = {};

  if (req.query.subject) {
    where.subject = req.query.subject;
  }

  if (req.query.semester) {
    where.semester = req.query.semester;
  }

  if (req.query.school_year) {
    where.school_year = req.query.school_year;
  }

  if (req.query.teacher_id) {
    where.teacher_id = req.query.teacher_id;
  }

  if (req.query.class_id) {
    where.class_id = req.query.class_id;
  }

  if (req.query.is_active !== undefined) {
    where.is_active = req.query.is_active === 'true';
  }

  // Search by name or code
  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.search}%` } },
      { code: { [Op.iLike]: `%${req.query.search}%` } },
    ];
  }

  // Sorting
  const order = [];
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-')
      ? req.query.sort.substring(1)
      : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';
    order.push([sortField, sortOrder]);
  } else {
    order.push(['subject', 'ASC'], ['name', 'ASC']);
  }

  // Include related data
  const include = [
    {
      model: Teacher,
      as: 'teacher',
      attributes: ['id', 'first_name', 'last_name', 'department'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email'],
      }],
    },
    {
      model: Class,
      as: 'class',
      attributes: ['id', 'name', 'grade_level'],
    },
  ];

  const { rows: courses, count } = await Course.findAndCountAll({
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
      courses,
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
 * @route   GET /api/courses/:id
 * @desc    Get course by ID with details
 * @access  Public
 */
exports.getCourseById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id, {
    include: [
      {
        model: Teacher,
        as: 'teacher',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'department'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['email'],
        }],
      },
      {
        model: Class,
        as: 'class',
        attributes: ['id', 'name', 'grade_level', 'room_number'],
      },
    ],
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Get statistics
  const stats = await course.getStatistics();

  res.json({
    success: true,
    data: {
      course: {
        ...course.toJSON(),
        stats,
      },
    },
  });
});

/**
 * @route   POST /api/courses
 * @desc    Create new course
 * @access  Admin, Teacher
 */
exports.createCourse = catchAsync(async (req, res) => {
  const {
    name,
    code,
    subject,
    description,
    credits,
    teacher_id,
    class_id,
    semester,
    school_year,
    schedule,
  } = req.body;

  // Validate required fields
  if (!name || !code || !subject) {
    throw new ValidationError('Name, code, and subject are required');
  }

  // Check if code already exists for the same school year
  const existingCourse = await Course.findOne({
    where: {
      code,
      school_year: school_year || '2024-2025',
    },
  });

  if (existingCourse) {
    throw new ValidationError('Course code already exists for this school year');
  }

  // Verify teacher exists if provided
  if (teacher_id) {
    const teacher = await Teacher.findByPk(teacher_id);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }
  }

  // Verify class exists if provided
  if (class_id) {
    const classData = await Class.findByPk(class_id);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }
  }

  // Create course
  if (!teacher_id || !class_id) {
    throw new ValidationError('Teacher ID and Class ID are required');
  }

  // Validate schedule format if provided
  let validatedSchedule = null;
  if (schedule) {
    // Schedule should be an object or array
    if (typeof schedule === 'string') {
      try {
        validatedSchedule = JSON.parse(schedule);
      } catch (error) {
        throw new ValidationError('Invalid schedule format. Must be valid JSON.');
      }
    } else if (typeof schedule === 'object') {
      validatedSchedule = schedule;
    } else {
      throw new ValidationError('Schedule must be an object or array');
    }
  }

  const newCourse = await Course.create({
    name,
    code,
    subject,
    description,
    credits: credits || 1.0,
    teacher_id, // ✓ Không cho null
    class_id, // ✓ Không cho null
    semester: semester || '1',
    school_year: school_year || '2024-2025',
    schedule: validatedSchedule,
    is_active: true,
  });

  // Fetch complete course data
  const courseData = await Course.findByPk(newCourse.id, {
    include: [
      { model: Teacher, as: 'teacher', attributes: ['id', 'first_name', 'last_name'] },
      { model: Class, as: 'class', attributes: ['id', 'name', 'grade_level'] },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: {
      course: {
        ...courseData.toJSON(),
        credits: parseFloat(courseData.credits),
      },
    },
  });
});

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Admin, Teacher (own courses)
 */
exports.updateCourse = catchAsync(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id);

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check permissions - teachers can only update their own courses
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only update your own courses');
    }
  }

  // Fields that can be updated
  const allowedFields = [
    'name', 'code', 'subject', 'description', 'credits',
    'teacher_id', 'class_id', 'semester', 'school_year',
    'schedule', 'is_active',
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

  // Verify class exists if updating class_id
  if (updates.class_id) {
    const classData = await Class.findByPk(updates.class_id);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }
  }

  // Check if new code conflicts with existing course
  if (updates.code && updates.code !== course.code) {
    const existingCourse = await Course.findOne({
      where: {
        code: updates.code,
        school_year: updates.school_year || course.school_year,
        id: { [Op.ne]: id },
      },
    });

    if (existingCourse) {
      throw new ValidationError('Course code already exists for this school year');
    }
  }

  await course.update(updates);

  // Fetch updated data with associations
  const updatedCourse = await Course.findByPk(id, {
    include: [
      { model: Teacher, as: 'teacher', attributes: ['id', 'first_name', 'last_name'] },
      { model: Class, as: 'class', attributes: ['id', 'name', 'grade_level'] },
    ],
  });

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: {
      course: {
        ...updatedCourse.toJSON(),
        credits: parseFloat(updatedCourse.credits),
      },
    },
  });
});

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course (soft delete - set is_active to false)
 * @access  Admin only
 */
exports.deleteCourse = catchAsync(async (req, res) => {
  const { id } = req.params;

  const course = await Course.findByPk(id, {
    include: [{ model: Grade, as: 'grades' }],
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check if course has grades
  if (course.grades && course.grades.length > 0) {
    throw new ValidationError(
      `Cannot delete course with ${course.grades.length} grade records. `
      + 'Archive the course instead by setting is_active to false.',
    );
  }

  // Soft delete
  await course.update({ is_active: false });

  res.json({
    success: true,
    message: 'Course deleted successfully',
    data: { deletedCourseId: id },
  });
});

/**
 * @route   GET /api/courses/:id/grades
 * @desc    Get all grades for a course
 * @access  Teacher (own courses), Admin
 */
exports.getCourseGrades = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verify course exists
  const course = await Course.findByPk(id);

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check permissions - teachers can only view grades for their own courses
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only view grades for your own courses');
    }
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Get grades with student data
  const { rows: grades, count } = await Grade.findAndCountAll({
    where: { course_id: id },
    include: [{
      model: Student,
      as: 'student',
      attributes: ['id', 'first_name', 'last_name'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email'],
      }],
    }],
    limit,
    offset,
    order: [
      ['semester', 'ASC'],
      ['graded_date', 'DESC'],
      [{ model: Student, as: 'student' }, 'last_name', 'ASC'],
    ],
  });

  // Calculate average score
  const avgScore = grades.length > 0
    ? grades.reduce((sum, grade) => sum + parseFloat(grade.score), 0) / grades.length
    : 0;

  res.json({
    success: true,
    data: {
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        subject: course.subject,
      },
      grades,
      stats: {
        total: count,
        average: Math.round(avgScore * 100) / 100,
      },
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
 * @route   GET /api/courses/:id/students
 * @desc    Get enrolled students for a course (via grades)
 * @access  Teacher (own courses), Admin
 */
exports.getCourseStudents = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Verify course exists
  const course = await Course.findByPk(id);

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only view students for your own courses');
    }
  }

  // Get unique students who have grades in this course
  const students = await Student.findAll({
    include: [{
      model: Grade,
      as: 'grades',
      where: { course_id: id },
      attributes: [],
      required: true,
    }, {
      model: User,
      as: 'user',
      attributes: ['email', 'is_active'],
    }],
    attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'class_id'],
    group: ['Student.id', 'user.id'],
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
      },
      students,
      total: students.length,
    },
  });
});

/**
 * @route   GET /api/courses/subjects
 * @desc    Get list of all unique subjects
 * @access  Public
 */
exports.getAllSubjects = catchAsync(async (req, res) => {
  const school_year = req.query.school_year || '2024-2025';

  const subjects = await Course.findAll({
    where: {
      school_year,
      is_active: true,
    },
    attributes: [
      'subject',
      [Course.sequelize.fn('COUNT', Course.sequelize.col('id')), 'course_count'],
    ],
    group: ['subject'],
    order: [['subject', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      subjects: subjects.map((item) => ({
        subject: item.subject,
        course_count: parseInt(item.dataValues.course_count),
      })),
    },
  });
});

/**
 * @route   GET /api/courses/stats
 * @desc    Get statistics about courses
 * @access  Admin only
 */
exports.getCourseStats = catchAsync(async (req, res) => {
  const school_year = req.query.school_year || '2024-2025';

  const [totalCourses, activeCourses, bySubject, bySemester] = await Promise.all([
    // Total courses
    Course.count({ where: { school_year } }),

    // Active courses
    Course.count({ where: { school_year, is_active: true } }),

    // Courses by subject
    Course.findAll({
      where: { school_year, is_active: true },
      attributes: [
        'subject',
        [Course.sequelize.fn('COUNT', Course.sequelize.col('id')), 'count'],
      ],
      group: ['subject'],
      order: [[Course.sequelize.fn('COUNT', Course.sequelize.col('id')), 'DESC']],
    }),

    // Courses by semester
    Course.findAll({
      where: { school_year, is_active: true },
      attributes: [
        'semester',
        [Course.sequelize.fn('COUNT', Course.sequelize.col('id')), 'count'],
      ],
      group: ['semester'],
      order: [['semester', 'ASC']],
    }),
  ]);

  res.json({
    success: true,
    data: {
      school_year,
      totalCourses,
      activeCourses,
      bySubject: bySubject.map((item) => ({
        subject: item.subject,
        count: parseInt(item.dataValues.count),
      })),
      bySemester: bySemester.map((item) => ({
        semester: item.semester,
        count: parseInt(item.dataValues.count),
      })),
    },
  });
});

module.exports = exports;
