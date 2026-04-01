const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');

const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    return successResponse(res, result, 201);
  } catch (err) {
    if (err.code === 'EMAIL_EXISTS') return errorResponse(res, err.message, err.code, err.status || 409);
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return successResponse(res, result);
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS') return errorResponse(res, err.message, err.code, 401);
    next(err);
  }
};

const me = async (req, res) => {
  return successResponse(res, { user: req.user });
};

module.exports = { signup, login, me };
