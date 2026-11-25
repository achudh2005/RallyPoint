import React, { useState } from 'react';
import {
  BottomSheet,
  Button,
  GroupedList,
  GroupedSection,
  GroupedRow,
  Haptics,
} from '@rallypoint/ui';
import type { MatchState, PointEvent } from '@rallypoint/engine';
import { getStats } from '@rallypoint/engine';
import { Share2, ListChecks, Check } from 'lucide-react';
import { nativeShare } from '../../mobile/nativeShare.js';
import { registerBackHandler } from '../../mobile/backButton.js';
import { computeMatchAwards, type RankingMatchEvent } from '@rallypoint/ranking';
import { MvpRevealCard } from './MvpRevealCard.js';

export interface AppleMatchSummarySheetProps {
  state: MatchState;
  onDone?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AppleMatchSummarySheet: React.FC<AppleMatchSummarySheetProps> = ({
  state,
  onDone,
  onClose,
  isOpen = false,
}) => {
  const [showPointDetails, setShowPointDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFinish = () => {
    Haptics.selection();
    if (onClose) onClose();
    if (onDone) onDone();
  };

  React.useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      handleFinish();
      return true;
    });
  }, [isOpen]);

  const { config, games, winnerSide, history } = state;
  const stats = getStats(history, config);

  const teamAName = config.sideA?.name || 'Side A';
  const teamBName = config.sideB?.name || 'Side B';

  const winner = winnerSide === 'A' ? teamAName : teamBName;
  const loser = winnerSide === 'A' ? teamBName : teamAName;

  const gameBreakdowns = games.map((g, i) => ({
    game: i + 1,
    scoreA: g.scoreA,
    scoreB: g.scoreB,
    winner: g.winnerSide || (g.scoreA > g.scoreB ? 'A' : 'B'),
  }));

  const totalPoints = history.filter((e) => e.type === 'POINT').length;
  const maxStreak = Math.max(stats.longestStreak.sideA, stats.longestStreak.sideB);

  // Compute player performance metrics for MVP and Needs Warm-up
  const playerIdsA: string[] = config.sideA?.playerIds || [];
  const playerIdsB: string[] = config.sideB?.playerIds || [];
  const playerNamesA = config.sideA?.playerNames || [];
  const playerNamesB = config.sideB?.playerNames || [];

  const playerStatsMap: Record<
    string,
    { id: string; name: string; pointsWon: number; drops: number; net: number; teamSide: 'A' | 'B' }
  > = {};

  playerIdsA.forEach((id: string, idx: number) => {
    playerStatsMap[id] = {
      id,
      name: playerNamesA[idx] || (playerIdsA.length === 1 ? teamAName : id),
      pointsWon: 0,
      drops: 0,
      net: 0,
      teamSide: 'A',
    };
  });

  playerIdsB.forEach((id: string, idx: number) => {
    playerStatsMap[id] = {
      id,
      name: playerNamesB[idx] || (playerIdsB.length === 1 ? teamBName : id),
      pointsWon: 0,
      drops: 0,
      net: 0,
      teamSide: 'B',
    };
  });

  for (const ev of history || []) {
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

  const teamTotalPointsA = games.reduce((acc, g) => acc + g.scoreA, 0);
  const teamTotalPointsB = games.reduce((acc, g) => acc + g.scoreB, 0);
  const mvpTeamPoints = mvp ? (mvp.teamSide === 'A' ? teamTotalPointsA : teamTotalPointsB) : 0;
  const mvpShare = mvp && mvpTeamPoints > 0 ? Math.round((mvp.pointsWon / mvpTeamPoints) * 100) : 0;

  const needsWarmup =
    playerList.length > 1
      ? [...playerList].sort((a, b) => (b.drops !== a.drops ? b.drops - a.drops : a.net - b.net))[0]
      : null;

  const handleShare = async () => {
    Haptics.selection();
    const scoresStr = gameBreakdowns
      .map((g) => `${g.scoreA}-${g.scoreB}`)
      .join(', ');
    const mvpStr = mvp ? ` | MVP: ${mvp.name} (${mvp.net >= 0 ? `+${mvp.net}` : mvp.net} net)` : '';
    const text = `🏸 Match Result: ${winner} defeated ${loser} (${scoresStr})${mvpStr} on RallyPoint!`;

    const shared = await nativeShare.shareText('RallyPoint Match Result', text);
    if (!shared) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const pointEvents = history.filter((e): e is PointEvent => e.type === 'POINT');

  const awards = React.useMemo(() => {
    const rankingEvents: RankingMatchEvent[] = (history || []).map((ev: any, idx: number) => ({
      id: ev.id || `ev-${idx}`,
      sequenceNumber: ev.sequenceNumber || idx + 1,
      eventType: ev.type || 'PLAYER_ACTION',
      playerId: ev.playerId,
      side: ev.side,
      action: ev.action,
      isPoint: ev.isPoint,
      isSideOut: ev.isSideOut,
      payload: {
        servingSideAtRally: ev.servingSideAtRally,
      },
    }));

    const participants = [
      ...playerIdsA.map((id, idx) => ({
        playerId: id,
        displayName: playerNamesA[idx] || (playerIdsA.length === 1 ? teamAName : id),
        side: 'A' as const,
      })),
      ...playerIdsB.map((id, idx) => ({
        playerId: id,
        displayName: playerNamesB[idx] || (playerIdsB.length === 1 ? teamBName : id),
        side: 'B' as const,
      })),
    ];

    return computeMatchAwards(rankingEvents, undefined, {
      matchType: config.mode === 'doubles' ? 'DOUBLES' : 'SINGLES',
      winnerSide,
      participants,
    });
  }, [history, config, playerIdsA, playerIdsB, playerNamesA, playerNamesB, winnerSide, teamAName, teamBName]);

  return (
    <div className="space-y-5 pb-6 text-neutral-900 dark:text-white max-w-md mx-auto">
      {/* Hero Winner Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/20 text-center relative overflow-hidden">
        <span className="text-3xl mb-1 block">🏆</span>
        <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
          Winner
        </span>
        <h2 className="text-2xl font-black tracking-tight mt-0.5">{winner}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {state.gamesWonA} - {state.gamesWonB} in games against {loser}
        </p>
      </div>

      {/* Set / Game Scores Breakdown */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
          Game Scores
        </span>
        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden shadow-xs">
          {gameBreakdowns.map((g) => (
            <div
              key={g.game}
              className="flex items-center justify-between p-3.5 text-sm"
            >
              <span className="font-semibold text-neutral-500">Game {g.game}</span>
              <div className="flex items-center gap-3 font-mono font-bold text-base">
                <span
                  className={
                    g.winner === 'A'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-400'
                  }
                >
                  {g.scoreA}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">-</span>
                <span
                  className={
                    g.winner === 'B'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-400'
                  }
                >
                  {g.scoreB}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Headline Match Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-center">
          <span className="text-[11px] font-medium text-neutral-400 block">
            Total Points
          </span>
          <span className="text-lg font-black text-neutral-800 dark:text-neutral-200">
            {totalPoints}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-center">
          <span className="text-[11px] font-medium text-neutral-400 block">
            Longest Rally
          </span>
          <span className="text-lg font-black text-emerald-500">
            {maxStreak}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-center">
          <span className="text-[11px] font-medium text-neutral-400 block">
            Events
          </span>
          <span className="text-lg font-black text-blue-500">
            {history.length}
          </span>
        </div>
      </div>

      {/* Official Match MVP Reveal */}
      <MvpRevealCard awards={awards} matchTitle={`${teamAName} vs ${teamBName}`} />

      {/* Match Highlights: MVP & Needs Warm-Up */}
      <div className="space-y-3">
        {mvp && (
          <div
            data-testid="mvp-highlight-card"
            className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌟</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                    MVP of the Match
                  </span>
                </div>
                <h3 className="text-base font-extrabold mt-0.5 text-neutral-900 dark:text-white">
                  {mvp.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {mvp.pointsWon} pts won • {mvp.drops} drops • {mvpShare}% team share
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-black text-amber-600 dark:text-amber-400">
                {mvp.net >= 0 ? `+${mvp.net}` : mvp.net}
              </span>
              <span className="block text-[10px] text-neutral-400">Net Contrib</span>
            </div>
          </div>
        )}

        {needsWarmup && (
          <div
            data-testid="warmup-highlight-card"
            className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⚡️</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400">
                  Needs Warm-Up
                </span>
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {needsWarmup.name}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {needsWarmup.drops} drops conceded. Good hustle—shake it off for the next set!
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-500 px-2 py-1 rounded-lg bg-rose-500/10">
              {needsWarmup.drops} Drops
            </span>
          </div>
        )}
      </div>

      {/* Weekly Accolades */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
          Weekly Accolades
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-center">
            <span className="text-base mb-1 block">🎯</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Top Scorer</span>
            <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
              {mvp ? mvp.name : winner}
            </span>
            <span className="text-[10px] text-emerald-500 font-mono font-semibold">
              {mvp ? `${mvp.pointsWon} pts` : 'Week leader'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-center">
            <span className="text-base mb-1 block">🛡️</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Iron Defense</span>
            <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
              {playerList.length > 0 ? [...playerList].sort((a, b) => a.drops - b.drops)[0]?.name : winner}
            </span>
            <span className="text-[10px] text-blue-500 font-mono font-semibold">
              Min drops
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-center">
            <span className="text-base mb-1 block">🔥</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Clutch Player</span>
            <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
              {winner}
            </span>
            <span className="text-[10px] text-amber-500 font-mono font-semibold">
              Deuce Winner
            </span>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure: Point Details */}
      <div>
        <button
          onClick={() => {
            Haptics.selection();
            setShowPointDetails(true);
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-neutral-600 dark:text-neutral-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-neutral-400" />
            <span>Inspect Point by Point Log</span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {pointEvents.length} points
          </span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="secondary"
          fullWidth
          onClick={handleShare}
          className="flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Result</span>
            </>
          )}
        </Button>

        <Button
          variant="primary"
          fullWidth
          onClick={handleFinish}
        >
          Done
        </Button>
      </div>

      {/* Point by Point Bottom Sheet */}
      <BottomSheet
        isOpen={showPointDetails}
        onClose={() => setShowPointDetails(false)}
        title="Point-by-Point Details"
      >
        <div className="pb-6">
          <GroupedList>
            <GroupedSection header="All Scored Points">
              {pointEvents.map((ev, i) => {
                const side = ev.side;
                const scorerName = side === 'A' ? teamAName : teamBName;
                return (
                  <GroupedRow
                    key={ev.id || i}
                    title={`Point #${i + 1} - ${scorerName}`}
                    subtitle={`Scored for Side ${side}`}
                    trailing={
                      <span className="text-xs font-bold font-mono">
                        {side === winnerSide ? '⭐️' : ''}
                      </span>
                    }
                  />
                );
              })}
            </GroupedSection>
          </GroupedList>
        </div>
      </BottomSheet>
    </div>
  );
};
