const imageService = require('./services/fileStorageService');
const Scheduler = require('./utils/scheduler');
const { handleRejections } = require('./middleware/errorHandler');
const { port, nodeEnv } = require('./config/oauth');

/**
 * Server Startup Module
 * 
 * This module handles server initialization, service startup, and graceful shutdown.
 * It ensures all services are properly initialized before accepting connections
 * and handles shutdown signals gracefully to prevent data loss.
 */

/**
 * Initialize services before starting server
 * 
 * Services that need initialization:
 * - Image service: Creates necessary directories for file uploads
 * - Scheduler: Initializes background tasks and cron jobs
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
const createGracefulShutdown = (server) => (signal) => {
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
 * 
 * @param {Express} app - Express application instance
 */
const startServer = async (app) => {
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
    
    const gracefulShutdown = createGracefulShutdown(server);
    
    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // For production
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // For Ctrl+C in development
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    return server;
  } catch (error) {
    console.error('❌ Error during server startup:', error);
    throw error;
  }
};

module.exports = { startServer };