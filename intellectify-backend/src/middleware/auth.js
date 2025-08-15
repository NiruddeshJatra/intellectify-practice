const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { jwtAccessSecret } = require('../config/oauth');

// Middleware to check if user is authenticated
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.access_token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtAccessSecret);
    
    // Get user from database (make sure user still exists)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user to request object for use in route handlers
    req.user = user;
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Admin access required',
    code: 'ADMIN_ACCESS_REQUIRED'
  });
};

module.exports = {
  authenticateUser,
  requireAdmin
};
