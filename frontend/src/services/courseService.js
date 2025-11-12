/**
 * courseService.js - Course API Service
 * ======================================
 * Service for course management CRUD operations
 */

import api from './api.js';

/**
 * Get all courses with optional filters
 * @param {Object} params - Query parameters (page, limit, subject, semester, etc.)
 * @returns {Promise} API response with courses data
 */
export const getAllCourses = async (params = {}) => {
  const response = await api.get('/courses', { params });
  return response.data;
};

/**
 * Get course by ID
 * @param {string} id - Course ID
 * @returns {Promise} API response with course data
 */
export const getCourseById = async (id) => {
  const response = await api.get(`/courses/${id}`);
  return response.data;
};

/**
 * Create new course
 * @param {Object} courseData - Course data
 * @returns {Promise} API response with created course
 */
export const createCourse = async (courseData) => {
  const response = await api.post('/courses', courseData);
  return response.data;
};

/**
 * Update existing course
 * @param {string} id - Course ID
 * @param {Object} courseData - Updated course data
 * @returns {Promise} API response with updated course
 */
export const updateCourse = async (id, courseData) => {
  const response = await api.put(`/courses/${id}`, courseData);
  return response.data;
};

/**
 * Delete course
 * @param {string} id - Course ID
 * @returns {Promise} API response
 */
export const deleteCourse = async (id) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

/**
 * Get all subjects
 * @param {Object} params - Query parameters
 * @returns {Promise} API response with subjects list
 */
export const getAllSubjects = async (params = {}) => {
  const response = await api.get('/courses/subjects', { params });
  return response.data;
};

/**
 * Get course statistics
 * @param {Object} params - Query parameters
 * @returns {Promise} API response with course stats
 */
export const getCourseStats = async (params = {}) => {
  const response = await api.get('/courses/stats', { params });
  return response.data;
};

/**
 * Get students enrolled in a course
 * @param {string} courseId - Course ID
 * @returns {Promise} API response with students list
 */
export const getCourseStudents = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/student`);
  return response.data;
};

/**
 * Get grades for a course
 * @param {string} courseId - Course ID
 * @param {Object} params - Query parameters
 * @returns {Promise} API response with grades list
 */
export const getCourseGrades = async (courseId, params = {}) => {
  const response = await api.get(`/courses/${courseId}/grade`, { params });
  return response.data;
};

const courseService = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getAllSubjects,
  getCourseStats,
  getCourseStudents,
  getCourseGrades
};

export default courseService;
