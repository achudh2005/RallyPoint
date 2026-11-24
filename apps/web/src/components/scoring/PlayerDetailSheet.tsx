import React from 'react';
import { X, ArrowLeftRight, Edit2 } from 'lucide-react';
import { PlayerMatchActionStats } from '@rallypoint/scoring-rules';

export interface PlayerDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  player: { id: string; name: string; side: 'A' | 'B' } | null;
  stats?: PlayerMatchActionStats;
  onSwapPlayer?: (playerId: string) => void;
  onOpenEditSheet?: () => void;
}

export const PlayerDetailSheet: React.FC<PlayerDetailSheetProps> = ({
  isOpen,
  onClose,
  player,
  stats,
  onSwapPlayer,
  onOpenEditSheet,
}) => {
  if (!isOpen || !player) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-details-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl border-t border-black/10 dark:border-white/10 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div>
            <h2 id="player-details-title" className="text-base font-bold text-slate-900 dark:text-white">
              {player.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Side {player.side} Options & Stats
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
            aria-label="Close sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Match Stats Grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-center">
            <div>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.pointsWon}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Points Won
              </div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-rose-500 dark:text-rose-400">
                {stats.drops}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Drops
              </div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                {stats.netContribution > 0 ? `+${stats.netContribution}` : stats.netContribution}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Net Score
              </div>
            </div>
            <div className="col-span-3 pt-2 border-t border-slate-200 dark:border-zinc-700 text-xs text-slate-500 flex justify-around">
              <span>Point Share: <b>{stats.pointShareWithinTeam}%</b></span>
              <span>Best Streak: <b>{stats.bestPointStreak}</b></span>
            </div>
          </div>
        )}

        {/* Actions List */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenEditSheet) onOpenEditSheet();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-semibold text-sm text-slate-900 dark:text-white transition-colors"
          >
            <Edit2 className="w-4 h-4 text-emerald-500" />
            <span>Fix Attribution / Edit Actions</span>
          </button>

          {onSwapPlayer && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwapPlayer(player.id);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 font-semibold text-sm text-slate-900 dark:text-white transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4 text-blue-500" />
              <span>Swap Court Position</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
