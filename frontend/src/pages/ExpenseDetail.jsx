import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { expenseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';
import { ArrowLeft, DollarSign, Calendar, Tag, FileText, User, Layers, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-dark-700/30 last:border-none">
    <div className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-dark-400" />
    </div>
    <div>
      <p className="text-xs text-dark-500 font-medium">{label}</p>
      <p className="text-sm text-dark-200 font-medium mt-0.5">{value || '—'}</p>
    </div>
  </div>
);

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    expenseAPI.getById(id).then(res => {
      setExpense(res.data.data.expense);
    }).catch(err => {
      setError(err.response?.data?.error?.message || 'Failed to load expense');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-8 w-32 bg-dark-700/50 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-64 glass-card animate-pulse" />
          <div className="lg:col-span-2 h-64 glass-card animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
      </div>
    );
  }

  if (!expense) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl glass-card hover:border-dark-600 flex items-center justify-center text-dark-400 hover:text-dark-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-dark-100">Expense Details</h1>
            <StatusBadge status={expense.status} />
          </div>
          <p className="text-dark-500 text-xs mt-0.5">ID: {expense.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Expense info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Amount highlight */}
          <div className={`glass-card p-6 text-center ${
            expense.status === 'APPROVED' ? 'glow-green' :
            expense.status === 'REJECTED' ? 'glow-red' : 'glow'
          }`}>
            <p className="text-dark-400 text-sm mb-1">Amount</p>
            <p className="text-4xl font-bold text-dark-100">
              ${parseFloat(expense.amount).toFixed(2)}
            </p>
            <p className="text-dark-500 text-sm mt-1">{expense.currency}</p>
            <div className="mt-4 pt-4 border-t border-dark-700/50">
              <StatusBadge status={expense.status} />
            </div>
          </div>

          {/* Details */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-dark-200 mb-3">Expense Info</h3>
            <InfoRow icon={User} label="Submitted by" value={expense.submitter_name} />
            <InfoRow icon={Tag} label="Category" value={expense.category_name} />
            <InfoRow icon={Calendar} label="Date" value={expense.expense_date ? format(new Date(expense.expense_date), 'MMM d, yyyy') : '—'} />
            <InfoRow icon={Layers} label="Workflow" value={expense.workflow_name} />
            <InfoRow icon={FileText} label="Description" value={expense.description} />
            <InfoRow icon={DollarSign} label="Step" value={`Step ${expense.current_step_order}`} />
          </div>

          {/* Receipt Image */}
          {expense.receipt_url && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-dark-200 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary-400" />
                Receipt
              </h3>
              <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-dark-700/50 hover:border-primary-500/30 transition-colors">
                <img src={expense.receipt_url} alt="Expense Receipt" className="w-full h-auto object-cover max-h-64" />
              </a>
            </div>
          )}
        </div>

        {/* Right: Approval timeline */}
        <div className="lg:col-span-2">
          <ApprovalTimeline
            steps={expense.steps || []}
            auditLogs={expense.audit_logs || []}
            currentStepOrder={expense.current_step_order}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;
