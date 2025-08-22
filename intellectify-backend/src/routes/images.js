const express = require('express');
const imageController = require('../controllers/imageController');
const { authenticateAdmin } = require('../middleware/auth');
const { uploadRateLimit, validateFileUpload } = require('../middleware/security');
const upload = require('../config/multerConfig');

const router = express.Router();

/**
 * @route POST /api/images/upload-temp
 * @description Upload image to temporary location (for editor use before content is saved)
 * @access Private - Admin authentication required
 * @request
 * body: {
 *   image: File - The image file to upload
 * }
 * @response
 * success: {
 *   success: true,
 *   url: string - URL of the uploaded image
 *   filename: string - Name of the saved file
 *   path: string - Relative path to the file
 *   size: number - File size in bytes
 *   mimetype: string - MIME type of the file
 * }
 * error: {
 *   success: false,
 *   error: string,
 *   code: string,
 *   timestamp: string
 * }
 */

router.post('/upload-temp', 
  uploadRateLimit,
  authenticateAdmin,
  upload.single('image'),
  validateFileUpload,
  imageController.uploadTempImage
);

module.exports = router;
