const Joi = require('joi');

const createExpenseSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).default('USD'),
  category_id: Joi.string().uuid().required(),
  description: Joi.string().max(1000).allow('', null),
  receipt_url: Joi.string().allow('', null),
  expense_date: Joi.date().iso().required(),
  workflow_id: Joi.string().uuid().allow(null),
});

const expenseQuerySchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').allow('', null),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category_id: Joi.string().uuid().allow('', null),
});

module.exports = { createExpenseSchema, expenseQuerySchema };
