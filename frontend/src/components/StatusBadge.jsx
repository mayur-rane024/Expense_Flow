import clsx from 'clsx';
import { Clock, CheckCircle, XCircle, Minus } from 'lucide-react';

const StatusBadge = ({ status, size = 'sm' }) => {
  const config = {
    PENDING: { label: 'Pending', class: 'badge-pending', icon: Clock },
    APPROVED: { label: 'Approved', class: 'badge-approved', icon: CheckCircle },
    REJECTED: { label: 'Rejected', class: 'badge-rejected', icon: XCircle },
    SKIPPED: { label: 'Skipped', class: 'badge-skipped', icon: Minus },
    SUBMITTED: { label: 'Submitted', class: 'badge-pending', icon: Clock },
    OVERRIDDEN: { label: 'Overridden', class: 'badge-approved', icon: CheckCircle },
  };

  const item = config[status] || config.PENDING;
  const Icon = item.icon;

  return (
    <span className={item.class}>
      <Icon className="w-3 h-3" />
      {item.label}
    </span>
  );
};

export default StatusBadge;
