const { query, getClient } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create workflow template with steps and approvers (transactional)
 */
const createWorkflow = async ({ name, is_default, steps }, company_id) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // If setting as default, clear existing default
    if (is_default) {
      await client.query(
        'UPDATE workflows SET is_default = FALSE WHERE company_id = $1',
        [company_id]
      );
    }

    const workflowResult = await client.query(
      'INSERT INTO workflows (id, company_id, name, is_default) VALUES ($1, $2, $3, $4) RETURNING *',
      [uuidv4(), company_id, name, is_default || false]
    );
    const workflow = workflowResult.rows[0];

    const createdSteps = [];
    for (const step of steps) {
      const stepResult = await client.query(
        `INSERT INTO workflow_steps (id, workflow_id, step_order, rule_type, rule_value, is_manager_step)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [uuidv4(), workflow.id, step.step_order, step.rule_type, step.rule_value, step.is_manager_step || false]
      );
      const createdStep = stepResult.rows[0];

      // Add approvers (not needed for manager steps - assigned dynamically)
      const approvers = [];
      if (!step.is_manager_step) {
        let finalApproverIds = step.approver_ids || [];
        
        // Ensure specific required users are always in the approver pool
        if (step.rule_value && step.rule_value.required_user_id) {
          if (!finalApproverIds.includes(step.rule_value.required_user_id)) {
            finalApproverIds.push(step.rule_value.required_user_id);
          }
        }

        for (const userId of finalApproverIds) {
          const approverResult = await client.query(
            'INSERT INTO step_approvers (id, step_id, user_id) VALUES ($1, $2, $3) RETURNING *',
            [uuidv4(), createdStep.id, userId]
          );
          approvers.push(approverResult.rows[0]);
        }
      }

      createdSteps.push({ ...createdStep, approvers });
    }

    await client.query('COMMIT');
    return { ...workflow, steps: createdSteps };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get all workflows for a company with steps
 */
const getWorkflows = async (company_id, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const totalResult = await query(
    'SELECT COUNT(*) FROM workflows WHERE company_id = $1 AND deleted_at IS NULL',
    [company_id]
  );
  const total = parseInt(totalResult.rows[0].count);

  const workflowsResult = await query(
    `SELECT w.*, 
       COALESCE(json_agg(
         json_build_object(
           'id', ws.id,
           'step_order', ws.step_order,
           'rule_type', ws.rule_type,
           'rule_value', ws.rule_value,
           'is_manager_step', ws.is_manager_step
         ) ORDER BY ws.step_order
       ) FILTER (WHERE ws.id IS NOT NULL), '[]') as steps
     FROM workflows w
     LEFT JOIN workflow_steps ws ON ws.workflow_id = w.id
     WHERE w.company_id = $1 AND w.deleted_at IS NULL
     GROUP BY w.id
     ORDER BY w.created_at DESC
     LIMIT $2 OFFSET $3`,
    [company_id, limit, offset]
  );

  return { workflows: workflowsResult.rows, total };
};

/**
 * Get a single workflow with full details
 */
const getWorkflowById = async (workflowId, company_id) => {
  const workflowResult = await query(
    'SELECT * FROM workflows WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
    [workflowId, company_id]
  );
  if (workflowResult.rows.length === 0) return null;

  const stepsResult = await query(
    `SELECT ws.*, 
       COALESCE(json_agg(
         json_build_object('id', sa.id, 'user_id', sa.user_id, 'full_name', u.full_name, 'email', u.email)
       ) FILTER (WHERE sa.id IS NOT NULL), '[]') as approvers
     FROM workflow_steps ws
     LEFT JOIN step_approvers sa ON sa.step_id = ws.id
     LEFT JOIN users u ON u.id = sa.user_id
     WHERE ws.workflow_id = $1
     GROUP BY ws.id
     ORDER BY ws.step_order`,
    [workflowId]
  );

  return { ...workflowResult.rows[0], steps: stepsResult.rows };
};

/**
 * Delete a workflow (soft delete)
 */
const deleteWorkflow = async (workflowId, company_id) => {
  const result = await query(
    'UPDATE workflows SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
    [workflowId, company_id]
  );
  return result.rows.length > 0;
};

module.exports = { createWorkflow, getWorkflows, getWorkflowById, deleteWorkflow };
