/**
 * Assignment Service
 * ==================
 * Business logic for assignment management and grading
 */

const {
  Assignment, Question, Submission, Student, Course, Teacher, User,
} = require('../models');
const notificationService = require('./notificationService');

class AssignmentService {
  /**
   * Create new assignment with questions
   */
  async createAssignment(assignmentData, questions, teacherId, io) {
    const { course_id, ...data } = assignmentData;

    // Create assignment
    const assignment = await Assignment.create({
      ...data,
      course_id,
      teacher_id: teacherId,
      status: 'draft',
    });

    // Create questions if provided
    if (questions && questions.length > 0) {
      const questionsData = questions.map((q, index) => ({
        ...q,
        assignment_id: assignment.id,
        order: q.order !== undefined ? q.order : index,
      }));

      await Question.bulkCreate(questionsData);
    }

    return await this.getAssignmentById(assignment.id);
  }

  /**
   * Get assignment by ID with questions
   */
  async getAssignmentById(assignmentId) {
    return await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Question,
          as: 'questions',
          order: [['order', 'ASC']],
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Teacher,
          as: 'teacher',
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email'],
          }],
        },
      ],
    });
  }

  /**
   * Get assignments for a course
   */
  async getAssignmentsByCourse(courseId, filters = {}) {
    const where = { course_id: courseId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return await Assignment.findAll({
      where,
      include: [
        {
          model: Question,
          as: 'questions',
          attributes: ['id'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get student's assignments (published ones)
   */
  async getStudentAssignments(studentId) {
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }],
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get student's courses
    const courses = await Course.findAll({
      where: { class_id: student.class_id },
    });

    const courseIds = courses.map((c) => c.id);

    // Get published assignments for these courses
    const assignments = await Assignment.findAll({
      where: {
        course_id: courseIds,
        status: 'published',
      },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Submission,
          as: 'submissions',
          where: { student_id: studentId },
          required: false,
        },
      ],
      order: [['due_date', 'ASC']],
    });

    // Add metadata about submission status
    return assignments.map((assignment) => {
      const assignmentJson = assignment.toJSON();
      const submission = assignmentJson.submissions?.[0];

      return {
        ...assignmentJson,
        submission_status: submission ? submission.status : 'not_started',
        submission_score: submission?.score || null,
        can_submit: assignment.isAvailable()
                    && (!submission || (submission.status === 'draft'
                    && assignment.max_attempts > submission.attempt_number)),
        is_overdue: assignment.isOverdue(),
      };
    });
  }

  /**
   * Start assignment (create draft submission)
   */
  async startAssignment(assignmentId, studentId) {
    const assignment = await this.getAssignmentById(assignmentId);

    if (!assignment.isAvailable()) {
      throw new Error('Bài tập chưa được mở hoặc đã đóng');
    }

    // Check existing attempts
    const attemptsCount = await Submission.getAttemptsCount(assignmentId, studentId);

    if (attemptsCount >= assignment.max_attempts) {
      throw new Error(`Đã hết số lần làm bài (${assignment.max_attempts} lần)`);
    }

    // Calculate max score
    const questions = await Question.findAll({
      where: { assignment_id: assignmentId },
    });

    const maxScore = questions.reduce((sum, q) => sum + parseFloat(q.points), 0);

    // Create draft submission
    const submission = await Submission.create({
      assignment_id: assignmentId,
      student_id: studentId,
      attempt_number: attemptsCount + 1,
      max_score: maxScore,
      status: 'draft',
      started_at: new Date(),
      answers: {},
    });

    return submission;
  }

  /**
   * Submit assignment with auto-grading
   */
  async submitAssignment(submissionId, answers, studentId, io = null) {
    const submission = await Submission.findByPk(submissionId);

    if (!submission || submission.student_id !== studentId) {
      throw new Error('Không tìm thấy bài nộp');
    }

    if (submission.status !== 'draft') {
      throw new Error('Bài tập đã được nộp');
    }

    const assignment = await this.getAssignmentById(submission.assignment_id);
    const questions = await Question.findAll({
      where: { assignment_id: assignment.id },
    });

    // Grade each answer
    const gradedAnswers = {};
    let needsManualGrading = false;

    for (const question of questions) {
      const studentAnswer = answers[question.id];

      if (!studentAnswer) {
        // No answer provided
        gradedAnswers[question.id] = {
          answer: null,
          is_correct: false,
          points_earned: 0,
          max_points: question.points,
        };
        continue;
      }

      if (question.isAutoGradable()) {
        // Auto-grade
        const isCorrect = question.checkAnswer(studentAnswer);
        const pointsEarned = isCorrect ? parseFloat(question.points) : 0;

        gradedAnswers[question.id] = {
          answer: studentAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          max_points: question.points,
        };

        // Update question statistics
        await question.updateStatistics(isCorrect);
      } else {
        // Needs manual grading
        gradedAnswers[question.id] = {
          answer: studentAnswer,
          is_correct: null,
          points_earned: 0,
          max_points: question.points,
          needs_manual_grading: true,
        };
        needsManualGrading = true;
      }
    }

    // Check if late
    const isLate = assignment.due_date && new Date() > new Date(assignment.due_date);
    const latePenalty = isLate ? assignment.calculateLatePenalty(new Date()) : 0;

    // Update submission
    submission.answers = gradedAnswers;
    submission.is_late = isLate;
    submission.late_penalty = latePenalty;
    submission.needs_manual_grading = needsManualGrading;

    await submission.submit();

    // Update assignment statistics
    await assignment.updateStatistics();

    // Send notification
    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user' }],
    });

    if (io && student.user) {
      await notificationService.createNotification({
        user_id: student.user_id,
        type: 'assignment',
        title: 'Đã Nộp Bài Thành Công',
        message: `Bạn đã nộp bài "${assignment.title}". ${needsManualGrading ? 'Đang chờ giáo viên chấm điểm.' : `Điểm: ${submission.score}/${submission.max_score}`}`,
        related_type: 'submission',
        related_id: submission.id,
        priority: 'medium',
      }, { io, sendEmail: false });
    }

    return await Submission.findByPk(submission.id, {
      include: [
        { model: Assignment, as: 'assignment' },
        { model: Student, as: 'student', include: [{ model: User, as: 'user' }] },
      ],
    });
  }

  /**
   * Manual grading by teacher
   */
  async gradeSubmission(submissionId, gradedAnswers, feedback, teacherId, io) {
    const submission = await Submission.findByPk(submissionId, {
      include: [
        { model: Assignment, as: 'assignment' },
        { model: Student, as: 'student', include: [{ model: User, as: 'user' }] },
      ],
    });

    if (!submission) {
      throw new Error('Không tìm thấy bài nộp');
    }

    // Update answers with teacher's grading
    const updatedAnswers = { ...submission.answers };

    Object.keys(gradedAnswers).forEach((questionId) => {
      if (updatedAnswers[questionId]) {
        updatedAnswers[questionId] = {
          ...updatedAnswers[questionId],
          ...gradedAnswers[questionId],
          manually_graded: true,
        };
      }
    });

    submission.answers = updatedAnswers;
    submission.teacher_feedback = feedback;

    await submission.completeGrading(teacherId);

    // Update assignment statistics
    await submission.assignment.updateStatistics();

    // Send notification to student
    if (io && submission.student.user) {
      await notificationService.createNotification({
        user_id: submission.student.user_id,
        type: 'grade_posted',
        title: 'Bài Tập Đã Được Chấm Điểm',
        message: `Bài tập "${submission.assignment.title}" đã được chấm. Điểm: ${submission.score}/${submission.max_score} (${submission.percentage}%)`,
        related_type: 'submission',
        related_id: submission.id,
        priority: 'high',
      }, { io, sendEmail: true });
    }

    return submission;
  }

  /**
   * Publish assignment (send notifications to students)
   */
  async publishAssignment(assignmentId, teacherId, io) {
    const assignment = await Assignment.findByPk(assignmentId);

    if (!assignment || assignment.teacher_id !== teacherId) {
      throw new Error('Không tìm thấy bài tập');
    }

    assignment.status = 'published';
    await assignment.save();

    // Get all students in the course
    const course = await Course.findByPk(assignment.course_id);
    const students = await Student.findAll({
      where: { class_id: course.class_id },
      include: [{ model: User, as: 'user' }],
    });

    const studentUserIds = students.map((s) => s.user_id).filter(Boolean);

    // Send bulk notification
    if (io && studentUserIds.length > 0) {
      await notificationService.createBulkNotifications(
        studentUserIds,
        {
          type: 'assignment',
          title: 'Bài Tập Mới',
          message: `Bài tập mới "${assignment.title}" đã được giao. Hạn nộp: ${assignment.due_date ? new Date(assignment.due_date).toLocaleString('vi-VN') : 'Không giới hạn'}`,
          related_type: 'assignment',
          related_id: assignment.id,
          priority: 'medium',
        },
        { io, sendEmail: true },
      );
    }

    return assignment;
  }

  /**
   * Get submissions for grading
   */
  async getSubmissionsForGrading(assignmentId, teacherId) {
    const assignment = await Assignment.findByPk(assignmentId);

    if (!assignment || assignment.teacher_id !== teacherId) {
      throw new Error('Không có quyền truy cập');
    }

    return await Submission.findAll({
      where: {
        assignment_id: assignmentId,
        status: ['submitted', 'grading', 'graded'],
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user' }],
        },
      ],
      order: [['submitted_at', 'ASC']],
    });
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStatistics(assignmentId) {
    const assignment = await this.getAssignmentById(assignmentId);
    const stats = await Submission.getAssignmentStats(assignmentId);

    const questions = await Question.findAll({
      where: { assignment_id: assignmentId },
    });

    const questionStats = questions.map((q) => ({
      id: q.id,
      text: q.question_text,
      type: q.question_type,
      points: q.points,
      times_answered: q.times_answered,
      success_rate: q.getSuccessRate(),
    }));

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        total_points: assignment.total_points,
        total_submissions: assignment.total_submissions,
        avg_score: assignment.avg_score,
      },
      submissions: stats,
      questions: questionStats,
    };
  }
}

module.exports = new AssignmentService();
