require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const users = await client.query('SELECT id, full_name, role, manager_id FROM users');
  const workflows = await client.query('SELECT * FROM workflows');
  const ws = await client.query('SELECT * FROM workflow_steps');
  const sa = await client.query('SELECT * FROM step_approvers');
  const expenses = await client.query('SELECT id, amount, status, workflow_id, current_step_order, user_id FROM expenses ORDER BY created_at DESC LIMIT 5');
  const steps = await client.query('SELECT id, expense_id, step_order, approver_id, status FROM expense_steps ORDER BY created_at DESC');
  
  const output = JSON.stringify({
    users: users.rows,
    workflows: workflows.rows,
    ws: ws.rows,
    sa: sa.rows,
    recent_expenses: expenses.rows,
    all_expense_steps: steps.rows
  }, null, 2);
  
  fs.writeFileSync('db_state_detailed.json', output);
  await client.end();
}
test().catch(console.error);
