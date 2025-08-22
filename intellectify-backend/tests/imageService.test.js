const path = require('path');
const imageService = require('../src/services/imageService');

describe('ImageService', () => {
  const testFile = {
    buffer: Buffer.from('test image content'),
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Validation', () => {
    test('should validate file type', () => {
      const invalidFile = { ...testFile, mimetype: 'text/plain' };
      expect(() => imageService.validateFile(invalidFile)).toThrow('Invalid file type. Only images are allowed');
    });

    test('should validate file size', () => {
      const largeFile = { ...testFile, size: 10 * 1024 * 1024 };
      expect(() => imageService.validateFile(largeFile)).toThrow('File size exceeds the maximum allowed size of 5MB');
    });

    test('should generate unique filenames', () => {
      const filename1 = imageService.generateUniqueFilename('test.jpg');
      const filename2 = imageService.generateUniqueFilename('test.jpg');
      
      expect(filename1).not.toBe(filename2);
      // Check for format: sanitizedBaseName-timestamp-randomString.extension
      expect(filename1).toMatch(/^[a-z0-9-]+\d+-[a-f0-9]+\.jpg$/i);
    });
  });

  describe('MIME Type Handling', () => {
    test('should get correct MIME type from extension', () => {
      expect(imageService.getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
      expect(imageService.getMimeTypeFromExtension('.JPG')).toBe('image/jpeg');
      expect(imageService.getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(imageService.getMimeTypeFromExtension('.gif')).toBe('image/gif');
      expect(imageService.getMimeTypeFromExtension('.webp')).toBe('image/webp');
      expect(imageService.getMimeTypeFromExtension('.txt')).toBe('application/octet-stream');
    });
  });
});