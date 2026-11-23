import React from 'react';
import type { MatchStats, RallyEndType } from '@rallypoint/engine';

interface ShotHeatmapProps {
  stats: MatchStats;
  nameA: string;
  nameB: string;
}

const SHOT_LABELS: Record<RallyEndType, string> = {
  SMASH: 'Smash Winner',
  DROP: 'Drop Shot',
  NET: 'Net Kill',
  OUT: 'Opponent Out',
  UNFORCED_ERROR: 'Unforced Error',
  SERVICE_FAULT: 'Service Fault',
  WINNER: 'General Winner',
};

export const ShotHeatmap: React.FC<ShotHeatmapProps> = ({ stats, nameA, nameB }) => {
  const shotKeys: RallyEndType[] = [
    'SMASH',
    'DROP',
    'NET',
    'OUT',
    'UNFORCED_ERROR',
    'SERVICE_FAULT',
    'WINNER',
  ];

  const totalShotsA = Object.values(stats.shotBreakdown.sideA).reduce((a, b) => a + b, 0);
  const totalShotsB = Object.values(stats.shotBreakdown.sideB).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
          Shot-Type Breakdown & Errors
        </h4>
        <p className="text-[11px] text-gray-400">
          Distribution of winners and unforced errors
        </p>
      </div>

      <div className="space-y-2 text-xs">
        {shotKeys.map((key) => {
          const countA = stats.shotBreakdown.sideA[key] ?? 0;
          const countB = stats.shotBreakdown.sideB[key] ?? 0;
          const maxCount = Math.max(1, countA + countB);

          return (
            <div key={key} className="bg-gray-800/40 p-2 rounded-xl border border-gray-800">
              <div className="flex justify-between items-center text-[11px] font-semibold mb-1 text-gray-300">
                <span className="text-emerald-400 font-mono">{countA}</span>
                <span className="text-white font-sans">{SHOT_LABELS[key]}</span>
                <span className="text-cyan-400 font-mono">{countB}</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-700">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(countA / maxCount) * 100}%` }}
                ></div>
                <div
                  className="bg-cyan-500 transition-all"
                  style={{ width: `${(countB / maxCount) * 100}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-gray-500 font-mono px-1">
        <span>{nameA} Tagged Points: {totalShotsA}</span>
        <span>{nameB} Tagged Points: {totalShotsB}</span>
      </div>
    </div>
  );
};
