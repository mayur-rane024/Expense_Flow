const { query, getClient } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Evaluate whether a step's approval rule is satisfied.
 * @param {string} ruleType - PERCENTAGE | SPECIFIC | HYBRID
 * @param {object} ruleValue - JSON rule configuration
 * @param {Array} stepRows - All expense_step rows for this step_order
 * @param {string} actingUserId - The user who just approved
 */
const evaluateRule = (ruleType, ruleValue, stepRows, actingUserId) => {
  const total = stepRows.length;
  const approvedCount = stepRows.filter((s) => s.status === 'APPROVED').length;

  switch (ruleType) {
    case 'PERCENTAGE': {
      // ruleValue: { threshold: 0.5 } means 50% must approve
      const threshold = ruleValue.threshold || 1.0;
      return approvedCount / total >= threshold;
    }

    case 'SPECIFIC': {
      // ruleValue: { required_user_id: "uuid" } - specific person must approve
      const requiredUserId = ruleValue.required_user_id;
      if (!requiredUserId) return approvedCount === total;
      return stepRows.some(
        (s) => s.approver_id === requiredUserId && s.status === 'APPROVED'
      );
    }

    case 'HYBRID': {
      // ruleValue: { threshold: 0.5, required_user_id: "uuid" }
      // Either percentage OR specific user approval satisfies the rule
      const threshold = ruleValue.threshold || 1.0;
      const percentageMet = approvedCount / total >= threshold;

      const requiredUserId = ruleValue.required_user_id;
      const specificMet = requiredUserId
        ? stepRows.some((s) => s.approver_id === requiredUserId && s.status === 'APPROVED')
        : false;

      return percentageMet || specificMet;
    }

    default:
      // Default: unanimous approval required
      return approvedCount === total;
  }
};

/**
 * Core approval engine - handles approve/reject with row-level locking.
 * Uses DB transactions to prevent race conditions.
 */
const processApproval = async (expenseId, userId, action, comment = '') => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Lock and fetch the expense to prevent race conditions
    const expenseResult = await client.query(
      `SELECT e.*, u.manager_id as manager_id
       FROM expenses e
       JOIN users u ON u.id = e.user_id
       WHERE e.id = $1 AND e.deleted_at IS NULL
       FOR UPDATE`,
      [expenseId]
    );

    if (expenseResult.rows.length === 0) {
      throw Object.assign(new Error('Expense not found'), { code: 'NOT_FOUND', status: 404 });
    }

    const expense = expenseResult.rows[0];

    if (expense.status !== 'PENDING') {
      throw Object.assign(
        new Error(`Expense is already ${expense.status.toLowerCase()}`),
        { code: 'INVALID_STATE', status: 400 }
      );
    }

    const currentStep = expense.current_step_order;

    // 2. Find and lock this user's step at the current step order
    const userStepResult = await client.query(
      `SELECT * FROM expense_steps
       WHERE expense_id = $1 AND step_order = $2 AND approver_id = $3 AND status = 'PENDING'
       FOR UPDATE`,
      [expenseId, currentStep, userId]
    );

    if (userStepResult.rows.length === 0) {
      throw Object.assign(
        new Error('You are not an approver for the current step or have already acted'),
        { code: 'FORBIDDEN', status: 403 }
      );
    }

    const userStep = userStepResult.rows[0];

    // 3. Mark this approver's action
    await client.query(
      `UPDATE expense_steps 
       SET status = $1, acted_at = NOW() 
       WHERE id = $2`,
      [action, userStep.id]
    );

    // 4. Audit log
    await client.query(
      `INSERT INTO approval_logs (id, expense_id, user_id, action, comment, step_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), expenseId, userId, action, comment, currentStep]
    );

    // 5. REJECTION: immediate - any rejector stops the workflow
    if (action === 'REJECTED') {
      // Mark all remaining pending steps as SKIPPED
      await client.query(
        `UPDATE expense_steps SET status = 'SKIPPED'
         WHERE expense_id = $1 AND status = 'PENDING'`,
        [expenseId]
      );
      await client.query(
        `UPDATE expenses SET status = 'REJECTED' WHERE id = $1`,
        [expenseId]
      );
      await client.query('COMMIT');
      return { action: 'REJECTED', expense_id: expenseId };
    }

    // 6. APPROVAL: evaluate whether current step's rule is satisfied
    const allCurrentStepsResult = await client.query(
      `SELECT * FROM expense_steps
       WHERE expense_id = $1 AND step_order = $2
       FOR UPDATE`,
      [expenseId, currentStep]
    );
    const allCurrentSteps = allCurrentStepsResult.rows;

    // Use the rule from the step (all steps at same order share same rule)
    const { rule_type, rule_value } = userStep;
    const ruleSatisfied = evaluateRule(rule_type, rule_value, allCurrentSteps, userId);

    if (!ruleSatisfied) {
      // Rule not yet satisfied - waiting for more approvers
      await client.query('COMMIT');
      return { action: 'PENDING', message: 'Waiting for more approvals', expense_id: expenseId };
    }

    // 7. Rule satisfied - advance to next step
    const nextStepResult = await client.query(
      `SELECT MIN(step_order) as next_step FROM expense_steps 
       WHERE expense_id = $1 AND step_order > $2 AND status = 'PENDING'`,
      [expenseId, currentStep]
    );
    
    const trueNextStep = nextStepResult.rows[0].next_step;

    if (trueNextStep === null) {
      // No more PENDING steps - FULLY APPROVED
      await client.query(
        `UPDATE expenses SET status = 'APPROVED', current_step_order = $1 WHERE id = $2`,
        [currentStep, expenseId]
      );
      await client.query('COMMIT');
      return { action: 'FULLY_APPROVED', expense_id: expenseId };
    }

    // 8. Advance to true next step
    await client.query(
      `UPDATE expenses SET current_step_order = $1 WHERE id = $2`,
      [trueNextStep, expenseId]
    );

    await client.query('COMMIT');
    return { action: 'ADVANCED', next_step: trueNextStep, expense_id: expenseId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Admin override - forcefully approve or reject an expense
 */
const overrideExpense = async (expenseId, adminId, action, comment = '') => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const expenseResult = await client.query(
      'SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [expenseId]
    );

    if (expenseResult.rows.length === 0) {
      throw Object.assign(new Error('Expense not found'), { code: 'NOT_FOUND', status: 404 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await client.query(
      'UPDATE expenses SET status = $1 WHERE id = $2',
      [newStatus, expenseId]
    );

    // Skip all pending steps
    await client.query(
      `UPDATE expense_steps SET status = 'SKIPPED' WHERE expense_id = $1 AND status = 'PENDING'`,
      [expenseId]
    );

    await client.query(
      `INSERT INTO approval_logs (id, expense_id, user_id, action, comment, step_order)
       VALUES ($1, $2, $3, 'OVERRIDDEN', $4, -1)`,
      [uuidv4(), expenseId, adminId, comment]
    );

    await client.query('COMMIT');
    return { action: newStatus, expense_id: expenseId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get pending approvals for a user (manager/approver view)
 */
const getPendingApprovals = async (userId, company_id, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const totalResult = await query(
    `SELECT COUNT(DISTINCT e.id) 
     FROM expenses e
     JOIN expense_steps es ON es.expense_id = e.id
     WHERE es.approver_id = $1 
       AND es.status = 'PENDING'
       AND e.status = 'PENDING'
       AND e.company_id = $2
       AND e.current_step_order = es.step_order`,
    [userId, company_id]
  );
  const total = parseInt(totalResult.rows[0].count);

  const result = await query(
    `SELECT DISTINCT e.*, 
       u.full_name as submitter_name, u.email as submitter_email,
       c.name as category_name,
       w.name as workflow_name,
       es.step_order as pending_step_order
     FROM expenses e
     JOIN expense_steps es ON es.expense_id = e.id
     JOIN users u ON u.id = e.user_id
     LEFT JOIN categories c ON c.id = e.category_id
     LEFT JOIN workflows w ON w.id = e.workflow_id
     WHERE es.approver_id = $1 
       AND es.status = 'PENDING'
       AND e.status = 'PENDING'
       AND e.company_id = $2
       AND e.current_step_order = es.step_order
     ORDER BY e.created_at ASC
     LIMIT $3 OFFSET $4`,
    [userId, company_id, limit, offset]
  );

  return { expenses: result.rows, total };
};

module.exports = { processApproval, overrideExpense, getPendingApprovals };
