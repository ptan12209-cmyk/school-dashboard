/**
 * AI Controller
 * =============
 * Handles AI-related endpoints
 */

const { Op } = require('sequelize');
const aiService = require('../services/aiService');
const { catchAsync } = require('../middleware/errorHandler');
const {
  Student, Grade, Course, Attendance,
} = require('../models');

/**
 * Chat with AI Assistant
 * POST /api/ai/chat
 */
exports.chat = catchAsync(async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  // ✅ SECURITY FIX: Enhanced input validation and sanitization
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tin nhắn hợp lệ',
    });
  }

  // Limit message length to prevent abuse
  const MAX_MESSAGE_LENGTH = 2000;
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Tin nhắn quá dài. Tối đa ${MAX_MESSAGE_LENGTH} ký tự`,
    });
  }

  // Basic prompt injection detection
  const suspiciousPatterns = [
    /ignore\s+(previous|above|all)\s+instructions?/i,
    /you\s+are\s+now/i,
    /system\s*:/i,
    /\[SYSTEM\]/i,
    /<\|im_start\|>/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      console.warn(`⚠️  Potential prompt injection detected from user ${userId}: ${message.substring(0, 100)}`);
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn chứa nội dung không được phép',
      });
    }
  }

  // Build context from user profile
  const context = {
    role: req.user.role,
    name: req.user.email.split('@')[0],
    language: 'Vietnamese',
  };

  const response = await aiService.chat(userId, message, context);

  return res.json({
    success: true,
    data: {
      message: response,
      timestamp: new Date(),
    },
  });
});

/**
 * Clear chat history
 * DELETE /api/ai/chat/history
 */
exports.clearChatHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  aiService.clearHistory(userId);

  return res.json({
    success: true,
    message: 'Đã xóa lịch sử trò chuyện',
  });
});

/**
 * Get study recommendations for a student
 * GET /api/ai/recommendations/study/:studentId
 */
exports.getStudyRecommendations = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  // Check permissions
  if (req.user.role === 'student' && req.user.studentProfile?.id !== parseInt(studentId, 10)) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập',
    });
  }

  // Get student data
  const student = await Student.findByPk(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy học sinh',
    });
  }

  // Get grades
  const grades = await Grade.findAll({
    where: { student_id: studentId },
    include: [{ model: Course, as: 'course' }],
    order: [['created_at', 'DESC']],
    limit: 20,
  });

  // Calculate average and identify weak/strong subjects
  const subjectScores = {};
  grades.forEach((grade) => {
    const courseName = grade.course?.name || 'Unknown';
    if (!subjectScores[courseName]) {
      subjectScores[courseName] = [];
    }
    subjectScores[courseName].push(parseFloat(grade.score));
  });

  const subjectAverages = Object.entries(subjectScores).map(([name, scores]) => ({
    name,
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
  })).sort((a, b) => a.average - b.average);

  const weakSubjects = subjectAverages.slice(0, 3).map((s) => s.name);
  const strengths = subjectAverages.slice(-3).map((s) => s.name);
  const overallAverage = subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length;

  // Generate recommendations
  const studentData = {
    name: student.getFullName(),
    grades: {
      average: overallAverage.toFixed(2),
    },
    weakSubjects,
    strengths,
  };

  const recommendations = await aiService.generateStudyRecommendations(studentData);

  return res.json({
    success: true,
    data: {
      recommendations,
      studentData: {
        name: student.getFullName(),
        overallAverage: overallAverage.toFixed(2),
        weakSubjects,
        strengths,
      },
    },
  });
});

/**
 * Get performance prediction for a student
 * GET /api/ai/predict/performance/:studentId
 */
exports.predictPerformance = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  // Check permissions
  if (req.user.role === 'student' && req.user.studentProfile?.id !== parseInt(studentId, 10)) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập',
    });
  }

  // Get recent grades
  const grades = await Grade.findAll({
    where: { student_id: studentId },
    order: [['created_at', 'ASC']],
    limit: 10,
  });

  if (grades.length < 2) {
    return res.json({
      success: true,
      data: {
        trend: 'insufficient_data',
        message: 'Cần ít nhất 2 điểm để dự đoán xu hướng',
      },
    });
  }

  const prediction = aiService.predictPerformanceTrend(grades);

  return res.json({
    success: true,
    data: prediction,
  });
});

/**
 * Get course recommendations
 * POST /api/ai/recommendations/courses
 */
exports.getCourseRecommendations = catchAsync(async (req, res) => {
  const { interests, careerGoals } = req.body;
  const studentId = req.user.studentProfile?.id;

  if (!studentId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ học sinh mới có thể nhận gợi ý khóa học',
    });
  }

  // Get completed courses
  const completedGrades = await Grade.findAll({
    where: {
      student_id: studentId,
      score: { [Op.gte]: 5 },
    },
    include: [{ model: Course, as: 'course' }],
  });

  const completedCourses = [...new Set(completedGrades.map((g) => g.course?.name).filter(Boolean))];

  // Calculate average grade
  const avgGrade = completedGrades.length > 0
    ? (completedGrades.reduce((sum, g) => sum + parseFloat(g.score), 0) / completedGrades.length).toFixed(2)
    : 7.0;

  const studentProfile = {
    interests: interests || ['Toán học', 'Khoa học'],
    completedCourses: completedCourses.slice(0, 10),
    avgGrade,
    careerGoals: careerGoals || 'Phát triển kỹ năng học tập',
  };

  const recommendations = await aiService.generateCourseRecommendations(studentProfile);

  return res.json({
    success: true,
    data: {
      recommendations,
      profile: studentProfile,
    },
  });
});

/**
 * Generate AI report summary
 * POST /api/ai/report/summary
 */
exports.generateReportSummary = catchAsync(async (req, res) => {
  const { studentId, period } = req.body;

  // Check permissions (teachers and admins only)
  if (!['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ giáo viên và admin mới có thể tạo báo cáo',
    });
  }

  // Get student
  const student = await Student.findByPk(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy học sinh',
    });
  }

  // Get grades
  const grades = await Grade.findAll({
    where: { student_id: studentId },
    include: [{ model: Course, as: 'course' }],
    order: [['created_at', 'DESC']],
    limit: 20,
  });

  // Calculate subject averages
  const subjectScores = {};
  grades.forEach((grade) => {
    const courseName = grade.course?.name || 'Unknown';
    if (!subjectScores[courseName]) {
      subjectScores[courseName] = [];
    }
    subjectScores[courseName].push(parseFloat(grade.score));
  });

  const subjects = Object.entries(subjectScores).map(([name, scores]) => ({
    name,
    score: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
  }));

  const overallAverage = subjects.reduce((sum, s) => sum + parseFloat(s.score), 0) / subjects.length;

  // Get attendance
  const attendance = await Attendance.findAll({
    where: { student_id: studentId },
    order: [['date', 'DESC']],
    limit: 30,
  });

  const attendanceRate = attendance.length > 0
    ? ((attendance.filter((a) => a.status === 'present').length / attendance.length) * 100).toFixed(1)
    : 100;

  // Generate report
  const reportData = {
    studentName: student.getFullName(),
    period: period || 'Học kỳ hiện tại',
    grades: {
      average: overallAverage.toFixed(2),
      subjects,
    },
    attendance: {
      rate: attendanceRate,
    },
    behavior: {
      score: 8.5, // Default, can be customized
    },
  };

  const summary = await aiService.generateReportSummary(reportData);

  return res.json({
    success: true,
    data: {
      summary,
      reportData,
    },
  });
});

module.exports = exports;
