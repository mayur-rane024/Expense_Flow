const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const approvalController = require('../controllers/approval.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createUserSchema, createCategorySchema } = require('../validators/user.validator');

router.use(authenticate, authorize('ADMIN'));

// User management
router.post('/users', validate(createUserSchema), userController.createUser);
router.get('/users', userController.getUsers);
router.patch('/users/:id', userController.updateUser);

// Expense override
router.post('/expenses/:id/override', approvalController.overrideExpense);

// Categories
router.post('/categories', validate(createCategorySchema), userController.createCategory);

module.exports = router;
