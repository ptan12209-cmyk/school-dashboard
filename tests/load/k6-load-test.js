/**
 * K6 Load Test - 100 Concurrent Users
 * ====================================
 * Tests system performance under 100 concurrent user load
 *
 * Usage:
 *   k6 run tests/load/k6-load-test.js
 *   k6 run --vus 100 --duration 5m tests/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginDuration = new Trend('login_duration');
const dashboardLoadDuration = new Trend('dashboard_load_duration');
const gradeQueryDuration = new Trend('grade_query_duration');
const aiPredictionDuration = new Trend('ai_prediction_duration');
const errorRate = new Rate('error_rate');
const requestCounter = new Counter('total_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

// Test options - 100 concurrent users scenario
export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },   // Warm up: 0 -> 20 users
        { duration: '3m', target: 50 },   // Ramp up: 20 -> 50 users
        { duration: '2m', target: 100 },  // Ramp up: 50 -> 100 users
        { duration: '5m', target: 100 },  // Sustained: 100 users
        { duration: '3m', target: 50 },   // Ramp down: 100 -> 50 users
        { duration: '2m', target: 0 }     // Cool down: 50 -> 0 users
      ],
      gracefulRampDown: '30s'
    }
  },

  thresholds: {
    // Overall HTTP metrics
    http_req_duration: [
      'p(95)<3000',  // 95% of requests < 3s (REQUIREMENT)
      'p(99)<5000'   // 99% of requests < 5s
    ],
    http_req_failed: ['rate<0.05'],  // < 5% failure rate

    // Custom metrics
    login_duration: ['p(95)<2000'],          // Login < 2s
    dashboard_load_duration: ['p(95)<3000'], // Dashboard < 3s (REQUIREMENT)
    grade_query_duration: ['p(95)<3000'],    // Grades < 3s (REQUIREMENT for 240K records)
    ai_prediction_duration: ['p(95)<5000'],  // AI predictions < 5s
    error_rate: ['rate<0.05'],               // < 5% errors

    // Checks
    checks: ['rate>0.95'] // 95% of checks pass
  },

  // Test summary
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)']
};

// Helper: Extract token from Set-Cookie header
function extractToken(response) {
  const setCookie = response.headers['Set-Cookie'];
  if (!setCookie) return null;

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookies) {
    if (cookie.startsWith('accessToken=')) {
      return cookie.split(';')[0].split('=')[1];
    }
  }
  return null;
}

// Test scenarios
export default function() {
  const userType = ['admin', 'teacher', 'student'][Math.floor(Math.random() * 3)];
  const timestamp = Date.now();

  let token = null;

  group('Authentication Flow', () => {
    // Register new user
    group('Register', () => {
      const registerPayload = {
        email: `${userType}_${timestamp}_${__VU}@loadtest.com`,
        password: 'Test@123!',
        role: userType,
        firstName: 'Load',
        lastName: 'Test'
      };

      if (userType === 'teacher') {
        registerPayload.department = 'Testing';
      } else if (userType === 'student') {
        registerPayload.dateOfBirth = '2005-01-01';
        registerPayload.gender = 'M';
      }

      const registerRes = http.post(
        `${BASE_URL}/api/auth/register`,
        JSON.stringify(registerPayload),
        { headers: { 'Content-Type': 'application/json' } }
      );

      requestCounter.add(1);

      check(registerRes, {
        'register: status is 201': (r) => r.status === 201,
        'register: has user data': (r) => r.json('data.user') !== undefined
      }) || errorRate.add(1);

      token = extractToken(registerRes);
    });

    // Login
    group('Login', () => {
      const loginStart = Date.now();

      const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
          email: `${userType}_${timestamp}_${__VU}@loadtest.com`,
          password: 'Test@123!'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      loginDuration.add(Date.now() - loginStart);
      requestCounter.add(1);

      check(loginRes, {
        'login: status is 200': (r) => r.status === 200,
        'login: duration < 2s': (r) => r.timings.duration < 2000
      }) || errorRate.add(1);

      if (!token) {
        token = extractToken(loginRes);
      }
    });

    sleep(1);
  });

  if (!token) {
    console.error('Failed to get authentication token');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // User-specific scenarios
  if (userType === 'admin') {
    group('Admin Dashboard', () => {
      const dashStart = Date.now();

      // Get dashboard stats
      const dashRes = http.get(`${BASE_URL}/api/dashboard/stats`, { headers });
      dashboardLoadDuration.add(Date.now() - dashStart);
      requestCounter.add(1);

      check(dashRes, {
        'dashboard: status is 200': (r) => r.status === 200,
        'dashboard: load time < 3s': (r) => r.timings.duration < 3000
      }) || errorRate.add(1);

      sleep(2);

      // List users
      const usersRes = http.get(`${BASE_URL}/api/users?page=1&limit=20`, { headers });
      requestCounter.add(1);

      check(usersRes, {
        'users list: status is 200': (r) => r.status === 200
      }) || errorRate.add(1);

      sleep(1);
    });

  } else if (userType === 'teacher') {
    group('Teacher Activities', () => {
      // View classes
      const classesRes = http.get(`${BASE_URL}/api/classes`, { headers });
      requestCounter.add(1);

      check(classesRes, {
        'classes: status is 200': (r) => r.status === 200
      }) || errorRate.add(1);

      sleep(1);

      // View grades (240K records simulation)
      const gradeStart = Date.now();
      const gradesRes = http.get(`${BASE_URL}/api/grades?page=1&limit=50`, { headers });
      gradeQueryDuration.add(Date.now() - gradeStart);
      requestCounter.add(1);

      check(gradesRes, {
        'grades: status is 200': (r) => r.status === 200,
        'grades: query time < 3s': (r) => r.timings.duration < 3000  // REQUIREMENT
      }) || errorRate.add(1);

      sleep(2);
    });

  } else if (userType === 'student') {
    group('Student Activities', () => {
      // View own profile
      const meRes = http.get(`${BASE_URL}/api/auth/me`, { headers });
      requestCounter.add(1);

      check(meRes, {
        'profile: status is 200': (r) => r.status === 200
      }) || errorRate.add(1);

      const studentId = meRes.json('data.studentProfile.id');

      if (studentId) {
        sleep(1);

        // Get AI study recommendations
        const aiStart = Date.now();
        const aiRes = http.get(
          `${BASE_URL}/api/ai/recommendations/study/${studentId}`,
          { headers }
        );
        aiPredictionDuration.add(Date.now() - aiStart);
        requestCounter.add(1);

        check(aiRes, {
          'ai recommendations: status is 200': (r) => r.status === 200,
          'ai recommendations: response time < 5s': (r) => r.timings.duration < 5000
        }) || errorRate.add(1);

        sleep(2);

        // View grades
        const gradeStart = Date.now();
        const gradesRes = http.get(`${BASE_URL}/api/grades?student_id=${studentId}`, { headers });
        gradeQueryDuration.add(Date.now() - gradeStart);
        requestCounter.add(1);

        check(gradesRes, {
          'student grades: status is 200': (r) => r.status === 200,
          'student grades: query time < 3s': (r) => r.timings.duration < 3000
        }) || errorRate.add(1);
      }

      sleep(1);
    });
  }

  // Random think time between iterations
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

// Setup function - runs once before all VUs
export function setup() {
  console.log('🚀 Starting load test: 100 concurrent users');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log('⏱️  Duration: 17 minutes total');
  console.log('📈 Stages: 0 → 20 → 50 → 100 users');
  console.log('');

  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error('Server health check failed! Is the server running?');
  }

  console.log('✅ Server is healthy and ready');
  return { startTime: Date.now() };
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('');
  console.log(`✅ Load test completed in ${duration.toFixed(2)}s`);
  console.log('📊 Check the summary above for detailed metrics');
}

// Handle summary - custom reporting
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'tests/load/results/k6-load-test-results.json': JSON.stringify(data, null, 2),
  };
}

// Helper: Generate text summary
function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors !== false;

  let output = '\n';
  output += '═'.repeat(80) + '\n';
  output += '  LOAD TEST SUMMARY - 100 Concurrent Users\n';
  output += '═'.repeat(80) + '\n\n';

  // Test duration
  output += `${indent}Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n\n`;

  // HTTP metrics
  output += `${indent}HTTP Request Duration:\n`;
  const reqDuration = data.metrics.http_req_duration;
  if (reqDuration) {
    output += `${indent}  avg: ${reqDuration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}  p(95): ${reqDuration.values['p(95)'].toFixed(2)}ms ${reqDuration.values['p(95)'] < 3000 ? '✅' : '❌'}\n`;
    output += `${indent}  p(99): ${reqDuration.values['p(99)'].toFixed(2)}ms\n`;
  }

  output += '\n';
  output += `${indent}Total Requests: ${data.metrics.total_requests ? data.metrics.total_requests.values.count : 'N/A'}\n`;
  output += `${indent}Failed Requests: ${(data.metrics.http_req_failed?.values.rate * 100 || 0).toFixed(2)}% ${data.metrics.http_req_failed?.values.rate < 0.05 ? '✅' : '❌'}\n`;
  output += `${indent}Checks Passed: ${(data.metrics.checks?.values.rate * 100 || 0).toFixed(2)}% ${data.metrics.checks?.values.rate > 0.95 ? '✅' : '❌'}\n`;

  output += '\n';
  output += '─'.repeat(80) + '\n';
  output += `${indent}✅ REQUIREMENT VERIFICATION:\n`;
  output += '─'.repeat(80) + '\n';
  output += `${indent}• 100 concurrent users: TESTED ✅\n`;
  output += `${indent}• Dashboard load < 3s: ${data.metrics.dashboard_load_duration?.values['p(95)'] < 3000 ? 'PASS ✅' : 'FAIL ❌'}\n`;
  output += `${indent}• Grade query < 3s: ${data.metrics.grade_query_duration?.values['p(95)'] < 3000 ? 'PASS ✅' : 'FAIL ❌'}\n`;
  output += `${indent}• Error rate < 5%: ${data.metrics.error_rate?.values.rate < 0.05 ? 'PASS ✅' : 'FAIL ❌'}\n`;
  output += '\n';

  return output;
}
