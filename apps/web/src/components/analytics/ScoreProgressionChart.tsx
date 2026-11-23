import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MatchStats } from '@rallypoint/engine';

interface ScoreProgressionChartProps {
  stats: MatchStats;
  nameA: string;
  nameB: string;
}

export const ScoreProgressionChart: React.FC<ScoreProgressionChartProps> = ({
  stats,
  nameA,
  nameB,
}) => {
  const data = stats.momentumSeries.map((pt) => ({
    rally: pt.sequenceNumber,
    scoreA: pt.scoreA,
    scoreB: pt.scoreB,
    game: pt.gameNumber,
  }));

  if (data.length === 0) {
    return <div className="text-gray-500 text-xs py-6 text-center">No progression data.</div>;
  }

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Score Progression</h4>
          <p className="text-[11px] text-gray-400">Cumulative point trajectory per game</p>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="rally" stroke="#4b5563" tick={{ fontSize: 10 }} />
            <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                fontSize: '11px',
              }}
              formatter={(val: any, name: any) => [
                val,
                name === 'scoreA' ? nameA : nameB,
              ]}
              labelFormatter={(label) => `Rally #${label}`}
            />
            <Line
              type="monotone"
              dataKey="scoreA"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="scoreA"
            />
            <Line
              type="monotone"
              dataKey="scoreB"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={false}
              name="scoreB"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
