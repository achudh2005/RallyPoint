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
}) => {
  const [showPointDetails, setShowPointDetails] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleShare = () => {
    Haptics.selection();
    const scoresStr = gameBreakdowns
      .map((g) => `${g.scoreA}-${g.scoreB}`)
      .join(', ');
    const text = `🏸 Match Result: ${winner} defeated ${loser} (${scoresStr}) on RallyPoint!`;

    if (navigator.share) {
      navigator.share({ title: 'RallyPoint Match Result', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    Haptics.selection();
    if (onClose) onClose();
    if (onDone) onDone();
  };

  const pointEvents = history.filter((e): e is PointEvent => e.type === 'POINT');

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
