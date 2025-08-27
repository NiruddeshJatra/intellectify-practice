const AppError = require('../utils/appError');

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

const nodeEnv = process.env.NODE_ENV || 'development';

const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Handle Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    // In production, show a generic error message
    if (nodeEnv === 'production') {
      error = new AppError('Invalid data provided', 400, 'VALIDATION_ERROR');
    } else {
      // In development, include the full error details
      error = new AppError(
        err.message.split('\n').slice(0, 5).join('\n'), // Show first 5 lines of error
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  // Handle Prisma constraint violations (unique constraints, foreign key violations, etc.)
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      // Unique constraint violation
      error = new AppError('A record with this value already exists', 409, 'DUPLICATE_ENTRY');
    } else if (err.code === 'P2025') {
      // Record not found
      error = new AppError('Record not found', 404, 'NOT_FOUND');
    } else {
      // Other known Prisma errors
      error = new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    }
  }

  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    error = new AppError(message, 400, 'DUPLICATE_FIELD');
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  // Sanitize error message to prevent path-to-regexp errors
  const safeMessage = error.message ? String(error.message).replace(/^https?:\/\//, '//') : 'Unknown error';
  
  // Log error details
  const errorDetails = {
    timestamp,
    level: 'ERROR',
    message: safeMessage,
    name: error.name || 'Error',
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
    path: req.originalUrl,
    method: req.method,
    ...(nodeEnv === 'development' && {
      stack: error.stack,
      error: {
        ...error,
        message: safeMessage,
        // Remove any URL-like strings from the error object to prevent further issues
        ...(error.message && { originalMessage: error.message })
      }
    })
  };

  // Log to console in development, to file in production
  if (nodeEnv === 'development') {
    console.error('\x1b[31m', 'ERROR 💥', errorDetails);
  } else {
    console.error(JSON.stringify(errorDetails));
  }

  // Send response to client
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: statusCode >= 500 ? 'Internal Server Error' : (error.message || 'Something went wrong'),
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };
  
  // Only include additional details for client errors (4xx)
  if (statusCode < 500 && error.message) {
    response.error = error.message;
  }
  
  // Add debug info in development
  if (nodeEnv === 'development') {
    response.stack = error.stack;
    if (error.details) {
      response.details = error.details;
    }
  }
  
  res.status(statusCode).json(response);
};

/**
 * Handles unhandled promise rejections
 * 
 * This catches promises that are rejected but don't have a .catch() handler.
 * Common in async/await code when you forget try/catch.
 * 
 * @param {Object} server - Optional HTTP server instance for graceful shutdown
 */
const handleRejections = () => {
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
