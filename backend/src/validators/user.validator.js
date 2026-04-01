const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('MANAGER', 'EMPLOYEE').required(),
  manager_id: Joi.string().uuid().allow(null),
});

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

module.exports = { createUserSchema, createCategorySchema };
