/**
 * Class Management Integration Tests
 * ====================================
 * Tests for class/homeroom CRUD endpoints
 * 
 * Endpoints tested:
 * - GET    /api/class
 * - GET    /api/classes/stats
 * - GET    /api/classes/available
 * - GET    /api/classes/:id
 * - POST   /api/class
 * - PUT    /api/classes/:id
 * - DELETE /api/classes/:id
 * - GET    /api/classes/:id/student
 * - GET    /api/classes/:id/course
 * 
 * Total tests: 30
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

describe('Class Management API', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  /**
   * ============================================
   * GET /api/class
   * ============================================
   */
  describe('GET /api/classes', () => {
    test('should get all class without authentication', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { name: 'Class 10A' });
      await TestHelpers.createClass(token, { name: 'Class 10B' });

      const response = await request(app).get('/api/classes');

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('classes');
      expect(Array.isArray(response.body.data.classes)).toBe(true);
      expect(response.body.data.classes.length).toBeGreaterThanOrEqual(2);
      Assertions.assertPagination(response);
    });

    test('should support pagination', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createClass(token, { name: `Class ${i}A` });
      }

      const response = await request(app).get('/api/classes?page=1&limit=3');

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.classes.length).toBeLessThanOrEqual(3);
    });

    test('should filter by grade level', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { grade_level: 10 });
      await TestHelpers.createClass(token, { grade_level: 11 });

      const response = await request(app).get('/api/classes?grade_level=10');

      Assertions.assertSuccess(response, 200);
      response.body.data.classes.forEach(cls => {
        expect(cls.grade_level).toBe(10);
      });
    });

    test('should filter by school year', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { school_year: '2024-2025' });

      const response = await request(app).get('/api/classes?school_year=2024-2025');

      Assertions.assertSuccess(response, 200);
      response.body.data.classes.forEach(cls => {
        expect(cls.school_year).toBe('2024-2025');
      });
    });

    test('should filter by active status', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      const cls = await TestHelpers.createClass(token);
      
      // Deactivate class
      await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ is_active: false });

      const response = await request(app).get('/api/classes?is_active=false');

      Assertions.assertSuccess(response, 200);
      response.body.data.classes.forEach(cls => {
        expect(cls.is_active).toBe(false);
      });
    });
  });

  /**
   * ============================================
   * GET /api/classes/stats
   * ============================================
   */
  describe('GET /api/classes/stats', () => {
    test('should get class statistics as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { grade_level: 10 });
      await TestHelpers.createClass(token, { grade_level: 11 });
      await TestHelpers.createClass(token, { grade_level: 10 });

      const response = await request(app)
        .get('/api/classes/stats')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('school_year');
      expect(response.body.data).toHaveProperty('totalClasses');
      expect(response.body.data).toHaveProperty('activeClasses');
      expect(response.body.data).toHaveProperty('totalCapacity');
      expect(response.body.data).toHaveProperty('enrolledStudents');
      expect(response.body.data).toHaveProperty('availableSeats');
      expect(response.body.data).toHaveProperty('byGradeLevel');
      expect(Array.isArray(response.body.data.byGradeLevel)).toBe(true);
    });

    test('should filter stats by school year', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { school_year: '2024-2025' });

      const response = await request(app)
        .get('/api/classes/stats?school_year=2024-2025')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.school_year).toBe('2024-2025');
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get('/api/classes/stats')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/classes/available
   * ============================================
   */
  describe('GET /api/classes/available', () => {
    test('should get class with available seats', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { capacity: 40 });

      const response = await request(app)
        .get('/api/classes/available')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('classes');
      expect(Array.isArray(response.body.data.classes)).toBe(true);
      
      response.body.data.classes.forEach(cls => {
        expect(cls.is_full).toBe(false);
        expect(cls.available_seats).toBeGreaterThan(0);
      });
    });

    test('should filter by grade level', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { grade_level: 10 });

      const response = await request(app)
        .get('/api/classes/available?grade_level=10')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      response.body.data.classes.forEach(cls => {
        expect(cls.grade_level).toBe(10);
      });
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get('/api/classes/available')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * POST /api/class
   * ============================================
   */
  describe('POST /api/classes', () => {
    test('should create class as admin', async () => {
      const { token } = await TestHelpers.createAdmin();

      const classData = {
        name: 'Class 10A',
        grade_level: 10,
        capacity: 40,
        room_number: 'A101',
        school_year: '2024-2025'
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send(classData);

      Assertions.assertSuccess(response, 201);
      expect(response.body.message).toBe('Class created successfully');
      expect(response.body.data.class.name).toBe(classData.name);
      expect(response.body.data.class.grade_level).toBe(classData.grade_level);
      Assertions.assertClassObject(response.body.data.class);
    });

    test('should create class with teacher assignment', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { teacher } = await TestHelpers.createTeacher();

      const classData = {
        name: 'Class 10B',
        grade_level: 10,
        teacher_id: teacher.id
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send(classData);

      Assertions.assertSuccess(response, 201);
      expect(response.body.data.class.teacher_id).toBe(teacher.id);
    });

    test('should fail with duplicate class name for same school year', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      const classData = {
        name: 'Class 10A',
        grade_level: 10,
        school_year: '2024-2025'
      };

      await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send(classData);

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send(classData);

      Assertions.assertValidationError(response);
      expect(response.body.message).toMatch(/already exists/i);
    });

    test('should validate required fields', async () => {
      const { token } = await TestHelpers.createAdmin();

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing name and grade_level
          capacity: 40
        });

      Assertions.assertValidationError(response);
    });

    test('should validate grade level range', async () => {
      const { token } = await TestHelpers.createAdmin();

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Class',
          grade_level: 15 // Invalid, must be 1-12
        });

      Assertions.assertValidationError(response);
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();

      const classData = MockData.validClass();

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${token}`)
        .send(classData);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/classes/:id
   * ============================================
   */
  describe('GET /api/classes/:id', () => {
    test('should get class by ID without authentication', async () => {
      const { token } = await TestHelpers.createAdmin();
      const cls = await TestHelpers.createClass(token);

      const response = await request(app).get(`/api/classes/${cls.id}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.class.id).toBe(cls.id);
      expect(response.body.data.class).toHaveProperty('stats');
      Assertions.assertClassObject(response.body.data.class);
    });

    test('should include teacher information', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { teacher } = await TestHelpers.createTeacher();
      const cls = await TestHelpers.createClass(token, { teacher_id: teacher.id });

      const response = await request(app).get(`/api/classes/${cls.id}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.class).toHaveProperty('homeroomTeacher');
      expect(response.body.data.class.homeroomTeacher.id).toBe(teacher.id);
    });

    test('should return 404 for non-existent class', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app).get(`/api/classes/${fakeId}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * PUT /api/classes/:id
   * ============================================
   */
  describe('PUT /api/classes/:id', () => {
    test('should update class as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const cls = await TestHelpers.createClass(token);

      const updateData = {
        name: 'Updated Class Name',
        max_students: 35,
        room_number: 'B202'
      };

      const response = await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.class.name).toBe(updateData.name);
      expect(response.body.data.class.max_students).toBe(updateData.max_students);
    });

    test('should update teacher assignment', async () => {
      const { token } = await TestHelpers.createAdmin();
      const cls = await TestHelpers.createClass(token);
      const { teacher } = await TestHelpers.createTeacher();

      const response = await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ teacher_id: teacher.id });

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.class.teacher_id).toBe(teacher.id);
    });

    test('should fail with duplicate name for same school year', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createClass(token, { name: 'Class 10A' });
      const cls2 = await TestHelpers.createClass(token, { name: 'Class 10B' });

      const response = await request(app)
        .put(`/api/classes/${cls2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Class 10A' });

      Assertions.assertValidationError(response);
    });

    test('should deny access for non-admin', async () => {
      const { token: adminToken } = await TestHelpers.createAdmin();
      const { token: teacherToken } = await TestHelpers.createTeacher();
      const cls = await TestHelpers.createClass(adminToken);

      const response = await request(app)
        .put(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'Hacked' });

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent class', async () => {
      const { token } = await TestHelpers.createAdmin();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .put(`/api/classes/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' });

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * DELETE /api/classes/:id
   * ============================================
   */
  describe('DELETE /api/classes/:id', () => {
    test('should delete empty class as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const cls = await TestHelpers.createClass(token);

      const response = await request(app)
        .delete(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.message).toBe('Class deleted successfully');
    });

    test('should deny access for non-admin', async () => {
      const { token: adminToken } = await TestHelpers.createAdmin();
      const { token: teacherToken } = await TestHelpers.createTeacher();
      const cls = await TestHelpers.createClass(adminToken);

      const response = await request(app)
        .delete(`/api/classes/${cls.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent class', async () => {
      const { token } = await TestHelpers.createAdmin();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/classes/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * GET /api/classes/:id/student
   * ============================================
   */
  describe('GET /api/classes/:id/student', () => {
    test('should get student in class as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const cls = await TestHelpers.createClass(token);

      const response = await request(app)
        .get(`/api/classes/${cls.id}/student`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('class');
      expect(response.body.data).toHaveProperty('students');
      expect(Array.isArray(response.body.data.students)).toBe(true);
      Assertions.assertPagination(response);
    });

    test('should allow teacher to view class student', async () => {
      const { token: adminToken } = await TestHelpers.createAdmin();
      const { token: teacherToken } = await TestHelpers.createTeacher();
      const cls = await TestHelpers.createClass(adminToken);

      const response = await request(app)
        .get(`/api/classes/${cls.id}/student`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny access for non-admin/non-teacher', async () => {
      const { token: adminToken } = await TestHelpers.createAdmin();
      const { token: studentToken } = await TestHelpers.createStudent();
      const cls = await TestHelpers.createClass(adminToken);

      const response = await request(app)
        .get(`/api/classes/${cls.id}/student`)
        .set('Authorization', `Bearer ${studentToken}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/classes/:id/course
   * ============================================
   */
  describe('GET /api/classes/:id/course', () => {
    test('should get course for class as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const cls = await TestHelpers.createClass(token);

      const response = await request(app)
        .get(`/api/classes/${cls.id}/course`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('class');
      expect(response.body.data).toHaveProperty('courses');
      expect(Array.isArray(response.body.data.courses)).toBe(true);
    });

    test('should allow teacher to view class course', async () => {
      const { token: adminToken } = await TestHelpers.createAdmin();
      const { token: teacherToken } = await TestHelpers.createTeacher();
      const cls = await TestHelpers.createClass(adminToken);

      const response = await request(app)
        .get(`/api/classes/${cls.id}/course`)
        .set('Authorization', `Bearer ${teacherToken}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny access for student', async () => {
      const { token: adminToken } = await TestHelpers.createAdmin();
      const { token: studentToken } = await TestHelpers.createStudent();
      const cls = await TestHelpers.createClass(adminToken);

      const response = await request(app)
        .get(`/api/classes/${cls.id}/course`)
        .set('Authorization', `Bearer ${studentToken}`);

      Assertions.assertForbidden(response);
    });
  });
});
