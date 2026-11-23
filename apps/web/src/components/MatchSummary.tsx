import React, { useState } from 'react';
import { getStats, type MatchState } from '@rallypoint/engine';
import { useMatchStore } from '../store/matchStore.js';
import { PointLog } from './PointLog.js';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard.js';

interface MatchSummaryProps {
  state: MatchState;
}

export const MatchSummary: React.FC<MatchSummaryProps> = ({ state }) => {
  const { events, resetMatch } = useMatchStore();
  const [showLog, setShowLog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const stats = getStats(events, state.config);
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;
  const winnerName = state.winnerSide === 'A' ? nameA : nameB;

  if (showAnalytics) {
    return (
      <AnalyticsDashboard
        state={state}
        events={events}
        onBack={() => setShowAnalytics(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-5 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col gap-4">
      {/* Winner Hero */}
      <div className="text-center py-6 px-4 bg-gradient-to-b from-emerald-950/80 to-gray-900 border border-emerald-700/50 rounded-2xl shadow-inner">
        <span className="text-4xl mb-2 block">🏆</span>
        <div className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-1">
          Match Winner
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">{winnerName}</h2>
        <div className="text-sm font-medium text-gray-400 mt-1">
          {state.winReason === 'RETIRE' && '(Win by Retirement)'}
          {state.winReason === 'WALKOVER' && '(Win by Walkover)'}
          {state.winReason === 'NORMAL' && `Games: ${state.gamesWonA} - ${state.gamesWonB}`}
        </div>
      </div>

      {/* Game Scores Breakdown */}
      <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">
          Game Scores
        </h4>
        <div className="space-y-1.5">
          {state.games.map((g) => (
            <div
              key={g.gameNumber}
              className="flex justify-between items-center text-xs p-2 bg-gray-900/60 rounded-lg"
            >
              <span className="text-gray-400 font-mono">Game {g.gameNumber}</span>
              <div className="font-mono font-bold text-sm">
                <span className={g.scoreA > g.scoreB ? 'text-emerald-400' : 'text-gray-300'}>
                  {g.scoreA}
                </span>
                <span className="text-gray-600 mx-2">-</span>
                <span className={g.scoreB > g.scoreA ? 'text-cyan-400' : 'text-gray-300'}>
                  {g.scoreB}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="text-gray-400 text-[11px]">Longest Streak</div>
          <div className="font-bold text-sm text-white mt-1">
            {stats.longestStreak.sideA} pts <span className="text-gray-500 font-normal">vs</span> {stats.longestStreak.sideB} pts
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="text-gray-400 text-[11px]">Lead Changes</div>
          <div className="font-bold text-sm text-white mt-1">
            {stats.leadChanges} times
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="text-gray-400 text-[11px]">Comeback Deficits</div>
          <div className="font-bold text-sm text-white mt-1">
            {stats.comebackDeficits.sideA} pts / {stats.comebackDeficits.sideB} pts
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="text-gray-400 text-[11px]">Total Points</div>
          <div className="font-bold text-sm text-white mt-1">
            {events.filter((e) => e.type === 'POINT').length} rallies
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <button
        onClick={() => setShowAnalytics(true)}
        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-lg tap-active flex items-center justify-center gap-2"
      >
        <span>📊</span>
        <span>Analytics, Insights & Story Card</span>
      </button>

      <div className="flex gap-2.5">
        <button
          onClick={() => setShowLog(true)}
          className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors tap-active"
        >
          View Point Log
        </button>
        <button
          onClick={resetMatch}
          className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors tap-active"
        >
          New Match
        </button>
      </div>

      {showLog && (
        <PointLog
          events={events}
          state={state}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
};
