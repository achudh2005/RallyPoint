import React, { useState } from 'react';
import { X, Check, ArrowDown, Edit3 } from 'lucide-react';
import { PlayerActionEvent } from '@rallypoint/scoring-rules';

export interface QuickEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: PlayerActionEvent[];
  players: { id: string; name: string; side: 'A' | 'B' }[];
  onEditAction: (
    eventId: string,
    updates: { playerId?: string; action?: 'POINT' | 'DROP' }
  ) => Promise<boolean>;
}

export const QuickEditSheet: React.FC<QuickEditSheetProps> = ({
  isOpen,
  onClose,
  actions,
  players,
  onEditAction,
}) => {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  if (!isOpen) return null;

  const recentActions = [...actions].slice(-10).reverse();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-edit-sheet-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl border-t border-black/10 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 id="quick-edit-sheet-title" className="text-base font-bold text-slate-900 dark:text-white">
              Edit Recent Actions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
            aria-label="Close edit sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {recentActions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 dark:text-zinc-500">
              No player actions recorded yet.
            </div>
          ) : (
            recentActions.map((act) => {
              const player = players.find((p) => p.id === act.playerId);
              const isEditing = editingEventId === act.id;

              return (
                <div
                  key={act.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{act.sequenceNumber}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-zinc-200">
                        Game {act.gameNumber}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Side {act.side}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingEventId(isEditing ? null : act.id)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {isEditing ? 'Done' : 'Change'}
                    </button>
                  </div>

                  {/* Summary row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {player ? player.name : act.playerId}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        act.action === 'POINT'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {act.action === 'POINT' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      )}
                      {act.action}
                    </span>
                  </div>

                  {/* Inline edit options if active */}
                  {isEditing && (
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-700 flex flex-col gap-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Re-attribute to Player:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {players.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            data-testid={`reattribute-btn-${p.id}`}
                            onClick={async () => {
                              await onEditAction(act.id, { playerId: p.id });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left truncate transition-colors ${
                              p.id === act.playerId
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-600'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
                        Switch Action:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await onEditAction(act.id, { action: 'POINT' });
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold ${
                            act.action === 'POINT'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-600'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          POINT
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onEditAction(act.id, { action: 'DROP' });
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold ${
                            act.action === 'DROP'
                              ? 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-600'
                          }`}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          DROP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
