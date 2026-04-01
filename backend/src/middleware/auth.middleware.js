const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(res, 'No token provided', 'UNAUTHORIZED', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 'TOKEN_EXPIRED', 401);
    }
    return errorResponse(res, 'Invalid token', 'INVALID_TOKEN', 403);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden: insufficient permissions', 'FORBIDDEN', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
