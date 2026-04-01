const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.code === '23505') {
    return errorResponse(res, 'Duplicate entry - resource already exists', 'DUPLICATE_ENTRY', 409);
  }
  if (err.code === '23503') {
    return errorResponse(res, 'Referenced resource not found', 'FOREIGN_KEY_VIOLATION', 400);
  }
  if (err.code === '22P02') {
    return errorResponse(res, 'Invalid UUID format', 'INVALID_ID', 400);
  }

  return errorResponse(res, err.message || 'Internal server error', 'INTERNAL_ERROR', 500);
};

module.exports = { errorHandler };
