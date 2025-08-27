const authRoutes = require('../routes/auth');
const adminAuthRoutes = require('../routes/adminAuth');
const contentRoutes = require('../routes/content');
const adminContentRoutes = require('../routes/adminContent');
const imageRoutes = require('../routes/images');
const { errorHandler } = require('../middleware/errorHandler');
const { nodeEnv } = require('./oauth');

/**
 * Routes Configuration Module
 * 
 * This module configures all application routes and error handling.
 * Routes are mounted in a specific order:
 * 1. Health check endpoint
 * 2. API routes (authentication, content, images)
 * 3. 404 handler (must be after all routes)
 * 4. Error handling middleware (must be last)
 */

/**
 * Configure application routes
 * @param {Express} app - Express application instance
 */
const configureRoutes = (app) => {
  // ========== Health Check Endpoint ========== //
  /**
   * Root endpoint
   * @route GET /
   * @description Health check endpoint to verify API is running
   * @returns {Object} API status information
   */
  app.get('/', (req, res) => {
    res.json({
      message: 'Intellectify API',
      environment: nodeEnv,
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });

  // ========== API Routes ========== //
  // Mount API routes with appropriate prefixes
  app.use('/api/auth', authRoutes);                    // Authentication routes
  app.use('/api/admin/auth', adminAuthRoutes);         // Admin authentication
  app.use('/api/content', contentRoutes);              // Public content access
  app.use('/api/admin/content', adminContentRoutes);   // Admin content management
  app.use('/api/admin/content/images', imageRoutes);   // Image upload and management

  // ========== Error Handling ========== //
  // 404 handler - must be after all routes but before error handler
  app.use((req, res) => {
    // This will only run if no previous routes matched
    res.status(404).json({
      success: false,
      error: 'Not Found',
      code: 'NOT_FOUND'
    });
  });

  // Error handling middleware (must be after all routes)
  app.use(errorHandler);
};

module.exports = { configureRoutes };