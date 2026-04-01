require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const expenseRoutes = require('./routes/expense.routes');
const approvalRoutes = require('./routes/approval.routes');
const workflowRoutes = require('./routes/workflow.routes');
const adminRoutes = require('./routes/admin.routes');
const sharedRoutes = require('./routes/shared.routes');

const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/expenses', expenseRoutes);
app.use('/approvals', approvalRoutes);
app.use('/workflows', workflowRoutes);
app.use('/admin', adminRoutes);
app.use('/api', sharedRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Expense Reimbursement API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
