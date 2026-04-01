const approvalService = require('../services/approval.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const approveExpense = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const result = await approvalService.processApproval(
      req.params.expenseId,
      req.user.id,
      'APPROVED',
      comment
    );
    return successResponse(res, result);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

const rejectExpense = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const result = await approvalService.processApproval(
      req.params.expenseId,
      req.user.id,
      'REJECTED',
      comment
    );
    return successResponse(res, result);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { expenses, total } = await approvalService.getPendingApprovals(
      req.user.id,
      req.user.company_id,
      page || 1,
      limit || 10
    );
    return paginatedResponse(res, expenses, total, page || 1, limit || 10);
  } catch (err) {
    next(err);
  }
};

const overrideExpense = async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return errorResponse(res, 'Action must be APPROVE or REJECT', 'VALIDATION_ERROR', 400);
    }
    const result = await approvalService.overrideExpense(
      req.params.id,
      req.user.id,
      action,
      comment
    );
    return successResponse(res, result);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

module.exports = { approveExpense, rejectExpense, getPendingApprovals, overrideExpense };
