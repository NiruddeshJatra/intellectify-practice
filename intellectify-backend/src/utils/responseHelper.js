/**
 * Create a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} pagination - Optional pagination info
 * @returns {Object} - Express response
 */
const success = (res, data = null, message = null, statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    ...(data !== null && { data }),
    ...(message && { message }),
    ...(pagination && { pagination })
  };

  return res.status(statusCode).json(response);
};

/**
 * Create an error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {*} details - Optional error details
 * @returns {Object} - Express response
 */
const error = (res, error, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error,
    ...(details && { details })
  };

  return res.status(statusCode).json(response);
};

/**
 * Create a validation error response
 * @param {Object} res - Express response object
 * @param {Array|string} errors - Validation errors
 * @param {string} message - Optional error message
 * @returns {Object} - Express response
 */
const validationError = (res, errors, message = 'Validation failed') => {
  const response = {
    success: false,
    error: message,
    details: Array.isArray(errors) ? errors : [errors]
  };

  return res.status(422).json(response);
};

/**
 * Create a not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (e.g., 'User', 'Content')
 * @param {string|number} id - Resource identifier
 * @returns {Object} - Express response
 */
const notFound = (res, resource = 'Resource', id = null) => {
  const message = id 
    ? `${resource} with ID ${id} not found`
    : `${resource} not found`;
    
  return error(res, message, 404);
};

/**
 * Create an unauthorized error response
 * @param {Object} res - Express response object
 * @param {string} message - Optional error message
 * @returns {Object} - Express response
 */
const unauthorized = (res, message = 'Unauthorized access') => {
  return error(res, message, 401);
};

/**
 * Create a forbidden error response
 * @param {Object} res - Express response object
 * @param {string} message - Optional error message
 * @returns {Object} - Express response
 */
const forbidden = (res, message = 'Access forbidden') => {
  return error(res, message, 403);
};

/**
 * Create an internal server error response
 * @param {Object} res - Express response object
 * @param {string} message - Optional error message
 * @returns {Object} - Express response
 */
const serverError = (res, message = 'Internal server error') => {
  return error(res, message, 500);
};

/**
 * Create a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {number} currentPage - Current page number
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @param {string} message - Optional success message
 * @returns {Object} - Express response
 */
const paginated = (res, data, currentPage, totalItems, itemsPerPage, message = null) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const pagination = {
    currentPage: parseInt(currentPage),
    totalPages,
    totalItems: parseInt(totalItems),
    itemsPerPage: parseInt(itemsPerPage),
    hasNextPage,
    hasPrevPage
  };

  return success(res, data, message, 200, pagination);
};

/**
 * Create a created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Optional success message
 * @returns {Object} - Express response
 */
const created = (res, data, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

/**
 * Create a no content response (204)
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create response based on operation result
 * @param {Object} res - Express response object
 * @param {Object} result - Operation result with success flag
 * @param {string} successMessage - Success message
 * @param {string} errorMessage - Error message
 * @returns {Object} - Express response
 */
const handleResult = (res, result, successMessage = 'Operation successful', errorMessage = 'Operation failed') => {
  if (result.success) {
    return success(res, result.data, successMessage);
  } else {
    return error(res, result.error || errorMessage, result.statusCode || 400);
  }
};

module.exports = {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  serverError,
  paginated,
  created,
  noContent,
  asyncHandler,
  handleResult
};