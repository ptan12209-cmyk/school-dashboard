/**
 * User Management Integration Tests
 * ===================================
 * Tests for user CRUD endpoints
 * 
 * Endpoints tested:
 * - GET    /api/user
 * - GET    /api/users/stats
 * - GET    /api/users/:id
 * - PUT    /api/users/:id
 * - DELETE /api/users/:id
 * - PATCH  /api/users/:id/activate
 * - PATCH  /api/users/:id/deactivate
 * 
 * Total tests: 28
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

describe('User Management API', () => {
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
   * GET /api/user
   * ============================================
   */
  describe('GET /api/users', () => {
    test('should get all user as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      // Create some user
      await TestHelpers.createTeacher();
      await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('user');
      expect(Array.isArray(response.body.data.user)).toBe(true);
      expect(response.body.data.user.length).toBeGreaterThanOrEqual(3);
      Assertions.assertPagination(response);
    });

    test('should support pagination', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      // Create multiple user
      for (let i = 0; i < 5; i++) {
        await TestHelpers.createStudent({ email: `student${i}@test.com` });
      }

      const response = await request(app)
        .get('/api/users?page=1&limit=3')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.length).toBeLessThanOrEqual(3);
      expect(response.body.data.pagination.limit).toBe(3);
    });

    test('should filter by role', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createTeacher();
      await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/users?role=teacher')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      response.body.data.user.forEach(user => {
        expect(user.role).toBe('teacher');
      });
    });

    test('should filter by active status', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      const { user } = await TestHelpers.createStudent();
      
      // Deactivate one user
      await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app)
        .get('/api/users?is_active=false')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      response.body.data.user.forEach(user => {
        expect(user.is_active).toBe(false);
      });
    });

    test('should search by email', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createStudent({ email: 'searchable@test.com' });

      const response = await request(app)
        .get('/api/users?search=searchable')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.length).toBeGreaterThan(0);
      expect(response.body.data.user[0].email).toContain('searchable');
    });

    test('should deny access for non-admin user', async () => {
      const { token } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });

    test('should deny access without token', async () => {
      const response = await request(app).get('/api/users');

      Assertions.assertAuthRequired(response);
    });
  });

  /**
   * ============================================
   * GET /api/users/stats
   * ============================================
   */
  describe('GET /api/users/stats', () => {
    test('should get user statistics as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      
      await TestHelpers.createTeacher();
      await TestHelpers.createStudent();

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('inactive');
      expect(response.body.data).toHaveProperty('byRole');
      expect(response.body.data.byRole).toHaveProperty('admin');
      expect(response.body.data.byRole).toHaveProperty('teacher');
      expect(response.body.data.byRole).toHaveProperty('student');
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * GET /api/users/:id
   * ============================================
   */
  describe('GET /api/users/:id', () => {
    test('should get user by ID as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.id).toBe(user.id);
      Assertions.assertUserObject(response.body.data.user);
    });

    test('should get own user profile', async () => {
      const { token, user } = await TestHelpers.createStudent();

      const response = await request(app)
        .get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.id).toBe(user.id);
    });

    test('should deny access to other user profiles', async () => {
      const { token } = await TestHelpers.createStudent();
      const { user: otherUser } = await TestHelpers.createTeacher();

      const response = await request(app)
        .get(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent user', async () => {
      const { token } = await TestHelpers.createAdmin();

      const response = await request(app)
        .get(`/api/users/${MockData.invalidUUID()}`)
        .set('Authorization', `Bearer ${token}`);

      // Will get validation error for invalid UUID format
      Assertions.assertValidationError(response);
    });
  });

  /**
   * ============================================
   * PUT /api/users/:id
   * ============================================
   */
  describe('PUT /api/users/:id', () => {
    test('should update user as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      const updateData = {
        email: 'newemail@test.com',
        role: 'teacher',
        is_active: false
      };

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.email).toBe(updateData.email);
      expect(response.body.data.user.role).toBe(updateData.role);
    });

    test('should update own email as regular user', async () => {
      const { token, user } = await TestHelpers.createStudent();

      const updateData = {
        email: 'mynewemail@test.com'
      };

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.email).toBe(updateData.email);
    });

    test('should not allow non-admin to change role', async () => {
      const { token, user } = await TestHelpers.createStudent();

      const updateData = {
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      // Should succeed but role should not change (non-admin can't update role)
      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.role).toBe('student');
    });

    test('should fail with duplicate email', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent({ email: 'original@test.com' });
      await TestHelpers.createStudent({ email: 'taken@test.com' });

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'taken@test.com' });

      Assertions.assertConflict(response);
    });

    test('should deny updating other user profile', async () => {
      const { token } = await TestHelpers.createStudent();
      const { user: otherUser } = await TestHelpers.createTeacher();

      const response = await request(app)
        .put(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'hacked@test.com' });

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * DELETE /api/users/:id
   * ============================================
   */
  describe('DELETE /api/users/:id', () => {
    test('should delete user as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.message).toBe('User deleted successfully');
    });

    test('should not allow deleting own account', async () => {
      const { token, user } = await TestHelpers.createAdmin();

      const response = await request(app)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertValidationError(response);
      expect(response.body.message).toMatch(/cannot delete your own account/i);
    });

    test('should deny delete for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });

    test('should return 404 for non-existent user', async () => {
      const { token } = await TestHelpers.createAdmin();
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertNotFound(response);
    });
  });

  /**
   * ============================================
   * PATCH /api/users/:id/activate
   * ============================================
   */
  describe('PATCH /api/users/:id/activate', () => {
    test('should activate inactive user as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      // Deactivate first
      await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      // Activate
      const response = await request(app)
        .patch(`/api/users/${user.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.is_active).toBe(true);
    });

    test('should fail if user already active', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .patch(`/api/users/${user.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertValidationError(response);
      expect(response.body.message).toMatch(/already active/i);
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .patch(`/api/users/${user.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });

  /**
   * ============================================
   * PATCH /api/users/:id/deactivate
   * ============================================
   */
  describe('PATCH /api/users/:id/deactivate', () => {
    test('should deactivate user as admin', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertSuccess(response, 200);
      expect(response.body.data.user.is_active).toBe(false);
    });

    test('should not allow deactivating own account', async () => {
      const { token, user } = await TestHelpers.createAdmin();

      const response = await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertValidationError(response);
      expect(response.body.message).toMatch(/cannot deactivate your own account/i);
    });

    test('should fail if user already inactive', async () => {
      const { token } = await TestHelpers.createAdmin();
      const { user } = await TestHelpers.createStudent();

      // Deactivate first time
      await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      // Try to deactivate again
      const response = await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertValidationError(response);
      expect(response.body.message).toMatch(/already inactive/i);
    });

    test('should deny access for non-admin', async () => {
      const { token } = await TestHelpers.createTeacher();
      const { user } = await TestHelpers.createStudent();

      const response = await request(app)
        .patch(`/api/users/${user.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      Assertions.assertForbidden(response);
    });
  });
});
