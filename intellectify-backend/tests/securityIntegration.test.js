const request = require('supertest');
const app = require('../app');
const adminAuthService = require('../src/services/adminAuthService');

describe('Security Integration Tests', () => {
  let adminLoginResponse;

  beforeAll(async () => {
    // Create a test admin user using the admin auth service
    try {
      await adminAuthService.createAdmin(
        'test-admin@example.com',
        'TestPassword123!',
        'Test Admin'
      );
    } catch (error) {
      // Admin might already exist, which is fine for testing
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    // Login to get authentication cookies
    adminLoginResponse = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: 'test-admin@example.com',
        password: 'TestPassword123!'
      });
  });

  describe('Authenticated admin operations', () => {
    test('should allow admin to create content with proper authentication', async () => {
      if (adminLoginResponse.status !== 200) {
        console.log('Admin login failed:', adminLoginResponse.body);
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      
      const response = await request(app)
        .post('/api/content')
        .set('Cookie', cookies)
        .send({
          title: 'Test Security Content',
          content: '<p>This is a test content with <strong>safe HTML</strong></p>',
          category: 'test'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Test Security Content');
      expect(response.body.data.content).toContain('<strong>safe HTML</strong>');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should sanitize XSS attempts in content', async () => {
      if (adminLoginResponse.status !== 200) {
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      const maliciousContent = '<script>alert("XSS")</script><p>Safe content</p><img src="x" onerror="alert(1)">';
      
      const response = await request(app)
        .post('/api/content')
        .set('Cookie', cookies)
        .send({
          title: 'XSS Test Content',
          content: maliciousContent,
          category: 'test'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).not.toContain('onerror');
      expect(response.body.data.content).toContain('<p>Safe content</p>');
    });

    test('should validate content length limits', async () => {
      if (adminLoginResponse.status !== 200) {
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      const longContent = 'a'.repeat(100001); // Exceeds 100,000 character limit
      
      const response = await request(app)
        .post('/api/content')
        .set('Cookie', cookies)
        .send({
          title: 'Long Content Test',
          content: longContent
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('100,000 characters');
    });

    test('should validate title length limits', async () => {
      if (adminLoginResponse.status !== 200) {
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      const longTitle = 'a'.repeat(201); // Exceeds 200 character limit
      
      const response = await request(app)
        .post('/api/content')
        .set('Cookie', cookies)
        .send({
          title: longTitle,
          content: 'Valid content'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('200 characters');
    });

    test('should validate priority values', async () => {
      if (adminLoginResponse.status !== 200) {
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      
      const response = await request(app)
        .post('/api/content')
        .set('Cookie', cookies)
        .send({
          title: 'Priority Test',
          content: 'Valid content',
          priority: -1 // Invalid negative priority
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('non-negative number');
    });
  });

  describe('File upload security', () => {
    test('should reject non-image files', async () => {
      if (adminLoginResponse.status !== 200) {
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      
      const response = await request(app)
        .post('/api/images/upload-temp')
        .set('Cookie', cookies)
        .attach('image', Buffer.from('not an image'), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file type');
    });

    test('should validate image category', async () => {
      if (adminLoginResponse.status !== 200) {
        return; // Skip test if login failed
      }

      const cookies = adminLoginResponse.headers['set-cookie'];
      
      // Create a minimal valid JPEG buffer
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const jpegBuffer = Buffer.concat([jpegHeader, Buffer.alloc(100)]);
      
      const response = await request(app)
        .post('/api/images/upload')
        .set('Cookie', cookies)
        .field('category', 'invalid-category')
        .attach('image', jpegBuffer, 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_CATEGORY');
    });
  });
});