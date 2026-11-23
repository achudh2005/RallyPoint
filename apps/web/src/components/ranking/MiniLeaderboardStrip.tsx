import React from 'react';
import type { RankingCategory } from '@rallypoint/ranking';
import { useRankingStore } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';

const CATEGORIES: { key: RankingCategory; label: string }[] = [
  { key: 'OVERALL', label: 'Overall' },
  { key: 'LEAGUE_TABLE', label: 'League' },
  { key: 'MOST_WINS', label: 'Wins' },
  { key: 'MOST_POINTS', label: 'Points' },
  { key: 'MOST_DROPS_PLAYED', label: 'Drops' },
  { key: 'BEST_SERVICE_GAME', label: 'Service' },
  { key: 'BEST_WIN_RATE', label: 'Win %' },
];

export const MiniLeaderboardStrip: React.FC = () => {
  const { playerLeaderboards, selectedCategory, setSelectedCategory } = useRankingStore();
  const { scoringFormat } = useMatchStore();

  const currentBoard = (playerLeaderboards[selectedCategory] || []).slice(0, 3);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-amber-300 font-extrabold"
          title="Rank 1 Gold"
          aria-label="Rank 1 Gold"
        >
          <span>🥇</span>
          <span className="text-[9px] bg-amber-400/20 px-1 py-0.2 rounded border border-amber-400/40">#1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-slate-200 font-extrabold"
          title="Rank 2 Silver"
          aria-label="Rank 2 Silver"
        >
          <span>🥈</span>
          <span className="text-[9px] bg-slate-300/20 px-1 py-0.2 rounded border border-slate-300/40">#2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-amber-600 font-extrabold"
          title="Rank 3 Bronze"
          aria-label="Rank 3 Bronze"
        >
          <span>🥉</span>
          <span className="text-[9px] bg-amber-700/20 px-1 py-0.2 rounded border border-amber-600/40">#3</span>
        </span>
      );
    }
    return `#${rank}`;
  };

  const getMovementIcon = (movement: 'UP' | 'DOWN' | 'SAME', delta: number) => {
    if (movement === 'UP') return <span className="text-emerald-400 font-bold text-[10px]">▲{delta}</span>;
    if (movement === 'DOWN') return <span className="text-rose-400 font-bold text-[10px]">▼{delta}</span>;
    return <span className="text-gray-500 text-[10px]">−</span>;
  };

  return (
    <div
      role="region"
      aria-label="Community Live Ranking Board"
      aria-live="polite"
      className="w-full bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-2.5 shadow-md flex flex-col gap-1.5 text-xs"
    >
      {/* Category Tabs & Label */}
      <div className="flex justify-between items-center border-b border-gray-800/80 pb-1.5">
        <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <span>🏆 Community Live Board</span>
          {scoringFormat && (
            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
              [{scoringFormat.replace(/_/g, ' ')}]
            </span>
          )}
        </span>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                selectedCategory === key
                  ? 'bg-emerald-500 text-gray-950 font-bold'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Leaderboard Entries */}
      <div className="grid grid-cols-3 gap-2">
        {currentBoard.length === 0 ? (
          <div className="col-span-3 text-center py-1 text-[11px] text-gray-500">
            No active rankings in this category yet.
          </div>
        ) : (
          currentBoard.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-1.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                <span className="flex items-center gap-1 font-bold">
                  <span>{getRankBadge(entry.rank)}</span>
                  <span className="text-gray-300 truncate max-w-[65px]">{entry.name}</span>
                </span>
                {getMovementIcon(entry.rankMovement, entry.movementDelta)}
              </div>

              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-[11px] font-black text-white">{entry.headlineFormatted}</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded">
                  Matches: {entry.matchesPlayed}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
