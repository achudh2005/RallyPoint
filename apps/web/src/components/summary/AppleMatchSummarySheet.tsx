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
import { Share2, ListChecks, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { nativeShare } from '../../mobile/nativeShare.js';
import { registerBackHandler } from '../../mobile/backButton.js';
import { computeMatchAwards, type RankingMatchEvent } from '@rallypoint/ranking';
import { useMatchStore, type ExtendedMatchConfig } from '../../store/matchStore.js';
import { useRankingStore } from '../../store/rankingStore.js';
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
  const [isSubmittingDone, setIsSubmittingDone] = useState(false);
  const { communityPlayers, playerLeaderboards } = useRankingStore();

  const handleFinish = () => {
    if (isSubmittingDone) return;
    setIsSubmittingDone(true);
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
  const { events: storeEvents, scoringFormat, scoringRulesState } = useMatchStore();
  const effectiveEvents =
    storeEvents && storeEvents.length > 0 ? storeEvents : history || [];
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

  const totalPoints = effectiveEvents.filter(
    (e: any) => e.type === 'POINT' || e.type === 'PLAYER_ACTION' || e.eventType === 'PLAYER_ACTION'
  ).length;
  const maxStreak = Math.max(stats.longestStreak.sideA, stats.longestStreak.sideB);
  const pointEvents = effectiveEvents.filter(
    (e: any) => e.type === 'POINT' || e.type === 'PLAYER_ACTION' || e.eventType === 'PLAYER_ACTION'
  ) as PointEvent[];

  // Compute player performance metrics for MVP and Needs Warm-up
  const playerIdsA: string[] = config.sideA?.playerIds || [];
  const playerIdsB: string[] = config.sideB?.playerIds || [];
  const playerNamesA = config.sideA?.playerNames || [];
  const playerNamesB = config.sideB?.playerNames || [];
  const communityMap = React.useMemo(
    () => new Map(communityPlayers.map((p) => [p.id, p.displayName])),
    [communityPlayers]
  );
  const resolvePlayerName = (id: string, fallbackList: string[], idx: number, sideName: string) =>
    communityMap.get(id) ||
    fallbackList[idx] ||
    sideName.split('&')[idx]?.trim() ||
    (id.startsWith('cp-') ? `Player ${idx + 1}` : id);

  const playerStatsMap: Record<
    string,
    { id: string; name: string; pointsWon: number; drops: number; net: number; teamSide: 'A' | 'B' }
  > = {};

  playerIdsA.forEach((id: string, idx: number) => {
    playerStatsMap[id] = {
      id,
      name: resolvePlayerName(id, playerNamesA, idx, teamAName),
      pointsWon: 0,
      drops: 0,
      net: 0,
      teamSide: 'A',
    };
  });

  playerIdsB.forEach((id: string, idx: number) => {
    playerStatsMap[id] = {
      id,
      name: resolvePlayerName(id, playerNamesB, idx, teamBName),
      pointsWon: 0,
      drops: 0,
      net: 0,
      teamSide: 'B',
    };
  });

  for (const ev of effectiveEvents || []) {
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

  const needsWarmup =
    playerList.length > 1
      ? [...playerList].sort((a, b) => (b.drops !== a.drops ? b.drops - a.drops : a.net - b.net))[0]
      : null;

  const awards = React.useMemo(() => {
    const rankingEvents: RankingMatchEvent[] = (effectiveEvents || []).map((ev: any, idx: number) => ({
      id: ev.id || `ev-${idx}`,
      sequenceNumber: ev.sequenceNumber || idx + 1,
      eventType: ev.type || ev.eventType || 'PLAYER_ACTION',
      playerId: ev.playerId,
      side: ev.side,
      action: ev.action,
      isPoint: ev.isPoint,
      isSideOut: ev.isSideOut,
      payload: {
        servingSideAtRally: ev.servingSideAtRally,
        reason: ev.reason,
      },
    }));

    const participants = [
      ...playerIdsA.map((id, idx) => ({
        playerId: id,
        displayName: resolvePlayerName(id, playerNamesA, idx, teamAName),
        side: 'A' as const,
      })),
      ...playerIdsB.map((id, idx) => ({
        playerId: id,
        displayName: resolvePlayerName(id, playerNamesB, idx, teamBName),
        side: 'B' as const,
      })),
    ];

    const extCfg = config as ExtendedMatchConfig;
    const isShutout = games.some(
      (g) => (g as { winReason?: string }).winReason === 'SHUTOUT' || (extCfg.shutout?.enabled && ((g.scoreA >= (extCfg.shutout.target || 7) && g.scoreB === 0) || (g.scoreB >= (extCfg.shutout.target || 7) && g.scoreA === 0)))
    );

    return computeMatchAwards(rankingEvents, undefined, {
      matchType: config.mode === 'doubles' ? 'DOUBLES' : 'SINGLES',
      scoringFormat: scoringRulesState?.formatConfig.format || extCfg.scoringFormat || scoringFormat,
      targetPoints: scoringRulesState?.formatConfig.targetPoints || config.pointsToWinGame,
      bestOf: config.bestOf,
      status:
        state.winReason === 'WALKOVER'
          ? 'WALKOVER'
          : state.winReason === 'RETIRE'
          ? 'RETIRED'
          : 'COMPLETED',
      isShutout,
      winnerSide,
      participants,
    });
  }, [effectiveEvents, config, games, scoringRulesState, scoringFormat, state.status, playerIdsA, playerIdsB, playerNamesA, playerNamesB, winnerSide, teamAName, teamBName]);

  const handleShare = async () => {
    Haptics.selection();
    const scoresStr = gameBreakdowns
      .map((g) => `${g.scoreA}-${g.scoreB}`)
      .join(', ');
    const mvpStr = awards.mvp
      ? ` | MVP: ${awards.mvp.name} (${awards.mvp.mvpScore.toFixed(1)} pts)`
      : '';
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
            {effectiveEvents.length}
          </span>
        </div>
      </div>

      {/* Official Match MVP Reveal (Single Source of Truth) */}
      <MvpRevealCard awards={awards} matchTitle={`${teamAName} vs ${teamBName}`} />

      {/* Live Ranking Changes Preview */}
      {(() => {
        const allParticipantIds = [...playerIdsA, ...playerIdsB];
        const overall = playerLeaderboards?.OVERALL || [];
        const matchedRanks = overall.filter((e) => allParticipantIds.includes(e.id));
        if (matchedRanks.length === 0) return null;
        return (
          <div className="space-y-2" data-testid="match-summary-rank-changes">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
              Live Ranking Updates
            </span>
            <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 overflow-hidden shadow-xs">
              {matchedRanks.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-neutral-500 w-6">
                      #{entry.rank}
                    </span>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">{entry.name}</p>
                      <p className="text-[11px] text-neutral-400">
                        {entry.stats.wins}W-{entry.stats.losses}L • {entry.stats.pointsWon} pts / {entry.stats.drops} drops
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.rankMovement === 'UP' && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-500 font-bold">
                        <TrendingUp className="w-3.5 h-3.5" />+{Math.abs(entry.movementDelta)}
                      </span>
                    )}
                    {entry.rankMovement === 'DOWN' && (
                      <span className="inline-flex items-center gap-0.5 text-rose-500 font-bold">
                        <TrendingDown className="w-3.5 h-3.5" />-{Math.abs(entry.movementDelta)}
                      </span>
                    )}
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      {entry.headlineValue.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Needs Warm-Up */}
      <div className="space-y-3">

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
            <span className="text-base mb-1 block">🌟</span>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">MVP of the Week</span>
            <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
              {awards.mvp ? awards.mvp.name : mvp ? mvp.name : winner}
            </span>
            <span className="text-[10px] text-emerald-500 font-mono font-semibold">
              {awards.mvp ? `${awards.mvp.mvpScore.toFixed(1)} rating` : mvp ? `${mvp.pointsWon} pts` : 'Week leader'}
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
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Streak Master</span>
            <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate block mt-0.5">
              {awards.allContributions.length > 0
                ? [...awards.allContributions].sort((a, b) => b.bestPointStreak - a.bestPointStreak)[0]?.name
                : winner}
            </span>
            <span className="text-[10px] text-amber-500 font-mono font-semibold">
              {awards.allContributions.length > 0
                ? `${[...awards.allContributions].sort((a, b) => b.bestPointStreak - a.bestPointStreak)[0]?.bestPointStreak || 0} Streak`
                : 'Hot Hand'}
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
          disabled={isSubmittingDone}
          onClick={handleFinish}
        >
          {isSubmittingDone ? 'Saving...' : 'Done'}
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
