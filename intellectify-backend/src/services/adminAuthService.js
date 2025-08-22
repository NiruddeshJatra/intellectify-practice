const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const tokenService = require('./tokenService');
const AppError = require('../utils/AppError');

/**
 * AdminAuthService handles email/password authentication for admin users
 * Integrates with existing JWT token system while providing separate admin authentication
 */
class AdminAuthService {
  /**
   * Authenticates admin user with email and password
   * @param {string} email - Admin email
   * @param {string} password - Plain text password
   * @returns {Object} User object if authentication successful
   * @throws {Error} If authentication fails
   */
  async validateAdminCredentials(email, password) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'CREDENTIALS_REQUIRED');
    }

    // Find admin user by email
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase().trim() 
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        password: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
    }

    // Check if user has password (admin users should have password, OAuth users don't)
    if (!user.password) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Creates a new admin user (for script use only)
   * @param {string} email - Admin email
   * @param {string} password - Plain text password
   * @param {string} name - Admin name
   * @returns {Object} Created user object
   */
  async createAdmin(email, password, name) {
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create admin user
    return await prisma.user.create({
          data: {
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password: hashedPassword,
            role: 'ADMIN',
            // OAuth fields are nullable for admin users
            provider: null,
            providerAccountId: null,
          },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          }
        });
  }

  /**
   * Hashes password using bcrypt
   * @param {string} password - Plain text password
   * @returns {string} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 12; // High security salt rounds
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify if the provided password matches the hashed password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {boolean} True if passwords match
   */
  async verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      return false;
    }
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Sets authentication cookies for admin user (integrates with existing JWT system)
   * @param {Object} user - User object with id property
   * @param {string} userAgent - User agent string for token tracking
   * @param {Object} res - Express response object
   * @returns {Object} Generated tokens
   */
  async setAdminAuthCookies(user, userAgent, res) {
    if (!user || !user.id) {
      throw new AppError('Invalid user object provided', 400, 'INVALID_USER');
    }
    
    const userId = user.id;
    
    // Generate new access token
    const accessToken = tokenService.generateAccessToken(userId);
    
    // Generate fresh refresh token
    const refreshToken = await tokenService.generateRefreshToken(userId, userAgent);

    // Set HTTP-only cookies
    tokenService.setTokenCookies(res, { accessToken, refreshToken });
    
    return { accessToken, refreshToken };
  }
}

module.exports = new AdminAuthService();