const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const tokenService = require('../src/services/tokenService');
const prisma = require('../src/config/database');
const { jwtAccessSecret, jwtRefreshSecret } = require('../src/config/oauth');
const AppError = require('../src/utils/appError');

// Mock Prisma client
jest.mock('../src/config/database');

// Mock JWT module
jest.mock('jsonwebtoken');

/**
 * Backend Authentication Tests
 * 
 * Tests for the cookie-based authentication system migration.
 * Verifies all critical backend fixes are working correctly.
 */

describe('Authentication System Tests', () => {
  
  describe('Token Service Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('generateAccessToken', () => {
      it('should generate access token with correct payload and options', () => {
        const userId = 'test-user-id';
        const mockToken = 'mock.access.token';
        
        jwt.sign.mockReturnValue(mockToken);
        
        const token = tokenService.generateAccessToken(userId);
        
        expect(token).toBe(mockToken);
        expect(jwt.sign).toHaveBeenCalledWith(
          { userId },
          jwtAccessSecret,
          { expiresIn: '15m' }
        );
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate and store refresh token', async () => {
        const userId = 'test-user-id';
        const userAgent = 'test-agent';
        const mockToken = 'mock.refresh.token';
        const hashedToken = 'hashedToken123';
        
        // Mock JWT sign
        jwt.sign.mockReturnValue(mockToken);
        
        // Mock crypto hash
        const mockHash = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue(hashedToken)
        };
        const createHashSpy = jest.spyOn(require('crypto'), 'createHash')
          .mockReturnValue(mockHash);
        
        // Mock Prisma
        prisma.refreshToken.create.mockResolvedValue({ id: 'token-123' });
        
        const token = await tokenService.generateRefreshToken(userId, userAgent);
        
        expect(token).toBe(mockToken);
        expect(jwt.sign).toHaveBeenCalledWith(
          { userId },
          jwtRefreshSecret,
          { expiresIn: '7d' }
        );
        
        expect(createHashSpy).toHaveBeenCalledWith('sha256');
        expect(mockHash.update).toHaveBeenCalledWith(mockToken);
        expect(mockHash.digest).toHaveBeenCalledWith('hex');
        
        expect(prisma.refreshToken.create).toHaveBeenCalledWith({
          data: {
            token: hashedToken,
            userId,
            userAgent,
            expiresAt: expect.any(Date)
          }
        });
      });
    });

    describe('verifyAccessToken', () => {
      it('should verify valid access token', () => {
        const token = 'valid.token.here';
        const decoded = { userId: 'user-123' };
        
        jwt.verify.mockReturnValue(decoded);
        
        const result = tokenService.verifyAccessToken(token);
        
        expect(result).toEqual(decoded);
        expect(jwt.verify).toHaveBeenCalledWith(token, jwtAccessSecret);
      });
      
      it('should return null for invalid token', () => {
        jwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        const result = tokenService.verifyAccessToken('invalid.token');
        
        expect(result).toBeNull();
      });
    });
    
    describe('verifyRefreshToken', () => {
      it('should verify valid refresh token', async () => {
        const token = 'valid.refresh.token';
        const hashedToken = 'hashedToken123';
        const decoded = { userId: 'user-123' };
        const storedToken = { id: 'token-123', userId: 'user-123' };
        
        // Mock JWT verify
        jwt.verify.mockReturnValue(decoded);
        
        // Mock crypto hash
        const mockHash = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue(hashedToken)
        };
        jest.spyOn(require('crypto'), 'createHash')
          .mockReturnValue(mockHash);
        
        // Mock Prisma
        prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
        
        const result = await tokenService.verifyRefreshToken(token);
        
        expect(result).toEqual(decoded);
        expect(jwt.verify).toHaveBeenCalledWith(token, jwtRefreshSecret);
        expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
          where: {
            token: hashedToken,
            userId: decoded.userId,
            expiresAt: { gt: expect.any(Date) },
            revokedAt: null
          }
        });
      });
      
      it('should return null for invalid token', async () => {
        jwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        const result = await tokenService.verifyRefreshToken('invalid.token');
        
        expect(result).toBeNull();
        expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
      });
      
      it('should return null for non-existent token in database', async () => {
        const token = 'valid.but.not.in.db';
        const decoded = { userId: 'user-123' };
        
        jwt.verify.mockReturnValue(decoded);
        prisma.refreshToken.findFirst.mockResolvedValue(null);
        
        const result = await tokenService.verifyRefreshToken(token);
        
        expect(result).toBeNull();
      });
    });
    
    describe('revokeSpecificToken', () => {
      it('should revoke a specific token', async () => {
        const token = 'token.to.revoke';
        const userId = 'user-123';
        
        await tokenService.revokeSpecificToken(token, userId);
        
        expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
          where: {
            token: expect.any(String),
            userId,
            revokedAt: null
          },
          data: {
            revokedAt: expect.any(Date)
          }
        });
      });
    });
    
    describe('revokeAllUserTokens', () => {
      it('should revoke all tokens for a user', async () => {
        const userId = 'user-123';
        
        await tokenService.revokeAllUserTokens(userId);
        
        expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
          where: {
            userId,
            revokedAt: null
          },
          data: {
            revokedAt: expect.any(Date)
          }
        });
      });
    });
  });

  describe('CORS Configuration Tests', () => {
    const testCases = [
      { origin: 'http://localhost:5173', allowed: true },
      { origin: 'http://127.0.0.1:5173', allowed: true },
      { origin: 'http://localhost:3000', allowed: true },
      { origin: 'http://malicious-site.com', allowed: false },
      { origin: 'https://intellectify.app', allowed: true },
      { origin: 'https://app.intellectify.app', allowed: true },
      { origin: 'https://malicious.intellectify.app', allowed: false },
      { origin: 'http://localhost:1234', allowed: false },
      { origin: 'http://192.168.1.100:3000', allowed: true },
    ];

    testCases.forEach(({ origin, allowed }) => {
      it(`${allowed ? 'should allow' : 'should reject'} requests from ${origin}`, async () => {
        const response = await request(app)
          .options('/api/auth/me')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET');
        
        if (allowed) {
          expect(response.status).toBe(204);
          expect(response.headers['access-control-allow-origin']).toBe(origin);
          expect(response.headers['access-control-allow-credentials']).toBe('true');
        } else {
          // Should either be a CORS error (500) or not include CORS headers
          expect(
            response.status === 500 || 
            !response.headers['access-control-allow-origin']
          ).toBe(true);
        }
      });
    });
  });

  describe('Authentication Endpoints Tests', () => {
    let mockUser;
    let mockTokens;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER'
      };
      
      mockTokens = {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token'
      };
      
      // Mock token verification
      jwt.verify.mockImplementation((token) => {
        if (token === mockTokens.accessToken) {
          return { userId: mockUser.id };
        }
        if (token === mockTokens.refreshToken) {
          return { userId: mockUser.id };
        }
        throw new Error('Invalid token');
      });
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
    
    test('GET /api/auth/google/callback should redirect with error when code is missing', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback')
        .redirects(0); // Prevent automatic redirect following
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('http://localhost:5173/auth/github/callback?error=Authorization%20code%20is%20required');
    });

    test('GET /api/auth/github/callback should redirect with error when code is missing', async () => {
      const response = await request(app)
        .get('/api/auth/github/callback')
        .redirects(0); // Prevent automatic redirect following
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('http://localhost:5173/auth/github/callback?error=Authorization%20code%20is%20required');
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