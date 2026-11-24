import React, { useState } from 'react';
import { getStats, type MatchState } from '@rallypoint/engine';
import { useMatchStore } from '../store/matchStore.js';
import { PointLog } from './PointLog.js';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard.js';
import { nativeShare } from '../mobile/nativeShare.js';
import { Share2, Check } from 'lucide-react';

interface MatchSummaryProps {
  state: MatchState;
}

export const MatchSummary: React.FC<MatchSummaryProps> = ({ state }) => {
  const { events, resetMatch } = useMatchStore();
  const [showLog, setShowLog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = getStats(events, state.config);
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;
  const winnerName = state.winnerSide === 'A' ? nameA : nameB;
  const loserName = state.winnerSide === 'A' ? nameB : nameA;

  // Compute player performance for MVP & Needs Warm-Up
  const playerIdsA: string[] = state.config.sideA?.playerIds || [];
  const playerIdsB: string[] = state.config.sideB?.playerIds || [];
  const playerNamesA = state.config.sideA?.playerNames || [];
  const playerNamesB = state.config.sideB?.playerNames || [];

  const playerStatsMap: Record<
    string,
    { id: string; name: string; pointsWon: number; drops: number; net: number; teamSide: 'A' | 'B' }
  > = {};

  playerIdsA.forEach((id: string, idx: number) => {
    playerStatsMap[id] = {
      id,
      name: playerNamesA[idx] || (playerIdsA.length === 1 ? nameA : id),
      pointsWon: 0,
      drops: 0,
      net: 0,
      teamSide: 'A',
    };
  });

  playerIdsB.forEach((id: string, idx: number) => {
    playerStatsMap[id] = {
      id,
      name: playerNamesB[idx] || (playerIdsB.length === 1 ? nameB : id),
      pointsWon: 0,
      drops: 0,
      net: 0,
      teamSide: 'B',
    };
  });

  for (const ev of events || []) {
    if (ev.type === 'PLAYER_ACTION' || (ev as any).action) {
      const pId = (ev as any).playerId;
      const act = (ev as any).action;
      if (pId && playerStatsMap[pId]) {
        if (act === 'POINT') playerStatsMap[pId].pointsWon++;
        else if (act === 'DROP') playerStatsMap[pId].drops++;
      }
    }
  }

  for (const p of Object.values(playerStatsMap)) {
    p.net = p.pointsWon - p.drops;
  }

  const playerList = Object.values(playerStatsMap);
  const mvp =
    playerList.length > 0
      ? [...playerList].sort((a, b) => (b.net !== a.net ? b.net - a.net : b.pointsWon - a.pointsWon))[0]
      : null;

  const teamTotalPointsA = state.games.reduce((acc, g) => acc + g.scoreA, 0);
  const teamTotalPointsB = state.games.reduce((acc, g) => acc + g.scoreB, 0);
  const mvpTeamPoints = mvp ? (mvp.teamSide === 'A' ? teamTotalPointsA : teamTotalPointsB) : 0;
  const mvpShare = mvp && mvpTeamPoints > 0 ? Math.round((mvp.pointsWon / mvpTeamPoints) * 100) : 0;

  const needsWarmup =
    playerList.length > 1
      ? [...playerList].sort((a, b) => (b.drops !== a.drops ? b.drops - a.drops : a.net - b.net))[0]
      : null;

  const handleShare = async () => {
    const scoresStr = state.games.map((g) => `${g.scoreA}-${g.scoreB}`).join(', ');
    const mvpStr = mvp ? ` | MVP: ${mvp.name} (${mvp.net >= 0 ? `+${mvp.net}` : mvp.net} net)` : '';
    const text = `🏸 Match Result: ${winnerName} defeated ${loserName} (${scoresStr})${mvpStr} on RallyPoint!`;

    const shared = await nativeShare.shareText('RallyPoint Match Result', text);
    if (!shared && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

      {/* Match Highlights: MVP & Needs Warm-Up */}
      <div className="space-y-3">
        {mvp && (
          <div
            data-testid="mvp-highlight-card"
            className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-gray-900 border border-amber-600/40 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌟</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  MVP of the Match
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {mvp.name}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {mvp.pointsWon} pts won • {mvp.drops} drops • {mvpShare}% team share
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-mono font-bold text-amber-400">
                {mvp.net >= 0 ? `+${mvp.net}` : mvp.net}
              </span>
              <span className="block text-[10px] text-gray-500">Net Contrib</span>
            </div>
          </div>
        )}

        {needsWarmup && (
          <div
            data-testid="warmup-highlight-card"
            className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/60 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚡️</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Needs Warm-Up
                </span>
                <p className="text-xs font-bold text-gray-200">
                  {needsWarmup.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {needsWarmup.drops} drops conceded. Great hustle—ready for the next game!
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-400 px-2 py-1 rounded bg-rose-500/10">
              {needsWarmup.drops} Drops
            </span>
          </div>
        )}
      </div>

      {/* Weekly Accolades */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide px-1">
          Weekly Accolades
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/60 text-center">
            <span className="text-sm block">🎯</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Top Scorer</span>
            <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">
              {mvp ? mvp.name : winnerName}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              {mvp ? `${mvp.pointsWon} pts` : 'Leader'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/60 text-center">
            <span className="text-sm block">🛡️</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Iron Defense</span>
            <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">
              {playerList.length > 0 ? [...playerList].sort((a, b) => a.drops - b.drops)[0]?.name : winnerName}
            </span>
            <span className="text-[10px] text-blue-400 font-mono font-semibold">
              Min drops
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/60 text-center">
            <span className="text-sm block">🔥</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Clutch Player</span>
            <span className="text-xs font-bold text-gray-200 truncate block mt-0.5">
              {winnerName}
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-semibold">
              Deuce Winner
            </span>
          </div>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span>Share Match Summary</span>
          </>
        )}
      </button>

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
