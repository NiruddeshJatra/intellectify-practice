// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

/**
 * Formats log data into a colored, readable string
 * @param {Object} data - The log data to format
 * @param {string} type - The type of log (REQUEST/RESPONSE)
 * @returns {string} Formatted and colored log string
 */
const formatLog = (data, type = 'REQUEST') => {
  const { method, url, status, duration, level } = data;
  const timestamp = new Date().toISOString();
  
  // Determine colors based on type and status
  const typeColor = type === 'REQUEST' ? colors.cyan : 
    (status >= 400 ? colors.red : colors.green);
  const methodColor = colors.bright + (
    method === 'GET' ? colors.blue :
    method === 'POST' ? colors.green :
    method === 'PUT' ? colors.yellow :
    method === 'DELETE' ? colors.red :
    colors.magenta
  );
  
  // Build the log header
  let logString = [
    `${colors.dim}[${timestamp}]`,
    `${colors.bright}${typeColor}${type.padEnd(8)}${colors.reset}`,
    `${methodColor}${method.padEnd(7)}${colors.reset}`,
    `${colors.bright}${url}${colors.reset}`,
    status ? `${colors.bright}${status}${colors.reset}` : '',
    duration ? `${colors.dim}(${duration})${colors.reset}` : '',
    level === 'ERROR' ? `${colors.bgRed}${colors.white} ERROR ${colors.reset}` : ''
  ].filter(Boolean).join(' ') + '\n';
  
  // Add additional properties with indentation
  const exclude = ['timestamp', 'level', 'method', 'url', 'status', 'duration'];
  
  Object.entries(data).forEach(([key, value]) => {
    if (!exclude.includes(key) && value !== undefined) {
      const formattedValue = typeof value === 'object' 
        ? '\n' + JSON.stringify(value, null, 2)
            .split('\n')
            .map(line => `  ${line}`)
            .join('\n')
        : value;
      
      logString += `  ${colors.cyan}${key}:${colors.reset} ${formattedValue}\n`;
    }
  });
  
  return logString;
};

// Store the original json method
const originalJson = require('express/lib/response').json;

/**
 * Override the json method to capture the response body
 */
function captureResponseBody(res) {
  if (res._body) return; // Already patched
  
  res._body = true;
  const originalJson = res.json;
  
  res.json = function(body) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };
}

/**
 * Logs all incoming requests with useful information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestLogger = (req, res, next) => {
  // Skip logging for health checks and static files
  if (req.path === '/' || req.path.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg)$/i)) {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip, body, query, params, headers } = req;

  // Capture response body
  captureResponseBody(res);
  
  // Log request details
  const requestLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    method,
    url: originalUrl,
    ip,
    ...(Object.keys(query).length > 0 && { query }),
    ...(Object.keys(params).length > 0 && { params }),
    ...(body && Object.keys(body).length > 0 && { 
      body: JSON.parse(JSON.stringify(body)) // Create a clean copy
    })
  };

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
      ...(responseBody && { body: responseBody }),
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
