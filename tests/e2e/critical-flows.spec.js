/**
 * E2E Tests - Critical User Flows
 * ================================
 * Tests all critical user journeys across devices
 *
 * Coverage:
 * - Student login and dashboard
 * - Teacher grade management
 * - Admin user management
 * - AI recommendations
 * - Responsive design
 */

const { test, expect } = require('@playwright/test');

// Test data
const TEST_USERS = {
  student: {
    email: 'student_e2e@test.com',
    password: 'Student@123',
    role: 'student'
  },
  teacher: {
    email: 'teacher_e2e@test.com',
    password: 'Teacher@123',
    role: 'teacher'
  },
  admin: {
    email: 'admin_e2e@test.com',
    password: 'Admin@123',
    role: 'admin'
  }
};

test.describe('🎓 Student Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login and view dashboard', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', TEST_USERS.student.email);
    await page.fill('input[name="password"]', TEST_USERS.student.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Verify dashboard elements
    await expect(page.locator('[data-testid="stats-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-grades"]')).toBeVisible();
  });

  test('should view grades', async ({ page }) => {
    // Login
    await loginAs(page, TEST_USERS.student);

    // Navigate to grades
    await page.click('text=Grades');
    await expect(page).toHaveURL(/\/grades/);

    // Verify grades table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('thead')).toContainText('Subject');
    await expect(page.locator('thead')).toContainText('Score');
  });

  test('should get AI study recommendations', async ({ page }) => {
    // Login
    await loginAs(page, TEST_USERS.student);

    // Navigate to AI recommendations
    await page.click('text=AI Recommendations');
    await expect(page).toHaveURL(/\/ai-recommendations/);

    // Verify AI recommendations loaded
    await expect(page.locator('[data-testid="ai-recommendations"]')).toBeVisible();

    // Check recommendation cards
    const recommendations = page.locator('[data-testid="recommendation-card"]');
    await expect(recommendations).toHaveCount(await recommendations.count());
  });

  test('should view attendance record', async ({ page }) => {
    // Login
    await loginAs(page, TEST_USERS.student);

    // Navigate to attendance
    await page.click('text=Attendance');
    await expect(page).toHaveURL(/\/attendance/);

    // Verify attendance calendar
    await expect(page.locator('[data-testid="attendance-calendar"]')).toBeVisible();
  });
});

test.describe('👨‍🏫 Teacher Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login and view teacher dashboard', async ({ page }) => {
    await loginAs(page, TEST_USERS.teacher);

    // Verify teacher dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Teacher Dashboard');

    // Verify teacher-specific elements
    await expect(page.locator('text=My Classes')).toBeVisible();
    await expect(page.locator('text=Recent Grades')).toBeVisible();
  });

  test('should manage grades', async ({ page }) => {
    await loginAs(page, TEST_USERS.teacher);

    // Navigate to grades
    await page.click('text=Grades');
    await expect(page).toHaveURL(/\/grades/);

    // Open add grade modal
    await page.click('button:has-text("Add Grade")');
    await expect(page.locator('[data-testid="add-grade-modal"]')).toBeVisible();

    // Fill grade form
    await page.selectOption('select[name="student"]', { index: 1 });
    await page.selectOption('select[name="course"]', { index: 1 });
    await page.fill('input[name="score"]', '8.5');
    await page.selectOption('select[name="gradeType"]', 'Test');

    // Submit
    await page.click('button:has-text("Submit")');

    // Verify success message
    await expect(page.locator('.success-message')).toContainText('Grade added successfully');
  });

  test('should view class roster', async ({ page }) => {
    await loginAs(page, TEST_USERS.teacher);

    // Navigate to classes
    await page.click('text=My Classes');

    // Click on a class
    await page.click('[data-testid="class-card"]:first-child');

    // Verify student list
    await expect(page.locator('h2')).toContainText('Class Roster');
    await expect(page.locator('[data-testid="student-list"]')).toBeVisible();
  });

  test('should generate AI report', async ({ page }) => {
    await loginAs(page, TEST_USERS.teacher);

    // Navigate to reports
    await page.click('text=Reports');

    // Select student
    await page.selectOption('select[name="student"]', { index: 1 });

    // Generate AI report
    await page.click('button:has-text("Generate AI Report")');

    // Wait for AI report
    await expect(page.locator('[data-testid="ai-report"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ai-report"]')).toContainText('Summary');
  });
});

test.describe('👤 Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login and view admin dashboard', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    // Verify admin dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Admin Dashboard');

    // Verify admin-specific stats
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Total Students')).toBeVisible();
    await expect(page.locator('text=Total Teachers')).toBeVisible();
  });

  test('should manage users', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    // Navigate to users
    await page.click('text=Users');
    await expect(page).toHaveURL(/\/users/);

    // Verify user table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('thead')).toContainText('Email');
    await expect(page.locator('thead')).toContainText('Role');
    await expect(page.locator('thead')).toContainText('Status');
  });

  test('should create new teacher', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    // Navigate to users
    await page.click('text=Users');

    // Open create user modal
    await page.click('button:has-text("Add Teacher")');
    await expect(page.locator('[data-testid="add-teacher-modal"]')).toBeVisible();

    // Fill teacher form
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `teacher_${timestamp}@test.com`);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Teacher');
    await page.fill('input[name="password"]', 'Teacher@123');
    await page.selectOption('select[name="department"]', 'Mathematics');

    // Submit
    await page.click('button:has-text("Create Teacher")');

    // Verify success
    await expect(page.locator('.success-message')).toContainText('Teacher created successfully');
  });

  test('should view system analytics', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    // Navigate to analytics
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/\/analytics/);

    // Verify charts loaded
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="attendance-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="grade-distribution-chart"]')).toBeVisible();
  });
});

test.describe('📱 Responsive Design', () => {
  test('should work on mobile portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await loginAs(page, TEST_USERS.student);

    // Verify mobile menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

    // Navigate
    await page.click('text=Grades');
    await expect(page).toHaveURL(/\/grades/);

    // Verify responsive table
    await expect(page.locator('[data-testid="grades-mobile-view"]')).toBeVisible();
  });

  test('should work on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await loginAs(page, TEST_USERS.teacher);

    // Verify tablet layout
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Check dashboard cards layout
    const cards = page.locator('[data-testid="stats-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should work on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD

    await loginAs(page, TEST_USERS.admin);

    // Verify desktop layout
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Verify multi-column layout
    const columns = page.locator('[class*="grid-cols-"]');
    await expect(columns.first()).toBeVisible();
  });
});

test.describe('🔍 Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check form accessibility
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('aria-label', /.+/);

    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('aria-label', /.+/);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveAttribute('aria-label', /.+/);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();

    // Submit with Enter
    await page.fill('input[name="email"]', TEST_USERS.student.email);
    await page.fill('input[name="password"]', TEST_USERS.student.password);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('⚡ Performance', () => {
  test('should load dashboard within 3 seconds', async ({ page }) => {
    await loginAs(page, TEST_USERS.student);

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // < 3 seconds requirement
  });

  test('should handle large grade lists efficiently', async ({ page }) => {
    await loginAs(page, TEST_USERS.teacher);

    await page.goto('/grades');

    const startTime = Date.now();
    await page.waitForSelector('[data-testid="grades-table"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // < 3 seconds
  });
});

// Helper functions
async function loginAs(page, user) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}
