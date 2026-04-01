const Joi = require('joi');

const createWorkflowSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  is_default: Joi.boolean().default(false),
  steps: Joi.array().items(
    Joi.object({
      step_order: Joi.number().integer().min(1).required(),
      rule_type: Joi.string().valid('PERCENTAGE', 'SPECIFIC', 'HYBRID').required(),
      rule_value: Joi.object().required(),
      is_manager_step: Joi.boolean().default(false),
      approver_ids: Joi.array().items(Joi.string().uuid()).default([]),
    })
  ).min(1).required(),
});

const approvalActionSchema = Joi.object({
  comment: Joi.string().max(500).allow('', null),
});

module.exports = { createWorkflowSchema, approvalActionSchema };
