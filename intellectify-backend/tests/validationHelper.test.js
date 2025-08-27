const ValidationHelper = require('../src/utils/ValidationHelper');

describe('ValidationHelper', () => {
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(ValidationHelper.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.example.com',
        '',
        null,
        undefined
      ];

      invalidEmails.forEach(email => {
        expect(ValidationHelper.isValidEmail(email)).toBe(false);
      });
    });

    it('should handle email with whitespace', () => {
      expect(ValidationHelper.isValidEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('validateStringLength', () => {
    it('should validate string within length limits', () => {
      const result = ValidationHelper.validateStringLength('Hello', 1, 10);
      
      expect(result).toEqual({
        isValid: true
      });
    });

    it('should reject string too short', () => {
      const result = ValidationHelper.validateStringLength('Hi', 5, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'String must be at least 5 characters long'
      });
    });

    it('should reject string too long', () => {
      const result = ValidationHelper.validateStringLength('This is a very long string', 1, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'String must be no more than 10 characters long'
      });
    });

    it('should reject non-string values', () => {
      const result = ValidationHelper.validateStringLength(123, 1, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'Value must be a string'
      });
    });

    it('should trim whitespace when checking length', () => {
      const result = ValidationHelper.validateStringLength('  Hi  ', 1, 5);
      
      expect(result).toEqual({
        isValid: true
      });
    });
  });

  describe('validateNumberRange', () => {
    it('should validate number within range', () => {
      const result = ValidationHelper.validateNumberRange(5, 1, 10);
      
      expect(result).toEqual({
        isValid: true
      });
    });

    it('should reject number too small', () => {
      const result = ValidationHelper.validateNumberRange(0, 1, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'Number must be at least 1'
      });
    });

    it('should reject number too large', () => {
      const result = ValidationHelper.validateNumberRange(15, 1, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'Number must be no more than 10'
      });
    });

    it('should reject non-number values', () => {
      const result = ValidationHelper.validateNumberRange('not-a-number', 1, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'Value must be a valid number'
      });
    });

    it('should reject NaN', () => {
      const result = ValidationHelper.validateNumberRange(NaN, 1, 10);
      
      expect(result).toEqual({
        isValid: false,
        error: 'Value must be a valid number'
      });
    });
  });

  describe('isValidSlug', () => {
    it('should validate correct slug formats', () => {
      const validSlugs = [
        'hello-world',
        'test-123',
        'simple-slug',
        'a'
      ];

      validSlugs.forEach(slug => {
        expect(ValidationHelper.isValidSlug(slug)).toBe(true);
      });
    });

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Hello World', // spaces
        'test_slug', // underscores
        '-hello', // starts with hyphen
        'hello-', // ends with hyphen
        'hello--world', // double hyphens
        '',
        null,
        undefined
      ];

      invalidSlugs.forEach(slug => {
        expect(ValidationHelper.isValidSlug(slug)).toBe(false);
      });
    });
  });

  describe('validateContentTitle', () => {
    it('should validate clean title', () => {
      const result = ValidationHelper.validateContentTitle('My Great Article');
      
      expect(result).toEqual({
        isValid: true
      });
    });

    it('should reject title with HTML', () => {
      const result = ValidationHelper.validateContentTitle('My <script>alert("xss")</script> Article');
      
      expect(result).toEqual({
        isValid: false,
        error: 'Title contains invalid characters'
      });
    });

    it('should reject empty title', () => {
      const result = ValidationHelper.validateContentTitle('');
      
      expect(result).toEqual({
        isValid: false,
        error: 'String must be at least 1 characters long'
      });
    });

    it('should reject title too long', () => {
      const longTitle = 'a'.repeat(201);
      const result = ValidationHelper.validateContentTitle(longTitle);
      
      expect(result).toEqual({
        isValid: false,
        error: 'String must be no more than 200 characters long'
      });
    });
  });

  describe('validateContentBody', () => {
    it('should validate content body', () => {
      const result = ValidationHelper.validateContentBody('This is some content');
      
      expect(result).toEqual({
        isValid: true
      });
    });

    it('should reject empty content', () => {
      const result = ValidationHelper.validateContentBody('');
      
      expect(result).toEqual({
        isValid: false,
        error: 'Content body is required'
      });
    });

    it('should reject content too long', () => {
      const longContent = 'a'.repeat(10001);
      const result = ValidationHelper.validateContentBody(longContent);
      
      expect(result).toEqual({
        isValid: false,
        error: 'String must be no more than 10000 characters long'
      });
    });
  });

  describe('isValidImageType', () => {
    it('should validate correct image types', () => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      validTypes.forEach(type => {
        expect(ValidationHelper.isValidImageType(type)).toBe(true);
      });
    });

    it('should reject invalid image types', () => {
      const invalidTypes = [
        'text/plain',
        'application/pdf',
        'video/mp4',
        'image/bmp',
        ''
      ];

      invalidTypes.forEach(type => {
        expect(ValidationHelper.isValidImageType(type)).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    it('should validate file within size limit', () => {
      const result = ValidationHelper.validateFileSize(1024 * 1024); // 1MB
      
      expect(result).toEqual({
        isValid: true
      });
    });

    it('should reject file too large', () => {
      const result = ValidationHelper.validateFileSize(10 * 1024 * 1024); // 10MB
      
      expect(result).toEqual({
        isValid: false,
        error: 'File size must be less than 5MB'
      });
    });

    it('should reject invalid file size', () => {
      const result = ValidationHelper.validateFileSize(-1);
      
      expect(result).toEqual({
        isValid: false,
        error: 'Invalid file size'
      });
    });

    it('should use custom max size', () => {
      const result = ValidationHelper.validateFileSize(2 * 1024 * 1024, 1024 * 1024); // 2MB with 1MB limit
      
      expect(result).toEqual({
        isValid: false,
        error: 'File size must be less than 1MB'
      });
    });
  });
});