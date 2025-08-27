const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { jwtAccessSecret } = require('../config/oauth');
const AppError = require('../utils/appError');

// Middleware to check if user is authenticated
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.access_token;
    
    if (!token) {
      return next(new AppError('No token provided', 401, 'MISSING_TOKEN'));
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtAccessSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    
    // Validate token payload
    if (!decoded?.userId) {
      return next(new AppError('Invalid token payload', 401, 'INVALID_TOKEN_PAYLOAD'));
    }
    
    // Get user from database (make sure user still exists)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return next(new AppError('Authentication failed', 401, 'AUTH_ERROR'));
  }
};

// Middleware specifically for admin authentication
// This combines user authentication with admin role checking
const authenticateAdmin = async (req, res, next) => {
  try {
    // First authenticate the user
    await authenticateUser(req, res, (err) => {
      if (err) {
        return next(err);
      }
      
      // Then check if user is admin
      if (req.user.role !== 'ADMIN') {
        console.warn(`Non-admin user ${req.user.id} attempted to access admin endpoint: ${req.method} ${req.originalUrl}`);
        return next(new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED'));
      }
      
      next();
    });
  } catch (error) {
    console.error('Admin authentication error:', error);
    return next(new AppError('Admin authentication failed', 401, 'ADMIN_AUTH_ERROR'));
  }
};

module.exports = {
  authenticateUser,
  authenticateAdmin
};
