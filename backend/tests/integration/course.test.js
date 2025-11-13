/**
 * Course Management Integration Tests
 * =====================================
 * Tests for course/subject CRUD endpoints
 * 
 * Endpoints tested:
 * - GET    /api/course
 * - GET    /api/courses/subjects
 * - GET    /api/courses/stats
 * - GET    /api/courses/:id
 * - POST   /api/course
 * - PUT    /api/courses/:id
 * - DELETE /api/courses/:id
 * - GET    /api/courses/:id/grade
 * - GET    /api/courses/:id/student
 * 
 * Total tests: 32
 */

const {
  request,
  app,
  setupDatabase,
  cleanDatabase,
  closeDatabase,
  TestHelpers,
  Assertions,
  MockData
} = require('../setup');

describe('Course Management API', () => {
  let adminToken, teacherToken, teacher, cls;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    
    // Setup common data
    const admin = await TestHelpers.createAdmin();
    adminToken = admin.token;
    
    const teacherData = await TestHelpers.createTeacher();
    teacherToken = teacherData.token;
    teacher = teacherData.teacher;
    
    cls = await TestHelpers.createClass(adminToken);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  /**
   * ============================================
   * GET /api/course
   * ============================================
   */
  describe('GET /api/courses', () => {
    test('should get all courses without authentication', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        name: 'Mathematics 101',
        code: 'MATH101'
      });

      const response = await request(app).get('/api/courses');

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('courses');
      expect(Array.isArray(response.body.data.courses)).toBe(true);
      Assertions.assertPagination(response);
    });

    test('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createCourse(adminToken, {
          teacher_id: teacher.id,
          class_id: cls.id,
          code: `CODE${i}`
        });
      }

      const response = await request(app).get('/api/courses?page=1&limit=3');

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.courses.length).toBeLessThanOrEqual(3);
    });

    test('should filter by subject', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        subject: 'Mathematics',
        code: 'MATH1'
      });

      const response = await request(app).get('/api/courses?subject=Mathematics');

      Assertions.assertSuccess(response, 200);
      response.body.data.courses.forEach(course => {
        expect(course.subject).toBe('Mathematics');
      });
    });

    test('should filter by semester', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        semester: '1',
        code: 'COURSE1'
      });

      const response = await request(app).get('/api/courses?semester=1');

      Assertions.assertSuccess(response, 200);
      response.body.data.courses.forEach(course => {
        expect(course.semester).toBe('1');
      });
    });

    test('should filter by teacher', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'TEACH1'
      });

      const response = await request(app).get(`/api/courses?teacher_id=${teacher.id}`);

      Assertions.assertSuccess(response, 200);
      response.body.data.courses.forEach(course => {
        expect(course.teacher_id).toBe(teacher.id);
      });
    });

    test('should filter by class', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'CLASS1'
      });

      const response = await request(app).get(`/api/courses?class_id=${cls.id}`);

      Assertions.assertSuccess(response, 200);
      response.body.data.courses.forEach(course => {
        expect(course.class_id).toBe(cls.id);
      });
    });

    test('should search by name or code', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        name: 'Advanced Mathematics',
        code: 'ADV-MATH-101'
      });

      const response = await request(app).get('/api/courses?search=Advanced');

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.courses.length).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * GET /api/courses/subjects
   * ============================================
   */
  describe('GET /api/courses/subjects', () => {
    test('should get list of all subjects', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        subject: 'Mathematics',
        code: 'MATH1'
      });
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        subject: 'Science',
        code: 'SCI1'
      });

      const response = await request(app).get('/api/courses/subjects');

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('subjects');
      expect(Array.isArray(response.body.data.subjects)).toBe(true);
      expect(response.body.data.subjects.length).toBeGreaterThan(0);
    });
  });

  /**
   * ============================================
   * GET /api/courses/stats
   * ============================================
   */
  describe('GET /api/courses/stats', () => {
    test('should get course statistics as admin', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        subject: 'Mathematics',
        semester: '1',
        code: 'STAT1'
      });

      const response = await request(app)
        .get('/api/courses/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('school_year');
      expect(response.body.data).toHaveProperty('totalCourses');
      expect(response.body.data).toHaveProperty('activeCourses');
      expect(response.body.data).toHaveProperty('bySubject');
      expect(response.body.data).toHaveProperty('bySemester');
    });

    test('should deny access for non-admin', async () => {
      const response = await request(app)
        .get('/api/courses/stats')
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * POST /api/course
   * ============================================
   */
  describe('POST /api/courses', () => {
    test('should create course as admin', async () => {
      const courseData = {
        name: 'Mathematics 101',
        code: 'MATH101',
        subject: 'Mathematics',
        description: 'Basic mathematics course',
        credits: 1.5,
        teacher_id: teacher.id,
        class_id: cls.id,
        semester: '1',
        school_year: '2024-2025'
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(courseData);

      Assertions.assertSuccess(response, 201);
      expect(response.body.message).toBe('Course created successfully');
      expect(response.body.data.course.name).toBe(courseData.name);
      expect(response.body.data.course.code).toBe(courseData.code);
      Assertions.assertCourseObject(response.body.data.course);
    });

    test('should create course as teacher', async () => {
      const courseData = {
        name: 'Science 101',
        code: 'SCI101',
        subject: 'Science',
        teacher_id: teacher.id,
        class_id: cls.id
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(courseData);

      Assertions.assertSuccess(response, 201);
    });

    test('should fail with duplicate code', async () => {
      const courseData = {
        name: 'Course 1',
        code: 'DUPLICATE',
        subject: 'Math',
        teacher_id: teacher.id,
        class_id: cls.id
      };

      await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(courseData);

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(courseData);

      Assertions.assertValidationError(response);
      expect(response.body.message).toMatch(/already exists/i);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing name, code, subject
          teacher_id: teacher.id
        });

      Assertions.assertValidationError(response);
    });

    test('should validate code format', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Course',
          code: 'invalid code!', // Contains invalid characters
          subject: 'Math',
          teacher_id: teacher.id,
          class_id: cls.id
        });

      Assertions.assertValidationError(response);
    });

    test('should deny access for student', async () => {
      const { token: studentToken } = await TestHelpers.createStudent();

      const courseData = MockData.validCourse(teacher.id, cls.id);

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(courseData);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/courses/:id
   * ============================================
   */
  describe('GET /api/courses/:id', () => {
    test('should get course by ID', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'GET1'
      });

      const response = await request(app).get(`/api/courses/${course.id}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.course.id).toBe(course.id);
      expect(response.body.data.course).toHaveProperty('stats');
      Assertions.assertCourseObject(response.body.data.course);
    });

    test('should include teacher and class information', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'INFO1'
      });

      const response = await request(app).get(`/api/courses/${course.id}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.course).toHaveProperty('teacher');
      expect(response.body.data.course).toHaveProperty('class');
    });

    test('should return 404 for non-existent course', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app).get(`/api/courses/${fakeId}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * PUT /api/courses/:id
   * ============================================
   */
  describe('PUT /api/courses/:id', () => {
    test('should update course as admin', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'UPDATE1'
      });

      const updateData = {
        name: 'Updated Course Name',
        description: 'Updated description',
        credits: 2.0
      };

      const response = await request(app)
        .put(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.course.name).toBe(updateData.name);
      expect(response.body.data.course.credits).toBe(updateData.credits);
    });

    test('should allow teacher to update own course', async () => {
      const course = await TestHelpers.createCourse(teacherToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'OWN1'
      });

      const updateData = {
        description: 'Updated by teacher'
      };

      const response = await request(app)
        .put(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny teacher updating other student', async () => {
      const otherTeacherData = await TestHelpers.createTeacher();
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: otherTeacherData.teacher.id,
        class_id: cls.id,
        code: 'OTHER1'
      });

      const response = await request(app)
        .put(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ description: 'Hacked' });

      Assertions.assertForbidden(response);
    });

    test('should fail with duplicate code', async () => {
      await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'FIRST'
      });
      const course2 = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'SECOND'
      });

      const response = await request(app)
        .put(`/api/courses/${course2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'FIRST' });

      Assertions.assertValidationError(response);
    });

    test('should return 404 for non-existent course', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .put(`/api/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' });

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * DELETE /api/courses/:id
   * ============================================
   */
  describe('DELETE /api/courses/:id', () => {
    test('should delete course as admin', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'DEL1'
      });

      const response = await request(app)
        .delete(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.message).toBe('Course deleted successfully');
    });

    test('should deny access for teachers', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'DENY1'
      });

      const response = await request(app)
        .delete(`/api/courses/${course.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent course', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * GET /api/courses/:id/grade
   * ============================================
   */
  describe('GET /api/courses/:id/grade', () => {
    test('should get course grade as admin', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'GRADE1'
      });

      const response = await request(app)
        .get(`/api/courses/${course.id}/grade`)
        .set('Authorization', `Bearer ${adminToken}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('course');
      expect(response.body.data).toHaveProperty('grades');
      expect(response.body.data).toHaveProperty('stats');
    });

    test('should allow teacher to view own course grade', async () => {
      const course = await TestHelpers.createCourse(teacherToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'TEACH-GRADE1'
      });

      const response = await request(app)
        .get(`/api/courses/${course.id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny teacher viewing other student grade', async () => {
      const otherTeacherData = await TestHelpers.createTeacher();
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: otherTeacherData.teacher.id,
        class_id: cls.id,
        code: 'OTHER-GRADE1'
      });

      const response = await request(app)
        .get(`/api/courses/${course.id}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/courses/:id/student
   * ============================================
   */
  describe('GET /api/courses/:id/student', () => {
    test('should get enrolled student as admin', async () => {
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'STUD1'
      });

      const response = await request(app)
        .get(`/api/courses/${course.id}/student`)
        .set('Authorization', `Bearer ${adminToken}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('course');
      expect(response.body.data).toHaveProperty('students');
      expect(response.body.data).toHaveProperty('total');
    });

    test('should allow teacher to view own course student', async () => {
      const course = await TestHelpers.createCourse(teacherToken, {
        teacher_id: teacher.id,
        class_id: cls.id,
        code: 'TEACH-STUD1'
      });

      const response = await request(app)
        .get(`/api/courses/${course.id}/student`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny teacher viewing other student student', async () => {
      const otherTeacherData = await TestHelpers.createTeacher();
      const course = await TestHelpers.createCourse(adminToken, {
        teacher_id: otherTeacherData.teacher.id,
        class_id: cls.id,
        code: 'OTHER-STUD1'
      });

      const response = await request(app)
        .get(`/api/courses/${course.id}/student`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertForbidden(response);
    });
  });
});
