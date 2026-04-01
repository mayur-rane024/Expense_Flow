const Joi = require('joi');

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(2).max(100).required(),
  company_name: Joi.string().min(2).max(100).required(),
  default_currency: Joi.string().length(3).default('USD'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { signupSchema, loginSchema };
