const cors = require('cors');
const { frontendUrl, backendUrl } = require('./oauth');

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 *
 * Enhanced CORS setup for better development experience and security.
 * Supports multiple origins including localhost variations and environment-specific URLs.
 *
 * Cookie Authentication Note:
 * - We're using HTTP-only cookies for authentication tokens
 * - Cookies are automatically sent with requests (no Authorization header needed)
 * - credentials: true is required for cookie-based authentication
 *
 * Security Considerations:
 * - Multiple allowed origins for development flexibility
 * - Proper origin validation with callback function
 * - Only necessary headers and methods are permitted
 */

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.100:3000',
  'https://intellectify.app',
  'https://app.intellectify.app',
  ...(frontendUrl ? [frontendUrl] : []),
  ...(backendUrl ? [backendUrl] : []),
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  /**
   * Origin Validation Function
   * Checks if the request origin is in the allowedOrigins array
   * or if it's undefined (for development environments)
   *
   * - Callback allows to perform asynchronous operations (like database lookups) to verify the origin
   * - Gives flexibility to have different rules for development/production
   *
   * - Two Possible Outcomes:
   *   1. callback(new Error('Not allowed')): Block the request
   *   2. callback(null, true): Allow the request
   *
   * - The callback should be called with two arguments:
   *   1. Error object (if any, otherwise null)
   *   2. Boolean indicating if the request is allowed
   */
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in the allowed list
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    return callback(null, isAllowed);
  },

  // Allow cookies to be sent with requests (required for HTTP-only cookie auth)
  credentials: true,

  // Allowed request headers
  // - Content-Type: For specifying request body format (JSON, form-data, etc.)
  // - Authorization: Kept for backward compatibility, though we use cookies now
  allowedHeaders: ['Content-Type', 'Authorization'],

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  // Return 204 (No Content) for preflight requests
  // This is more semantic than the default 200 for OPTIONS requests
  optionsSuccessStatus: 204,
};

/**
 * Configure CORS middleware
 * @param {Express} app - Express application instance
 */
const configureCors = (app) => {
  app.use(cors(corsOptions));
};

module.exports = { configureCors, corsOptions };
