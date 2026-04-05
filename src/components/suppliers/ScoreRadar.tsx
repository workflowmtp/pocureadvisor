'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface ScoreRadarProps {
  scoring: {
    quality: number;
    price: number;
    delivery: number;
    docCompliance: number;
    reactivity: number;
    regularity: number;
    global: number;
  };
}

export default function ScoreRadar({ scoring }: ScoreRadarProps) {
  const data = [
    { axis: 'Qualité', value: scoring.quality, fullMark: 100 },
    { axis: 'Prix', value: scoring.price, fullMark: 100 },
    { axis: 'Délais', value: scoring.delivery, fullMark: 100 },
    { axis: 'Conformité doc.', value: scoring.docCompliance, fullMark: 100 },
    { axis: 'Réactivité', value: scoring.reactivity, fullMark: 100 },
    { axis: 'Régularité', value: scoring.regularity, fullMark: 100 },
  ];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Radar de scoring</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-tertiary)]">Score global</span>
          <span className={`font-mono text-xl font-bold ${
            scoring.global >= 80 ? 'text-brand-green' : scoring.global >= 60 ? 'text-brand-blue' : scoring.global >= 40 ? 'text-brand-orange' : 'text-brand-red'
          }`}>
            {scoring.global}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="var(--border-primary)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px' }}
            formatter={(value: number) => [`${value}/100`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {data.map((d) => (
          <div key={d.axis} className="text-center p-2 bg-[var(--bg-input)] rounded-lg">
            <div className={`font-mono text-lg font-bold ${
              d.value >= 80 ? 'text-brand-green' : d.value >= 60 ? 'text-brand-blue' : d.value >= 40 ? 'text-brand-orange' : 'text-brand-red'
            }`}>
              {d.value}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{d.axis}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
