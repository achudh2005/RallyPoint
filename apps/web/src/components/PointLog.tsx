import React from 'react';
import type { MatchEvent, MatchState } from '@rallypoint/engine';

interface PointLogProps {
  events: MatchEvent[];
  state: MatchState;
  onClose: () => void;
}

export const PointLog: React.FC<PointLogProps> = ({ events, state, onClose }) => {
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;

  let runningScoreA = 0;
  let runningScoreB = 0;

  const scoringEntries = events.map((e, idx) => {
    if (e.type === 'POINT') {
      if (e.side === 'A') runningScoreA++;
      else runningScoreB++;
      return {
        event: e,
        index: idx + 1,
        scoreA: runningScoreA,
        scoreB: runningScoreB,
        winner: e.side === 'A' ? nameA : nameB,
        tag: e.rallyEndType,
      };
    }
    if (e.type === 'SERVE_FAULT') {
      const winnerSide = e.faultySide === 'A' ? 'B' : 'A';
      if (winnerSide === 'A') runningScoreA++;
      else runningScoreB++;
      return {
        event: e,
        index: idx + 1,
        scoreA: runningScoreA,
        scoreB: runningScoreB,
        winner: winnerSide === 'A' ? nameA : nameB,
        tag: 'SERVICE_FAULT' as const,
      };
    }
    if (e.type === 'GAME_END') {
      runningScoreA = 0;
      runningScoreB = 0;
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white">Point-by-Point Log</h3>
            <p className="text-xs text-gray-400">Total Points: {scoringEntries.length}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-3 py-1 bg-gray-800 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {scoringEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">No points recorded yet.</div>
          ) : (
            scoringEntries.map((entry) => (
              <div
                key={entry!.event.id}
                className="flex items-center justify-between p-2.5 bg-gray-800/60 rounded-xl text-xs border border-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-500 text-[10px]">#{entry!.index}</span>
                  <span className="font-semibold text-white">{entry!.winner}</span>
                  {entry!.tag && (
                    <span className="bg-gray-700 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">
                      {entry!.tag}
                    </span>
                  )}
                </div>
                <div className="font-mono font-bold text-sm">
                  <span className="text-emerald-400">{entry!.scoreA}</span>
                  <span className="text-gray-500 mx-1">-</span>
                  <span className="text-cyan-400">{entry!.scoreB}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
