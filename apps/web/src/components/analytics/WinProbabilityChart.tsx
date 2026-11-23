import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MatchStats } from '@rallypoint/engine';
import { computeGameWinProbability } from '../../analytics/markovModel.js';

interface WinProbabilityChartProps {
  stats: MatchStats;
  nameA: string;
  nameB: string;
}

export const WinProbabilityChart: React.FC<WinProbabilityChartProps> = ({
  stats,
  nameA,
  nameB,
}) => {
  const totalWonA = stats.pointsWonOnServeVsReceive.sideA.serve + stats.pointsWonOnServeVsReceive.sideA.receive;
  const totalWonB = stats.pointsWonOnServeVsReceive.sideB.serve + stats.pointsWonOnServeVsReceive.sideB.receive;
  const totalPoints = totalWonA + totalWonB;
  const pointWinRateA = totalPoints > 0 ? totalWonA / totalPoints : 0.5;

  const data = stats.momentumSeries.map((pt) => {
    const probA = computeGameWinProbability(pt.scoreA, pt.scoreB, pointWinRateA);
    return {
      rally: pt.sequenceNumber,
      probA: Math.round(probA * 100),
      probB: Math.round((1 - probA) * 100),
      scoreA: pt.scoreA,
      scoreB: pt.scoreB,
    };
  });

  if (data.length === 0) {
    return <div className="text-gray-500 text-xs py-6 text-center">No rally data recorded yet.</div>;
  }

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Markov Win Probability Curve
          </h4>
          <p className="text-[11px] text-gray-400">
            Real-time Bayesian / Markov game win expectation
          </p>
        </div>
        <div className="text-[10px] font-mono flex items-center gap-2">
          <span className="text-emerald-400 font-bold">{nameA}</span>
          <span className="text-gray-600">vs</span>
          <span className="text-cyan-400 font-bold">{nameB}</span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="rally" stroke="#4b5563" tick={{ fontSize: 10 }} />
            <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                fontSize: '11px',
              }}
              formatter={(val: any, name: any) => [
                `${val}%`,
                name === 'probA' ? nameA : nameB,
              ]}
              labelFormatter={(label) => `Rally #${label}`}
            />
            <Line
              type="monotone"
              dataKey="probA"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="probA"
            />
            <Line
              type="monotone"
              dataKey="probB"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="probB"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
