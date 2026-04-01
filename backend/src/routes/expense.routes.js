const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createExpenseSchema, expenseQuerySchema } = require('../validators/expense.validator');

// All routes require authentication
router.use(authenticate);

// Employee: submit expense
router.post('/', authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(createExpenseSchema), expenseController.createExpense);

// Employee: view own expenses
router.get('/my', validate(expenseQuerySchema, 'query'), expenseController.getMyExpenses);

// Admin/Manager: view all expenses
router.get('/', authorize('ADMIN', 'MANAGER'), validate(expenseQuerySchema, 'query'), expenseController.getAllExpenses);

// Any authenticated user: view single expense (access checked in controller)
router.get('/:id', expenseController.getExpenseById);

module.exports = router;
