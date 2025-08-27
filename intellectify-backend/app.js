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
const { configureCors } = require('./src/config/cors');
const { configureSecurity } = require('./src/config/security');
const { configureMiddleware } = require('./src/config/middleware');
const { configureRoutes } = require('./src/config/routes');
const { startServer } = require('./src/server');

/**
 * Express Application Entry Point
 * This file sets ip the core Express server with CORS, Security headers, Middleware and Routes
 */

// Initialize Express application
const app = express();

configureCors(app);        // Cross-origin resource sharing
configureSecurity(app);    // Security headers and policies
configureMiddleware(app);  // Body parsing, logging, static files
configureRoutes(app);      // API routes and error handling

module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  startServer(app).catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}