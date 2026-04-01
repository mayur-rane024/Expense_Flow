require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const workflows = await client.query('SELECT * FROM workflows');
  const ws = await client.query('SELECT * FROM workflow_steps');
  
  const output = JSON.stringify({
    workflows: workflows.rows,
    ws: ws.rows
  }, null, 2);
  
  fs.writeFileSync('wf_state.json', output);
  await client.end();
}
test().catch(console.error);
