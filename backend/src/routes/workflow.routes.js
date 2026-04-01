const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createWorkflowSchema } = require('../validators/workflow.validator');

router.use(authenticate);

// Admin: create workflow
router.post('/', authorize('ADMIN'), validate(createWorkflowSchema), workflowController.createWorkflow);

// Admin/Manager: view workflows
router.get('/', authorize('ADMIN', 'MANAGER'), workflowController.getWorkflows);

// Admin: get workflow by id
router.get('/:id', authorize('ADMIN'), workflowController.getWorkflowById);

// Admin: delete workflow
router.delete('/:id', authorize('ADMIN'), workflowController.deleteWorkflow);

module.exports = router;
