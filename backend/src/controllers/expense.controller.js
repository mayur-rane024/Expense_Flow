const expenseService = require('../services/expense.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body, req.user.id, req.user.company_id);
    return successResponse(res, { expense }, 201);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

const getMyExpenses = async (req, res, next) => {
  try {
    const { status, page, limit, category_id } = req.query;
    const { expenses, total } = await expenseService.getExpenses(
      { status, page, limit, category_id },
      req.user.company_id,
      req.user.id,
      false
    );
    return paginatedResponse(res, expenses, total, page || 1, limit || 10);
  } catch (err) {
    next(err);
  }
};

const getAllExpenses = async (req, res, next) => {
  try {
    const { status, page, limit, category_id } = req.query;
    const { expenses, total } = await expenseService.getExpenses(
      { status, page, limit, category_id },
      req.user.company_id,
      null,
      true
    );
    return paginatedResponse(res, expenses, total, page || 1, limit || 10);
  } catch (err) {
    next(err);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id, req.user.company_id);
    if (!expense) return errorResponse(res, 'Expense not found', 'NOT_FOUND', 404);

    // Non-admins can only see their own expenses
    if (req.user.role === 'EMPLOYEE' && expense.user_id !== req.user.id) {
      return errorResponse(res, 'Forbidden', 'FORBIDDEN', 403);
    }

    return successResponse(res, { expense });
  } catch (err) {
    next(err);
  }
};

module.exports = { createExpense, getMyExpenses, getAllExpenses, getExpenseById };
