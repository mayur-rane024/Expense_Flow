const { query, getClient } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Instantiate expense steps by copying from workflow template.
 * This is the core of the "dynamic workflow engine".
 * Must be called inside an existing transaction client.
 */
const instantiateWorkflow = async (client, expenseId, workflowId, submitterId) => {
  // Fetch the employee's manager for manager steps
  const managerResult = await client.query(
    'SELECT manager_id FROM users WHERE id = $1',
    [submitterId]
  );
  const managerId = managerResult.rows[0]?.manager_id;

  // Fetch all template steps with their approvers
  const stepsResult = await client.query(
    `SELECT ws.*, 
       COALESCE(
         json_agg(sa.user_id ORDER BY sa.user_id) 
         FILTER (WHERE sa.id IS NOT NULL), 
         '[]'
       ) as approver_ids
     FROM workflow_steps ws
     LEFT JOIN step_approvers sa ON sa.step_id = ws.id
     WHERE ws.workflow_id = $1
     GROUP BY ws.id
     ORDER BY ws.step_order`,
    [workflowId]
  );

  if (stepsResult.rows.length === 0) {
    throw new Error('Workflow has no steps defined');
  }

  // For each template step, create runtime expense_steps (one per approver)
  for (const step of stepsResult.rows) {
    let approverIds = step.approver_ids;

    // Manager step: dynamically assign employee's manager
    if (step.is_manager_step) {
      if (!managerId) {
        // Skip manager step if no manager assigned - log as SKIPPED
        await client.query(
          `INSERT INTO expense_steps 
           (id, expense_id, step_order, approver_id, rule_type, rule_value, status)
           VALUES ($1, $2, $3, NULL, $4, $5, 'SKIPPED')`,
          [uuidv4(), expenseId, step.step_order, step.rule_type, step.rule_value]
        );
        continue;
      }
      approverIds = [managerId];
    }

    // Create one expense_step per approver
    for (const approverId of approverIds) {
      await client.query(
        `INSERT INTO expense_steps 
         (id, expense_id, step_order, approver_id, rule_type, rule_value, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          expenseId,
          step.step_order,
          approverId,
          step.rule_type,
          step.rule_value,
          step.step_order === 1 ? 'PENDING' : 'PENDING', // All start as PENDING; engine controls flow
        ]
      );
    }
  }
};

/**
 * Submit a new expense - transactionally creates expense + instantiates workflow
 */
const createExpense = async ({ amount, currency, category_id, description, receipt_url, expense_date, workflow_id }, userId, company_id) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Resolve workflow: use provided or company default
    let resolvedWorkflowId = workflow_id;
    if (!resolvedWorkflowId) {
      const defaultWorkflow = await client.query(
        'SELECT id FROM workflows WHERE company_id = $1 AND is_default = TRUE AND deleted_at IS NULL LIMIT 1',
        [company_id]
      );
      if (defaultWorkflow.rows.length > 0) {
        resolvedWorkflowId = defaultWorkflow.rows[0].id;
      } else {
        // Use any available workflow
        const anyWorkflow = await client.query(
          'SELECT id FROM workflows WHERE company_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1',
          [company_id]
        );
        if (anyWorkflow.rows.length > 0) {
          resolvedWorkflowId = anyWorkflow.rows[0].id;
        }
      }
    }

    // Create the expense
    const expenseResult = await client.query(
      `INSERT INTO expenses (id, user_id, company_id, workflow_id, amount, currency, category_id, description, receipt_url, expense_date, status, current_step_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', 1)
       RETURNING *`,
      [uuidv4(), userId, company_id, resolvedWorkflowId, amount, currency || 'USD', category_id, description, receipt_url, expense_date]
    );
    const expense = expenseResult.rows[0];

    // Instantiate workflow if one is found
    if (resolvedWorkflowId) {
      await instantiateWorkflow(client, expense.id, resolvedWorkflowId, userId);
      
      const firstValidStep = await client.query(
        "SELECT MIN(step_order) as first_step FROM expense_steps WHERE expense_id = $1 AND status = 'PENDING'",
        [expense.id]
      );
      
      if (firstValidStep.rows[0].first_step !== null) {
        await client.query('UPDATE expenses SET current_step_order = $1 WHERE id = $2', [firstValidStep.rows[0].first_step, expense.id]);
      } else {
        // All steps skipped or workflow empty
        await client.query("UPDATE expenses SET status = 'APPROVED' WHERE id = $1", [expense.id]);
      }
    }

    // Audit log: SUBMITTED
    await client.query(
      `INSERT INTO approval_logs (id, expense_id, user_id, action, step_order) 
       VALUES ($1, $2, $3, 'SUBMITTED', $4)`,
      [uuidv4(), expense.id, userId, 1]
    );

    await client.query('COMMIT');
    return expense;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get expenses with pagination and filters
 */
const getExpenses = async ({ status, page = 1, limit = 10, category_id }, company_id, userId = null, isAdmin = false) => {
  const offset = (page - 1) * limit;
  const conditions = ['e.company_id = $1', 'e.deleted_at IS NULL'];
  const params = [company_id];
  let paramIdx = 2;

  if (!isAdmin && userId) {
    conditions.push(`e.user_id = $${paramIdx++}`);
    params.push(userId);
  }
  if (status) {
    conditions.push(`e.status = $${paramIdx++}`);
    params.push(status);
  }
  if (category_id) {
    conditions.push(`e.category_id = $${paramIdx++}`);
    params.push(category_id);
  }

  const where = conditions.join(' AND ');

  const totalResult = await query(`SELECT COUNT(*) FROM expenses e WHERE ${where}`, params);
  const total = parseInt(totalResult.rows[0].count);

  const result = await query(
    `SELECT e.*, 
       u.full_name as submitter_name, u.email as submitter_email,
       c.name as category_name,
       w.name as workflow_name
     FROM expenses e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN categories c ON c.id = e.category_id
     LEFT JOIN workflows w ON w.id = e.workflow_id
     WHERE ${where}
     ORDER BY e.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return { expenses: result.rows, total };
};

/**
 * Get single expense with approval timeline
 */
const getExpenseById = async (expenseId, company_id) => {
  const expenseResult = await query(
    `SELECT e.*, 
       u.full_name as submitter_name, u.email as submitter_email,
       c.name as category_name,
       w.name as workflow_name
     FROM expenses e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN categories c ON c.id = e.category_id
     LEFT JOIN workflows w ON w.id = e.workflow_id
     WHERE e.id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL`,
    [expenseId, company_id]
  );

  if (expenseResult.rows.length === 0) return null;
  const expense = expenseResult.rows[0];

  // Get approval steps (grouped by step_order)
  const stepsResult = await query(
    `SELECT es.*, u.full_name as approver_name, u.email as approver_email
     FROM expense_steps es
     LEFT JOIN users u ON u.id = es.approver_id
     WHERE es.expense_id = $1
     ORDER BY es.step_order ASC, es.created_at ASC`,
    [expenseId]
  );

  // Get audit logs
  const logsResult = await query(
    `SELECT al.*, u.full_name as actor_name
     FROM approval_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.expense_id = $1
     ORDER BY al.created_at ASC`,
    [expenseId]
  );

  return { ...expense, steps: stepsResult.rows, audit_logs: logsResult.rows };
};

module.exports = { createExpense, getExpenses, getExpenseById };
