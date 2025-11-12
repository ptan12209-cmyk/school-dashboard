const express = require('express');

const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * All routes require authentication
 */
router.use(verifyToken);

/**
 * @route   GET /api/assignments/student
 * @desc    Get all assignments for logged-in student
 * @access  Private (Student)
 */
router.get('/student', assignmentController.getStudentAssignments);

/**
 * @route   GET /api/assignments/course/:courseId
 * @desc    Get assignments by course
 * @access  Private
 */
router.get('/course/:courseId', assignmentController.getAssignmentsByCourse);

/**
 * @route   POST /api/assignments
 * @desc    Create new assignment
 * @access  Private (Teacher)
 */
router.post('/', assignmentController.createAssignment);

/**
 * @route   GET /api/assignments/:id
 * @desc    Get assignment by ID
 * @access  Private
 */
router.get('/:id', assignmentController.getAssignment);

/**
 * @route   PUT /api/assignments/:id
 * @desc    Update assignment
 * @access  Private (Teacher)
 */
router.put('/:id', assignmentController.updateAssignment);

/**
 * @route   DELETE /api/assignments/:id
 * @desc    Delete assignment
 * @access  Private (Teacher)
 */
router.delete('/:id', assignmentController.deleteAssignment);

/**
 * @route   POST /api/assignments/:id/publish
 * @desc    Publish assignment (sends notifications)
 * @access  Private (Teacher)
 */
router.post('/:id/publish', assignmentController.publishAssignment);

/**
 * @route   POST /api/assignments/:id/start
 * @desc    Start assignment (create submission)
 * @access  Private (Student)
 */
router.post('/:id/start', assignmentController.startAssignment);

/**
 * @route   POST /api/assignments/submit
 * @desc    Submit assignment
 * @access  Private (Student)
 */
router.post('/submit', assignmentController.submitAssignment);

/**
 * @route   GET /api/assignments/:id/submissions
 * @desc    Get submissions for grading
 * @access  Private (Teacher)
 */
router.get('/:id/submissions', assignmentController.getSubmissionsForGrading);

/**
 * @route   POST /api/assignments/submissions/:submissionId/grade
 * @desc    Grade submission
 * @access  Private (Teacher)
 */
router.post('/submissions/:submissionId/grade', assignmentController.gradeSubmission);

/**
 * @route   GET /api/assignments/:id/statistics
 * @desc    Get assignment statistics
 * @access  Private (Teacher)
 */
router.get('/:id/statistics', assignmentController.getAssignmentStatistics);

module.exports = router;
