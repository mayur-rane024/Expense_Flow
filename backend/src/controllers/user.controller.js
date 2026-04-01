const userService = require('../services/user.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user.company_id);
    return successResponse(res, { user }, 201);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { users, total } = await userService.getUsers(req.user.company_id, page || 1, limit || 20);
    return paginatedResponse(res, users, total, page || 1, limit || 20);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user.company_id);
    return successResponse(res, { user });
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await userService.getCategories(req.user.company_id);
    return successResponse(res, { categories });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await userService.createCategory(name, req.user.company_id);
    return successResponse(res, { category }, 201);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

module.exports = { createUser, getUsers, updateUser, getCategories, createCategory };
