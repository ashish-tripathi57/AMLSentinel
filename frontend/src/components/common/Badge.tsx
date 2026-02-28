import React from 'react';

interface BadgeProps {
  variant: 'new' | 'in-progress' | 'review' | 'escalated' | 'closed' | 'critical' | 'high' | 'medium' | 'low';
  children: React.ReactNode;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  new: 'bg-status-new/10 text-status-new',
  'in-progress': 'bg-status-in-progress/10 text-status-in-progress',
  review: 'bg-status-review/10 text-status-review',
  escalated: 'bg-status-escalated/10 text-status-escalated',
  closed: 'bg-status-closed/10 text-status-closed',
  critical: 'bg-severity-critical/10 text-severity-critical',
  high: 'bg-severity-high/10 text-severity-high',
  medium: 'bg-severity-medium/10 text-severity-medium',
  low: 'bg-severity-low/10 text-severity-low',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
