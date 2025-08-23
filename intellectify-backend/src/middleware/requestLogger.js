const { nodeEnv } = require('../config/oauth');

/**
 * Formats log data into a readable string with each property on a new line
 * @param {Object} data - The log data to format
 * @param {string} type - The type of log (request/response)
 * @returns {string} Formatted log string
 */
const formatLog = (data, type = 'REQUEST') => {
  const timestamp = `[${new Date().toISOString()}]`;
  const level = data.level || 'INFO';
  const status = data.status ? ` ${data.status}` : '';
  const duration = data.duration ? ` (${data.duration})` : '';
  
  let logString = `${timestamp} [${level}] ${type} ${data.method} ${data.url}${status}${duration}\n`;
  
  // Add additional properties with indentation
  const exclude = ['timestamp', 'level', 'method', 'url', 'status', 'duration'];
  
  Object.entries(data).forEach(([key, value]) => {
    if (!exclude.includes(key) && value !== undefined) {
      const formattedValue = typeof value === 'object' 
        ? JSON.stringify(value, null, 2).split('\n').join('\n    ')
        : value;
      logString += `  ${key}: ${formattedValue}\n`;
    }
  });
  
  return logString;
};

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
  const { method, originalUrl, ip, body, query, params, headers } = req;
  const isDev = nodeEnv === 'development';

  // Log request details
  const requestLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    method,
    url: originalUrl,
    ip,
    ...(query && Object.keys(query).length > 0 && { query }),
    ...(isDev && {
      ...(params && Object.keys(params).length > 0 && { params }),
      ...(body && typeof body === 'object' && Object.keys(body).length > 0 && { body }),
      ...(headers && { headers: { 
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent'],
        authorization: headers['authorization'] ? '*****' : undefined,
        cookie: headers['cookie'] ? '*****' : undefined
      }})
    })
  };

  // Store response data in res.locals
  res.locals.responseBody = null;
  
  // Log the request
  console.log(formatLog(requestLog, 'REQUEST'));

  // Log response time and details
  res.on('finish', () => {
    const duration = Date.now() - start;
    const responseBody = res.locals.responseBody;
    
    const responseLog = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'ERROR' : 'INFO',
      method,
      url: originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      body: isDev ? (responseBody || (res.locals.responseBody || 'Response body not captured')) : undefined,
      ...(res.statusCode >= 400 && { 
        error: res.locals.errorMessage || 'Unknown error',
        ...(res.locals.error && { 
          errorDetails: res.locals.error.message || res.locals.error 
        })
      })
    };
    
    console.log(formatLog(responseLog, 'RESPONSE'));
  });

  next();
};

module.exports = requestLogger;
