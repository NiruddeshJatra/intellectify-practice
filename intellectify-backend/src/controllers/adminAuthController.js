const adminAuthService = require('../services/adminAuthService');
const AppError = require('../utils/appError');

/**
 * Handles admin login with email/password authentication
 * @route POST /api/admin/auth/login
 * @access Public
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    // Authenticate admin
    const user = await adminAuthService.validateAdminCredentials(email, password);

    // Set authentication cookies
    await adminAuthService.setAdminAuthCookies(user, req.get('user-agent'), res);

    // Return user data (without sensitive fields)
    res.status(200).json({
      success: true,
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
    // For security, don't leak specific error details
    if (error.code === 'INVALID_CREDENTIALS') {
      error.message = 'Invalid email or password';
    }
    next(error);
  }
};

/**
 * Validates admin credentials (for middleware or other services)
 * @route POST /api/admin/auth/validate
 * @access Private (Admin only)
 */
const validateAdminCredentials = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    try {
      const user = await adminAuthService.validateAdminCredentials(email, password);
      res.status(200).json({
        success: true,
        data: {
          valid: Boolean(user)
        }
      });
    } catch (validationError) {
      // If validation fails, return valid: false instead of throwing error
      res.status(200).json({
        success: true,
        data: {
          valid: false
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get current admin user's information
 * @route GET /api/admin/auth/me
 * @access Private (Admin only)
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401, 'UNAUTHENTICATED');
    }
    
    // Return admin user data (password and provider fields already excluded by auth middleware)
    const { password, provider, providerAccountId, ...safeUser } = req.user;
    
    res.status(200).json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminLogin,
  validateAdminCredentials,
  getMe,
};