const { Op } = require('sequelize');
const {
  Student, Teacher, Course, Grade, Attendance, Class,
} = require('../models');
const { catchAsync } = require('../middleware/errorHandler');

// Helper functions defined before main export to fix no-use-before-define errors

const getPerformanceData = async (courseFilter = {}) => {
  const last6Months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const where = {
      created_at: {
        [Op.gte]: month,
        [Op.lt]: nextMonth,
      },
    };

    // Apply course filter if provided
    if (courseFilter.id) {
      where.course_id = courseFilter.id;
    }

    const grades = await Grade.findAll({ where });

    const avg = grades.length > 0
      ? parseFloat((grades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / grades.length / 10).toFixed(1))
      : 0;

    last6Months.push({
      month: month.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
      value: avg,
    });
  }

  return last6Months;
};

const getSubjectData = async (courseFilter = {}) => {
  const where = courseFilter.id ? courseFilter : {};

  const courses = await Course.findAll({
    where,
    include: [{
      model: Grade,
      as: 'grades',
      attributes: ['score'],
    }],
    limit: 6,
  });

  return courses.map((course) => ({
    subject: course.name,
    value: course.grades && course.grades.length > 0
      ? parseFloat((course.grades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / course.grades.length / 10).toFixed(1))
      : 0,
  }));
};

const getGradeDistribution = async (courseFilter = {}) => {
  const where = courseFilter.id ? { course_id: courseFilter.id } : {};

  const grades = await Grade.findAll({
    where,
    attributes: ['score'],
  });

  const distribution = {
    excellent: 0,
    good: 0,
    average: 0,
    poor: 0,
  };

  grades.forEach((grade) => {
    const score = parseFloat(grade.score || 0) / 10;
    if (score >= 8.5) distribution.excellent++;
    else if (score >= 7) distribution.good++;
    else if (score >= 5.5) distribution.average++;
    else distribution.poor++;
  });

  return [
    { name: 'Xuất Sắc (≥8.5)', value: distribution.excellent },
    { name: 'Giỏi (7-8.5)', value: distribution.good },
    { name: 'Khá (5.5-7)', value: distribution.average },
    { name: 'Yếu (<5.5)', value: distribution.poor },
  ];
};

const getRecentActivities = async (courseFilter = {}) => {
  const where = courseFilter.id ? { course_id: courseFilter.id } : {};

  const recentGrades = await Grade.findAll({
    where,
    include: [
      { model: Student, as: 'student', attributes: ['first_name', 'last_name'] },
      { model: Course, as: 'course', attributes: ['name'] },
    ],
    order: [['created_at', 'DESC']],
    limit: 5,
  });

  const recentAttendance = await Attendance.findAll({
    where,
    include: [
      { model: Student, as: 'student', attributes: ['first_name', 'last_name'] },
      { model: Course, as: 'course', attributes: ['name'] },
    ],
    order: [['created_at', 'DESC']],
    limit: 5,
  });

  const activities = [];

  recentGrades.forEach((grade) => {
    activities.push({
      type: 'grade',
      description: `Điểm ${grade.course?.name || 'N/A'} cho ${grade.student?.first_name || ''} ${grade.student?.last_name || ''}: ${parseFloat(grade.score || 0) / 10}/10`,
      timestamp: grade.created_at,
    });
  });

  recentAttendance.forEach((att) => {
    activities.push({
      type: 'attendance',
      description: `Điểm danh ${att.course?.name || 'N/A'} - ${att.student?.first_name || ''} ${att.student?.last_name || ''}: ${att.status}`,
      timestamp: att.created_at,
    });
  });

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
};

exports.getDashboardStats = catchAsync(async (req, res) => {
  // ✅ FIXED: Filter dashboard stats based on user role
  let courseFilter = {};
  let studentFilter = {};

  // For teachers: only show stats for their courses and students
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { user_id: req.user.id } });
    if (teacher) {
      // Get teacher's courses
      const teacherCourses = await Course.findAll({
        where: { teacher_id: teacher.id },
        attributes: ['id'],
      });
      const courseIds = teacherCourses.map((c) => c.id);

      if (courseIds.length === 0) {
        // Teacher has no courses, return empty stats
        return res.json({
          success: true,
          data: {
            stats: {
              totalStudents: 0,
              totalTeachers: 1,
              totalCourses: 0,
              totalClasses: 0,
              averageGrade: 0,
              topStudents: [],
              topTeachers: [],
            },
            charts: {
              performanceData: [],
              subjectData: [],
              gradeDistribution: [],
            },
            recentActivities: [],
          },
        });
      }

      courseFilter = { id: { [Op.in]: courseIds } };

      // Get unique students enrolled in teacher's courses
      const enrolledStudents = await Grade.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        attributes: ['student_id'],
        group: ['student_id'],
      });
      const studentIds = [...new Set(enrolledStudents.map((g) => g.student_id))];
      studentFilter = { id: { [Op.in]: studentIds } };
    }
  }

  const totalStudents = await Student.count(studentFilter.id ? { where: studentFilter } : {});
  const totalTeachers = await Teacher.count();
  const totalCourses = await Course.count(courseFilter.id ? { where: courseFilter } : {});
  const totalClasses = await Class.count();

  const gradesWhere = courseFilter.id ? { course_id: courseFilter.id } : {};
  const grades = await Grade.findAll({
    where: gradesWhere,
    attributes: ['score'],
  });

  const averageGrade = grades.length > 0
    ? parseFloat((grades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / grades.length / 10).toFixed(1))
    : 0;

  const topStudents = await Student.findAll({
    where: studentFilter.id ? studentFilter : {},
    include: [{
      model: Grade,
      as: 'grades',
      attributes: ['score'],
      where: courseFilter.id ? { course_id: courseFilter.id } : {},
      required: true,
    }],
    limit: 5,
    order: [[{ model: Grade, as: 'grades' }, 'score', 'DESC']],
  });

  const topTeachers = await Teacher.findAll({
    include: [{
      model: Course,
      as: 'courses',
      attributes: ['id', 'name'],
    }],
    limit: 5,
  });

  return res.json({
    success: true,
    data: {
      stats: {
        totalStudents,
        totalTeachers,
        totalCourses,
        totalClasses,
        averageGrade,
        topStudents: topStudents.map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          averageGrade: s.grades && s.grades.length > 0
            ? parseFloat((s.grades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / s.grades.length / 10).toFixed(1))
            : 0,
        })),
        topTeachers: topTeachers.map((t) => ({
          id: t.id,
          name: `${t.first_name} ${t.last_name}`,
          coursesCount: t.courses ? t.courses.length : 0,
        })),
      },
      charts: {
        performanceData: await getPerformanceData(courseFilter),
        subjectData: await getSubjectData(courseFilter),
        gradeDistribution: await getGradeDistribution(courseFilter),
      },
      recentActivities: await getRecentActivities(courseFilter),
    },
  });
});
