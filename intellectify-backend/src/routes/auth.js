const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

/**
 * Complete Flow Comparison: Google OAuth vs One Tap (Cookie-Based Authentication)
 * 
 * Google OAuth Flow (/google/callback):
 * 1. Frontend: User clicks login → Redirects to Google consent screen
 * 2. User: Grants consent on Google's page
 * 3. Google: Redirects back to backend with authorization code
 * 4. Backend: 
 *    - Gets code from URL parameters
 *    - Exchanges code + client credentials for user info via Google API
 *    - Creates/updates user in database
 *    - Sets HTTP-only cookies (access_token + refresh_token)
 *    - Redirects to frontend callback page with success/error status
 * 5. Frontend: AuthCallback component handles redirect and updates auth state
 * 
 * Google One Tap Flow (/google-one-tap):
 * 1. Frontend: Shows One Tap prompt automatically
 * 2. User: Clicks to sign in (no redirect needed)
 * 3. Google: Creates credential (JWT) directly in browser
 * 4. Frontend: Sends credential to backend via AJAX
 * 5. Backend:
 *    - Verifies credential with Google's library
 *    - User info is already inside the credential
 *    - Creates/updates user in database
 *    - Sets HTTP-only cookies (access_token + refresh_token)
 *    - Returns JSON response with user data
 * 6. Frontend: Updates auth state immediately (no redirect needed)
 * 
 * Key Differences:
 * - OAuth: Full page redirect flow → Backend redirect → Frontend callback handling
 * - One Tap: AJAX flow → Direct JSON response → Immediate state update
 * - OAuth: User leaves the page temporarily
 * - One Tap: User stays on the same page throughout
 */

// ===================== PUBLIC ROUTES ===================== //

/**
 * @route POST /api/auth/google-one-tap
 * @description Google One Tap login endpoint (Cookie-Based)
 * @access Public
 * 
 * @request
 * body: {
 *   credential: string  // JWT credential from Google One Tap
 * }
 * 
 * @response
 * success: {
 *   success: true,
 *   user: {
 *     id: string,
 *     name: string,
 *     email: string,
 *     avatar: string,
 *     role: string
 *   }
 * }
 * cookies: Sets HTTP-only cookies (access_token, refresh_token)
 * 
 * error: {
 *   success: false,
 *   error: string
 * }
 * 
 * Why JSON instead of redirect?
 * - One Tap is an AJAX call from frontend JavaScript
 * - User stays on the same page (no navigation)
 * - Frontend can immediately update auth state
 * - Better UX: seamless, no page reload
 */
router.post('/google-one-tap', authController.googleOneTap);

/**
 * @route GET /api/auth/google/callback
 * @description Google OAuth callback endpoint (Cookie-Based)
 * @access Public
 * 
 * @request
 * query: {
 *   code: string,  // Authorization code from Google OAuth
 *   state: string  // CSRF protection state parameter (validated for security)
 * }
 * 
 * @response
 * success: 
 *   - Sets HTTP-only cookies (access_token, refresh_token)
 *   - Redirects to: ${frontendUrl}/auth/google/callback?success=true
 * error: 
 *   - Redirects to: ${frontendUrl}/auth/google/callback?error=encoded_error_message
 * 
 * Why redirect instead of JSON?
 * - OAuth is a full page redirect flow initiated by window.location
 * - User is coming back from Google's domain to our backend
 * - Must redirect to frontend to complete the flow
 * - Frontend AuthCallback component handles the redirect and updates state
 * 
 * Security Features:
 * - State parameter validation prevents CSRF attacks
 * - Validates state format and length for security
 * - Logs validation results for monitoring
 */
router.get('/google/callback', authController.googleAuth);

/**
 * @route GET /api/auth/github/callback
 * @description GitHub OAuth callback endpoint (Cookie-Based)
 * @access Public
 * 
 * @request
 * query: {
 *   code: string,  // Authorization code from GitHub OAuth
 *   state: string  // CSRF protection state parameter (validated for security)
 * }
 * 
 * @response
 * success: 
 *   - Sets HTTP-only cookies (access_token, refresh_token)
 *   - Redirects to: ${frontendUrl}/auth/github/callback?success=true
 * error: 
 *   - Redirects to: ${frontendUrl}/auth/github/callback?error=encoded_error_message
 * 
 * Why redirect instead of JSON?
 * - Same as Google OAuth - full page redirect flow
 * - User is returning from GitHub's domain
 * - Must redirect back to frontend to complete authentication
 * 
 * Security Features:
 * - State parameter validation prevents CSRF attacks
 * - Same validation logic as Google OAuth for consistency
 */
router.get('/github/callback', authController.githubAuth);

// ===================== PROTECTED ROUTES ===================== //

/**
 * @route GET /api/auth/me
 * @description Get current user's information (Cookie-Based)
 * @access Private - Requires valid access token in HTTP-only cookie
 * 
 * @request
 * cookies: {
 *   access_token: string  // JWT access token (HTTP-only)
 * }
 * 
 * @response
 * success: {
 *   success: true,
 *   data: {
 *     id: string,
 *     name: string,
 *     email: string,
 *     avatar: string,
 *     role: string,
 *     createdAt: string,
 *     updatedAt: string
 *   }
 * }
 * error: 401 Unauthorized if no valid token or cookie missing
 */
router.get('/me', authenticateUser, authController.getMe);

/**
 * @route POST /api/auth/refresh-token
 * @description Refreshes the access token using a valid refresh token (Cookie-Based)
 * @access Private - Requires valid refresh token in HTTP-only cookie
 * 
 * @request
 * cookies: {
 *   refresh_token: string  // Refresh token (HTTP-only)
 * }
 * 
 * @response
 * success: {
 *   success: true,
 *   accessToken: string  // New access token (also set as HTTP-only cookie)
 * }
 * cookies: Updates both access_token and refresh_token (token rotation)
 * 
 * error: {
 *   success: false,
 *   error: string,
 *   code: string  // Error code (e.g., 'MISSING_REFRESH_TOKEN')
 * }
 * 
 * Security Features:
 * - Token rotation: Issues new refresh token on each use
 * - Automatic cleanup: Revokes old refresh token
 * - HTTP-only cookies: Prevents XSS token theft
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @description Logout current user and revoke refresh tokens (Cookie-Based)
 * @access Private - Requires valid access token in HTTP-only cookie
 * 
 * @request
 * cookies: {
 *   access_token: string,   // Access token (HTTP-only, required)
 *   refresh_token: string   // Refresh token (HTTP-only, optional)
 * }
 * 
 * @response
 * success: {
 *   success: true,
 *   message: "Logged out successfully"
 * }
 * cookies: Clears both access_token and refresh_token cookies
 * 
 * Security Features:
 * - Revokes specific refresh token from database
 * - Clears all authentication cookies
 * - Idempotent: Safe to call multiple times
 * - Graceful: Succeeds even if refresh token is missing/invalid
 */
router.post('/logout', authenticateUser, authController.logout);

module.exports = router;
