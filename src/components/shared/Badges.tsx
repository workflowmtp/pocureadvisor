import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SEVERITY_CONFIG, SUPPLIER_STATUS_CONFIG } from '@/lib/constants';
import { scoreBgClass } from '@/lib/format';

// ─── Severity Badge ───
export const SeverityBadge = memo(function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
  if (!config) return <span className="text-xs text-[var(--text-tertiary)]">{severity}</span>;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold', config.bgClass)}>
      {config.label}
    </span>
  );
});

// ─── Score Badge ───
export const ScoreBadge = memo(function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm';
  const bgClass = scoreBgClass(score);

  return (
    <span className={cn('score-badge', sizeClass, bgClass)}>
      {score}
    </span>
  );
});

// ─── Supplier Status Badge ───
export const SupplierStatusBadge = memo(function SupplierStatusBadge({ status }: { status: string }) {
  const config = SUPPLIER_STATUS_CONFIG[status as keyof typeof SUPPLIER_STATUS_CONFIG];
  if (!config) return <span className="text-xs">{status}</span>;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold', config.bgClass)}>
      {config.label}
    </span>
  );
});

// ─── Trend Badge ───
const TREND_CONFIG: Record<string, { icon: string; color: string }> = {
  rising:    { icon: '↗', color: 'text-brand-green' },
  stable:    { icon: '→', color: 'text-[var(--text-tertiary)]' },
  declining: { icon: '↘', color: 'text-brand-red' },
};

export const TrendBadge = memo(function TrendBadge({ trend }: { trend: string }) {
  const tc = TREND_CONFIG[trend] || TREND_CONFIG.stable;
  return <span className={cn('text-sm font-bold', tc.color)}>{tc.icon}</span>;
});

// ─── Priority Tag ───
const PRIORITY_CLASSES: Record<number, string> = {
  1: 'bg-brand-red-soft text-brand-red',
  2: 'bg-brand-orange-soft text-brand-orange',
  3: 'bg-brand-blue-soft text-brand-blue',
};

export const PriorityTag = memo(function PriorityTag({ priority }: { priority: number }) {
  const cls = PRIORITY_CLASSES[priority] || PRIORITY_CLASSES[3];
  return (
    <span className={cn('inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full font-mono text-[11px] font-bold', cls)}>
      P{priority}
    </span>
  );
});

// ─── X3 Sync Badge ───
export const X3Badge = memo(function X3Badge({ status }: { status: string }) {
  if (status === 'synced') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-green-soft text-brand-green">🔗 Sage X3</span>;
  if (status === 'conflict') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-red-soft text-brand-red">⚠ Conflit X3</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">— Non lié X3</span>;
});
