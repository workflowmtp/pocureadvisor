import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface AlertItem {
  id: string;
  title: string;
  supplier?: string;
  detail?: string;
  impact?: number | null;
  riskOfStockout?: boolean;
}

interface AlertCardProps {
  type: 'critical' | 'warning' | 'opportunity';
  title: string;
  icon: string;
  items: AlertItem[];
}

const typeConfig = {
  critical: {
    border: 'border-l-brand-red',
    bg: 'bg-brand-red-soft',
    badge: 'bg-brand-red text-white',
    iconBg: 'bg-brand-red-soft text-brand-red',
  },
  warning: {
    border: 'border-l-brand-orange',
    bg: 'bg-brand-orange-soft',
    badge: 'bg-brand-orange text-white',
    iconBg: 'bg-brand-orange-soft text-brand-orange',
  },
  opportunity: {
    border: 'border-l-brand-blue',
    bg: 'bg-brand-blue-soft',
    badge: 'bg-brand-blue text-white',
    iconBg: 'bg-brand-blue-soft text-brand-blue',
  },
};

export default function AlertCard({ type, title, icon, items }: AlertCardProps) {
  const config = typeConfig[type];

  if (items.length === 0) return null;

  return (
    <div className={cn('bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden')}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)]">
        <div className="flex items-center gap-2">
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm', config.iconBg)}>
            {icon}
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
        <span className={cn('min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center', config.badge)}>
          {items.length}
        </span>
      </div>

      <div className="divide-y divide-[var(--border-secondary)]">
        {items.map((item) => (
          <div key={item.id} className={cn('px-4 py-3 border-l-3', config.border, 'hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer')}>
            <div className="text-sm font-medium text-[var(--text-primary)] leading-tight">
              {item.title}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[var(--text-tertiary)]">
                {item.supplier || item.detail || ''}
              </span>
              {item.impact ? (
                <span className="text-xs font-mono font-bold text-brand-red">
                  {formatCurrency(item.impact)}
                </span>
              ) : null}
            </div>
            {item.riskOfStockout && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-brand-red-soft text-brand-red text-[10px] font-bold rounded-full">
                🚨 Risque rupture
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
