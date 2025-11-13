/**
 * Assignment Controller
 * =====================
 * Handles assignment CRUD and submission management
 */

const assignmentService = require('../services/assignmentService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Create assignment (Teacher only)
 */
exports.createAssignment = catchAsync(async (req, res) => {
  const { questions, ...assignmentData } = req.body;
  const teacherId = req.user.teacherProfile?.id;

  if (!teacherId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ giáo viên mới có thể tạo bài tập',
    });
  }

  const { io } = req.app.locals;
  const assignment = await assignmentService.createAssignment(assignmentData, questions, teacherId, io);

  return res.status(201).json({
    success: true,
    data: assignment,
  });
});

/**
 * Get assignment by ID
 */
exports.getAssignment = catchAsync(async (req, res) => {
  const assignment = await assignmentService.getAssignmentById(req.params.id);

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài tập',
    });
  }

  return res.json({
    success: true,
    data: assignment,
  });
});

/**
 * Get assignments by course
 */
exports.getAssignmentsByCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const assignments = await assignmentService.getAssignmentsByCourse(courseId, req.query);

  return res.json({
    success: true,
    data: assignments,
  });
});

/**
 * Get student's assignments
 */
exports.getStudentAssignments = catchAsync(async (req, res) => {
  const studentId = req.user.studentProfile?.id;

  if (!studentId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ học sinh mới có thể xem bài tập của mình',
    });
  }

  const assignments = await assignmentService.getStudentAssignments(studentId);

  return res.json({
    success: true,
    data: assignments,
  });
});

/**
 * Update assignment
 */
exports.updateAssignment = catchAsync(async (req, res) => {
  const { Assignment } = require('../models');
  const teacherId = req.user.teacherProfile?.id;

  const assignment = await Assignment.findByPk(req.params.id);

  if (!assignment || assignment.teacher_id !== teacherId) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài tập',
    });
  }

  await assignment.update(req.body);

  return res.json({
    success: true,
    data: assignment,
  });
});

/**
 * Delete assignment
 */
exports.deleteAssignment = catchAsync(async (req, res) => {
  const { Assignment } = require('../models');
  const teacherId = req.user.teacherProfile?.id;

  const assignment = await Assignment.findByPk(req.params.id);

  if (!assignment || assignment.teacher_id !== teacherId) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bài tập',
    });
  }

  await assignment.destroy();

  return res.json({
    success: true,
    message: 'Đã xóa bài tập',
  });
});

/**
 * Publish assignment
 */
exports.publishAssignment = catchAsync(async (req, res) => {
  const teacherId = req.user.teacherProfile?.id;
  const { io } = req.app.locals;

  const assignment = await assignmentService.publishAssignment(req.params.id, teacherId, io);

  return res.json({
    success: true,
    data: assignment,
    message: 'Đã phát hành bài tập',
  });
});

/**
 * Start assignment (create submission)
 */
exports.startAssignment = catchAsync(async (req, res) => {
  const studentId = req.user.studentProfile?.id;

  if (!studentId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ học sinh mới có thể làm bài',
    });
  }

  const submission = await assignmentService.startAssignment(req.params.id, studentId);

  return res.status(201).json({
    success: true,
    data: submission,
  });
});

/**
 * Submit assignment
 */
exports.submitAssignment = catchAsync(async (req, res) => {
  const studentId = req.user.studentProfile?.id;
  const { submissionId, answers } = req.body;

  if (!studentId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ học sinh mới có thể nộp bài',
    });
  }

  const submission = await assignmentService.submitAssignment(submissionId, answers, studentId);

  return res.json({
    success: true,
    data: submission,
    message: 'Đã nộp bài thành công',
  });
});

/**
 * Grade submission (Teacher only)
 */
exports.gradeSubmission = catchAsync(async (req, res) => {
  const teacherId = req.user.teacherProfile?.id;
  const { gradedAnswers, feedback } = req.body;
  const { io } = req.app.locals;

  if (!teacherId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ giáo viên mới có thể chấm bài',
    });
  }

  const submission = await assignmentService.gradeSubmission(
    req.params.submissionId,
    gradedAnswers,
    feedback,
    teacherId,
    io,
  );

  return res.json({
    success: true,
    data: submission,
    message: 'Đã chấm bài thành công',
  });
});

/**
 * Get submissions for grading (Teacher only)
 */
exports.getSubmissionsForGrading = catchAsync(async (req, res) => {
  const teacherId = req.user.teacherProfile?.id;

  if (!teacherId) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ giáo viên mới có quyền truy cập',
    });
  }

  const submissions = await assignmentService.getSubmissionsForGrading(req.params.id, teacherId);

  return res.json({
    success: true,
    data: submissions,
  });
});

/**
 * Get assignment statistics
 */
exports.getAssignmentStatistics = catchAsync(async (req, res) => {
  const stats = await assignmentService.getAssignmentStatistics(req.params.id);

  return res.json({
    success: true,
    data: stats,
  });
});
