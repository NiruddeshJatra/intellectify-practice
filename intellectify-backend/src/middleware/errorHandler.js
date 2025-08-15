/**
 * Categories of Errors in Express.js
 * 
 * 1. Route Not Found (404):
 *    - When no route matches the requested URL
 *    - Example: GET /nonexistent-route
 *    - Handled by: Express's default 404 handler or custom middleware
 * 
 * 2. Synchronous Errors:
 *    - Errors thrown directly in route handlers
 *    - Example: throw new Error('Invalid input')
 *    - Automatically caught by Express
 * 
 * 3. Asynchronous Errors:
 *    - Errors in Promises/async functions
 *    - Two ways they occur:
 *      a) Caught by try/catch: await getUserData()
 *      b) Unhandled: forgetting try/catch or .catch()
 *    - Need async error wrapper or express-async-errors
 * 
 * 4. General Operational Errors:
 *    - Expected errors during normal operation
 *    - Example: Database validation, auth failures
 *    - Usually have specific status codes (400, 401, 403)
 * 
 * This middleware handles ALL these types by being the last in the chain!
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */

const errorHandler = (err, req, res, next) => {
  const { nodeEnv } =  require('../config/oauth');
  const timestamp = new Date().toISOString();
  
  // Prepare error details for logging
  const errorDetails = {
    timestamp,
    level: 'ERROR',
    message: err.message,       // Error message (e.g., "User not found")
    name: err.name,            // Error type (e.g., "ValidationError")
    statusCode: err.statusCode || 500,  // HTTP status code
    path: req.originalUrl,     // Requested URL
    method: req.method,        // HTTP method (GET, POST, etc.)
    
    // Only include stack trace and sensitive data in development
    ...(nodeEnv === 'development' && {
      stack: err.stack,        // Full error stack trace
      code: err.code,          // Error code (if any)
      headers: req.headers,    // Request headers
      body: req.body,          // Request body
      query: req.query,        // Query parameters
      params: req.params       // Route parameters
    })
  };

  // Log the error with all details
  console.error(JSON.stringify(errorDetails, null, 2));

  // Prepare the response to the client
  const statusCode = err.statusCode || 500;
  // Structure the error response to the client
  const errorResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
    
    // Only include stack trace and error code in development
    ...(nodeEnv === 'development' && {
      stack: err.stack,                    // Full stack trace
      ...(err.code && { code: err.code })  // Include error code if it exists
    })
  };

  // Send the error response with appropriate status code
  res.status(statusCode).json(errorResponse);
};

/**
 * Handles unhandled promise rejections
 * 
 * This catches promises that are rejected but don't have a .catch() handler.
 * Common in async/await code when you forget try/catch.
 * 
 * @param {Object} server - Optional HTTP server instance for graceful shutdown
 */
const handleRejections = (server) => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'UNHANDLED_REJECTION',
      message: 'Unhandled Promise Rejection',
      reason: {
        name: reason?.name,      // Error type (if any)
        message: reason?.message, // Error message
        stack: reason?.stack,    // Stack trace
        ...reason                // Any additional error properties
      }
    }, null, 2));
  });
};

/**
 * Handles uncaught exceptions
 * 
 * This catches synchronous errors that aren't wrapped in try/catch blocks.
 * These are typically programming errors that should be fixed during development.
 */
process.on('uncaughtException', (error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'UNCAUGHT_EXCEPTION',
    message: 'Uncaught Exception - This is likely a programming error',
    error: {
      name: error.name,      // Error type
      message: error.message, // Error message
      stack: error.stack     // Stack trace
    }
  }, null, 2));
});

module.exports = {
  errorHandler,
  handleRejections
};
