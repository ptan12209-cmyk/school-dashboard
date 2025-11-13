/**
 * gradeService.js - Grade API Service
 * ====================================
 * Service for grade management CRUD operations
 */

import api from './api.js';

/**
 * Get all grades with optional filters
 * @param {Object} params - Query parameters (page, limit, student_id, course_id, etc.)
 * @returns {Promise} API response with grades data
 */
export const getAllGrades = async (params = {}) => {
  const response = await api.get('/grades', { params });
  return response.data;
};

/**
 * Get grade by ID
 * @param {string} id - Grade ID
 * @returns {Promise} API response with grade data
 */
export const getGradeById = async (id) => {
  const response = await api.get(`/grades/${id}`);
  return response.data;
};

/**
 * Create new grade
 * @param {Object} gradeData - Grade data
 * @returns {Promise} API response with created grade
 */
export const createGrade = async (gradeData) => {
  const response = await api.post('/grades', gradeData);
  return response.data;
};

/**
 * Create multiple grades at once
 * @param {Array} gradesArray - Array of grade objects
 * @returns {Promise} API response with created grades
 */
export const bulkCreateGrades = async (gradesArray) => {
  const response = await api.post('/grades/bulk', { grades: gradesArray });
  return response.data;
};

/**
 * Update existing grade
 * @param {string} id - Grade ID
 * @param {Object} gradeData - Updated grade data
 * @returns {Promise} API response with updated grade
 */
export const updateGrade = async (id, gradeData) => {
  const response = await api.put(`/grades/${id}`, gradeData);
  return response.data;
};

/**
 * Delete grade
 * @param {string} id - Grade ID
 * @returns {Promise} API response
 */
export const deleteGrade = async (id) => {
  const response = await api.delete(`/grades/${id}`);
  return response.data;
};

/**
 * Get all grades for a specific student
 * @param {string} studentId - Student ID
 * @param {Object} params - Query parameters (semester, course_id)
 * @returns {Promise} API response with student grades
 */
export const getStudentGrades = async (studentId, params = {}) => {
  const response = await api.get(`/grades/student/${studentId}`, { params });
  return response.data;
};

/**
 * Get all grades for a specific course
 * @param {string} courseId - Course ID
 * @param {Object} params - Query parameters (semester, grade_type)
 * @returns {Promise} API response with course grades
 */
export const getCourseGrades = async (courseId, params = {}) => {
  const response = await api.get(`/grades/course/${courseId}`, { params });
  return response.data;
};

/**
 * Get grade statistics
 * @param {Object} params - Query parameters (semester)
 * @returns {Promise} API response with grade stats
 */
export const getGradeStats = async (params = {}) => {
  const response = await api.get('/grades/stats', { params });
  return response.data;
};

const gradeService = {
  getAllGrades,
  getGradeById,
  createGrade,
  bulkCreateGrades,
  updateGrade,
  deleteGrade,
  getStudentGrades,
  getCourseGrades,
  getGradeStats
};

export default gradeService;
