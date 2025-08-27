// Utility functions for API responses

/**
 * Standard success response format
 * @param {*} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Data to send in response
 */
exports.successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standard error response format
 * @param {*} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} errors - Additional error details
 */
exports.errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Format validation errors from express-validator
 * @param {Array} errors - Array of validation errors
 * @returns {Object} - Formatted errors object
 */
exports.formatValidationErrors = (errors) => {
  const formattedErrors = {};
  errors.forEach((error) => {
    formattedErrors[error.param] = error.msg;
  });
  return formattedErrors;
};