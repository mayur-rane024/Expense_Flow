import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { expenseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ExpenseForm from '../components/ExpenseForm';
import { Plus, FileText, DollarSign, Clock, CheckCircle, XCircle, TrendingUp, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="stat-card group hover:border-dark-600/80 transition-all duration-300">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity ${
        color.includes('primary') ? 'bg-primary-500/15 border border-primary-500/20' :
        color.includes('emerald') ? 'bg-emerald-500/15 border border-emerald-500/20' :
        color.includes('amber') ? 'bg-amber-500/15 border border-amber-500/20' :
        'bg-red-500/15 border border-red-500/20'
      }`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
  </div>
);

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.getMy({ status: filter || undefined, page, limit: 10 });
      setExpenses(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const stats = {
    total: expenses.length,
    pending: expenses.filter(e => e.status === 'PENDING').length,
    approved: expenses.filter(e => e.status === 'APPROVED').length,
    rejected: expenses.filter(e => e.status === 'REJECTED').length,
    totalAmount: expenses.reduce((s, e) => s + parseFloat(e.amount), 0),
  };

  const chartData = [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-dark-400 text-sm mt-1">Track and manage your expense reimbursements</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
          id="submit-expense-btn"
        >
          <Plus className="w-4 h-4" />
          Submit Expense
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Amount" value={`$${stats.totalAmount.toFixed(0)}`} icon={DollarSign} color="text-primary-400" subtitle={`${pagination.total || 0} expenses`} />
        <StatCard title="Pending Review" value={stats.pending} icon={Clock} color="text-amber-400" subtitle="Awaiting approval" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="text-emerald-400" subtitle="Reimbursed" />
        <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="text-red-400" subtitle="Not approved" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-dark-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Expenses by Status
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-200">Recent Expenses</h3>
            <div className="flex gap-2">
              {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <button
                  key={s}
                  onClick={() => { setFilter(s); setPage(1); }}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                    filter === s
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-dark-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">No expenses yet</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-3 text-sm">
                Submit your first expense
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 6).map(expense => (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-700/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-dark-700/50 flex items-center justify-center border border-dark-600/50">
                      <FileText className="w-4 h-4 text-dark-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-200 group-hover:text-dark-100">{expense.category_name}</p>
                      <p className="text-xs text-dark-500">{format(new Date(expense.expense_date || expense.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-dark-100">${parseFloat(expense.amount).toFixed(2)}</span>
                    <StatusBadge status={expense.status} />
                    <ExternalLink className="w-3.5 h-3.5 text-dark-600 group-hover:text-dark-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-dark-700/50">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
              >Previous</button>
              <span className="text-xs text-dark-400">Page {page} of {pagination.totalPages}</span>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
              >Next</button>
            </div>
          )}
        </div>
      </div>

      {showForm && <ExpenseForm onClose={() => setShowForm(false)} onSuccess={fetchExpenses} />}
    </div>
  );
};

export default EmployeeDashboard;
