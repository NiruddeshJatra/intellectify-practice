const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const oauthStateService = require('../services/oauthStateService');
const { frontendUrl } = require('../config/oauth');
const AppError = require('../utils/AppError');

/**
 * Handles Google One Tap authentication
 * Verifies the credential and creates/updates user in database
 * 
 * Note: No state validation needed for One Tap because:
 * - It's an AJAX POST request (not redirect-based OAuth)
 * - No CSRF risk - credential generated directly in browser
 * - Google's credential is already signed and verified
 * - Request originates from same page (no cross-site redirect)
 */
const googleOneTap = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      throw new AppError('Google credential is required', 401, 'UNAUTHORIZED');
    }

    const user = await authService.handleGoogleOneTap(credential);
    await authService.setAuthCookies(user, req.get('user-agent'), res);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles Google OAuth callback
 * Exchanges authorization code for user info and creates/updates user
 * 
 * What encodeURIComponent Does:
 * Encodes special characters so they can be safely included in URL parameters
 * Prevents URL breaking when error messages contain spaces, symbols, or special characters
 * Security protection against URL injection attacks
 *
 * What is the Frontend Callback Page's Role:
 * - Handles the success or error from the authentication process
 * - Displays appropriate messages to the user
 * - Redirects to the appropriate page based on the outcome
 */
const googleAuth = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      // Redirect to frontend with error message when code is missing
      return res.redirect(302, `${frontendUrl}/auth/github/callback?error=Authorization%20code%20is%20required`);
    }

    // Validate OAuth state parameter for CSRF protection
    const stateValidation = oauthStateService.validateState(state, req.get('user-agent'));
    if (!stateValidation.valid) {
      throw new AppError(
        `Invalid OAuth state: ${stateValidation.error}`, 
        400, 
        'INVALID_OAUTH_STATE'
      );
    }

    const user = await authService.handleGoogleAuth(code);
    await authService.setAuthCookies(user, req.get('user-agent'), res);

    // Redirect to frontend callback page that will handle the success
    return res.redirect(`${frontendUrl}/auth/google/callback?success=true`);
  } catch (error) {
    const errorMessage = error.message || 'Authentication failed';
    const errorCode = error.code || 'AUTH_ERROR';
    return res.redirect(
      `${frontendUrl}/auth/google/callback?error=${encodeURIComponent(errorMessage)}&code=${errorCode}`
    );
  }
};

/**
 * Handles GitHub OAuth callback
 * Exchanges authorization code for user info and creates/updates user
 */
const githubAuth = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      // Redirect to frontend with error message when code is missing
      return res.redirect(302, `${frontendUrl}/auth/github/callback?error=Authorization%20code%20is%20required`);
    }

    // Validate OAuth state parameter for CSRF protection
    const stateValidation = oauthStateService.validateState(state, req.get('user-agent'));
    if (!stateValidation.valid) {
      throw new AppError(
        `Invalid OAuth state: ${stateValidation.error}`,
        400,
        'INVALID_OAUTH_STATE'
      );
    }

    const user = await authService.handleGithubAuth(code);
    await authService.setAuthCookies(user, req.get('user-agent'), res);

    // Redirect to frontend callback page that will handle the success
    return res.redirect(`${frontendUrl}/auth/github/callback?success=true`);
  } catch (error) {
    next(error);
  }
};

/**
 * Returns current user's information
 * Excludes sensitive fields like password and provider details
 */
const getMe = (req, res) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401, 'UNAUTHENTICATED');
  }
  
  const { password, provider, providerAccountId, ...safeUser } = req.user;
  res.status(200).json({
    status: 'success',
    data: safeUser
  });
};

/**
 * Refreshes the access token using a valid refresh token
 * 
 * Security Features:
 * 1. Verifies the refresh token's validity
 * 2. Generates a new access token
 * 3. Rotates the refresh token for security
 */
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401, 'MISSING_REFRESH_TOKEN');
    }

    // Verify the refresh token and get user info
    const payload = await tokenService.verifyRefreshToken(refreshToken);
    if (!payload?.userId) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Generate new tokens
    const tokens = await authService.setAuthCookies(
      payload.userId, 
      req.get('user-agent'), 
      res,
      { existingRefreshToken: refreshToken }
    );

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: tokens.accessToken
      }
    });
  } catch (error) {
    // Clear invalid tokens on any error
    tokenService.clearTokenCookies(res);
    next(error);
  }
};

/**
 * Handles user logout
 * Revokes refresh tokens and clears authentication cookies
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const refreshToken = req.cookies.refresh_token;

    // If there's a refresh token, revoke it specifically
    if (refreshToken && userId) {
      try {
        // Revoke the specific refresh token
        await tokenService.revokeSpecificToken(refreshToken, userId);
      } catch (error) {
        // Log error but don't fail logout - still clear cookies
        console.error('Error revoking specific refresh token:', error);
      }
    }

    // Clear authentication cookies
    tokenService.clearTokenCookies(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    // Even if there's an error, still clear cookies for security
    tokenService.clearTokenCookies(res);
    next(error);
  }
};

module.exports = {
  googleAuth,
  githubAuth,
  googleOneTap,
  getMe,
  refreshToken,
  logout,
};
