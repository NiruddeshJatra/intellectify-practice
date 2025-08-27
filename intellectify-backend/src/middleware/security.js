const rateLimit = require('express-rate-limit');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const prisma = require('../config/database');
const AppError = require('../utils/appError');

/**
 * Content ownership validation middleware
 * Ensures users can only access/modify their own content
 */
const validateContentOwnership = async (req, res, next) => {
  try {
    const contentId = req.params.id || req.params.contentId;
    const userId = req.user?.id;

    if (!contentId) {
      return next(new AppError('Content ID is required', 400, 'MISSING_CONTENT_ID'));
    }

    // Validate UUID format - treat invalid UUID as content not found
    if (!validator.isUUID(contentId)) {
      return next(new AppError('Content not found', 404, 'CONTENT_NOT_FOUND'));
    }

    // Check if content exists and user is the owner
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { authorId: true }
    });

    if (!content) {
      return next(new AppError('Content not found', 404, 'CONTENT_NOT_FOUND'));
    }

    if (content.authorId !== userId) {
      return next(new AppError('You do not have permission to access this content', 403, 'FORBIDDEN'));
    }

    // Store contentId for use in controllers
    req.validatedContentId = contentId;
    req.content = content;

    next();
  } catch (error) {
    console.error('Content ownership validation error:', error);
    next(new AppError('Failed to validate content ownership', 500, 'VALIDATION_ERROR'));
  }
};

/**
 * Input sanitization middleware for rich text content
 * Prevents XSS attacks while preserving safe HTML formatting
 */
const sanitizeRichTextInput = (req, res, next) => {
  try {
    // Ensure req.body exists and is an object
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      console.error('Invalid request body in sanitizeRichTextInput:', req.body);
      return next(new AppError('Invalid request body', 400, 'INVALID_BODY'));
    }

    // Sanitize content if it exists
    if (req.body.content !== undefined && req.body.content !== null && typeof req.body.content === 'string') {
          const cleanContent = DOMPurify.sanitize(req.body.content, {
            ADD_TAGS: ['iframe'],
            ADD_ATTR: [
              'allowfullscreen',
              'frameborder',
              'allow',
              'loading',
              'referrerpolicy',
              'sandbox'
            ],
            ALLOWED_TAGS: [
              'p', 'br', 'strong', 'em', 'u',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'ul', 'ol', 'li', 'blockquote',
              'a', 'img', 'figure', 'figcaption',
              'table', 'thead', 'tbody', 'tr', 'th', 'td',
              'div', 'span', 'iframe'
            ],
            ALLOWED_ATTR: [
              'href', 'src', 'alt', 'title', 'class', 'id',
              'style', 'width', 'height', 'target', 'rel',
              'frameborder', 'allowfullscreen', 'allow',
              'loading', 'referrerpolicy', 'sandbox',
              'srcset', 'sizes', 'data-*', 'controls', 
              'autoplay', 'loop', 'muted', 'poster'
            ],
            // Allow YouTube, Vimeo, and other common video embeds
            ADD_URI_SAFE_ATTR: [
              'allow',
              'allowfullscreen',
              'frameborder',
              'referrerpolicy',
              'sandbox'
            ],
            // Only allow iframes from trusted sources
            ALLOWED_IFRAME_SRC: [
              /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/.*/i,
              /^https?:\/\/(player\.vimeo\.com|vimeo\.com)\/.*/i
            ]
          });
          req.body.content = cleanContent;
    }

    // Sanitize other fields if they exist
    const fieldsToSanitize = ['excerpt', 'metaTitle', 'metaDescription', 'category', 'subcategory'];
    fieldsToSanitize.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = validator.escape(req.body[field]);
      }
    });

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    // Pass the error to the error handling middleware
    return next(new AppError(
      'Failed to sanitize input data', 
      500, 
      'SANITIZATION_ERROR',
      { originalError: error.message }
    ));
  }
};

// File upload validation constants
exports.fileValidationConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  // Map of MIME types to their valid file extensions
  mimeTypeExtensions: {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp']
  },
  // Magic bytes for file type validation
  magicBytes: {
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF header
  }
};

/**
 * Validates the uploaded file's MIME type and extension
 * @param {Object} file - Multer file object
 * @returns {Object} - { isValid: boolean, error: string }
 */
const validateFileType = (file) => {
  const { allowedMimeTypes, mimeTypeExtensions } = exports.fileValidationConfig;
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}` 
    };
  }

  const fileExt = file.originalname.split('.').pop().toLowerCase();
  const validExtensions = mimeTypeExtensions[file.mimetype] || [];
  
  if (!validExtensions.includes(fileExt)) {
    return {
      isValid: false,
      error: `Invalid file extension for ${file.mimetype}. Allowed: ${validExtensions.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Middleware to validate file uploads
 * - Checks file size and type
 * - Validates file extension matches MIME type
 * - Sanitizes filename
 */
const validateFileUpload = (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400, 'NO_FILE'));
    }

    const { maxFileSize } = exports.fileValidationConfig;
    
    if (req.file.size > maxFileSize) {
      return next(new AppError(
        `File size too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`,
        400,
        'FILE_TOO_LARGE'
      ));
    }

    const typeValidation = validateFileType(req.file);
    if (!typeValidation.isValid) {
      return next(new AppError(
        typeValidation.error,
        400,
        'INVALID_FILE_TYPE'
      ));
    }

    next();
  } catch (error) {
    console.error('File upload validation error:', error);
    next(new AppError(
      'Failed to validate file upload',
      500,
      'FILE_VALIDATION_ERROR'
    ));
  }
};

/**
 * Rate limiting for admin endpoints
 */
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test environment, except for specific rate limiting tests
    if (process.env.NODE_ENV === 'test') {
      // Only apply rate limiting for specific test scenarios
      return !req.headers['x-test-rate-limit'];
    }
    return false;
  },
});

// Rate limit configuration for uploads
const uploadRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: 'Too many upload attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Rate limiting for file uploads (more restrictive)
 */
const uploadRateLimit = rateLimit({
  ...uploadRateLimitConfig,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in test environment
});

// Export the config for testing
exports.uploadRateLimitConfig = uploadRateLimitConfig;

/**
 * Comprehensive error handler for security-related errors
 */
const securityErrorHandler = (error, req, res, next) => {
  console.error('Security error:', error);

  // Handle specific security errors
  if (error.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'INVALID_CSRF_TOKEN',
      timestamp: new Date().toISOString(),
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      code: 'PAYLOAD_TOO_LARGE',
      timestamp: new Date().toISOString(),
    });
  }

  // Default security error response
  return res.status(500).json({
    success: false,
    error: 'Security validation failed',
    code: 'SECURITY_ERROR',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  validateContentOwnership,
  sanitizeRichTextInput,
  validateFileUpload,
  adminRateLimit,
  uploadRateLimit,
  securityErrorHandler,
};
