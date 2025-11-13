/**
 * Student Management Integration Tests
 * ======================================
 * Tests for student CRUD endpoints
 * 
 * Endpoints tested:
 * - GET    /api/student
 * - GET    /api/students/stats
 * - GET    /api/students/unassigned
 * - GET    /api/students/:id
 * - POST   /api/student
 * - PUT    /api/students/:id
 * - DELETE /api/students/:id
 * - GET    /api/students/:id/grade
 * 
 * Total tests: 26
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

describe('Student Management API', () => {
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
   * GET /api/student
   * ============================================
   */
  describe('GET /api/students', () => {
    test('should get all student as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createStudent();
      await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('students');
      expect(Array.isArray(response.body.data.students)).toBe(true);
      expect(response.body.data.students.length).toBeGreaterThanOrEqual(2);
      Assertions.assertPagination(response);
    });

    test('should get all student as teacher', async () => {
      const { token } = await TestHelpers.createTeacher();
      
      await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(Array.isArray(response.body.data.students)).toBe(true);
    });

    test('should support pagination', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createStudent({ email: `student${i}@test.com` });
      }

      const response = await request(app)
        .get('/api/students?page=1&limit=3')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.students.length).toBeLessThanOrEqual(3);
    });

    test('should filter by gender', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createStudent({ gender: 'M' });
      await TestHelpers.createStudent({ gender: 'F' });

      const response = await request(app)
        .get('/api/students?gender=M')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      response.body.data.students.forEach(student => {
        expect(student.gender).toBe('M');
      });
    });

    test('should search by name', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createStudent({ 
        firstName: 'Alice', 
        lastName: 'Wonder' 
      });

      const response = await request(app)
        .get('/api/students?search=Alice')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.students.length).toBeGreaterThan(0);
    });

    test('should deny access for student', async () => {
      const { token } = await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/students/stats
   * ============================================
   */
  describe('GET /api/students/stats', () => {
    test('should get student statistics as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createStudent({ gender: 'M' });
      await TestHelpers.createStudent({ gender: 'F' });

      const response = await request(app)
        .get('/api/students/stats')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('assigned');
      expect(response.body.data).toHaveProperty('unassigned');
      expect(response.body.data).toHaveProperty('byGender');
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get('/api/students/stats')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/students/unassigned
   * ============================================
   */
  describe('GET /api/students/unassigned', () => {
    test('should get unassigned student', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      // Create student without class
      await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/students/unassigned')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('student');
      expect(response.body.data).toHaveProperty('count');
    });

    test('should allow teachers to view unassigned', async () => {
      const { token } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get('/api/students/unassigned')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny access for student', async () => {
      const { token } = await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/students/unassigned')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * POST /api/student
   * ============================================
   */
  describe('POST /api/students', () => {
    test('should create student as admin', async () => {
      const { token } = await TestHelpers.createAdmin();

      const studentData = {
        email: 'newstudent@test.com',
        password: 'Student123!',
        firstName: 'John',
        lastName: 'Student',
        dateOfBirth: '2008-05-15',
        gender: 'M',
        phone: '1234567890',
        address: '123 Main St',
        parentName: 'Parent Name',
        parentPhone: '0987654321',
        parentEmail: 'parent@test.com'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

      Assertions.assertSuccess(response, 201);
      expect(response.body.message).toBe('Student created successfully');
      expect(response.body.data.student.first_name).toBe(studentData.firstName);
      Assertions.assertStudentObject(response.body.data.student);
    });

    test('should create student with minimal fields', async () => {
      const { token } = await TestHelpers.createAdmin();

      const studentData = {
        email: 'minimal@test.com',
        password: 'Student123!',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2008-01-01'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

      Assertions.assertSuccess(response, 201);
    });

    test('should fail with duplicate email', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createStudent({ email: 'duplicate@test.com' });

      const studentData = {
        email: 'duplicate@test.com',
        password: 'Student123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '2008-01-01'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

      Assertions.assertConflict(response);
    });

    test('should validate required fields', async () => {
      const { token } = await TestHelpers.createAdmin();

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'test@test.com'
          // Missing password, firstName, lastName, dateOfBirth
        });

      Assertions.assertValidationError(response);
    });

    test('should validate date of birth', async () => {
      const { token } = await TestHelpers.createAdmin();

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'test@test.com',
          password: 'Student123!',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: 'invalid-date'
        });

      Assertions.assertValidationError(response);
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();

      const studentData = MockData.validStudent();

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/students/:id
   * ============================================
   */
  describe('GET /api/students/:id', () => {
    test('should get student by ID as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { student } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.student.id).toBe(student.id);
      Assertions.assertStudentObject(response.body.data.student);
    });

    test('should get own student profile', async () => {
      const { token, student } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.student.id).toBe(student.id);
    });

    test('should allow teacher to view student', async () => {
      const { token } = await TestHelpers.createTeacher();
      const { student } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should deny access to other student profiles', async () => {
      const { token } = await TestHelpers.createStudent();
      const { student: otherStudent } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${otherStudent.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent student', async () => {
      const { token } = await TestHelpers.createAdmin();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/students/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * PUT /api/students/:id
   * ============================================
   */
  describe('PUT /api/students/:id', () => {
    test('should update student as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { student } = await TestHelpers.createStudent();

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '9876543210',
        address: 'New Address'
      };

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.student.first_name).toBe(updateData.firstName);
    });

    test('should update own profile as student (limited fields)', async () => {
      const { token, student } = await TestHelpers.createStudent();

      const updateData = {
        phone: '1111111111',
        address: 'My New Address'
      };

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.student.phone).toBe(updateData.phone);
    });

    test('should not allow student to update restricted fields', async () => {
      const { token, student } = await TestHelpers.createStudent();

      const updateData = {
        firstName: 'Hacked', // Should not be allowed
        phone: '1111111111'  // Should be allowed
      };

      const response = await request(app)
        .put(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      // firstName should not change
      expect(response.body.data.student.first_name).not.toBe('Hacked');
      // phone should change
      expect(response.body.data.student.phone).toBe(updateData.phone);
    });

    test('should deny updating other student', async () => {
      const { token } = await TestHelpers.createStudent();
      const { student: otherStudent } = await TestHelpers.createStudent();

      const response = await request(app)
        .put(`/api/students/${otherStudent.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '0000000000' });

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent student', async () => {
      const { token } = await TestHelpers.createAdmin();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .put(`/api/students/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Test' });

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * DELETE /api/students/:id
   * ============================================
   */
  describe('DELETE /api/students/:id', () => {
    test('should delete student as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { student } = await TestHelpers.createStudent();

      const response = await request(app)
        .delete(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.message).toBe('Student deleted successfully');
    });

    test('should not allow deleting own account', async () => {
      const adminData = await TestHelpers.createAdmin();
      const { token, student } = await TestHelpers.createStudent();

      const response = await request(app)
        .delete(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();
      const { student } = await TestHelpers.createStudent();

      const response = await request(app)
        .delete(`/api/students/${student.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent student', async () => {
      const { token } = await TestHelpers.createAdmin();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/students/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * GET /api/students/:id/grade
   * ============================================
   */
  describe('GET /api/students/:id/grade', () => {
    test('should get student grade as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { student } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${student.id}/grade`)
        .set('Authorization', `Bearer ${token}`);

      // Currently returns placeholder message
      Assertions.assertSuccess(response, 200);
    });

    test('should get own grade as student', async () => {
      const { token, student } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${student.id}/grade`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
    });

    test('should allow teacher to view student grade', async () => {
      const { token } = await TestHelpers.createTeacher();
      const { student } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/students/${student.id}/grade`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
    });
  });
});
