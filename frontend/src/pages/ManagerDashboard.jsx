import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { approvalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { CheckSquare, Clock, CheckCircle, XCircle, ExternalLink, MessageSquare, X, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ActionModal = ({ expense, action, onClose, onSuccess }) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (action === 'approve') {
        await approvalAPI.approve(expense.id, { comment });
        toast.success('Expense approved!');
      } else {
        await approvalAPI.reject(expense.id, { comment });
        toast.success('Expense rejected');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-dark-100">
            {action === 'approve' ? '✅ Approve Expense' : '❌ Reject Expense'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-dark-700 flex items-center justify-center text-dark-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-dark-800/50 rounded-xl p-4 mb-4 border border-dark-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-dark-200">{expense.submitter_name}</p>
              <p className="text-sm text-dark-400">{expense.category_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-dark-100">${parseFloat(expense.amount).toFixed(2)}</p>
              <p className="text-xs text-dark-500">{expense.currency}</p>
            </div>
          </div>
          {expense.description && (
            <p className="text-sm text-dark-400 mt-2 italic">"{expense.description}"</p>
          )}
        </div>

        <div className="mb-4">
          <label className="label flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Comment {action === 'reject' ? '(recommended)' : '(optional)'}
          </label>
          <textarea
            className="input-field resize-none h-20"
            placeholder={action === 'reject' ? 'Reason for rejection...' : 'Add a note...'}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleAction}
            disabled={loading}
            className={`flex-1 font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 disabled:opacity-50 ${
              action === 'approve'
                ? 'btn-success'
                : 'btn-danger'
            }`}
          >
            {loading ? 'Processing...' : action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [page, setPage] = useState(1);
  const [exchangeRates, setExchangeRates] = useState({});
  const companyCurrency = user?.company_currency || 'USD';

  useEffect(() => {
    fetch(`https://api.exchangerate-api.com/v4/latest/${companyCurrency}`)
      .then(res => res.json())
      .then(data => {
         if (data.rates) setExchangeRates(data.rates);
      }).catch(err => console.error("Exchange rate fetch failed"));
  }, [companyCurrency]);

  const renderAmount = (amount, expCurrency) => {
    const amt = parseFloat(amount);
    if (expCurrency === companyCurrency) {
      return (
        <span className="font-bold text-dark-100">${amt.toFixed(2)} {companyCurrency}</span>
      );
    }
    const rate = exchangeRates[expCurrency];
    if (!rate) return <span className="font-bold text-dark-100">${amt.toFixed(2)} {expCurrency}</span>;
    
    // Convert back from expCurrency to Company Base Currency
    const convertedAmt = (amt / rate).toFixed(2);
    
    return (
      <div className="flex flex-col">
        <span className="font-bold text-dark-100 text-sm">{convertedAmt} {companyCurrency}</span>
        <span className="text-rose-400 text-xs font-semibold mt-0.5">{amt.toFixed(2)} {expCurrency}</span>
      </div>
    );
  };

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await approvalAPI.getPending({ page, limit: 10 });
      setPendingExpenses(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Approval Queue</h1>
          <p className="text-dark-400 text-sm mt-1">Review and action pending expense requests</p>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-dark-200">{pagination.total || 0} pending</span>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="table-header">Employee</th>
              <th className="table-header">Category</th>
              <th className="table-header">Amount (in {companyCurrency})</th>
              <th className="table-header">Date</th>
              <th className="table-header">Step</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="table-row">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-5 bg-dark-700/50 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pendingExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <CheckCircle className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
                  <p className="text-dark-400 font-medium">All caught up!</p>
                  <p className="text-dark-500 text-sm">No pending approvals</p>
                </td>
              </tr>
            ) : (
              pendingExpenses.map(expense => (
                <tr key={expense.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-violet-700 flex items-center justify-center text-white text-xs font-bold">
                        {expense.submitter_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-dark-200">{expense.submitter_name}</p>
                        <p className="text-xs text-dark-500">{expense.submitter_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="px-2.5 py-1 bg-dark-700/50 rounded-lg text-xs font-medium text-dark-300">
                      {expense.category_name}
                    </span>
                  </td>
                  <td className="table-cell">
                    {renderAmount(expense.amount, expense.currency)}
                  </td>
                  <td className="table-cell text-dark-400 text-xs">
                    {format(new Date(expense.expense_date || expense.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="table-cell">
                    <span className="badge-pending text-xs">Step {expense.pending_step_order}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActionModal({ expense, action: 'approve' })}
                        className="btn-success text-xs py-1.5 px-3"
                        id={`approve-${expense.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => setActionModal({ expense, action: 'reject' })}
                        className="btn-danger text-xs py-1.5 px-3"
                        id={`reject-${expense.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <Link
                        to={`/expenses/${expense.id}`}
                        className="w-8 h-8 rounded-lg bg-dark-700/50 hover:bg-dark-600/50 flex items-center justify-center text-dark-400 hover:text-dark-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Previous</button>
          <span className="text-xs text-dark-400">Page {page} of {pagination.totalPages}</span>
          <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
        </div>
      )}

      {actionModal && (
        <ActionModal
          expense={actionModal.expense}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onSuccess={fetchPending}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
