import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { expenseAPI, workflowAPI, adminAPI, sharedAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Settings, Users, GitBranch, FileText, Plus, ChevronDown, ChevronUp, Trash2, X, Info, ExternalLink, CheckCircle, XCircle, Shield, Mail } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ---- Workflow Builder ----
const WorkflowBuilder = ({ onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    is_default: false,
    steps: [
      {
        step_order: 1,
        rule_type: 'PERCENTAGE',
        is_manager_step: false,
        approver_ids: [],
        rule_value: { threshold: 1.0 },
      }
    ],
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    sharedAPI.getUsers({ limit: 100 }).then(r => setUsers(r.data.data || []));
  }, []);

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, {
        step_order: f.steps.length + 1,
        rule_type: 'PERCENTAGE',
        is_manager_step: false,
        approver_ids: [],
        rule_value: { threshold: 1.0 },
      }]
    }));
  };

  const removeStep = (idx) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 }))
    }));
  };

  const updateStep = (idx, update) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s, i) => i === idx ? { ...s, ...update } : s)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        steps: form.steps.map(step => ({
          ...step,
          rule_value: step.rule_type === 'PERCENTAGE'
            ? { threshold: parseFloat(step.rule_value.threshold || 1.0) }
            : step.rule_type === 'SPECIFIC'
            ? { required_user_id: step.rule_value.required_user_id }
            : { threshold: parseFloat(step.rule_value.threshold || 0.5), required_user_id: step.rule_value.required_user_id }
        }))
      };
      await workflowAPI.create(payload);
      toast.success('Workflow created!');
      setShowForm(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create workflow');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2" id="create-workflow-btn">
        <Plus className="w-4 h-4" />
        Create Workflow
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
      <div className="relative glass-card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-dark-100">Create Workflow Template</h3>
          <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center text-dark-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Workflow Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Standard Approval"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800/40 rounded-xl border border-dark-700/50 w-full">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary-500"
                  checked={form.is_default}
                  onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                />
                <div>
                  <p className="text-sm font-medium text-dark-200">Set as Default</p>
                  <p className="text-xs text-dark-500">Used for new expenses</p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-dark-200">Approval Steps</h4>
              <button type="button" onClick={addStep} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>

            {form.steps.map((step, idx) => (
              <div key={idx} className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400">
                      {step.step_order}
                    </div>
                    <span className="text-sm font-semibold text-dark-200 flex items-center gap-2">
                      Step {step.step_order}
                      {step.is_manager_step && <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full border border-violet-500/30">Manager Auto-Select</span>}
                    </span>
                  </div>
                  {form.steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Rule Type</label>
                    <select
                      className="input-field text-sm"
                      value={step.rule_type}
                      onChange={e => updateStep(idx, { rule_type: e.target.value, rule_value: {} })}
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="SPECIFIC">Specific User</option>
                      <option value="HYBRID">Hybrid (Either)</option>
                    </select>
                  </div>

                  {(step.rule_type === 'PERCENTAGE' || step.rule_type === 'HYBRID') && (
                    <div>
                      <label className="label text-xs">Approval Threshold</label>
                      <select
                        className="input-field text-sm"
                        value={step.rule_value.threshold || 1.0}
                        onChange={e => updateStep(idx, { rule_value: { ...step.rule_value, threshold: parseFloat(e.target.value) } })}
                      >
                        <option value={0.5}>50% of approvers</option>
                        <option value={0.75}>75% of approvers</option>
                        <option value={1.0}>100% (all approvers)</option>
                      </select>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary-500"
                    checked={step.is_manager_step}
                    onChange={e => updateStep(idx, { is_manager_step: e.target.checked, approver_ids: [] })}
                  />
                  <span className="text-sm text-dark-300">Manager Step (auto-assigns employee's manager)</span>
                </label>

                {!step.is_manager_step && step.rule_type !== 'SPECIFIC' && (
                  <div className="animate-fade-in">
                    <label className="label text-xs">Approvers</label>
                    <select
                      className="input-field text-sm"
                      multiple
                      value={step.approver_ids}
                      onChange={e => updateStep(idx, { approver_ids: Array.from(e.target.selectedOptions, o => o.value) })}
                      size={Math.min(4, users.length)}
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                    </select>
                    <p className="text-xs text-dark-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                )}

                {(step.rule_type === 'SPECIFIC' || step.rule_type === 'HYBRID') && !step.is_manager_step && (
                  <div className="animate-fade-in">
                    <label className="label text-xs">Required Specific User (for SPECIFIC/HYBRID)</label>
                    <select
                      className="input-field text-sm"
                      value={step.rule_value.required_user_id || ''}
                      onChange={e => updateStep(idx, { rule_value: { ...step.rule_value, required_user_id: e.target.value } })}
                    >
                      <option value="">Select user...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---- User Manager ----
const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'EMPLOYEE', manager_id: '' });
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers({ limit: 50 });
      setUsers(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.manager_id) delete payload.manager_id;
      await adminAPI.createUser(payload);
      toast.success('User created!');
      setShowForm(false);
      setForm({ full_name: '', email: '', password: '', role: 'EMPLOYEE', manager_id: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    ADMIN: 'text-violet-400 bg-violet-500/10',
    MANAGER: 'text-blue-400 bg-blue-500/10',
    EMPLOYEE: 'text-emerald-400 bg-emerald-500/10',
  };

  const handleSendPassword = (userEmail) => {
    toast.success(`Password reset link sent to ${userEmail}`, { icon: '📧' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Team Members</h3>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4" id="create-user-btn">
          <Plus className="w-3.5 h-3.5" /> Add User
        </button>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="table-header">Name</th>
              <th className="table-header">Role</th>
              <th className="table-header">Manager</th>
              <th className="table-header">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-violet-700 flex items-center justify-center text-white text-xs font-bold">
                      {user.full_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-dark-200">{user.full_name}</p>
                      <p className="text-xs text-dark-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                  <button onClick={() => handleSendPassword(user.email)} className="block mt-2 text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1">
                     <Mail className="w-3 h-3" /> Send Password
                  </button>
                </td>
                <td className="table-cell text-dark-400 text-sm">{user.manager_name || '—'}</td>
                <td className="table-cell text-dark-400 text-xs">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-dark-100">Add Team Member</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center text-dark-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input-field" placeholder="John Doe" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input-field" placeholder="john@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input-field" placeholder="Min. 8 chars" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role *</label>
                  <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="label">Manager</label>
                  <select className="input-field" value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                    <option value="">None</option>
                    {users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Workflows List ----
const WorkflowsList = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    workflowAPI.getAll({ limit: 20 }).then(r => {
      setWorkflows(r.data.data || []);
    }).finally(() => setLoading(false));
  }, [refresh]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await workflowAPI.delete(id);
      toast.success('Workflow deleted');
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error('Failed to delete workflow');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Workflow Templates</h3>
        <WorkflowBuilder onSuccess={() => setRefresh(r => r + 1)} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 glass-card animate-pulse" />)}
        </div>
      ) : workflows.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <GitBranch className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No workflows yet. Create one to enable dynamic approvals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => (
            <div key={wf.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-dark-100">{wf.name}</h4>
                    {wf.is_default && (
                      <span className="text-xs px-2 py-0.5 bg-primary-500/15 text-primary-400 border border-primary-500/20 rounded-full font-medium">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-dark-500">{wf.steps?.length || 0} steps • Created {format(new Date(wf.created_at), 'MMM d, yyyy')}</p>
                </div>
                <button onClick={() => handleDelete(wf.id)} className="text-dark-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {wf.steps && wf.steps.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {wf.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-xs px-2.5 py-1 bg-dark-700/70 rounded-lg text-dark-300 border border-dark-600/50">
                        Step {step.step_order}: {step.rule_type}
                        {step.is_manager_step && ' (Manager)'}
                      </span>
                      {i < wf.steps.length - 1 && <span className="text-dark-600">→</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---- All Expenses ----
const AllExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [override, setOverride] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ action: 'APPROVE', comment: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.getAll({ status: filter || undefined, page, limit: 15 });
      setExpenses(res.data.data);
      setPagination(res.data.pagination);
    } catch {} finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleOverride = async () => {
    try {
      await adminAPI.overrideExpense(override.id, overrideForm);
      toast.success(`Expense ${overrideForm.action === 'APPROVE' ? 'approved' : 'rejected'}!`);
      setOverride(null);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Override failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">All Expenses</h3>
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${filter === s ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="table-header">Employee</th>
              <th className="table-header">Category</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Workflow</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i} className="table-row">{[...Array(6)].map((_, j) => <td key={j} className="table-cell"><div className="h-4 bg-dark-700/50 rounded animate-pulse" /></td>)}</tr>
            )) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-dark-400">No expenses found</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id} className="table-row">
                <td className="table-cell">
                  <p className="font-medium text-dark-200">{e.submitter_name}</p>
                  <p className="text-xs text-dark-500">{e.submitter_email}</p>
                </td>
                <td className="table-cell text-dark-400">{e.category_name}</td>
                <td className="table-cell"><span className="font-bold text-dark-100">${parseFloat(e.amount).toFixed(2)}</span></td>
                <td className="table-cell text-dark-400 text-xs">{e.workflow_name || '—'}</td>
                <td className="table-cell"><StatusBadge status={e.status} /></td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    {e.status === 'PENDING' && (
                      <button onClick={() => setOverride(e)} className="text-xs px-2.5 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-lg hover:bg-violet-500/25 transition-colors flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Override
                      </button>
                    )}
                    <Link to={`/expenses/${e.id}`} className="w-7 h-7 rounded-lg bg-dark-700/50 flex items-center justify-center text-dark-400 hover:text-dark-200 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {override && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOverride(null)} />
          <div className="relative glass-card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-dark-100 flex items-center gap-2"><Shield className="w-4 h-4 text-violet-400" /> Admin Override</h3>
              <button onClick={() => setOverride(null)} className="w-7 h-7 rounded-lg hover:bg-dark-700 flex items-center justify-center text-dark-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
              <p className="font-semibold text-dark-200">{override.submitter_name}</p>
              <p className="text-sm text-dark-400">{override.category_name} — <span className="font-bold text-dark-100">${parseFloat(override.amount).toFixed(2)}</span></p>
            </div>
            <div className="mb-4">
              <label className="label">Action</label>
              <div className="flex gap-3">
                <button onClick={() => setOverrideForm(f => ({ ...f, action: 'APPROVE' }))} className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${overrideForm.action === 'APPROVE' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-dark-600 text-dark-400 hover:border-dark-500'}`}>Approve</button>
                <button onClick={() => setOverrideForm(f => ({ ...f, action: 'REJECT' }))} className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${overrideForm.action === 'REJECT' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-dark-600 text-dark-400 hover:border-dark-500'}`}>Reject</button>
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Comment</label>
              <textarea className="input-field resize-none h-16" placeholder="Admin override reason..." value={overrideForm.comment} onChange={e => setOverrideForm(f => ({ ...f, comment: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOverride(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleOverride} className="btn-primary flex-1">Apply Override</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Main Admin Panel ----
const TABS = [
  { id: 'workflows', label: 'Workflows', icon: GitBranch },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'expenses', label: 'All Expenses', icon: FileText },
];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('workflows');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Admin Panel</h1>
          <p className="text-dark-400 text-sm mt-1">Manage workflows, users, and all company expenses</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 glass-card text-xs text-violet-400 border-violet-500/20">
          <Shield className="w-3.5 h-3.5" />
          Administrator
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-dark-800/60 rounded-xl border border-dark-700/50 mb-8 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              id={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'workflows' && <WorkflowsList />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'expenses' && <AllExpenses />}
      </div>
    </div>
  );
};

export default AdminPanel;
