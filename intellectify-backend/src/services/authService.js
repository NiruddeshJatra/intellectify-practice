const axios = require('axios');
const { OAuthProvider } = require('@prisma/client');
const prisma = require('../config/database');
const { google, github } = require('../config/oauth');
const tokenService = require('./tokenService');
const { OAuth2Client } = require('google-auth-library');

/**
 * Security Consideration: Multiple Active Sessions
 *
 * Q: Is it possible to create a new JWT token while already logged in?
 * A: Yes, in the current implementation, a logged-in user can:
 *    1. Start a new OAuth flow
 *    2. Get a new authorization code
 *    3. Exchange it for user data
 *    4. Receive a new JWT token
 *
 * Security Implications:
 * - Multiple valid tokens increase attack surface
 * - Makes token revocation more complex
 * - Complicates session management
 *
 * Potential Improvements:
 * 1. Implement token tracking in database:
 *    - Store active tokens with their expiration
 *    - Track device/browser information
 *
 * 2. Add token revocation:
 *    - Revoke old token when generating new ones
 *    - Implement a token blacklist
 *
 * 3. Add session checks:
 *    - Verify if user already has active session
 *    - Optionally prevent multiple logins
 *    - Or implement proper multi-device session management
 */

class AuthService {
  /**
   * Handles Google One Tap authentication
   *
   * Google One Tap Flow Explained:
   * 1. Frontend shows Google One Tap prompt automatically
   * 2. User clicks to sign in (no redirect - stays on same page)
   * 3. Google creates a JWT credential directly in the browser
   * 4. Frontend sends this credential to our backend via AJAX
   * 5. We verify the credential with Google's library
   *
   * What's in the credential?
   * - It's a JWT (JSON Web Token) signed by Google
   * - Contains user info: ID, email, name, profile picture
   * - Already verified by Google - we just need to validate it
   *
   * Why is this different from OAuth?
   * - OAuth: User leaves page → Goes to Google → Comes back with code → We exchange code for user info
   * - One Tap: User stays on page → Google creates credential → We verify credential (user info already inside)
   *
   * Security Benefits:
   * - Credential is signed by Google (tamper-proof)
   * - We verify it using Google's official library
   * - No sensitive data travels through URL parameters
   * - Faster and more secure than traditional OAuth for this use case
   *
   * @param {string} credential - JWT credential from Google One Tap
   * @returns {Object} User object from database
   */
  async handleGoogleOneTap(credential) {
    // Create Google OAuth client for verification
    const client = new OAuth2Client(google.clientId);

    // Verify the JWT credential with Google
    // This ensures the credential is legitimate and not tampered with
    const ticket = await client.verifyIdToken({
      idToken: credential, // The JWT credential from frontend
      audience: google.clientId, // Ensures credential was meant for our app
    });

    // Extract user information from the verified credential
    // 'sub' is Google's unique user ID (subject)
    const { sub: id, email, name, picture } = ticket.getPayload();

    // Create or update user in our database
    return this.findOrCreateUser({
      provider: OAuthProvider.GOOGLE,
      providerAccountId: id, // Google's unique ID for this user
      email,
      name,
      avatar: picture, // Google profile picture URL
    });
  }

  // Exchange OAuth code for user data
  async handleGoogleAuth(code) {
    try {
      /**
       * Exchanges the authorization code for an access token using Google's OAuth 2.0 token endpoint.
       *
       * Grant Types (OAuth 2.0 flows):
       * - 'authorization_code': Standard flow for web server apps (what we're using)
       * - 'password': Resource Owner Password Credentials (not recommended)
       * - 'client_credentials': Machine-to-machine authentication
       * - 'refresh_token': For obtaining new access tokens
       * - 'implicit': Legacy flow for browser-based apps (deprecated)
       *
       * Redirect URI:
       * - Must exactly match the URI registered in Google Cloud Console
       * - Prevents token interception by ensuring tokens are only sent to authorized URIs
       * - Can be localhost for development (e.g., http://localhost:3000/auth/callback)
       *
       * Token Response may include:
       * - access_token: Token for API access (required)
       * - refresh_token: For getting new access tokens (if offline access requested)
       * - expires_in: Token lifetime in seconds
       * - token_type: Typically 'Bearer'
       * - id_token: JWT containing user info (OpenID Connect)
       * - scope: Granted permissions
       *
       * Why Bearer token in Authorization header?
       * - Standard and secure way to transmit access tokens
       * - Prevents token leakage in server logs (vs. URL parameters)
       * - Required by OAuth 2.0 Bearer Token Usage spec (RFC 6750)
       * - More secure than sending in request body
       *
       * Error Response Format:
       * {
       *   error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type',
       *   error_description: 'Human-readable explanation',
       *   error_uri: 'URL to documentation'
       * }
       */
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code, // The one-time authorization code from Google
          client_id: google.clientId,
          client_secret: google.clientSecret,
          redirect_uri: google.redirectUri,
          grant_type: 'authorization_code',
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info from Google
      const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const { id, email, name, picture } = userResponse.data;

      // Create or update user in database
      return this.findOrCreateUser({
        provider: OAuthProvider.GOOGLE,
        providerAccountId: id,
        email,
        name,
        avatar: picture,
      });
    } catch (error) {
      throw new Error(`Google OAuth failed: ${error.message}`);
    }
  }

  async handleGithubAuth(code) {
    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          code,
          client_id: github.clientId,
          client_secret: github.clientSecret,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info from GitHub
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id, email, name, avatar_url } = userResponse.data;

      // GitHub might not return email in public profile
      let userEmail = email;
      if (!userEmail) {
        const emailResponse = await axios.get(
          'https://api.github.com/user/emails',
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        const primaryEmail = emailResponse.data.find((e) => e.primary);
        userEmail = primaryEmail ? primaryEmail.email : null;
      }

      if (!userEmail) {
        throw new Error('Unable to retrieve email from GitHub');
      }

      // Create or update user in database
      return this.findOrCreateUser({
        provider: OAuthProvider.GITHUB,
        providerAccountId: id.toString(),
        email: userEmail,
        name: name || userEmail.split('@')[0], // Fallback to username if no name
        avatar: avatar_url,
      });
    } catch (error) {
      throw new Error(`GitHub OAuth failed: ${error.message}`);
    }
  }

  async findOrCreateUser(userData) {
    const { provider, providerAccountId, email, name, avatar } = userData;

    // Check if user exists by provider + providerAccountId
    let user = await prisma.user.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });

    if (user) {
      // Update user data (in case profile changed)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          avatar,
          email,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
          provider,
          providerAccountId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return user;
  }

  /**
   * Sets authentication cookies with tokens
   * 
   * Supports two modes:
   * 1. New authentication (OAuth login) - generates fresh tokens
   * 2. Token refresh - rotates existing refresh token for security
   *
   * JWT Claims Explained:
   * - userId: Unique identifier for the user in our system
   *   - Used to identify the user in subsequent requests
   *   - Prevents the need for database lookups for basic auth
   *
   * Why these claims?
   * - Minimizes database queries - common user data is in the token
   * - Stateless authentication - no server-side session storage needed
   * - Tamper-proof - JWT is signed and verified with our secret
   * - Self-contained - All necessary user context is in the token
   * 
   * @param {Object|string} user - User object with id property or userId string
   * @param {string} userAgent - User agent string for token tracking
   * @param {Object} res - Express response object
   * @param {Object} options - Optional configuration
   * @param {string} options.existingRefreshToken - For token rotation (refresh flow)
   */
  async setAuthCookies(user, userAgent, res, options = {}) {
    const userId = user.id || user; // Support both user object and userId
    
    // Generate new access token
    const accessToken = tokenService.generateAccessToken(userId);
    
    let refreshToken;
    
    if (options.existingRefreshToken) {
      // Token refresh flow - rotate the existing refresh token
      refreshToken = await tokenService.rotateRefreshToken(
        userId,
        options.existingRefreshToken,
        userAgent
      );
    } else {
      // New authentication flow - generate fresh refresh token
      refreshToken = await tokenService.generateRefreshToken(userId, userAgent);
    }

    // Set cookies for tokens
    tokenService.setTokenCookies(res, { accessToken, refreshToken });
    
    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
