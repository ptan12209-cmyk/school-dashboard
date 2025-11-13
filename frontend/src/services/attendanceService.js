/**
 * attendanceService.js - Attendance API Service
 * ==============================================
 * Service for attendance management CRUD operations
 */

import api from './api.js';

/**
 * Get all attendance records with optional filters
 * @param {Object} params - Query parameters (page, limit, student_id, course_id, status, date, etc.)
 * @returns {Promise} API response with attendance data
 */
export const getAllAttendance = async (params = {}) => {
  const response = await api.get('/attendance', { params });
  return response.data;
};

/**
 * Get attendance record by ID
 * @param {string} id - Attendance ID
 * @returns {Promise} API response with attendance data
 */
export const getAttendanceById = async (id) => {
  const response = await api.get(`/attendance/${id}`);
  return response.data;
};

/**
 * Mark attendance (create new record)
 * @param {Object} attendanceData - Attendance data
 * @returns {Promise} API response with created attendance
 */
export const markAttendance = async (attendanceData) => {
  const response = await api.post('/attendance', attendanceData);
  return response.data;
};

/**
 * Mark attendance for multiple students at once
 * @param {string} courseId - Course ID
 * @param {string} date - Date
 * @param {Array} records - Array of attendance records
 * @returns {Promise} API response with created attendance records
 */
export const bulkMarkAttendance = async (courseId, date, records) => {
  const response = await api.post('/attendance/bulk', {
    course_id: courseId,
    date,
    records
  });
  return response.data;
};

/**
 * Update existing attendance record
 * @param {string} id - Attendance ID
 * @param {Object} attendanceData - Updated attendance data
 * @returns {Promise} API response with updated attendance
 */
export const updateAttendance = async (id, attendanceData) => {
  const response = await api.put(`/attendance/${id}`, attendanceData);
  return response.data;
};

/**
 * Delete attendance record
 * @param {string} id - Attendance ID
 * @returns {Promise} API response
 */
export const deleteAttendance = async (id) => {
  const response = await api.delete(`/attendance/${id}`);
  return response.data;
};

/**
 * Get attendance records for a specific student
 * @param {string} studentId - Student ID
 * @param {Object} params - Query parameters (course_id, start_date, end_date)
 * @returns {Promise} API response with student attendance
 */
export const getStudentAttendance = async (studentId, params = {}) => {
  const response = await api.get(`/attendance/student/${studentId}`, { params });
  return response.data;
};

/**
 * Get attendance records for a specific course
 * @param {string} courseId - Course ID
 * @param {Object} params - Query parameters (date, start_date, end_date, status)
 * @returns {Promise} API response with course attendance
 */
export const getCourseAttendance = async (courseId, params = {}) => {
  const response = await api.get(`/attendance/course/${courseId}`, { params });
  return response.data;
};

/**
 * Get all attendance records for a specific date
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {Object} params - Query parameters (course_id, status)
 * @returns {Promise} API response with attendance for the date
 */
export const getAttendanceByDate = async (date, params = {}) => {
  const response = await api.get(`/attendance/date/${date}`, { params });
  return response.data;
};

/**
 * Get attendance statistics
 * @param {Object} params - Query parameters (start_date, end_date)
 * @returns {Promise} API response with attendance stats
 */
export const getAttendanceStats = async (params = {}) => {
  const response = await api.get('/attendance/stats', { params });
  return response.data;
};

const attendanceService = {
  getAllAttendance,
  getAttendanceById,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  deleteAttendance,
  getStudentAttendance,
  getCourseAttendance,
  getAttendanceByDate,
  getAttendanceStats
};

export default attendanceService;
