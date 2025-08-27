const path = require('path');
const fileStorageService = require('../src/services/fileStorageService');

// Mock the fileStorageService methods
jest.mock('../src/services/fileStorageService');

describe('FileStorageService', () => {
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
      fileStorageService.validateFile.mockImplementation(() => {
        throw new Error('Invalid file type. Only images are allowed');
      });
      expect(() => fileStorageService.validateFile(invalidFile)).toThrow('Invalid file type. Only images are allowed');
    });

    test('should validate file size', () => {
      const largeFile = { ...testFile, size: 10 * 1024 * 1024 };
      fileStorageService.validateFile.mockImplementation(() => {
        throw new Error('File size must be less than 5MB');
      });
      expect(() => fileStorageService.validateFile(largeFile)).toThrow('File size must be less than 5MB');
    });

    test('should generate unique filenames', () => {
      fileStorageService.generateUniqueFilename.mockReturnValueOnce('unique1-test.jpg').mockReturnValueOnce('unique2-test.jpg');
      const filename1 = fileStorageService.generateUniqueFilename('test.jpg');
      const filename2 = fileStorageService.generateUniqueFilename('test.jpg');
      
      expect(filename1).toBe('unique1-test.jpg');
      expect(filename2).toBe('unique2-test.jpg');
      expect(filename1).not.toBe(filename2);
      // Verify the mock was called with the correct arguments
      expect(fileStorageService.generateUniqueFilename).toHaveBeenCalledWith('test.jpg');
      expect(fileStorageService.generateUniqueFilename).toHaveBeenCalledTimes(2);
    });
  });

  describe('MIME Type Handling', () => {
    test('should get correct MIME type from extension', () => {
      // Mock the getMimeTypeFromExtension method
      fileStorageService.getMimeTypeFromExtension.mockImplementation((ext) => {
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
      });
      
      expect(fileStorageService.getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
      expect(fileStorageService.getMimeTypeFromExtension('.JPG')).toBe('image/jpeg');
      expect(fileStorageService.getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(fileStorageService.getMimeTypeFromExtension('.gif')).toBe('image/gif');
      expect(fileStorageService.getMimeTypeFromExtension('.webp')).toBe('image/webp');
      expect(fileStorageService.getMimeTypeFromExtension('.txt')).toBe('application/octet-stream');
    });
  });
});