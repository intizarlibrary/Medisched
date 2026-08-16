import React from 'react';
import {
  Clock,
  CheckCircle2,
  UserCheck,
  Stethoscope,
  XCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const StatusBadge = ({ status, className = '', size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'Confirmed':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: 'Confirmed'
        };
      case 'Checked In':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <UserCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: 'Checked In'
        };
      case 'In Consultation':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
          icon: <Stethoscope className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-pulse text-emerald-600`} />,
          label: 'In Consultation'
        };
      case 'Completed':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: 'Completed'
        };
      case 'Cancelled':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: 'Cancelled'
        };
      case 'No Show':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: 'No Show'
        };
      case 'Rescheduled':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <RotateCcw className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: 'Rescheduled'
        };
      case 'Pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
          label: status || 'Pending'
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border whitespace-nowrap ${config.bg} ${sizeClasses} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
