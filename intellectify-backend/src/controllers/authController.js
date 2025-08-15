const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const oauthStateService = require('../services/oauthStateService');
const { frontendUrl } = require('../config/oauth');

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
const googleOneTap = async (req, res) => {
  try {
    const { credential } = req.body;
    const user = await authService.handleGoogleOneTap(credential);
    await authService.setAuthCookies(user, req.get('user-agent'), res);
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('One Tap error:', error);
    res.status(401).json({ success: false, error: 'Invalid Google credential' });
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
const googleAuth = async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Authorization code is required' });
  }

  // Validate OAuth state parameter for CSRF protection
  const stateValidation = oauthStateService.validateState(state, req.get('user-agent'));
  if (!stateValidation.valid) {
    console.error('OAuth state validation failed:', stateValidation.error);
    return res.redirect(`${frontendUrl}/auth/google/callback?error=${encodeURIComponent('Invalid OAuth state: ' + stateValidation.error)}`);
  }

  console.log('OAuth state validation passed:', stateValidation.state);

  try {
    const user = await authService.handleGoogleAuth(code);
    await authService.setAuthCookies(user, req.get('user-agent'), res);

    // Redirect to frontend callback page that will handle the success
    return res.redirect(`${frontendUrl}/auth/google/callback?success=true`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    // Redirect to frontend callback page with error
    return res.redirect(`${frontendUrl}/auth/google/callback?error=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
};

/**
 * Handles GitHub OAuth callback
 * Exchanges authorization code for user info and creates/updates user
 */
const githubAuth = async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Authorization code is required' });
  }

  // Validate OAuth state parameter for CSRF protection
  const stateValidation = oauthStateService.validateState(state, req.get('user-agent'));
  if (!stateValidation.valid) {
    console.error('OAuth state validation failed:', stateValidation.error);
    return res.redirect(`${frontendUrl}/auth/github/callback?error=${encodeURIComponent('Invalid OAuth state: ' + stateValidation.error)}`);
  }

  console.log('OAuth state validation passed:', stateValidation.state);

  try {
    const user = await authService.handleGithubAuth(code);
    await authService.setAuthCookies(user, req.get('user-agent'), res);

    // Redirect to frontend callback page that will handle the success
    return res.redirect(`${frontendUrl}/auth/github/callback?success=true`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    // Redirect to frontend callback page with error
    return res.redirect(`${frontendUrl}/auth/github/callback?error=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
};

/**
 * Returns current user's information
 * Excludes sensitive fields like password and provider details
 */
const getMe = (req, res) => {
  const { password, provider, providerAccountId, ...safeUser } = req.user;
  res.json({ success: true, data: safeUser });
};

/**
 * Refreshes the access token using a valid refresh token
 * 
 * Security Features:
 * 1. Verifies the refresh token's validity
 * 2. Generates a new access token
 * 3. Rotates the refresh token for security
 */
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'No refresh token provided',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify the refresh token and get user info
    const payload = await tokenService.verifyRefreshToken(refreshToken);
    if (!payload || !payload.userId) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await authService.setAuthCookies(
      payload.userId, 
      req.get('user-agent'), 
      res,
      { existingRefreshToken: refreshToken }
    );

    return res.json({ 
      success: true,
      accessToken: tokens.accessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    // Clear invalid tokens
    tokenService.clearTokenCookies(res);
    return res.status(401).json({ 
      success: false, 
      error: error.message || 'Invalid refresh token' 
    });
  }
};

/**
 * Handles user logout
 * Revokes refresh tokens and clears authentication cookies
 */
const logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const refreshToken = req.cookies.refresh_token;

    // If there's a refresh token, revoke it specifically
    if (refreshToken) {
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

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, still clear cookies for security
    tokenService.clearTokenCookies(res);
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
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
