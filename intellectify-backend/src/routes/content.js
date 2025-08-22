const express = require('express');
const contentController = require('../controllers/contentController');
// Security middleware imported in other files

const router = express.Router();

// Public routes (no authentication required)
/**
 * @route GET /api/content/published
 * @description Get published content (public access)
 * @access Public
 * 
 * @request
 * params: { 
 * }
 *
 * @response
 * success: {
 *   success: true,
 *   content: {
 *     id: string,
 *     title: string,
 *     content: string,
 *     excerpt: string,
 *     category: string,
 *     subcategory: string,
 *     priority: number,
 *     metaTitle: string,
 *     metaDescription: string,
 *     authorId: string,
 *     status: string,
 *     slug: string,
 *     createdAt: string,
 *     updatedAt: string
 *   }
 * }
 *
 * error: {
 *   success: false,
 *   error: string,
 *   code: string,
 *   timestamp: string
 * }
 */
router.get('/', contentController.getPublishedContent);

router.get('/:slug', contentController.getContentBySlug);

// Security error handler is applied globally in app.js

module.exports = router;