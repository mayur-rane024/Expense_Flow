const workflowService = require('../services/workflow.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const createWorkflow = async (req, res, next) => {
  try {
    const workflow = await workflowService.createWorkflow(req.body, req.user.company_id);
    return successResponse(res, { workflow }, 201);
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.code, err.status);
    next(err);
  }
};

const getWorkflows = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { workflows, total } = await workflowService.getWorkflows(
      req.user.company_id,
      page || 1,
      limit || 10
    );
    return paginatedResponse(res, workflows, total, page || 1, limit || 10);
  } catch (err) {
    next(err);
  }
};

const getWorkflowById = async (req, res, next) => {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id, req.user.company_id);
    if (!workflow) return errorResponse(res, 'Workflow not found', 'NOT_FOUND', 404);
    return successResponse(res, { workflow });
  } catch (err) {
    next(err);
  }
};

const deleteWorkflow = async (req, res, next) => {
  try {
    const deleted = await workflowService.deleteWorkflow(req.params.id, req.user.company_id);
    if (!deleted) return errorResponse(res, 'Workflow not found', 'NOT_FOUND', 404);
    return successResponse(res, { message: 'Workflow deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createWorkflow, getWorkflows, getWorkflowById, deleteWorkflow };
