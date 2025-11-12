const { Op } = require('sequelize');
const {
  Attendance, Student, Course, Teacher, User, Class,
} = require('../models');
const {
  catchAsync, NotFoundError, ValidationError, AuthorizationError,
} = require('../middleware/errorHandler');

/**
 * @route   GET /api/attendance
 * @desc    Get all attendance records with pagination and filtering
 * @access  Teacher, Admin
 */
exports.getAllAttendance = catchAsync(async (req, res) => {
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

  if (req.query.status) {
    where.status = req.query.status;
  }

  // Date filtering
  if (req.query.date) {
    where.date = req.query.date;
  } else if (req.query.start_date && req.query.end_date) {
    where.date = {
      [Op.between]: [req.query.start_date, req.query.end_date],
    };
  }

  // ✅ FIXED: For students, only show their own attendance
  if (req.user.role === 'student') {
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (student) {
      where.student_id = student.id;
    } else {
      // Student profile not found, return empty
      return res.json({
        success: true,
        data: {
          attendance: [],
          pagination: {
            total: 0, page: 1, pages: 0, limit,
          },
        },
      });
    }
  }

  // For teachers, only show attendance for their courses
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

  // Sorting
  const order = [['date', 'DESC'], ['created_at', 'DESC']];

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
    {
      model: User,
      as: 'marker',
      attributes: ['id', 'email', 'role'],
    },
  ];

  const { rows: attendance, count } = await Attendance.findAndCountAll({
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
      attendance,
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
 * @route   GET /api/attendance/:id
 * @desc    Get attendance record by ID
 * @access  Teacher (own courses), Admin
 */
exports.getAttendanceById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const attendance = await Attendance.findByPk(id, {
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
      {
        model: User,
        as: 'marker',
        attributes: ['id', 'email', 'role'],
      },
    ],
  });

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  // Check permissions - teachers can only view attendance for their courses
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || attendance.course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only view attendance for your courses');
    }
  }

  res.json({
    success: true,
    data: { attendance },
  });
});

/**
 * @route   POST /api/attendance
 * @desc    Mark attendance (create new record)
 * @access  Teacher (own courses), Admin
 */
exports.markAttendance = catchAsync(async (req, res) => {
  const {
    student_id,
    course_id,
    date,
    status,
    notes,
    check_in_time,
    check_out_time,
  } = req.body;

  // Validate required fields
  if (!student_id || !course_id || !date || !status) {
    throw new ValidationError('Student, course, date, and status are required');
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

  // Check permissions - teachers can only mark attendance for their courses
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only mark attendance for your own courses');
    }
  }

  // Check for duplicate attendance (same student, course, date)
  const existingAttendance = await Attendance.findOne({
    where: {
      student_id,
      course_id,
      date,
    },
  });

  if (existingAttendance) {
    throw new ValidationError(
      'Attendance for this student in this course on this date already exists. '
      + 'Please update the existing record instead.',
    );
  }

  // Create attendance record
  const newAttendance = await Attendance.create({
    student_id,
    course_id,
    date,
    status,
    notes: notes || null,
    check_in_time: check_in_time || null,
    check_out_time: check_out_time || null,
    marked_by: req.user.id,
  });

  // Fetch complete attendance data
  const attendanceData = await Attendance.findByPk(newAttendance.id, {
    include: [
      { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name'] },
      { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'Attendance marked successfully',
    data: { attendance: attendanceData },
  });
});

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance record
 * @access  Teacher (own courses), Admin
 */
exports.updateAttendance = catchAsync(async (req, res) => {
  const { id } = req.params;

  const attendance = await Attendance.findByPk(id, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || attendance.course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only update attendance for your own courses');
    }
  }

  // Fields that can be updated
  const allowedFields = [
    'status', 'notes', 'check_in_time', 'check_out_time',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Update marked_by to current user
  updates.marked_by = req.user.id;

  await attendance.update(updates);

  // Fetch updated data with associations
  const updatedAttendance = await Attendance.findByPk(id, {
    include: [
      { model: Student, as: 'student', attributes: ['id', 'first_name', 'last_name'] },
      { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'marker', attributes: ['id', 'email'] },
    ],
  });

  res.json({
    success: true,
    message: 'Attendance updated successfully',
    data: { attendance: updatedAttendance },
  });
});

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete attendance record
 * @access  Teacher (own courses), Admin
 */
exports.deleteAttendance = catchAsync(async (req, res) => {
  const { id } = req.params;

  const attendance = await Attendance.findByPk(id, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!attendance) {
    throw new NotFoundError('Attendance record not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || attendance.course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only delete attendance for your own courses');
    }
  }

  // Hard delete (attendance records can be removed)
  await attendance.destroy();

  res.json({
    success: true,
    message: 'Attendance deleted successfully',
    data: { deletedAttendanceId: id },
  });
});

/**
 * @route   GET /api/attendance/student/:studentId
 * @desc    Get attendance records for a specific student
 * @access  Student (self), Teacher, Admin
 */
exports.getStudentAttendance = catchAsync(async (req, res) => {
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
      throw new AuthorizationError('You can only view your own attendance');
    }
  }

  // Filtering
  const where = { student_id: studentId };

  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }

  if (req.query.start_date && req.query.end_date) {
    where.date = {
      [Op.between]: [req.query.start_date, req.query.end_date],
    };
  }

  // Get attendance with course data
  const attendance = await Attendance.findAll({
    where,
    include: [{
      model: Course,
      as: 'course',
      attributes: ['id', 'name', 'code', 'subject'],
    }],
    order: [['date', 'DESC']],
  });

  // Calculate attendance rate
  const rate = await Attendance.calculateAttendanceRate(studentId, {
    startDate: req.query.start_date,
    endDate: req.query.end_date,
  });

  res.json({
    success: true,
    data: {
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
      },
      attendance,
      rate,
      total: attendance.length,
      stats: rate,
    },
  });
});

/**
 * @route   GET /api/attendance/course/:courseId
 * @desc    Get attendance records for a specific course
 * @access  Teacher (own courses), Admin
 */
exports.getCourseAttendance = catchAsync(async (req, res) => {
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
      throw new AuthorizationError('You can only view attendance for your own courses');
    }
  }

  // Filtering
  const where = { course_id: courseId };

  if (req.query.date) {
    where.date = req.query.date;
  } else if (req.query.start_date && req.query.end_date) {
    where.date = {
      [Op.between]: [req.query.start_date, req.query.end_date],
    };
  }

  if (req.query.status) {
    where.status = req.query.status;
  }

  // Get attendance with student data
  const attendance = await Attendance.findAll({
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
      ['date', 'DESC'],
      [{ model: Student, as: 'student' }, 'last_name', 'ASC'],
    ],
  });

  // Get course statistics
  const stats = await Attendance.getCourseStats(courseId);

  res.json({
    success: true,
    data: {
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        subject: course.subject,
      },
      attendance,
      stats,
      total: attendance.length,
    },
  });
});

/**
 * @route   GET /api/attendance/date/:date
 * @desc    Get all attendance records for a specific date
 * @access  Teacher, Admin
 */
exports.getAttendanceByDate = catchAsync(async (req, res) => {
  const { date } = req.params;

  // Filtering
  const where = { date };

  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }

  if (req.query.status) {
    where.status = req.query.status;
  }

  // For teachers, only show attendance for their courses
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

  // Get attendance with student and course data
  const attendance = await Attendance.findAll({
    where,
    include: [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'first_name', 'last_name'],
      },
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'name', 'code', 'subject'],
      },
    ],
    order: [
      [{ model: Course, as: 'course' }, 'name', 'ASC'],
      [{ model: Student, as: 'student' }, 'last_name', 'ASC'],
    ],
  });

  // Calculate summary statistics
  const totalRecords = attendance.length;
  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const excusedCount = attendance.filter((a) => a.status === 'Excused').length;

  res.json({
    success: true,
    data: {
      date,
      attendance,
      summary: {
        total: totalRecords,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        attendance_rate: totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 10000) / 100
          : 0,
      },
    },
  });
});

/**
 * @route   GET /api/attendance/stats
 * @desc    Get attendance statistics
 * @access  Admin only
 */
exports.getAttendanceStats = catchAsync(async (req, res) => {
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;

  const where = {};
  if (startDate && endDate) {
    where.date = { [Op.between]: [startDate, endDate] };
  }

  const [totalRecords, byStatus, poorAttendance] = await Promise.all([
    // Total attendance records
    Attendance.count({ where }),

    // Records by status
    Attendance.findAll({
      where,
      attributes: [
        'status',
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
    }),

    // Students with poor attendance
    Attendance.getPoorAttendance(50, { startDate, endDate }),
  ]);

  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      total: totalRecords,
      overallRate: totalRecords > 0
        ? Math.round((byStatus.find((s) => s.status === 'Present')?.dataValues?.count || 0) / totalRecords * 10000) / 100
        : 0,
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.dataValues.count),
        percentage: totalRecords > 0
          ? Math.round((parseInt(item.dataValues.count) / totalRecords) * 10000) / 100
          : 0,
      })),
      poorAttendance: poorAttendance.slice(0, 10), // Top 10 students with poor attendance
    },
  });
});

/**
 * @route   POST /api/attendance/bulk
 * @desc    Mark attendance for multiple students at once
 * @access  Teacher (own courses), Admin
 */
exports.bulkMarkAttendance = catchAsync(async (req, res) => {
  const { course_id, date, records } = req.body;

  if (!course_id || !date || !Array.isArray(records) || records.length === 0) {
    throw new ValidationError('Course, date, and records array are required');
  }

  // Verify course exists
  const course = await Course.findByPk(course_id);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check permissions
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (!teacher || course.teacher_id !== teacher.id) {
      throw new AuthorizationError('You can only mark attendance for your own courses');
    }
  }

  // Check for existing attendance records on this date
  const existingRecords = await Attendance.findAll({
    where: {
      course_id,
      date,
      student_id: { [Op.in]: records.map((r) => r.student_id) },
    },
  });

  if (existingRecords.length > 0) {
    throw new ValidationError(
      `Attendance already exists for ${existingRecords.length} student(s) on this date. `
      + 'Please update existing records instead.',
    );
  }

  // Prepare attendance records for bulk insert
  const attendanceRecords = records.map((r) => ({
    student_id: r.student_id,
    course_id,
    date,
    status: r.status,
    notes: r.notes || null,
    check_in_time: r.check_in_time || null,
    check_out_time: r.check_out_time || null,
    marked_by: req.user.id,
  }));

  // Bulk create
  const createdRecords = await Attendance.bulkCreate(attendanceRecords, {
    validate: true,
  });

  res.status(201).json({
    success: true,
    message: `Attendance marked for ${createdRecords.length} student(s)`,
    data: {
      count: createdRecords.length,
      attendance: createdRecords,
    },
  });
});

module.exports = exports;
