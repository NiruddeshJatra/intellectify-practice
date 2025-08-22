/**
 * Why do we require dotenv?
 *
 * dotenv loads environment variables from a .env file into process.env
 * This helps us:
 * 1. Keep sensitive data out of code (API keys, passwords)
 * 2. Have different configs for different environments
 * 3. Never commit secrets to git (.env in .gitignore)
 *
 * Example .env file:
 * PORT=3000
 * GOOGLE_CLIENT_ID=your_client_id
 * DB_PASSWORD=secret123
 *
 * Then in code we use:
 * process.env.PORT
 * process.env.GOOGLE_CLIENT_ID
 * process.env.DB_PASSWORD
 *
 * Must be required as early as possible (top of entry file)
 * because other modules might need these env variables
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const requestLogger = require('./src/middleware/requestLogger');
const authRoutes = require('./src/routes/auth');
const adminAuthRoutes = require('./src/routes/adminAuth');
const contentRoutes = require('./src/routes/content');
const adminContentRoutes = require('./src/routes/adminContent');
const imageRoutes = require('./src/routes/images');
const imageService = require('./src/services/imageService');
const Scheduler = require('./src/utils/scheduler');
const path = require('path');
const {
  errorHandler,
  handleRejections,
} = require('./src/middleware/errorHandler');
const {
  frontendUrl,
  backendUrl,
  port,
  nodeEnv,
} = require('./src/config/oauth');

/**
 * Express Application Entry Point
 * This file sets up the core Express server with middleware, routes, and error handling.
 */

// Initialize Express application
const app = express();

// ========== Middleware Configuration ========== //

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

// CORS configuration with multiple allowed origins
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
  /*
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
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    // For unauthorized origins, don't set any CORS headers
    return callback(null, false);
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

// Apply CORS with the specified options
app.use(cors(corsOptions));

// Parse cookies
app.use(cookieParser());

// Add security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://apis.google.com',
        ],
        frameSrc: ["'self'", 'https://accounts.google.com'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
      },
    },
    permissionsPolicy: {
      features: {
        'identity-credentials-get': ["'self'", 'https://accounts.google.com'],
      },
    },
  })
);

// Add global security headers
app.use((req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevents browsers from interpreting files as a different type
  res.setHeader('X-Frame-Options', 'DENY'); // Prevents clickjacking by denying embedding in frames
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Prevents XSS attacks by blocking execution of inline scripts
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // Restricts referrer information sent with cross-origin requests

  next();
});

// Parse JSON request bodies (for API requests) with size limits
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store the raw body for signature verification (e.g., for webhooks)
      req.rawBody = buf;
    },
  })
);

// Parse URL-encoded request bodies (for form data) with size limits
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
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
 *
 * Alternatives considered:
 * - Winston: More features, good for complex needs
 * - Pino: Better performance for high-load apps
 * - Bunyan: Good for structured logging
 */

if (nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
          },
          null,
          2
        )
      );
    });
    next();
  });
}

// ========== Static File Serving ========== //
// Serve static files from the 'uploads' directory
// This allows direct access to uploaded files via /uploads/filename
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== API Routes ========== //
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

// Mount API routes
app.use('/api/auth', authRoutes);        // Authentication routes
app.use('/api/admin/auth', adminAuthRoutes); // Admin authentication
app.use('/api/content', contentRoutes);  // Public content access
app.use('/api/admin/content', adminContentRoutes); // Admin content management
app.use('/api/images', imageRoutes);     // Image upload and management

// 404 handler - must be after all routes but before error handler
app.use((req, res, next) => {
  // This will only run if no previous routes matched
  res.status(404).json({
    success: false,
    error: 'Not Found',
    code: 'NOT_FOUND'
  });
});

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Handle unhandled promise rejections
module.exports = app;

// ========== Server Setup ========== //
// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  /**
   * Initialize services before starting server
   */
  const initializeServices = async () => {
    try {
      await imageService.initializeDirectories();
      Scheduler.init();
      
      console.log('✅ All services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error; // Re-throw to see the actual error
    }
  };

  /**
   * Graceful Shutdown Handler
   *
   * Handles both SIGTERM (production) and SIGINT (Ctrl+C in development)
   *
   * What are these signals?
   * - SIGTERM: "Politely" asks the process to shut down (used in production)
   * - SIGINT: Sent when you press Ctrl+C in the terminal (used in development)
   */
  const gracefulShutdown = (server) => (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(() => {
      console.log('✅ All connections closed. Process terminated.');
      process.exit(0); // Success exit code
    });

    // 2. Force shutdown if cleanup takes too long
    setTimeout(() => {
      console.error('❌ Forcing shutdown after timeout!');
      process.exit(1); // Error exit code
    }, 10000).unref();
  };

  /**
   * Start the Express server
   *
   * Think of this like opening a restaurant:
   * - PORT: The door number where customers (requests) come in
   * - Callback: The "We're open!" sign that lights up
   */
  const startServer = async () => {
    try {
      await initializeServices();
      
      const server = app.listen(port, () => {
        console.log(`✅ Server running on port ${port} in ${nodeEnv} mode`);
      });

      /**
       * What is a Promise?
       * - Like ordering food at a restaurant
       * - You get a "promise" that you'll get your food later
       * - It can either be resolved (you get your food) or rejected (kitchen is closed)
       *
       * Unhandled rejections happen when:
       * - The kitchen burns down (error occurs)
       * - But no one is there to handle it (missing .catch())
       */
      handleRejections(server);
        
      // Handle different shutdown signals
      process.on('SIGTERM', () => gracefulShutdown(server)('SIGTERM')); // For production
      process.on('SIGINT', () => gracefulShutdown(server)('SIGINT')); // For Ctrl+C in development
      
      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        gracefulShutdown(server)('uncaughtException');
      });

      return server;
      
    } catch (error) {
      console.error('❌ Error during server startup:', error);
      throw error;
    }
  };

  startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}