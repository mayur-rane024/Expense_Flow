import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, User } from 'lucide-react';
import StatusBadge from './StatusBadge';

const ApprovalTimeline = ({ steps = [], auditLogs = [], currentStepOrder = 1 }) => {
  const [expanded, setExpanded] = useState(true);

  // Group steps by step_order
  const groupedSteps = steps.reduce((acc, step) => {
    if (!acc[step.step_order]) acc[step.step_order] = [];
    acc[step.step_order].push(step);
    return acc;
  }, {});

  const stepOrders = Object.keys(groupedSteps).map(Number).sort((a, b) => a - b);

  return (
    <div className="glass-card p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-4"
      >
        <h3 className="font-semibold text-dark-100">Approval Timeline</h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-dark-400" /> : <ChevronDown className="w-4 h-4 text-dark-400" />}
      </button>

      {expanded && (
        <div className="space-y-4 animate-fade-in">
          {stepOrders.length === 0 ? (
            <p className="text-dark-400 text-sm">No workflow steps assigned yet.</p>
          ) : (
            stepOrders.map((order) => {
              const stepGroup = groupedSteps[order];
              const isCurrentStep = order === currentStepOrder;
              const isPast = order < currentStepOrder;
              const allApproved = stepGroup.every(s => s.status === 'APPROVED');
              const anyRejected = stepGroup.some(s => s.status === 'REJECTED');

              return (
                <div key={order} className="relative pl-8">
                  {/* Timeline connector */}
                  <div className={`absolute left-3 top-0 bottom-0 w-0.5 ${
                    isPast || allApproved ? 'bg-emerald-500/40' :
                    anyRejected ? 'bg-red-500/40' :
                    isCurrentStep ? 'bg-primary-500/40' : 'bg-dark-700'
                  }`} />

                  {/* Step indicator */}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    allApproved || isPast ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                    anyRejected ? 'bg-red-500/20 border-red-500 text-red-400' :
                    isCurrentStep ? 'bg-primary-500/20 border-primary-500 text-primary-400 animate-pulse-slow' :
                    'bg-dark-700 border-dark-600 text-dark-400'
                  }`}>
                    {order}
                  </div>

                  <div className="mb-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-dark-200">
                        Step {order}
                        {isCurrentStep && <span className="ml-2 text-xs text-primary-400">(Current)</span>}
                      </span>
                      {allApproved && <StatusBadge status="APPROVED" />}
                      {anyRejected && <StatusBadge status="REJECTED" />}
                      {!allApproved && !anyRejected && order > currentStepOrder && <StatusBadge status="PENDING" />}
                    </div>

                    <div className="space-y-2">
                      {stepGroup.map((step) => (
                        <div key={step.id} className="flex items-center justify-between bg-dark-800/50 rounded-lg px-3 py-2 border border-dark-700/30">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center">
                              <User className="w-3 h-3 text-dark-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-dark-200">
                                {step.approver_name || 'Unknown Approver'}
                              </p>
                              {step.acted_at && (
                                <p className="text-xs text-dark-500">
                                  {format(new Date(step.acted_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={step.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Audit Log */}
          {auditLogs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-dark-700/50">
              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Audit Log</h4>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.action === 'APPROVED' || log.action === 'OVERRIDDEN' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.action === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {log.action === 'APPROVED' || log.action === 'OVERRIDDEN' ? <CheckCircle className="w-3 h-3" /> :
                       log.action === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                       <span className="text-[9px] font-bold">S</span>}
                    </div>
                    <div>
                      <p className="text-dark-300">
                        <span className="font-medium text-dark-200">{log.actor_name}</span>
                        {' '}{log.action.toLowerCase()} this expense
                        {log.comment && <span className="text-dark-400 italic"> — "{log.comment}"</span>}
                      </p>
                      <p className="text-dark-500">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalTimeline;
