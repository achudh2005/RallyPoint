import React, { useRef, useState } from 'react';
import type { MatchEvent, MatchState } from '@rallypoint/engine';
import { getStats } from '@rallypoint/engine';
import { exportScorecardPNG } from '../../analytics/exportUtils.js';

interface ShareableScorecardProps {
  state: MatchState;
  events: MatchEvent[];
}

export const ShareableScorecard: React.FC<ShareableScorecardProps> = ({ state, events }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const stats = getStats(events, state.config);
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;
  const winnerName = state.winnerSide === 'A' ? nameA : nameB;

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    await exportScorecardPNG(
      cardRef.current,
      `rallypoint_scorecard_${state.config.id}.png`
    );
    setExporting(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Export Action Trigger */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-xl flex items-center gap-2 tap-active transition-all"
      >
        <span>📸</span>
        <span>{exporting ? 'Generating PNG...' : 'Export Story Card (WhatsApp / Instagram)'}</span>
      </button>

      {/* Story-Ready Card Container (9:16 Aspect Ratio) */}
      <div
        ref={cardRef}
        data-testid="shareable-scorecard-card"
        className="w-full max-w-[360px] aspect-[9/16] bg-gradient-to-b from-gray-950 via-gray-900 to-emerald-950 text-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500/40 flex flex-col justify-between relative overflow-hidden"
      >
        {/* Decorative Court Graphic Lines in Background */}
        <div className="absolute inset-0 border-8 border-white/5 pointer-events-none rounded-3xl m-3">
          <div className="w-full h-1/2 border-b-2 border-dashed border-white/5"></div>
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🏸</span>
            <span className="font-black text-sm tracking-tight text-white">RallyPoint</span>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
            Official Scorecard
          </span>
        </div>

        {/* Match Winner Hero */}
        <div className="relative z-10 text-center py-4">
          <span className="text-3xl mb-1 block">🏆</span>
          <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">
            Match Winner
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 truncate">
            {winnerName}
          </h1>
          <div className="text-xs text-gray-400 font-semibold mt-1">
            {state.winReason === 'NORMAL' && `Sets Won: ${state.gamesWonA} - ${state.gamesWonB}`}
            {state.winReason === 'RETIRE' && 'Won by Retirement'}
            {state.winReason === 'WALKOVER' && 'Won by Walkover'}
          </div>
        </div>

        {/* Head-to-Head Big Scores */}
        <div className="relative z-10 bg-gray-950/80 border border-gray-800 rounded-2xl p-4 shadow-inner">
          <div className="flex justify-between items-center text-xs font-bold mb-3">
            <span className="text-emerald-400 truncate max-w-[45%]">{nameA}</span>
            <span className="text-gray-500 text-[10px]">VS</span>
            <span className="text-cyan-400 truncate max-w-[45%] text-right">{nameB}</span>
          </div>

          <div className="space-y-2">
            {state.games.map((g) => (
              <div
                key={g.gameNumber}
                className="flex justify-between items-center text-xs p-2 bg-gray-900 rounded-xl font-mono"
              >
                <span className="text-gray-400 text-[10px]">GAME {g.gameNumber}</span>
                <span className="font-bold text-sm">
                  <span className={g.scoreA > g.scoreB ? 'text-emerald-400' : 'text-gray-300'}>
                    {g.scoreA}
                  </span>
                  <span className="text-gray-600 mx-2">-</span>
                  <span className={g.scoreB > g.scoreA ? 'text-cyan-400' : 'text-gray-300'}>
                    {g.scoreB}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Match Key Stats */}
        <div className="relative z-10 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80">
            <div className="text-[10px] text-gray-400">Longest Streak</div>
            <div className="font-mono font-bold text-sm text-white mt-0.5">
              {stats.longestStreak.sideA} <span className="text-gray-500 text-xs">/</span> {stats.longestStreak.sideB}
            </div>
          </div>
          <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/80">
            <div className="text-[10px] text-gray-400">Lead Changes</div>
            <div className="font-mono font-bold text-sm text-white mt-0.5">
              {stats.leadChanges} times
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center border-t border-gray-800 pt-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">
            Tracked with RallyPoint • BWF Event Sourcing
          </p>
        </div>
      </div>
    </div>
  );
};
