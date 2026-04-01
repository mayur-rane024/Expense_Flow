require('dotenv').config();
const { query } = require('./index');

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  default_currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Workflows (templates)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Workflow Steps (template steps)
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('PERCENTAGE', 'SPECIFIC', 'HYBRID')),
  rule_value JSONB NOT NULL DEFAULT '{}',
  is_manager_step BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, step_order)
);

-- Step Approvers (template approvers)
CREATE TABLE IF NOT EXISTS step_approvers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(step_id, user_id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  category_id UUID REFERENCES categories(id),
  description TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  current_step_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Expense Steps (runtime copy of workflow steps)
CREATE TABLE IF NOT EXISTS expense_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  approver_id UUID REFERENCES users(id),
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('PERCENTAGE', 'SPECIFIC', 'HYBRID')),
  rule_value JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')),
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval Logs (audit trail)
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('APPROVED', 'REJECTED', 'OVERRIDDEN', 'SUBMITTED')),
  comment TEXT,
  step_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expense_steps_expense_id ON expense_steps(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_steps_expense_step ON expense_steps(expense_id, step_order);
CREATE INDEX IF NOT EXISTS idx_expense_steps_approver_status ON expense_steps(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_logs_expense_id ON approval_logs(expense_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

async function migrate() {
  try {
    console.log('🚀 Running database migration...');
    await query(schema);
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
