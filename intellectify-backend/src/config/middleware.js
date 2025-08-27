const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const requestLogger = require('../middleware/requestLogger');

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

  // ========== Static File Serving ========== //
  // Serve static files from the 'uploads' directory
  // This allows direct access to uploaded files via /uploads/filename
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
};

module.exports = { configureMiddleware };