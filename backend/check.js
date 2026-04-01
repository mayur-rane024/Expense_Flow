require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const users = await client.query('SELECT id, full_name, email, role, manager_id FROM users');
  const expenses = await client.query('SELECT id, amount, status, current_step_order, user_id FROM expenses');
  const steps = await client.query('SELECT id, expense_id, step_order, approver_id, status FROM expense_steps');
  
  const output = JSON.stringify({
    users: users.rows,
    expenses: expenses.rows,
    steps: steps.rows
  }, null, 2);
  
  fs.writeFileSync('db_state.json', output);
  await client.end();
}
test().catch(console.error);
