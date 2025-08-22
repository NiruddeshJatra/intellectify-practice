const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const crypto = require('crypto');
const { jwtAccessSecret, jwtRefreshSecret, nodeEnv } = require('../config/oauth');
const AppError = require('../utils/AppError');

const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days

/**
 * Generate access token with short expiry
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    jwtAccessSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate refresh token with longer expiry
 * Store in database for tracking and revocation
 */
const generateRefreshToken = async (userId, userAgent) => {
  // Generate refresh token
  const refreshToken = jwt.sign(
    { userId },
    jwtRefreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Hash token before storing
  // crypto is Node's built-in module used for hashing
  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Store in database
  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return refreshToken;
};

/**
 * Verify access token and return decoded payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtAccessSecret);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token and ensure it exists in database
 */
const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtRefreshSecret);
    
    // Check if token exists in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: hashedToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
    });

    if (!storedToken) return null;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Rotates a refresh token by invalidating the old one and generating a new one
 * 
 * Security Features:
 * 1. Prevents token reuse by immediately revoking the old token
 * 2. Helps detect token theft by making tokens single-use
 * 3. Maintains session continuity while rotating credentials
 */
const rotateRefreshToken = async (userId, oldRefreshToken, userAgent) => {
  try {
    // 1. Hash the old refresh token to search in database
    const hashedOldToken = crypto
      .createHash('sha256')
      .update(oldRefreshToken)
      .digest('hex');

    // 2. Verify the old refresh token exists and is valid
    const token = await prisma.refreshToken.findFirst({
      where: {
        token: hashedOldToken,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!token) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // 3. Revoke the old refresh token
    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { 
        revokedAt: new Date(),
        userAgent: userAgent
      }
    });

    // 4. Generate a new refresh token
    return await generateRefreshToken(userId, userAgent);
  } catch (error) {
    console.error('Error rotating refresh token:', error);
    throw error;
  }
};

/**
 * Revoke a specific refresh token
 * Used during logout to revoke the current session's token
 */
const revokeSpecificToken = async (token, userId) => {
  // Hash the refresh token to find it in database
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
    
  await prisma.refreshToken.updateMany({
    where: {
      token: hashedToken,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

/**
 * Revoke all refresh tokens for a user
 *This function is needed in scenarios like:
 * - User changes password
 * - User clicks "Sign out from all devices"
 * - Account compromise suspected
 * - Admin needs to force logout a user
  */
const revokeAllUserTokens = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

/**
 * Set secure HTTP-only cookies
 * This sets cookies for both access and refresh tokens
 *
 * The secure flag ensures cookies are only sent over HTTPS:
 * - In production: Cookie only sent over HTTPS
 * - In development: Works with HTTP (localhost)
 * - Prevents cookie theft through man-in-the-middle attacks
 * SameSite options:
 * - 'lax': Default, allows same-site and top-level navigations. Cookie sent when user clicks link to your site
 * - 'strict': Requires same-site, but not for top-level navigations. Cookie not sent when clicking links from emails
 * - 'none': No restrictions, but requires secure
 */
const setTokenCookies = (res, { accessToken, refreshToken }) => {
  // Access token cookie - short lived
  res.cookie('access_token', accessToken, {
    httpOnly: true, // to prevent client-side access
    secure: nodeEnv === 'production',
    sameSite: 'lax', //  to prevent cross-site request forgery
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token cookie - longer lived
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear auth cookies with proper options
 * Uses the same options as when setting cookies to ensure proper clearing
 */
const clearTokenCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
  };

  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeSpecificToken,
  revokeAllUserTokens,
  setTokenCookies,
  clearTokenCookies,
};
