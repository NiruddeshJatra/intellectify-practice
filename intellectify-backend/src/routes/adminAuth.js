const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { authenticateAdmin } = require('../middleware/auth');
const { adminRateLimit } = require('../middleware/security');

/**
 * Admin Authentication Routes
 * These routes handle admin-specific authentication with email/password
 */

// ===================== PUBLIC ADMIN ROUTES ===================== //

/**
 * @route POST /api/admin/auth/login
 * @description Admin login with email/password
 * @access Public (with rate limiting)
 *
 * @request
 * body: {
 *   email: string,     // Admin email address
 *   password: string   // Admin password (plain text)
 * }
 *
 * @response
 * success: {
 *   success: true,
 *   user: {
 *     id: string,
 *     email: string,
 *     name: string,
 *     avatar: string,
 *     role: string
 *   }
 * }
 * cookies: Sets HTTP-only cookies (access_token, refresh_token)
 *
 * error: {
 *   success: false,
 *   error: string,
 *   code: string,
 *   timestamp: string
 * }
 *
 * Security Features:
 * - Rate limiting to prevent brute force attacks
 * - Password hashing with bcrypt (salt rounds >= 12)
 * - Generic error messages to prevent user enumeration
 * - Admin role validation
 * - Integration with existing JWT token system
 * - Enhanced error logging and monitoring
 */
router.post('/login', adminRateLimit, adminAuthController.adminLogin);

/**
 * @route POST /api/admin/auth/validate
 * @description Validate admin credentials (internal use)
 * @access Public (but intended for internal use, with rate limiting)
 *
 * @request
 * body: {
 *   email: string,     // Admin email address
 *   password: string   // Admin password (plain text)
 * }
 *
 * @response
 * success: {
 *   success: true,
 *   valid: boolean
 * }
 *
 * error: {
 *   success: false,
 *   error: string,
 *   code: string,
 *   timestamp: string
 * }
 *
 * Note: This endpoint is for internal validation purposes
 * and should not be used for actual authentication
 * Security: Rate limited to prevent abuse
 */
router.post('/validate', adminRateLimit, adminAuthController.validateAdminCredentials);

// ===================== PROTECTED ADMIN ROUTES ===================== //

/**
 * @route GET /api/admin/auth/me
 * @description Get current admin user's information
 * @access Private - Requires admin authentication with enhanced security
 *
 * This route reuses the existing /api/auth/me endpoint functionality
 * but ensures only admin users can access it through the authenticateAdmin middleware
 * with additional security checks
 */
router.get('/me', authenticateAdmin, adminAuthController.getMe);


// Security error handler is applied globally in app.js

module.exports = router;
