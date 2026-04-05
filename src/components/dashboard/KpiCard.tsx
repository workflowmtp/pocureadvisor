'use client';

import { memo, useMemo } from 'react';

interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trendValue?: number;
  trendDir?: 'up' | 'down' | 'neutral';
}

const colorClasses = {
  blue: 'bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]',
  green: 'bg-[var(--accent-green-soft)] text-[var(--accent-green)]',
  orange: 'bg-[var(--accent-orange-soft)] text-[var(--accent-orange)]',
  red: 'bg-[var(--accent-red-soft)] text-[var(--accent-red)]',
  purple: 'bg-[var(--accent-purple-soft)] text-[var(--accent-purple)]',
};

const trendColors = {
  up: 'text-[var(--accent-green)]',
  down: 'text-[var(--accent-red)]',
  neutral: 'text-[var(--text-tertiary)]',
};

const KpiCard = memo(function KpiCard({ icon, label, value, color, trendValue = 0, trendDir = 'neutral' }: KpiCardProps) {
  // Memoize trend rendering
  const trendElement = useMemo(() => {
    if (trendDir === 'up') {
      return (
        <div className={`kpi-trend up ${trendColors.up}`}>
          ↑ +{Math.abs(trendValue).toFixed(1)}%
        </div>
      );
    } else if (trendDir === 'down') {
      return (
        <div className={`kpi-trend down ${trendColors.down}`}>
          ↓ {Math.abs(trendValue).toFixed(1)}%
        </div>
      );
    }
    return (
      <div className={`kpi-trend neutral ${trendColors.neutral}`}>
        → Stable
      </div>
    );
  }, [trendDir, trendValue]);

  // Memoize color class
  const colorClass = colorClasses[color];

  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${colorClass}`}>
        {icon}
      </div>
      <div className="kpi-content">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {trendDir !== 'neutral' && trendElement}
      </div>
    </div>
  );
});

export default KpiCard;
