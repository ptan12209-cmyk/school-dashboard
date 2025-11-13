/**
 * K6 Load Testing Configuration
 * ==============================
 * Shared configuration for all load tests
 */

module.exports = {
  // Test environment
  BASE_URL: __ENV.BASE_URL || 'http://localhost:5001',

  // Test data
  TEST_USERS: {
    admin: {
      email: 'admin@test.com',
      password: 'Admin@123'
    },
    teacher: {
      email: 'teacher@test.com',
      password: 'Teacher@123'
    },
    student: {
      email: 'student@test.com',
      password: 'Student@123'
    }
  },

  // Load test scenarios
  SCENARIOS: {
    // Smoke test - minimal load
    smoke: {
      vus: 1,
      duration: '30s'
    },

    // Load test - normal traffic
    load: {
      stages: [
        { duration: '2m', target: 20 },  // Ramp up
        { duration: '5m', target: 20 },  // Stay at 20 users
        { duration: '2m', target: 0 }    // Ramp down
      ]
    },

    // Stress test - find breaking point
    stress: {
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 }
      ]
    },

    // Spike test - sudden traffic surge
    spike: {
      stages: [
        { duration: '10s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '10s', target: 200 }, // Spike
        { duration: '3m', target: 200 },
        { duration: '10s', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '10s', target: 0 }
      ]
    },

    // Soak test - sustained load over time
    soak: {
      stages: [
        { duration: '5m', target: 50 },
        { duration: '30m', target: 50 }, // Sustained
        { duration: '5m', target: 0 }
      ]
    }
  },

  // Performance thresholds
  THRESHOLDS: {
    // HTTP request duration
    http_req_duration: ['p(95)<3000', 'p(99)<5000'], // 95% < 3s, 99% < 5s

    // HTTP request failure rate
    http_req_failed: ['rate<0.05'], // < 5% failure rate

    // Iteration duration
    iteration_duration: ['avg<5000'], // Average < 5s

    // Custom checks
    checks: ['rate>0.95'] // 95% of checks should pass
  }
};
