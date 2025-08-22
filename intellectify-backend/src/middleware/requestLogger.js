const { nodeEnv } = require('../config/oauth');

/**
 * Logs all incoming requests with useful information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestLogger = (req, res, next) => {
  // Skip logging for health checks
  if (req.path === '/health') return next();

  const start = Date.now();
  const { method, originalUrl, ip, body, query, params } = req;

  // Log request details
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    method,
    url: originalUrl,
    ip,
    ...(query && Object.keys(query).length > 0 && { query }),
    ...(nodeEnv === 'development' && {
      ...(req.headers && { headers: req.headers }),
      ...(body && typeof body === 'object' && Object.keys(body).length > 0 && { body }),
      ...(params && Object.keys(params).length > 0 && { params })
    })
  };

  // Log the request
  console.log(JSON.stringify(logData));

  // Log response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      method,
      url: originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ...(res.statusCode >= 400 && { 
        error: res.locals.errorMessage || 'Unknown error',
        ...(res.locals.error && { errorDetails: res.locals.error })
      })
    };
    
    if (res.statusCode >= 400) {
      console.error(JSON.stringify(logData));
    } else {
      console.log(JSON.stringify(logData));
    }
  });

  next();
};

module.exports = requestLogger;
