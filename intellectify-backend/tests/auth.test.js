const request = require('supertest');
const app = require('../app');
const tokenService = require('../src/services/tokenService');

/**
 * Backend Authentication Tests
 * 
 * Tests for the cookie-based authentication system migration.
 * Verifies all critical backend fixes are working correctly.
 */

describe('Authentication System Tests', () => {
  
  describe('Token Service Tests', () => {
    
    test('should generate access token', () => {
      const userId = 'test-user-id';
      const token = tokenService.generateAccessToken(userId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    test('should generate refresh token', async () => {
      const userId = 'test-user-id';
      const userAgent = 'test-agent';
      
      const token = await tokenService.generateRefreshToken(userId, userAgent);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    test('should verify refresh token structure', async () => {
      const userId = 'test-user-id';
      const userAgent = 'test-agent';
      
      // Test token generation structure
      const token = await tokenService.generateRefreshToken(userId, userAgent);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify it looks like a JWT (has 3 parts separated by dots)
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
  });

  describe('CORS Configuration Tests', () => {
    
    test('should allow requests from localhost:5173', async () => {
      const response = await request(app)
        .options('/api/auth/me')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
    });

    test('should allow requests from 127.0.0.1:5173', async () => {
      const response = await request(app)
        .options('/api/auth/me')
        .set('Origin', 'http://127.0.0.1:5173')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
    });

    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .options('/api/auth/me')
        .set('Origin', 'http://malicious-site.com')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(500); // CORS error
    });
  });

  describe('Authentication Endpoints Tests', () => {
    
    test('GET /api/auth/me should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_TOKEN');
    });

    test('POST /api/auth/logout should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/auth/refresh-token should handle missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No refresh token provided');
    });

    test('POST /api/auth/google-one-tap should require credential', async () => {
      const response = await request(app)
        .post('/api/auth/google-one-tap')
        .send({});
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('OAuth Callback Tests', () => {
    
    test('GET /api/auth/google/callback should require code parameter', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization code is required');
    });

    test('GET /api/auth/github/callback should require code parameter', async () => {
      const response = await request(app)
        .get('/api/auth/github/callback');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization code is required');
    });
  });

  describe('Error Handling Tests', () => {
    
    test('should handle 404 routes properly', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
    });

    test('should return proper error format', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check Tests', () => {
    
    test('GET / should return API status', async () => {
      const response = await request(app)
        .get('/');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Intellectify API');
      expect(response.body.status).toBe('running');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});

/**
 * Manual Test Instructions
 * 
 * These tests require manual verification or a full test environment:
 * 
 * 1. Token Rotation Test:
 *    - Create a user and generate refresh token
 *    - Call /api/auth/refresh-token
 *    - Verify old token is revoked and new token works
 * 
 * 2. Cookie Setting Test:
 *    - Complete OAuth flow
 *    - Verify HTTP-only cookies are set
 *    - Verify cookie security flags (secure, sameSite)
 * 
 * 3. Logout Test:
 *    - Login and get cookies
 *    - Call /api/auth/logout
 *    - Verify cookies are cleared and tokens revoked
 * 
 * 4. CORS Test:
 *    - Test from actual frontend at localhost:5173
 *    - Verify credentials are included in requests
 *    - Test preflight OPTIONS requests
 * 
 * 5. OAuth Integration Test:
 *    - Complete full Google OAuth flow
 *    - Complete full GitHub OAuth flow
 *    - Verify JSON responses instead of redirects
 */