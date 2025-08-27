const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const requestLogger = require('../middleware/requestLogger');
const { nodeEnv } = require('./oauth');

/**
 * Middleware Configuration Module
 * 
 * This module configures all Express middleware including:
 * - Body parsing (JSON and URL-encoded)
 * - Cookie parsing for authentication
 * - Request logging (development vs production)
 * - Static file serving
 * 
 * The middleware is applied in a specific order for optimal performance and security.
 */

/**
 * Configure Express middleware
 * @param {Express} app - Express application instance
 */
const configureMiddleware = (app) => {
  // Parse cookies (required for HTTP-only cookie authentication)
  app.use(cookieParser());

  // Parse JSON request bodies (for API requests) with size limits
  app.use(
    express.json({
      limit: '10mb', // Prevent large payload attacks
      verify: (req, res, buf) => {
        // Store the raw body for signature verification (e.g., for webhooks)
        req.rawBody = buf;
      },
    })
  );

  // Parse URL-encoded request bodies (for form data) with size limits
  app.use(
    express.urlencoded({
      extended: true, // Allow rich objects and arrays
      limit: '10mb',  // Prevent large payload attacks
    })
  );

// Custom middleware that logs request details after body parsing
  app.use(requestLogger);

// ========== Request Logging ========== //
  /**
   * Logs the request after it's completed, including response status and duration
   * 
   * Q: Why Morgan for development but not production?
   * A: It's like having two different ways to watch your app:
   *
   * Morgan in Development:
   * - Shows colorful, human-readable logs in console
   * - Instant visual feedback when you're coding
   * - Great for seeing requests while testing
   * Example: GET /api/users 200 50.3 ms - 1274
   *
   * JSON Logger in Production:
   * - Less pretty but more practical for real-world use
   * - Easy for monitoring tools to read
   * - Better for finding problems in live app
   * Example: {"level":"info","msg":"Request completed","path":"/api/users","status":200,"duration":50.3}
   *
   * Morgan is like a development-friendly dashboard, while JSON logging
   * is like a professional monitoring system for when your app goes live
   */
  if (nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
          })
        );
      });
      next();
    });
  }

  // ========== Static File Serving ========== //
  // Serve static files from the 'uploads' directory
  // This allows direct access to uploaded files via /uploads/filename
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
};

module.exports = { configureMiddleware };