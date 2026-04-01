/**
 * Standard API Response Helpers
 */

const successResponse = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

const errorResponse = (res, message, code = 'INTERNAL_ERROR', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { message, code },
  });
};

const paginatedResponse = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
    error: null,
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };
