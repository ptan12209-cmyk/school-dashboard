/**
 * Test Authentication Fix
 * =======================
 * This script tests the authentication endpoints to verify the fix works
 *
 * Usage: node test-auth-fix.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001';

// Test credentials
const TEST_USER = {
  email: 'admin@example.com',
  password: 'Admin@123',
};

let accessToken = '';

/**
 * Test 1: Login
 */
async function testLogin() {
  console.log('\n🧪 Test 1: Login');
  console.log('================================');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
    });

    const data = await response.json();

    // Extract token from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/accessToken=([^;]+)/);
      if (match) {
        accessToken = match[1];
      }
    }

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`Message: ${data.message}`);
    console.log(`Token extracted: ${accessToken ? 'Yes ✅' : 'No ❌'}`);

    if (!accessToken && data.token) {
      accessToken = data.token;
    }

    return response.status === 200 && data.success;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 2: Access protected endpoint
 */
async function testProtectedEndpoint() {
  console.log('\n🧪 Test 2: Protected Endpoint');
  console.log('================================');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': `accessToken=${accessToken}`,
      },
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`User ID: ${data.data?.user?.id || 'N/A'}`);
    console.log(`User Role: ${data.data?.user?.role || 'N/A'}`);

    return response.status === 200 && data.success;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 3: Token Refresh (NEW ENDPOINT)
 */
async function testTokenRefresh() {
  console.log('\n🧪 Test 3: Token Refresh (Critical Fix)');
  console.log('================================');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `accessToken=${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`Message: ${data.message}`);

    // Extract new token
    const setCookie = response.headers.get('set-cookie');
    let newToken = '';
    if (setCookie) {
      const match = setCookie.match(/accessToken=([^;]+)/);
      if (match) {
        newToken = match[1];
        console.log(`New token received: Yes ✅`);
        console.log(`Token changed: ${newToken !== accessToken ? 'Yes ✅' : 'No (same token)'}`);
      }
    }

    return response.status === 200 && data.success;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 4: Token Refresh with EXPIRED token
 */
async function testExpiredTokenRefresh() {
  console.log('\n🧪 Test 4: Refresh with Expired Token (Critical)');
  console.log('================================');

  // Create an expired but valid JWT (signed with correct secret but expired)
  const jwt = require('jsonwebtoken');
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-123456789';

  const expiredToken = jwt.sign(
    { id: 'test-user-id', email: 'test@example.com', role: 'student' },
    jwtSecret,
    { expiresIn: '-1h' } // Expired 1 hour ago
  );

  console.log('Created expired token for testing...');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `accessToken=${expiredToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`Message: ${data.message}`);

    // The fix should allow expired tokens to be refreshed
    // So we expect either 200 (success) or 401 "User not found" (if user doesn't exist)
    // But NOT 401 "Token expired"

    if (response.status === 401 && data.message === 'Token expired') {
      console.log('❌ FAIL: Still rejecting expired tokens!');
      return false;
    } else if (response.status === 401 && data.message.includes('User not found')) {
      console.log('✅ PASS: Expired token accepted, user validation working');
      return true;
    } else if (response.status === 200) {
      console.log('✅ PASS: Expired token refreshed successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 5: Health Check
 */
async function testHealthCheck() {
  console.log('\n🧪 Test 5: Health Check (New Endpoint)');
  console.log('================================');

  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Health: ${data.data?.status || 'N/A'}`);
    console.log(`Uptime: ${data.data?.uptime || 'N/A'}s`);
    console.log(`Memory Usage: ${data.data?.memory?.usagePercent || 'N/A'}`);
    console.log(`Total Requests: ${data.data?.metrics?.totalRequests || 'N/A'}`);
    console.log(`Avg Response Time: ${data.data?.metrics?.avgResponseTime || 'N/A'}`);

    return response.status === 200;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Test 6: Performance Monitoring
 */
async function testPerformanceEndpoint() {
  console.log('\n🧪 Test 6: Performance Monitoring (Admin)');
  console.log('================================');

  try {
    const response = await fetch(`${BASE_URL}/api/admin/performance`, {
      method: 'GET',
      headers: {
        'Cookie': `accessToken=${accessToken}`,
      },
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);

    if (response.status === 200) {
      console.log(`Total Requests: ${data.data?.summary?.totalRequests || 'N/A'}`);
      console.log(`Avg Response Time: ${data.data?.summary?.avgResponseTime || 'N/A'}`);
      console.log(`Error Rate: ${data.data?.summary?.errorRate || 'N/A'}`);
    } else if (response.status === 403) {
      console.log('⚠️  Access denied (expected for non-admin users)');
    }

    return response.status === 200 || response.status === 403;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   AUTHENTICATION FIX TEST SUITE        ║');
  console.log('╚════════════════════════════════════════╝');

  const results = {
    login: false,
    protectedEndpoint: false,
    tokenRefresh: false,
    expiredTokenRefresh: false,
    healthCheck: false,
    performance: false,
  };

  // Test 1: Login
  results.login = await testLogin();

  if (!results.login) {
    console.log('\n❌ Login failed. Cannot proceed with other tests.');
    console.log('💡 Make sure backend is running and test credentials are correct.');
    process.exit(1);
  }

  // Test 2: Protected endpoint
  results.protectedEndpoint = await testProtectedEndpoint();

  // Test 3: Token refresh
  results.tokenRefresh = await testTokenRefresh();

  // Test 4: Expired token refresh (CRITICAL TEST)
  results.expiredTokenRefresh = await testExpiredTokenRefresh();

  // Test 5: Health check
  results.healthCheck = await testHealthCheck();

  // Test 6: Performance monitoring
  results.performance = await testPerformanceEndpoint();

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          TEST RESULTS SUMMARY          ║');
  console.log('╚════════════════════════════════════════╝\n');

  const tests = [
    { name: 'Login', result: results.login, critical: true },
    { name: 'Protected Endpoint', result: results.protectedEndpoint, critical: true },
    { name: 'Token Refresh', result: results.tokenRefresh, critical: true },
    { name: 'Expired Token Refresh', result: results.expiredTokenRefresh, critical: true },
    { name: 'Health Check', result: results.healthCheck, critical: false },
    { name: 'Performance Monitoring', result: results.performance, critical: false },
  ];

  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    const critical = test.critical ? ' [CRITICAL]' : '';
    console.log(`${icon} ${test.name}${critical}`);
  });

  const criticalTests = tests.filter(t => t.critical);
  const passedCritical = criticalTests.filter(t => t.result).length;
  const totalCritical = criticalTests.length;

  console.log(`\n🎯 Critical Tests: ${passedCritical}/${totalCritical} passed`);

  if (passedCritical === totalCritical) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    console.log('✅ Authentication fix is working correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ SOME CRITICAL TESTS FAILED');
    console.log('⚠️  Please review the errors above');
    process.exit(1);
  }
}

// Check if backend is running
async function checkBackend() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main
(async () => {
  console.log('Checking if backend is running...');
  const backendRunning = await checkBackend();

  if (!backendRunning) {
    console.error('❌ Backend is not running!');
    console.error('💡 Please start backend: cd backend && npm start');
    process.exit(1);
  }

  console.log('✅ Backend is running\n');
  await runTests();
})();
