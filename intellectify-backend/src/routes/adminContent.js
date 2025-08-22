const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticateAdmin } = require('../middleware/auth');
const { 
  validateContentOwnership, 
  sanitizeRichTextInput,
  adminRateLimit,

} = require('../middleware/security');

// Apply security error handler, authentication and rate limiting to all admin routes
router.use(authenticateAdmin);
router.use(adminRateLimit);
// Security error handler is applied globally in app.js

/**
 * @route GET /api/admin/content
 * @description Get current admin's content (both draft and published)
 * @access Private - Admin authentication required
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - status: Filter by status (PUBLISHED/DRAFT) - optional
 * - category: Filter by category - optional
 */
router.get('/', contentController.getMyContent);

/**
 * @route GET /api/admin/content/:id
 * @description Get content by ID (includes drafts)
 * @access Private - Admin authentication required
 */
router.get('/:id', validateContentOwnership, contentController.getContentById);

/**
 * @route POST /api/admin/content
 * @description Create new content
 * @access Private - Admin authentication required
 */
router.post('/', sanitizeRichTextInput, contentController.createContent);

/**
 * @route PUT /api/admin/content/:id
 * @description Update existing content
 * @access Private - Admin authentication required
 */
router.put('/:id', validateContentOwnership, sanitizeRichTextInput, contentController.updateContent);

/**
 * @route PATCH /api/admin/content/:id/status
 * @description Update content status (publish/unpublish)
 * @access Private - Admin authentication required
 */
router.patch('/:id/status', validateContentOwnership, contentController.updateContentStatus);

/**
 * @route DELETE /api/admin/content/:id
 * @description Delete content
 * @access Private - Admin authentication required
 */
router.delete('/:id', validateContentOwnership, contentController.deleteContent);

module.exports = router;
