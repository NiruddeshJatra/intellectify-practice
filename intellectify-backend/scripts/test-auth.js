#!/usr/bin/env node

/**
 * Manual Authentication Testing Script
 * 
 * This script tests the backend authentication fixes manually.
 * Run with: node scripts/test-auth.js
 */

const axios = require('axios');
const { generateAccessToken, generateRefreshToken } = require('../src/services/tokenService');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test configuration
const TEST_USER_ID = 'test-user-123';
const TEST_USER_AGENT = 'test-script/1.0';

console.log('🧪 Starting Backend Authentication Tests...\n');

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await axios.get(BASE_URL);
    console.log('✅ Health check passed');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Environment: ${response.data.environment}\n`);
  } catch (error) {
    console.log('❌ Health check failed');
    console.log(`   Error: ${error.message}\n`);
  }
}

/**
 * Test 2: CORS Configuration
 */
async function testCORS() {
  console.log('2️⃣ Testing CORS Configuration...');
  try {
    // Test preflight request
    const response = await axios.options(`${API_URL}/auth/me`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('✅ CORS preflight passed');
    console.log(`   Status: ${response.status}\n`);
  } catch (error) {
    console.log('❌ CORS test failed');
    console.log(`   Error: ${error.message}\n`);
  }
}

/**
 * Test 3: Authentication Endpoints
 */
async function testAuthEndpoints() {
  console.log('3️⃣ Testing Authentication Endpoints...');
  
  // Test /me endpoint without token
  try {
    await axios.get(`${API_URL}/auth/me`);
    console.log('❌ /me endpoint should require authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ /me endpoint properly requires authentication');
      console.log(`   Error code: ${error.response.data.code}`);
    } else {
      console.log('❌ Unexpected error on /me endpoint');
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test refresh token endpoint without token
  try {
    await axios.post(`${API_URL}/auth/refresh-token`);
    console.log('❌ Refresh endpoint should require token');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Refresh endpoint properly requires token');
    } else {
      console.log('❌ Unexpected error on refresh endpoint');
    }
  }

  // Test logout endpoint without token
  try {
    await axios.post(`${API_URL}/auth/logout`);
    console.log('❌ Logout endpoint should require authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Logout endpoint properly requires authentication');
    } else {
      console.log('❌ Unexpected error on logout endpoint');
    }
  }

  console.log();
}

/**
 * Test 4: OAuth Callback Endpoints
 */
async function testOAuthCallbacks() {
  console.log('4️⃣ Testing OAuth Callback Endpoints...');
  
  // Test Google callback without code
  try {
    await axios.get(`${API_URL}/auth/google/callback`);
    console.log('❌ Google callback should require code');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Google callback properly requires code parameter');
    } else {
      console.log('❌ Unexpected error on Google callback');
    }
  }

  // Test GitHub callback without code
  try {
    await axios.get(`${API_URL}/auth/github/callback`);
    console.log('❌ GitHub callback should require code');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ GitHub callback properly requires code parameter');
    } else {
      console.log('❌ Unexpected error on GitHub callback');
    }
  }

  console.log();
}

/**
 * Test 5: Token Service Functions
 */
async function testTokenService() {
  console.log('5️⃣ Testing Token Service Functions...');
  
  try {
    // Test access token generation
    const accessToken = generateAccessToken(TEST_USER_ID);
    if (accessToken && typeof accessToken === 'string') {
      console.log('✅ Access token generation works');
    } else {
      console.log('❌ Access token generation failed');
    }

    // Test refresh token generation (requires database and valid user)
    try {
      const refreshToken = await generateRefreshToken(TEST_USER_ID, TEST_USER_AGENT);
      if (refreshToken && typeof refreshToken === 'string') {
        console.log('✅ Refresh token generation works');
      } else {
        console.log('❌ Refresh token generation failed');
      }
    } catch (error) {
      if (error.message.includes('Foreign key constraint')) {
        console.log('⚠️  Refresh token generation requires valid user in database');
        console.log('   Create a test user first or use existing user ID');
      } else if (error.message.includes('database')) {
        console.log('⚠️  Refresh token generation requires database connection');
      } else {
        console.log('❌ Refresh token generation failed');
        console.log(`   Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.log('❌ Token service test failed');
    console.log(`   Error: ${error.message}`);
  }

  console.log();
}

/**
 * Test 6: Error Handling
 */
async function testErrorHandling() {
  console.log('6️⃣ Testing Error Handling...');
  
  try {
    await axios.get(`${API_URL}/nonexistent-endpoint`);
    console.log('❌ Should return 404 for nonexistent endpoints');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Proper 404 handling for nonexistent endpoints');
      console.log(`   Error format: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log('❌ Unexpected error handling');
    }
  }

  console.log();
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testHealthCheck();
    await testCORS();
    await testAuthEndpoints();
    await testOAuthCallbacks();
    await testTokenService();
    await testErrorHandling();
    
    console.log('🎉 Backend authentication tests completed!');
    console.log('\n📋 Manual Tests Still Needed:');
    console.log('   • Complete OAuth flow with real Google/GitHub credentials');
    console.log('   • Verify HTTP-only cookies are set correctly');
    console.log('   • Test token rotation with database');
    console.log('   • Test logout with cookie clearing');
    console.log('   • Test from actual frontend application');
    
  } catch (error) {
    console.log('💥 Test suite failed');
    console.log(`   Error: ${error.message}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testHealthCheck,
  testCORS,
  testAuthEndpoints,
  testOAuthCallbacks,
  testTokenService,
  testErrorHandling
};