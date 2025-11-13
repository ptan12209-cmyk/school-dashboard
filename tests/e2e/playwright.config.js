/**
 * Playwright E2E Test Configuration
 * ==================================
 * End-to-end testing configuration for all browsers and devices
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',

  // Test timeout
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },

  // Fail fast on CI
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/html' }],
    ['json', { outputFile: 'tests/e2e/reports/results.json' }],
    ['junit', { outputFile: 'tests/e2e/reports/junit.xml' }],
    ['list']
  ],

  // Shared settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Browser context
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    permissions: []
  },

  // Projects for different browsers and devices
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },

    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] }
    }
  ],

  // Development server
  webServer: {
    command: 'cd frontend && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
});
