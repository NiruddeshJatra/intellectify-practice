const helmet = require('helmet');

/**
 * Security Configuration Module
 * 
 * This module configures security headers and policies for the Express application.
 * It uses Helmet.js for standard security headers and adds custom security headers.
 * 
 * Security Features:
 * - Content Security Policy (CSP) to prevent XSS attacks
 * - Permissions Policy for browser feature access control
 * - Various security headers to prevent common attacks
 */

/**
 * Configure security middleware
 * @param {Express} app - Express application instance
 */
const configureSecurity = (app) => {
  // Helmet security headers with Google OAuth support
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            'https://accounts.google.com',  // Google OAuth scripts
            'https://apis.google.com',      // Google APIs
          ],
          frameSrc: ["'self'", 'https://accounts.google.com'], // Google OAuth iframe
          connectSrc: ["'self'", 'https://accounts.google.com'], // Google OAuth connections
        },
      },
      permissionsPolicy: {
        features: {
          // Allow Google Identity Credentials API
          'identity-credentials-get': ["'self'", 'https://accounts.google.com'],
        },
      },
    })
  );

  // Additional security headers
  app.use((req, res, next) => {
    // Remove server information to prevent fingerprinting
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevents browsers from interpreting files as a different type
    res.setHeader('X-Frame-Options', 'DENY'); // Prevents clickjacking by denying embedding in frames
    res.setHeader('X-XSS-Protection', '1; mode=block'); // Prevents XSS attacks by blocking execution of inline scripts
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // Restricts referrer information sent with cross-origin requests

    next();
  });
};

module.exports = { configureSecurity };