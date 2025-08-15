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
const authRoutes = require('./src/routes/auth');
const {
  errorHandler,
  handleRejections,
} = require('./src/middleware/errorHandler');
const { frontendUrl, backendUrl, port, nodeEnv } = require('./src/config/oauth');

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
  frontendUrl,
  backendUrl
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
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const msg = `CORS not allowed for ${origin}`;
    console.warn(msg);
    return callback(new Error(msg), false);
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "https://accounts.google.com", 
        "https://apis.google.com"
      ],
      frameSrc: [
        "'self'", 
        "https://accounts.google.com"
      ],
      connectSrc: [
        "'self'", 
        "https://accounts.google.com"
      ]
    }
  },
  permissionsPolicy: {
    features: {
      "identity-credentials-get": ["'self'", "https://accounts.google.com"]
    }
  }
}));

// Parse incoming JSON requests
app.use(express.json());

// Parse URL-encoded request bodies (for form data)
app.use(express.urlencoded({ extended: true }));

// ========== Request Logging ========== //
/**
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

// ========== Routes ========== //
/**
 * Root endpoint
 *
 * Purpose:
 * - Health check endpoint to verify API is running
 * - Returns basic API information and environment
 * - Helpful for monitoring and debugging
 * - Optional but recommended for API status checks
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Intellectify API',
    environment: nodeEnv,
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// ========== Error Handlers ========== //
// 404 Handler
app.use((req, res) => {
  const error = new Error(`Cannot ${req.method} ${req.path}`);
  error.statusCode = 404;

  console.error(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        ...(nodeEnv === 'development' && {
          headers: req.headers,
          query: req.query,
          params: req.params,
        }),
      },
      null,
      2
    )
  );

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

/*
 * Global Error Handler
 * Catches any errors that make it through the routes
 */
app.use(errorHandler);

// Export the app for testing
module.exports = app;

// ========== Server Setup ========== //
// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  /**
   * Start the Express server
   *
   * Think of this like opening a restaurant:
   * - PORT: The door number where customers (requests) come in
   * - Callback: The "We're open!" sign that lights up
   */
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port} in ${nodeEnv} mode`);
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

  /**
   * Graceful Shutdown Handler
   * 
   * Handles both SIGTERM (production) and SIGINT (Ctrl+C in development)
   * 
   * What are these signals?
   * - SIGTERM: "Politely" asks the process to shut down (used in production)
   * - SIGINT: Sent when you press Ctrl+C in the terminal (used in development)
   */
  const gracefulShutdown = (signal) => {
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

  // Handle different shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));  // For production
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));    // For Ctrl+C in development
}
