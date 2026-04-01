const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { approvalActionSchema } = require('../validators/workflow.validator');

router.use(authenticate);

// Get pending approvals for current user
router.get('/pending', authorize('MANAGER', 'ADMIN', 'EMPLOYEE'), approvalController.getPendingApprovals);

// Approve an expense
router.post('/:expenseId/approve', validate(approvalActionSchema), approvalController.approveExpense);

// Reject an expense
router.post('/:expenseId/reject', validate(approvalActionSchema), approvalController.rejectExpense);

module.exports = router;
