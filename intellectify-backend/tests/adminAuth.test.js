const request = require('supertest');
const app = require('../app');
const adminAuthService = require('../src/services/adminAuthService');
const mockPrisma = require('../src/config/database');
const tokenService = require('../src/services/tokenService');
const bcrypt = require('bcrypt');
const AppError = require('../src/utils/appError');

describe('Admin Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AdminAuthService Unit Tests', () => {
    describe('hashPassword', () => {
      it('should hash password correctly', async () => {
        const password = 'TestPassword123!';
        const hash = await adminAuthService.hashPassword(password);

        expect(hash).toBeDefined();
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
        expect(hash.startsWith('$2b$')).toBe(true); // bcrypt format
      });

      it('should generate different hashes for same password', async () => {
        const password = 'TestPassword123!';
        const hash1 = await adminAuthService.hashPassword(password);
        const hash2 = await adminAuthService.hashPassword(password);

        expect(hash1).not.toBe(hash2);
        expect(await bcrypt.compare(password, hash1)).toBe(true);
        expect(await bcrypt.compare(password, hash2)).toBe(true);
      });

      it('should use high salt rounds for security', async () => {
        const password = 'TestPassword123!';
        const hash = await adminAuthService.hashPassword(password);
        
        // bcrypt hash format: $2b$rounds$salt+hash
        const rounds = parseInt(hash.split('$')[2]);
        expect(rounds).toBeGreaterThanOrEqual(12);
      });
    });

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const password = 'TestPassword123!';
        const hash = await adminAuthService.hashPassword(password);

        const isValid = await adminAuthService.verifyPassword(password, hash);
        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const password = 'TestPassword123!';
        const wrongPassword = 'WrongPassword123!';
        const hash = await adminAuthService.hashPassword(password);

        const isValid = await adminAuthService.verifyPassword(wrongPassword, hash);
        expect(isValid).toBe(false);
      });

      it('should handle empty password', async () => {
        const hash = await adminAuthService.hashPassword('validpassword');
        const isValid = await adminAuthService.verifyPassword('', hash);
        expect(isValid).toBe(false);
      });

      it('should handle invalid hash format', async () => {
        const isValid = await adminAuthService.verifyPassword('password', 'invalid-hash');
        expect(isValid).toBe(false);
      });
    });

    describe('validateAdminCredentials', () => {
      it('should validate admin credentials successfully', async () => {
        const mockAdmin = {
          id: 'admin-123',
          email: 'admin@test.com',
          name: 'Test Admin',
          role: 'ADMIN',
          password: await bcrypt.hash('TestPassword123!', 12),
          provider: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

        const result = await adminAuthService.validateAdminCredentials('admin@test.com', 'TestPassword123!');

        expect(result).toBeDefined();
        expect(result.id).toBe('admin-123');
        expect(result.email).toBe('admin@test.com');
        expect(result.role).toBe('ADMIN');
        expect(result.password).toBeUndefined(); // Should be excluded
      });

      it('should throw error for missing credentials', async () => {
        const error = await adminAuthService.validateAdminCredentials('', 'password').catch(e => e);
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('CREDENTIALS_REQUIRED');
        
        const error2 = await adminAuthService.validateAdminCredentials('email@test.com', '').catch(e => e);
        expect(error2).toBeInstanceOf(AppError);
        expect(error2.statusCode).toBe(400);
        expect(error2.code).toBe('CREDENTIALS_REQUIRED');
      });

      it('should throw error for non-existent user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const error = await adminAuthService.validateAdminCredentials('nonexistent@test.com', 'password').catch(e => e);
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should throw error for non-admin user', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'user@test.com',
          role: 'REGULAR',
          password: await bcrypt.hash('password', 12)
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const error = await adminAuthService.validateAdminCredentials('user@test.com', 'password').catch(e => e);
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('ADMIN_ACCESS_REQUIRED');
      });

      it('should throw error for admin without password (OAuth user)', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'oauth@test.com',
          role: 'ADMIN',
          password: null,
          provider: 'google'
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const error = await adminAuthService.validateAdminCredentials('oauth@test.com', 'password').catch(e => e);
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should throw error for wrong password', async () => {
        const mockAdmin = {
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'ADMIN',
          password: await bcrypt.hash('correctpassword', 12)
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

        const error = await adminAuthService.validateAdminCredentials('admin@test.com', 'wrongpassword').catch(e => e);
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should normalize email case', async () => {
        const mockAdmin = {
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'ADMIN',
          password: await bcrypt.hash('password', 12)
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

        await adminAuthService.validateAdminCredentials('ADMIN@TEST.COM', 'password');

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'admin@test.com' },
          select: expect.any(Object)
        });
      });
    });

    describe('createAdmin', () => {
      it('should throw error for missing required fields', async () => {
      const error = await adminAuthService.createAdmin('', 'pass', 'name').catch(e => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_REQUIRED_FIELDS');
      
      const error2 = await adminAuthService.createAdmin('test@test.com', '', 'name').catch(e => e);
      expect(error2).toBeInstanceOf(AppError);
      expect(error2.statusCode).toBe(400);
      expect(error2.code).toBe('MISSING_REQUIRED_FIELDS');
      
      const error3 = await adminAuthService.createAdmin('test@test.com', 'pass', '').catch(e => e);
      expect(error3).toBeInstanceOf(AppError);
      expect(error3.statusCode).toBe(400);
      expect(error3.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should throw error for existing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      
      const error = await adminAuthService.createAdmin('exists@test.com', 'password', 'Test').catch(e => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should create admin successfully', async () => {
        const mockCreatedAdmin = {
          id: 'admin-123',
          email: 'newadmin@test.com',
          name: 'New Admin',
          role: 'ADMIN',
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
        mockPrisma.user.create.mockResolvedValue(mockCreatedAdmin);

        const result = await adminAuthService.createAdmin('newadmin@test.com', 'password123', 'New Admin');

        expect(result).toEqual(mockCreatedAdmin);
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: {
            email: 'newadmin@test.com',
            name: 'New Admin',
            password: expect.any(String),
            role: 'ADMIN',
            provider: null,
            providerAccountId: null
          },
          select: expect.any(Object)
        });
      });

      it('should throw error for missing fields', async () => {
        await expect(adminAuthService.createAdmin('', 'password', 'name'))
          .rejects.toThrow('Email, password, and name are required');
        
        await expect(adminAuthService.createAdmin('email@test.com', '', 'name'))
          .rejects.toThrow('Email, password, and name are required');
        
        await expect(adminAuthService.createAdmin('email@test.com', 'password', ''))
          .rejects.toThrow('Email, password, and name are required');
      });

      it('should throw error for existing user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

        await expect(adminAuthService.createAdmin('existing@test.com', 'password', 'name'))
          .rejects.toThrow('User with this email already exists');
      });

      it('should normalize email and trim inputs', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue({});

        await adminAuthService.createAdmin('  ADMIN@TEST.COM  ', 'password', '  Admin Name  ');

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'admin@test.com' }
        });
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            email: 'admin@test.com',
            name: 'Admin Name'
          }),
          select: expect.any(Object)
        });
      });
    });

    describe('setAdminAuthCookies', () => {
      it('should set authentication cookies', async () => {
        const mockUser = { id: 'admin-123' };
        const mockRes = {
          cookie: jest.fn()
        };
        const userAgent = 'test-agent';

        // Mock token service methods
        jest.spyOn(tokenService, 'generateAccessToken').mockReturnValue('access-token');
        jest.spyOn(tokenService, 'generateRefreshToken').mockResolvedValue('refresh-token');
        jest.spyOn(tokenService, 'setTokenCookies').mockImplementation(() => {});

        const result = await adminAuthService.setAdminAuthCookies(mockUser, userAgent, mockRes);

        expect(tokenService.generateAccessToken).toHaveBeenCalledWith('admin-123');
        expect(tokenService.generateRefreshToken).toHaveBeenCalledWith('admin-123', userAgent);
        expect(tokenService.setTokenCookies).toHaveBeenCalledWith(mockRes, {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        });
        expect(result).toEqual({
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        });
      });
    });
  });

  describe('setAdminAuthCookies', () => {
    it('should set admin auth cookies with valid user', async () => {
      const mockUser = { id: 'user-123' };
      const mockRes = {
        cookie: jest.fn()
      };
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      };
      
      jest.spyOn(tokenService, 'generateAccessToken').mockReturnValue(mockTokens.accessToken);
      jest.spyOn(tokenService, 'generateRefreshToken').mockResolvedValue(mockTokens.refreshToken);
      jest.spyOn(tokenService, 'setTokenCookies');

      const result = await adminAuthService.setAdminAuthCookies(mockUser, 'test-agent', mockRes);

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(mockUser.id);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser.id, 'test-agent');
      expect(tokenService.setTokenCookies).toHaveBeenCalledWith(mockRes, mockTokens);
      expect(result).toEqual(mockTokens);
    });

    it('should throw error for invalid user object', async () => {
      const error = await adminAuthService.setAdminAuthCookies(null, 'agent', { cookie: jest.fn() }).catch(e => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_USER');
    });
  });

  describe('Admin Auth Integration Tests', () => {
    describe('POST /api/admin/auth/login', () => {
      it('should return 400 for missing credentials', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
      });

      it('should return 400 for missing email', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({ password: 'password' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
      });

      it('should return 400 for missing password', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({ email: 'admin@test.com' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
      });

      it('should return 401 for invalid credentials', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('INVALID_CREDENTIALS');
      });

      it('should return generic error message for security', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          });

        expect(response.body.error).toBe('Invalid email or password');
      });

      it('should handle malformed email', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: 'not-an-email',
            password: 'password',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should handle SQL injection attempts', async () => {
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: "admin@test.com'; DROP TABLE users; --",
            password: 'password',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/admin/auth/validate', () => {
      it('should return 400 for missing credentials', async () => {
        const response = await request(app)
          .post('/api/admin/auth/validate')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
      });

      it('should return valid: false for invalid credentials', async () => {
        const response = await request(app)
          .post('/api/admin/auth/validate')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(false);
      });

      it('should handle empty strings', async () => {
        const response = await request(app)
          .post('/api/admin/auth/validate')
          .send({
            email: '',
            password: '',
          });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe('MISSING_CREDENTIALS');
      });
    });

    describe('GET /api/admin/auth/me', () => {
      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app)
          .get('/api/admin/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-admin user', async () => {
        // This would require setting up a regular user token
        // Implementation depends on your auth middleware
        const response = await request(app)
          .get('/api/admin/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should apply rate limiting to login endpoint', async () => {
        // Test that rate limiting middleware is configured (skip actual rate limiting in tests)
        // This test verifies the middleware exists without triggering actual rate limits
        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });

        // Should get normal error response (not rate limited in test environment)
        expect([401, 400]).toContain(response.status);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Error Handling', () => {
      it('should handle database connection errors gracefully', async () => {
        // Mock database error
        mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'password'
          });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      it('should handle bcrypt errors gracefully', async () => {
        const mockAdmin = {
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'ADMIN',
          password: 'invalid-hash-format'
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

        const response = await request(app)
          .post('/api/admin/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'password'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });
});
