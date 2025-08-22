const multer = require('multer');

// Set upload limits
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 1, // Single file upload only
};

/**
 * Multer middleware configuration
 * - Uses memory storage to pass file buffer to image service
 * - Applies file size limits
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory for image service to handle
  limits,
});

module.exports = upload;
