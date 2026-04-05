'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

const POLE_COLORS: Record<string, string> = {
  OE: '#3B82F6',
  HF: '#8B5CF6',
  OC: '#06B6D4',
  BC: '#F59E0B',
};

const CATEGORY_COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#F97316', '#6366F1', '#84CC16'];

interface VolumeByPoleProps {
  data: { pole: string; amount: number }[];
}

export function VolumeByPoleChart({ data }: VolumeByPoleProps) {
  const formatM = (v: number) => Math.round(v / 1000000) + 'M';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Volume commandes par pôle</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
          <XAxis dataKey="pole" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis tickFormatter={formatM} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} width={50} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Volume']}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.pole} fill={POLE_COLORS[entry.pole] || '#3B82F6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CategoryDistributionProps {
  data: { name: string; value: number }[];
}

export function CategoryDistributionChart({ data }: CategoryDistributionProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Répartition par catégorie</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${formatCurrency(value)} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
