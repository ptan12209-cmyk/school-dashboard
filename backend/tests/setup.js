/**
 * Test Setup & Utilities
 * =======================
 * Common test helpers, assertions, and database setup/teardown
 * 
 * Comprehensive Test Suite for School Dashboard API
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'school_dashboard_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'hotanphat';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '24h';

const request = require('supertest');
const app = require('../app');
const { sequelize, User, Teacher, Student, Class, Course, Grade, Attendance } = require('../models');

/**
 * ============================================
 * DATABASE SETUP & TEARDOWN
 * ============================================
 */

/**
 * Setup database before all tests
 */
async function setupDatabase() {
  try {
    // Sync database (create tables)
    await sequelize.sync({ force: true });
    console.log('✅ Test database synced');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Clean database before each test
 */
async function cleanDatabase() {
  try {
    // Delete all records in reverse order (respecting foreign keys)
    await Attendance.destroy({ where: {}, force: true });
    await Grade.destroy({ where: {}, force: true });
    await Course.destroy({ where: {}, force: true });
    await Class.destroy({ where: {}, force: true });
    await Student.destroy({ where: {}, force: true });
    await Teacher.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Close database connection after all tests
 */
async function closeDatabase() {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Database close failed:', error);
    throw error;
  }
}

/**
 * ============================================
 * TEST HELPERS
 * ============================================
 */

class TestHelpers {
  /**
   * Create admin user with token
   */
  static async createAdmin(customData = {}) {
    const userData = {
      email: customData.email || `admin_${Date.now()}@test.com`,
      password: customData.password || 'Admin123!',
      role: 'admin',
      firstName: customData.firstName || 'Admin',
      lastName: customData.lastName || 'User'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    // ✅ FIX: Extract token from httpOnly cookie instead of response body
    const cookies = response.headers['set-cookie'];
    let token = null;
    if (cookies) {
      const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
      if (accessTokenCookie) {
        token = accessTokenCookie.split(';')[0].split('=')[1];
      }
    }

    return {
      user: response.body.data.user,
      token: token,
      profile: response.body.data.profile
    };
  }

  /**
   * Create teacher user with token
   */
  static async createTeacher(customData = {}) {
    const userData = {
      email: customData.email || `teacher_${Date.now()}@test.com`,
      password: customData.password || 'Teacher123!',
      role: 'teacher',
      firstName: customData.firstName || 'John',
      lastName: customData.lastName || 'Teacher',
      department: customData.department || 'Mathematics',
      phone: customData.phone || '1234567890'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    // ✅ FIX: Extract token from httpOnly cookie instead of response body
    const cookies = response.headers['set-cookie'];
    let token = null;
    if (cookies) {
      const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
      if (accessTokenCookie) {
        token = accessTokenCookie.split(';')[0].split('=')[1];
      }
    }

    return {
      user: response.body.data.user,
      token: token,
      teacher: response.body.data.profile
    };
  }

  /**
   * Create student user with token
   */
  static async createStudent(customData = {}) {
    const userData = {
      email: customData.email || `student_${Date.now()}@test.com`,
      password: customData.password || 'Student123!',
      role: 'student',
      firstName: customData.firstName || 'Jane',
      lastName: customData.lastName || 'Student',
      dateOfBirth: customData.dateOfBirth || '2008-01-01',
      gender: customData.gender || 'F',
      phone: customData.phone || '0987654321',
      parentName: customData.parentName || 'Parent Name',
      parentPhone: customData.parentPhone || '1234567890',
      parentEmail: customData.parentEmail || 'parent@test.com'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    // ✅ FIX: Extract token from httpOnly cookie instead of response body
    const cookies = response.headers['set-cookie'];
    let token = null;
    if (cookies) {
      const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
      if (accessTokenCookie) {
        token = accessTokenCookie.split(';')[0].split('=')[1];
      }
    }

    return {
      user: response.body.data.user,
      token: token,
      student: response.body.data.profile
    };
  }

  /**
   * Create class
   */
  // Phải sửa thành STATIC:
static async createClass(token, classData = {}) {
  let adminToken = token;
  if (!adminToken) {
    const admin = await TestHelpers.createAdmin();  // ✓ ĐÚNG
    adminToken = admin.token;
  }
  
  const response = await request(app)
    .post('/api/classes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: classData.name || `Test Class ${Date.now()}`,
      grade_level: classData.grade_level || 10,
      teacher_id: classData.teacher_id || null,
      capacity: classData.capacity || 40,
      room_number: classData.room_number || null,
      school_year: classData.school_year || '2024-2025'
    });
    
    if (response.status !== 201) {
      console.log('Class creation failed:', response.status, response.body);
      throw new Error(`Failed to create class: ${response.status} - ${response.body.message}`);
    }
    
    return response.body.data.class;
  }

  /**
   * Create course
   */
  static async createCourse(token, customData = {}) {
    const courseData = {
      name: customData.name || `Course ${Date.now()}`,
      code: customData.code || `C${Date.now()}`,
      subject: customData.subject || 'Mathematics',
      description: customData.description || 'Test course',
      credits: customData.credits || 1.0,
      teacher_id: customData.teacher_id,
      class_id: customData.class_id,
      semester: customData.semester || 'Full Year',
      school_year: customData.school_year || '2024-2025'
    };

    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(courseData);

    return response.body.data.course;
  }

  /**
   * Create grade
   */
  static async createGrade(token, customData = {}) {
    const gradeData = {
      student_id: customData.student_id,
      course_id: customData.course_id,
      score: customData.score || 85.5,
      grade_type: customData.grade_type || 'Test',
      semester: customData.semester || '1',
      graded_date: customData.graded_date || '2024-10-01',
      notes: customData.notes || 'Good performance',
      is_published: customData.is_published !== undefined ? customData.is_published : true
    };

    const response = await request(app)
      .post('/api/grades')
      .set('Authorization', `Bearer ${token}`)
      .send(gradeData);

    // Check if the response is successful
    if (response.status !== 201) {
      throw new Error(`Failed to create grade: ${response.status} - ${JSON.stringify(response.body)}`);
    }

    return response.body.data.grade;
  }

  /**
   * Mark attendance
   */
  static async markAttendance(token, customData = {}) {
    const attendanceData = {
      student_id: customData.student_id,
      course_id: customData.course_id,
      date: customData.date || '2024-10-01',
      status: customData.status || 'Present',
      notes: customData.notes || '',
      check_in_time: customData.check_in_time || '08:00:00',
      check_out_time: customData.check_out_time || '12:00:00'
    };

    const response = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${token}`)
      .send(attendanceData);

    return response.body.data.attendance;
  }

  /**
   * Login user
   */
  static async login(email, password) {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    // ✅ FIX: Extract token from httpOnly cookie instead of response body
    const cookies = response.headers['set-cookie'];
    let token = null;
    if (cookies) {
      const accessTokenCookie = cookies.find(cookie => cookie.startsWith('accessToken='));
      if (accessTokenCookie) {
        token = accessTokenCookie.split(';')[0].split('=')[1];
      }
    }

    return {
      user: response.body.data.user,
      token: token
    };
  }

  /**
   * Get random element from array
   */
  static randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate random date in range
   */
  static randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * Wait for async operations
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * ============================================
 * ASSERTIONS
 * ============================================
 */

class Assertions {
  /**
   * Assert successful response
   */
  static assertSuccess(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  }

  /**
   * Assert error response
   */
  static assertError(response, expectedStatus = 400) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  }

  /**
   * Assert authentication required
   */
  static assertAuthRequired(response) {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert authorization failed (forbidden)
   */
  static assertForbidden(response) {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert not found
   */
  static assertNotFound(response) {
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert validation error
   */
  static assertValidationError(response) {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/validation|invalid|required|cannot|already exists|already active|already inactive/i);
  }

  /**
   * Assert conflict error
   */
  static assertConflict(response) {
    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  }

  /**
   * Assert pagination in response
   */
  static assertPagination(response) {
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.pagination).toHaveProperty('total');
    expect(response.body.data.pagination).toHaveProperty('page');
    expect(response.body.data.pagination).toHaveProperty('pages');
    expect(response.body.data.pagination).toHaveProperty('limit');
  }

  /**
   * Assert user object structure
   */
  static assertUserObject(user) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).not.toHaveProperty('password_hash');
  }

  /**
   * Assert teacher object structure
   */
  static assertTeacherObject(teacher) {
    expect(teacher).toHaveProperty('id');
    expect(teacher).toHaveProperty('first_name');
    expect(teacher).toHaveProperty('last_name');
    expect(teacher).toHaveProperty('user_id');
  }

  /**
   * Assert student object structure
   */
  static assertStudentObject(student) {
    expect(student).toHaveProperty('id');
    expect(student).toHaveProperty('first_name');
    expect(student).toHaveProperty('last_name');
    expect(student).toHaveProperty('date_of_birth');
    expect(student).toHaveProperty('user_id');
  }

  /**
   * Assert class object structure
   */
  static assertClassObject(classObj) {
    expect(classObj).toHaveProperty('id');
    expect(classObj).toHaveProperty('name');
    expect(classObj).toHaveProperty('grade_level');
    expect(classObj).toHaveProperty('school_year');
  }

  /**
   * Assert course object structure
   */
  static assertCourseObject(course) {
    expect(course).toHaveProperty('id');
    expect(course).toHaveProperty('name');
    expect(course).toHaveProperty('code');
    expect(course).toHaveProperty('subject');
    expect(course).toHaveProperty('teacher_id');
    expect(course).toHaveProperty('class_id');
  }

  /**
   * Assert grade object structure
   */
  static assertGradeObject(grade) {
    expect(grade).toHaveProperty('id');
    expect(grade).toHaveProperty('student_id');
    expect(grade).toHaveProperty('course_id');
    expect(grade).toHaveProperty('score');
    expect(grade).toHaveProperty('letter_grade');
    expect(grade).toHaveProperty('grade_type');
    expect(grade).toHaveProperty('semester');
  }

  /**
   * Assert attendance object structure
   */
  static assertAttendanceObject(attendance) {
    expect(attendance).toHaveProperty('id');
    expect(attendance).toHaveProperty('student_id');
    expect(attendance).toHaveProperty('course_id');
    expect(attendance).toHaveProperty('date');
    expect(attendance).toHaveProperty('status');
  }
}

/**
 * ============================================
 * MOCK DATA GENERATORS
 * ============================================
 */

class MockData {
  /**
   * Generate valid user data
   */
  static validUser(role = 'student') {
    return {
      email: `${role}_${Date.now()}@test.com`,
      password: 'Password123!',
      role,
      firstName: 'Test',
      lastName: 'User'
    };
  }

  /**
   * Generate valid teacher data
   */
  static validTeacher() {
    return {
      email: `teacher_${Date.now()}@test.com`,
      password: 'Teacher123!',
      firstName: 'John',
      lastName: 'Doe',
      department: 'Mathematics',
      phone: '1234567890',
      hireDate: '2020-01-01'
    };
  }

  /**
   * Generate valid student data
   */
  static validStudent() {
    return {
      email: `student_${Date.now()}@test.com`,
      password: 'Student123!',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '2008-05-15',
      gender: 'F',
      phone: '0987654321',
      parentName: 'Parent Name',
      parentPhone: '1234567890',
      parentEmail: 'parent@test.com'
    };
  }

  /**
   * Generate valid class data
   */
  static validClass() {
    return {
      name: `Class ${Date.now()}`,
      grade_level: 10,
      capacity: 40,
      room_number: 'A101',
      school_year: '2024-2025'
    };
  }

  /**
   * Generate valid course data
   */
  static validCourse(teacherId, classId) {
    return {
      name: `Course ${Date.now()}`,
      code: `C${Date.now()}`,
      subject: 'Mathematics',
      description: 'Test course description',
      credits: 1.0,
      teacher_id: teacherId,
      class_id: classId,
      semester: 'Full Year',
      school_year: '2024-2025'
    };
  }

  /**
   * Generate valid grade data
   */
  static validGrade(studentId, courseId) {
    return {
      student_id: studentId,
      course_id: courseId,
      score: 85.5,
      grade_type: 'Test',
      semester: '1',
      graded_date: '2024-10-01',
      notes: 'Good performance',
      is_published: true
    };
  }

  /**
   * Generate valid attendance data
   */
  static validAttendance(studentId, courseId) {
    return {
      student_id: studentId,
      course_id: courseId,
      date: '2024-10-01',
      status: 'Present',
      check_in_time: '08:00:00',
      check_out_time: '12:00:00',
      notes: ''
    };
  }

  /**
   * Generate invalid email
   */
  static invalidEmail() {
    return 'invalid-email';
  }

  /**
   * Generate weak password
   */
  static weakPassword() {
    return '123'; // Too short, no uppercase, no special char
  }

  /**
   * Generate invalid UUID
   */
  static invalidUUID() {
    return 'invalid-uuid-123';
  }

  /**
   * Generate future date
   */
  static futureDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

module.exports = {
  app,
  request,
  setupDatabase,
  cleanDatabase,
  closeDatabase,
  TestHelpers,
  Assertions,
  MockData
};
