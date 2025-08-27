const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');
const AppError = require('../utils/appError');
const ValidationHelper = require('../utils/validationHelper');

class ImageService {
  constructor() {
    this.baseUploadPath = path.join(process.cwd(), 'uploads', 'content'); // Base directory for permanent images
    this.tempUploadPath = path.join(process.cwd(), 'uploads', 'temp'); // Temporary directory for uploaded images
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
  }

  /**
   * Initialize upload directories
   * @returns {Promise<void>}
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.baseUploadPath, { recursive: true });
      await fs.mkdir(this.tempUploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
      throw new AppError(
        'Failed to initialize upload directories',
        500,
        'UPLOAD_INIT_FAILED'
      );
    }
  }

  /**
   * Validate uploaded file using ValidationHelper
   * @param {Object} file - The uploaded file object
   * @returns {boolean} - True if file is valid, throws error otherwise
   */
  validateFile(file) {
    if (!file) {
      throw new AppError('No file provided', 400, 'NO_FILE');
    }

    // Use ValidationHelper for file type validation
    if (!ValidationHelper.isValidImageType(file.mimetype)) {
      throw new AppError(
        'Invalid file type. Only images are allowed',
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Use ValidationHelper for file size validation
    const sizeValidation = ValidationHelper.validateFileSize(
      file.size,
      this.maxFileSize
    );
    if (!sizeValidation.isValid) {
      throw new AppError(sizeValidation.error, 400, 'FILE_TOO_LARGE');
    }

    return true;
  }

  /**
   * Get MIME type from file extension
   *
   * @param {string} extension - The file extension
   * @returns {string} - The MIME type
   */
  getMimeTypeFromExtension(extension) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Generate a unique filename with timestamp and random string
   * @param {string} originalname - Original filename
   * @returns {string} - Generated unique filename
   */
  generateUniqueFilename(originalFilename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, extension);

    // Sanitize filename
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    return `${sanitizedBaseName}-${timestamp}-${randomString}${extension}`;
  }

  /**
   * Generate organized file path based on category and date
   * Example: general/2025/08/18
   *
   * @param {string} category - The category of the content
   * @param {string} contentId - The ID of the content
   * @returns {string} - The generated file path
   */
  generateImagePath(category = 'GENERAL', contentId = null) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Convert enum to lowercase for path
    const categoryName = typeof category === 'string' ? category : 'GENERAL';
    const sanitizedCategory = categoryName
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special characters with hyphens
      .replace(/_/g, '-') // Convert underscores to hyphens for URL-friendliness
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    if (contentId) {
      return path.join(sanitizedCategory, String(year), month, contentId);
    } else {
      // For temp uploads without contentId, include the category in the path
      return path.join(sanitizedCategory, String(year), month);
    }
  }

  /**
   * Generate public URL for image access
   *
   * @param {string} relativePath - The relative path of the image file
   * @returns {string} - The generated URL
   */
  generateImageUrl(relativePath) {
    // Remove any leading slashes and normalize path separators
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `/api/images/${normalizedPath}`;
  }

  /**
   * Get full file system path from relative path
   *
   * @param {string} relativePath - The relative path of the image file
   * @returns {string} - The full file system path
   */
  getFullImagePath(relativePath) {
    return path.join(this.baseUploadPath, relativePath);
  }

  /**
   * Extract image paths from HTML content
   * @param {string} html - HTML content to parse
   * @returns {string[]} - Array of image paths
   */
  extractImagePaths(html) {
    try {
      if (!html) {
        return [];
      }

      const dom = new JSDOM(html);
      const images = dom.window.document.querySelectorAll('img[src]');
      const imagePaths = [];

      images.forEach((img) => {
        const src = img.getAttribute('src');
        if (!src) {
          return;
        }

        // Handle both /api/images/ prefixed and direct paths
        if (src.startsWith('/api/images/')) {
          const pathMatch = src.match(/^\/api\/images\/(.+)$/);
          if (pathMatch && pathMatch[1]) {
            imagePaths.push(pathMatch[1]);
          }
        } else if (src.startsWith('http') || src.startsWith('/')) {
          // For direct URLs or absolute paths, use as is
          imagePaths.push(src);
        } else if (src.startsWith('uploads/')) {
          // For relative upload paths
          imagePaths.push(src);
        }
      });

      return imagePaths;
    } catch (error) {
      console.error('Error extracting image paths:', error);
      return [];
    }
  }

  /**
   * Save image to organized directory structure
   *
   * @param {Object} file - The uploaded file object with { originalname, buffer, size, mimetype }
   * @param {string} [category='GENERAL'] - The category of the content or 'TEMP' for temporary storage
   * @param {string} [contentId] - The ID of the content (for permanent storage)
   * @returns {Promise<Object>} - The saved image object
   */
  async saveImage(file, category = 'GENERAL', contentId = null) {
    try {
      // Validate file first
      this.validateFile(file);

      // Determine if this is a temporary upload
      const isTemp = category === 'TEMP';

      // Generate appropriate paths
      const relativePath = isTemp
        ? this.generateImagePath('temp')
        : this.generateImagePath(category, contentId);

      const basePath = isTemp ? this.tempUploadPath : this.baseUploadPath;
      const fullDirectoryPath = path.join(basePath, relativePath);

      try {
        // Create directory if it doesn't exist
        await fs.mkdir(fullDirectoryPath, { recursive: true });
      } catch (error) {
        if (error.code === 'EACCES') {
          throw new AppError(
            'Permission denied when creating upload directory',
            500,
            'DIRECTORY_CREATION_ERROR'
          );
        }
        throw error;
      }

      // Generate unique filename
      const uniqueFilename = this.generateUniqueFilename(file.originalname);
      const fullFilePath = path.join(fullDirectoryPath, uniqueFilename);

      try {
        // Save file
        await fs.writeFile(fullFilePath, file.buffer);
      } catch (error) {
        if (error.code === 'ENOSPC') {
          throw new AppError(
            'Not enough disk space to save the file',
            500,
            'INSUFFICIENT_DISK_SPACE'
          );
        }
        throw error;
      }

      // Generate relative path for database storage
      const relativeFilePath = path.join(relativePath, uniqueFilename);

      return {
        filename: uniqueFilename,
        path: relativeFilePath,
        url: this.generateImageUrl(relativeFilePath),
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      console.error('Error saving image:', error);
      // Re-throw the error to be handled by the controller
      throw error;
    }
  }

  /**
   * Check if image file exists
   *
   * @param {string} relativePath - The relative path of the image file
   * @returns {Promise<boolean>} - True if image exists, false otherwise
   */
  async imageExists(relativePath) {
    try {
      const fullPath = this.getFullImagePath(relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Move image from temp to permanent location
   *
   * @param {string} tempPath - The relative path of the temporary image file
   * @param {string} [category='GENERAL'] - The category of the content (must be a valid Category enum value)
   * @param {string} contentId - The ID of the content
   * @returns {Promise<Object>} - The saved image object
   */
  async moveImageFromTemp(tempPath, category = 'GENERAL', contentId) {
    try {
      const tempFullPath = path.join(this.tempUploadPath, tempPath);

      // Check if temp file exists
      if (!(await this.imageExists(path.join('..', 'temp', tempPath)))) {
        throw new AppError(
          'Temporary image file not found',
          404,
          'TEMP_FILE_NOT_FOUND'
        );
      }

      // Read temp file
      const fileBuffer = await fs.readFile(tempFullPath);

      // Create file object for saveImage
      const filename = path.basename(tempPath);
      const stats = await fs.stat(tempFullPath);

      const file = {
        originalname: filename,
        buffer: fileBuffer,
        size: stats.size,
        mimetype: this.getMimeTypeFromExtension(path.extname(filename)),
      };

      // Save to permanent location
      const savedImage = await this.saveImage(file, category, contentId);

      // Delete temp file
      await fs.unlink(tempFullPath);

      return savedImage;
    } catch (error) {
      console.error('Error moving image from temp:', error);
      throw error;
    }
  }

  /**
   * Deletes files or directories at the specified paths
   * @param {string|string[]} paths - Single path or array of paths to delete
   * @param {Object} options - Configuration options
   * @param {boolean} [options.recursive=false] - Whether to delete directories recursively
   * @param {boolean} [options.force=false] - Whether to ignore errors if files don't exist
   * @returns {Promise<Object>} Results of the deletion operation
   */
  async deleteFiles(paths, { recursive = false, force = false } = {}) {
    // Convert single path to array for uniform processing
    const pathsArray = Array.isArray(paths) ? paths : [paths];
    // Initialize result object
    const results = { success: true, deleted: [], errors: [] };

    // Process each path
    for (const filePath of pathsArray) {
      try {
        if (!filePath) {
          continue;
        }

        // Determine full path, handling both temp and base upload paths
        const fullPath =
          filePath.startsWith(this.baseUploadPath) ||
          filePath.startsWith(this.tempUploadPath)
            ? filePath
            : this.getFullImagePath(filePath);

        try {
          const stats = await fs.stat(fullPath);

          // Handle directory deletion
          if (stats.isDirectory()) {
            if (recursive) {
              await fs.rm(fullPath, { recursive: true, force });
            } else {
              await fs.rmdir(fullPath);
            }
          } else {
            // Handle file deletion
            await fs.unlink(fullPath);
          }

          results.deleted.push(filePath);
        } catch (error) {
          // Handle case where file doesn't exist and force is true
          if (error.code === 'ENOENT' && force) {
            results.deleted.push(filePath);
            continue;
          }
          throw error;
        }
      } catch (error) {
        // Record errors but continue processing other paths
        results.success = false;
        results.errors.push({ path: filePath, error });
        console.error(`Error deleting ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Alias for backward compatibility
   * @param {string} relativePath - Path to the image to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(relativePath) {
    const result = await this.deleteFiles(relativePath, { force: true });
    return {
      success: result.errors.length === 0,
      deleted: result.deleted.length > 0,
    };
  }

  /**
   * Clean up all images for a specific content ID
   * @param {string} contentId - The ID of the content
   * @param {string} [category='GENERAL'] - Content category (must be valid Category enum)
   * @returns {Promise<Object>} Deletion results
   */
  async cleanupContentImages(contentId, category = 'GENERAL') {
    // Generate and clean up the content directory
    const contentPath = this.generateImagePath(category, contentId);
    const fullContentPath = path.join(this.baseUploadPath, contentPath);

    const result = await this.deleteFiles(fullContentPath, {
      recursive: true,
      force: true,
    });

    if (result.deleted.length > 0) {
      console.log(`Cleaned up content directory: ${contentPath}`);
    }

    return {
      success: result.errors.length === 0,
      deleted: result.deleted,
      errors: result.errors,
    };
  }

  /**
   * Clean up unused images when content is updated
   * @param {string} oldContent - Previous content HTML
   * @param {string} newContent - New content HTML
   * @returns {Promise<string[]>} Array of deleted image paths
   */
  async cleanupUnusedImages(oldContent, newContent) {
    try {
      // Extract image paths from content
      const oldImages = this.extractImagePaths(oldContent);
      const newImages = this.extractImagePaths(newContent);

      // Find images that were in old content but not in new content
      const imagesToDelete = oldImages.filter(
        (img) => !newImages.includes(img)
      );

      // Delete unused images
      const deleted = [];
      for (const imgPath of imagesToDelete) {
        try {
          await this.deleteImage(imgPath);
          deleted.push(imgPath);
        } catch (error) {
          console.error(`Failed to delete unused image ${imgPath}:`, error);
        }
      }

      return deleted;
    } catch (error) {
      console.error('Error in cleanupUnusedImages:', error);
      return [];
    }
  }

  /**
   * Clean up old temporary files (older than 24 hours)
   * @returns {Promise<Object>} Results of cleanup operation
   */
  async cleanupTempFiles() {
    const tempPath = this.tempUploadPath;
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    try {
      // Recursively find files older than cutoff time
      const findOldFiles = async (dir) => {
        const oldFiles = [];
        try {
          const items = await fs.readdir(dir, { withFileTypes: true });

          for (const item of items) {
            const itemPath = path.join(dir, item.name);

            if (item.isDirectory()) {
              // Process subdirectories
              const subDirFiles = await findOldFiles(itemPath);
              oldFiles.push(...subDirFiles);

              // Check if directory is now empty
              try {
                const remaining = await fs.readdir(itemPath);
                if (remaining.length === 0) {
                  oldFiles.push(itemPath);
                }
              } catch (e) {
                // Directory might have been deleted
              }
            } else {
              // Check file modification time
              const stats = await fs.stat(itemPath);
              if (stats.mtime.getTime() < cutoffTime) {
                oldFiles.push(itemPath);
              }
            }
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`Error scanning directory ${dir}:`, error);
            throw error;
          }
        }
        return oldFiles;
      };

      const filesToDelete = await findOldFiles(tempPath);

      if (filesToDelete.length === 0) {
        return { success: true, deleted: [], errors: [] };
      }

      // Delete all old files and empty directories
      const result = await this.deleteFiles(filesToDelete, {
        recursive: true,
        force: true,
      });

      if (result.deleted.length > 0) {
        console.log(
          `Cleaned up ${result.deleted.length} temporary files and directories`
        );
      }

      return result;
    } catch (error) {
      console.error('Error in cleanupTempFiles:', error);
      return {
        success: false,
        deleted: [],
        errors: [{ path: tempPath, error }],
      };
    }
  }
}

module.exports = new ImageService();
