import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MatchStats } from '@rallypoint/engine';

interface MomentumChartProps {
  stats: MatchStats;
  nameA: string;
  nameB: string;
}

export const MomentumChart: React.FC<MomentumChartProps> = ({ stats, nameA, nameB }) => {
  const data = stats.momentumSeries.map((pt) => ({
    rally: pt.sequenceNumber,
    game: pt.gameNumber,
    lead: pt.diff,
    scoreA: pt.scoreA,
    scoreB: pt.scoreB,
    winner: pt.winningSide === 'A' ? nameA : nameB,
  }));

  if (data.length === 0) {
    return <div className="text-gray-500 text-xs py-6 text-center">No rally data recorded yet.</div>;
  }

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Momentum Timeline</h4>
          <p className="text-[11px] text-gray-400">Point lead difference (+ for {nameA}, - for {nameB})</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-400 font-bold">{nameA} (+)</span>
          <span className="text-gray-600">|</span>
          <span className="text-cyan-400 font-bold">{nameB} (-)</span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <XAxis dataKey="rally" stroke="#4b5563" tick={{ fontSize: 10 }} />
            <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '11px' }}
              formatter={(val: any) => [
                Number(val) > 0 ? `+${val} (${nameA})` : Number(val) < 0 ? `${val} (${nameB})` : 'Tied',
                'Lead',
              ]}
              labelFormatter={(label) => `Rally #${label}`}
            />
            <Area
              type="monotone"
              dataKey="lead"
              stroke="#eab308"
              strokeWidth={2}
              fill="url(#momentumGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
