const { Op } = require('sequelize');
const {
  Grade, Student, Course, Teacher, User, Class,
} = require('../models');
const {
  catchAsync, NotFoundError, ValidationError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/grades
 * @desc    Get all grades with pagination and filtering
 * @access  Admin, Teacher (own courses)
 */
exports.getAllGrades = catchAsync(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Filtering
  const where = {};

  if (req.query.student_id) {
    where.student_id = req.query.student_id;
  }

  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }

  if (req.query.semester) {
    where.semester = req.query.semester;
  }

  if (req.query.grade_type) {
    where.grade_type = req.query.grade_type;
  }

  if (req.query.is_published !== undefined) {
    where.is_published = req.query.is_published === 'true';
  }

  // Date range filter with validation
  if (req.query.start_date && req.query.end_date) {
    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    // Validate date range
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use valid dates.',
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before or equal to end date',
      });
    }

    where.graded_date = {
      [Op.between]: [req.query.start_date, req.query.end_date],
    };
  }

  // ✅ FIXED: For students, only show their own grades
  if (req.user.role === 'student') {
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (student) {
      where.student_id = student.id;
    } else {
      // Student profile not found, return empty
      return res.json({
        success: true,
        data: {
          grades: [],
          pagination: {
            total: 0, page: 1, pages: 0, limit,
          },
        },
      });
    }
  }

  // For teachers, only show grades for their courses
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (teacher) {
      const teacherCourses = await Course.findAll({
        where: { teacher_id: teacher.id },
        attributes: ['id'],
      });
      where.course_id = { [Op.in]: teacherCourses.map((c) => c.id) };
    }
  }

  // Sorting with whitelist validation to prevent SQL injection
  const order = [];
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-')
      ? req.query.sort.substring(1)
      : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';

    // Whitelist of allowed sort fields
    const allowedSortFields = ['grade_id', 'score', 'grade_type', 'graded_date', 'semester', 'weight', 'created_at', 'updated_at'];

    if (allowedSortFields.includes(sortField)) {
      order.push([sortField, sortOrder]);
    } else {
      // If invalid sort field, use default
      order.push(['graded_date', 'DESC']);
    }
  } else {
    order.push(['graded_date', 'DESC']);
  }

  // Include related data
  const include = [
    {
      model: Student,
      as: 'student',
      attributes: ['id', 'first_name', 'last_name'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email'],
      }],
    },
    {
      model: Course,
      as: 'course',
      attributes: ['id', 'name', 'code', 'subject'],
    },
  ];

  const { rows: grades, count } = await Grade.findAndCountAll({
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
      grades,
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
 * @route   GET /api/grades/:id
 * @desc    Get grade by ID
 * @access  Student (self), Teacher (own courses), Admin
 */
exports.getGradeById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const grade = await Grade.findByPk(id, {
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'first_name', 'last_name'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['email'],
        }],
      },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'name', 'code', 'subject', 'teacher_id'],
      },
    ],
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  // Check permissions
  const isAdmin = req.user.role === 'admin';
  const isStudent = req.user.role === 'student';
  const isTeacher = req.user.role === 'teacher';

  if (isStudent) {
    // Students can only view their own grades
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student || grade.student_id !== student.id) {
      throw new AuthorizationError('You can only view your own grades');
    }

    // Students can only see published grades
    if (!grade.is_published) {
      throw new AuthorizationError('This grade has not been published yet');
    }
  } else if (isTeacher) {
    // Teachers can only view grades for their courses
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || grade.course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only view grades for your courses');
    }
  }

  res.json({
    success: true,
    data: { grade },
  });
});

/**
 * @route   POST /api/grades
 * @desc    Create new grade
 * @access  Teacher (own courses), Admin
 */
exports.createGrade = catchAsync(async (req, res) => {
  const {
    student_id,
    course_id,
    score,
    grade_type,
    semester,
    graded_date,
    notes,
    is_published,
  } = req.body;

  // Validate required fields
  if (!student_id || !course_id || score === undefined || !grade_type || !semester) {
    throw new ValidationError('Student, course, score, grade type, and semester are required');
  }

  // Verify student exists
  const student = await Student.findByPk(student_id);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Verify course exists
  const course = await Course.findByPk(course_id);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check permissions - teachers can only create grades for their courses
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only create grades for your own courses');
    }
  }

  // Check for duplicate grade (same student, course, grade_type, semester)
  const existingGrade = await Grade.findOne({
    where: {
      student_id,
      course_id,
      grade_type,
      semester,
    },
  });

  if (existingGrade) {
    throw new ValidationError(
      `A ${grade_type} grade for this student in semester ${semester} already exists. `
      + 'Please update the existing grade instead.',
    );
  }

  // Create grade
  const newGrade = await Grade.create({
    student_id,
    course_id,
    score: parseFloat(score),
    letter_grade: Grade.calculateLetterGrade(parseFloat(score)),
    grade_type,
    semester,
    graded_date: graded_date || new Date(),
    notes: notes || null,
    is_published: is_published !== undefined ? is_published : false,
  });

  // Fetch complete grade data
  const gradeData = await Grade.findByPk(newGrade.id, {
    include: [
      { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name'] },
      { model: Course, as: 'course', attributes: ['id', 'name', 'code', 'subject'] },
    ],
  });

  // Convert score to number for consistent API response
  const formattedGrade = {
    ...gradeData.toJSON(),
    score: parseFloat(gradeData.score),
  };

  res.status(201).json({
    success: true,
    message: 'Grade created successfully',
    data: { grade: formattedGrade },
  });
});

/**
 * @route   PUT /api/grades/:id
 * @desc    Update grade
 * @access  Teacher (own courses), Admin
 */
exports.updateGrade = catchAsync(async (req, res) => {
  const { id } = req.params;

  const grade = await Grade.findByPk(id, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || grade.course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only update grades for your own courses');
    }
  }

  // Fields that can be updated
  const allowedFields = [
    'score', 'grade_type', 'semester', 'graded_date',
    'notes', 'is_published',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Recalculate letter grade if score is updated
  if (updates.score !== undefined) {
    updates.letter_grade = Grade.calculateLetterGrade(parseFloat(updates.score));
  }

  await grade.update(updates);

  // Fetch updated data with associations
  const updatedGrade = await Grade.findByPk(id, {
    include: [
      { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name'] },
      { model: Course, as: 'course', attributes: ['id', 'name', 'code', 'subject'] },
    ],
  });

  // Convert score to number for consistent API response
  const formattedGrade = {
    ...updatedGrade.toJSON(),
    score: parseFloat(updatedGrade.score),
  };

  res.json({
    success: true,
    message: 'Grade updated successfully',
    data: { grade: formattedGrade },
  });
});

/**
 * @route   DELETE /api/grades/:id
 * @desc    Delete grade
 * @access  Teacher (own courses), Admin
 */
exports.deleteGrade = catchAsync(async (req, res) => {
  const { id } = req.params;

  const grade = await Grade.findByPk(id, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || grade.course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only delete grades for your own courses');
    }
  }

  // Hard delete (since grades are records, not entities)
  await grade.destroy();

  res.json({
    success: true,
    message: 'Grade deleted successfully',
    data: { deletedGradeId: id },
  });
});

/**
 * @route   GET /api/grades/student/:studentId
 * @desc    Get all grades for a specific student
 * @access  Student (self), Teacher, Admin
 */
exports.getStudentGrades = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  // Verify student exists
  const student = await Student.findByPk(studentId);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Check permissions
  const isAdmin = req.user.role === 'admin';
  const isTeacher = req.user.role === 'teacher';
  const isStudent = req.user.role === 'student';

  if (isStudent) {
    const currentStudent = await Student.findOne({ where: { user_id: req.user.id } });
    if (!currentStudent || currentStudent.id !== studentId) {
      throw new AuthorizationError('You can only view your own grades');
    }
  }

  // Filtering
  const where = { student_id: studentId };

  // Students can only see published grades
  if (isStudent) {
    where.is_published = true;
  }

  if (req.query.semester) {
    where.semester = req.query.semester;
  }

  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }

  // Get grades with course data
  const grades = await Grade.findAll({
    where,
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'name', 'code', 'subject', 'credits'],
    }],
    order: [['semester', 'ASC'], ['graded_date', 'DESC']],
  });

  // Calculate GPA
  const gpa = await Grade.calculateStudentGPA(studentId);

  res.json({
    success: true,
    data: {
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
      },
      grades,
      gpa,
      total: grades.length,
    },
  });
});

/**
 * @route   GET /api/grades/course/:courseId
 * @desc    Get all grades for a specific course
 * @access  Teacher (own courses), Admin
 */
exports.getCourseGrades = catchAsync(async (req, res) => {
  const { courseId } = req.params;

  // Verify course exists
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only view grades for your own courses');
    }
  }

  // Filtering
  const where = { course_id: courseId };

  if (req.query.semester) {
    where.semester = req.query.semester;
  }

  if (req.query.grade_type) {
    where.grade_type = req.query.grade_type;
  }

  // Get grades with student data
  const grades = await Grade.findAll({
    where,
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
    order: [
      ['semester', 'ASC'],
      [{ model: Student, as: 'student' }, 'last_name', 'ASC'],
    ],
  });

  // Calculate statistics
  const distribution = await Grade.getDistribution(courseId);

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
      distribution,
      total: grades.length,
    },
  });
});

/**
 * @route   GET /api/grades/stats
 * @desc    Get grade statistics
 * @access  Admin only
 */
exports.getGradeStats = catchAsync(async (req, res) => {
  const semester = req.query.semester || '1';

  const [totalGrades, byGradeType, averageScore] = await Promise.all([
    // Total grades
    Grade.count({ where: { semester } }),

    // Grades by type
    Grade.findAll({
      where: { semester },
      attributes: [
        'grade_type',
        [Grade.sequelize.fn('COUNT', Grade.sequelize.col('id')), 'count'],
        [Grade.sequelize.fn('AVG', Grade.sequelize.col('score')), 'avg_score'],
      ],
      group: ['grade_type'],
      order: [['grade_type', 'ASC']],
    }),

    // Overall average
    Grade.findOne({
      where: { semester },
      attributes: [
        [Grade.sequelize.fn('AVG', Grade.sequelize.col('score')), 'average'],
      ],
    }),
  ]);

  // Pass/fail statistics
  const passingCount = await Grade.count({
    where: {
      semester,
      score: { [Op.gte]: 50 },
    },
  });

  // Get published grades count
  const publishedCount = await Grade.count({
    where: {
      semester,
      is_published: true,
    },
  });

  // Get grades by letter grade
  const byLetterGrade = await Grade.findAll({
    where: { semester },
    attributes: [
      'letter_grade',
      [Grade.sequelize.fn('COUNT', Grade.sequelize.col('id')), 'count'],
    ],
    group: ['letter_grade'],
    order: [['letter_grade', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      semester,
      total: totalGrades,
      published: publishedCount,
      averageScore: Math.round(parseFloat(averageScore?.dataValues.average || 0) * 100) / 100,
      passingGrades: passingCount,
      passingRate: totalGrades > 0 ? Math.round((passingCount / totalGrades) * 10000) / 100 : 0,
      byGradeType: byGradeType.map((item) => ({
        grade_type: item.grade_type,
        count: parseInt(item.dataValues.count),
        avg_score: Math.round(parseFloat(item.dataValues.avg_score) * 100) / 100,
      })),
      byLetterGrade: byLetterGrade.map((item) => ({
        letter_grade: item.letter_grade,
        count: parseInt(item.dataValues.count),
      })),
    },
  });
});

/**
 * @route   POST /api/grades/bulk
 * @desc    Create multiple grades at once
 * @access  Teacher (own courses), Admin
 */
exports.bulkCreateGrades = catchAsync(async (req, res) => {
  const { grades } = req.body;

  if (!Array.isArray(grades) || grades.length === 0) {
    throw new ValidationError('Grades array is required and must not be empty');
  }

  // Verify all courses belong to the teacher (if teacher)
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (teacher) {
      const courseIds = [...new Set(grades.map((g) => g.course_id))];
      const courses = await Course.findAll({
        where: {
          id: { [Op.in]: courseIds },
          teacher_id: teacher.id,
        },
      });

      if (courses.length !== courseIds.length) {
        throw new AuthorizationError('You can only create grades for your own courses');
      }
    }
  }

  // Validate and prepare grades for bulk insert
  const gradesToCreate = grades.map((g) => ({
    student_id: g.student_id,
    course_id: g.course_id,
    score: parseFloat(g.score),
    letter_grade: Grade.calculateLetterGrade(parseFloat(g.score)),
    grade_type: g.grade_type,
    semester: g.semester,
    graded_date: g.graded_date || new Date(),
    notes: g.notes || null,
    is_published: g.is_published !== undefined ? g.is_published : false,
  }));

  // Bulk create
  const createdGrades = await Grade.bulkCreate(gradesToCreate, {
    validate: true,
  });

  res.status(201).json({
    success: true,
    message: `${createdGrades.length} grades created successfully`,
    data: {
      count: createdGrades.length,
      grades: createdGrades,
    },
  });
});

module.exports = exports;
