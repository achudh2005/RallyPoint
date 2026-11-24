import React, { useRef } from 'react';
import { ArrowDown, Check, Sparkles } from 'lucide-react';

export interface PlayerCardProps {
  playerId: string;
  name: string;
  side: 'A' | 'B';
  isServer: boolean;
  courtPosition?: 'LEFT' | 'RIGHT';
  pointsWon: number;
  drops: number;
  netContribution: number;
  buttonLabels?: 'POINT_DROP' | 'WINNER_ERROR' | 'PLUS_MINUS';
  layout?: 'comfortable' | 'compact';
  disabled?: boolean;
  testIdPrefix?: string;
  onPoint: (playerId: string) => void;
  onDrop: (playerId: string) => void;
  onLongPress?: (playerId: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  playerId,
  name,
  side,
  isServer,
  courtPosition,
  pointsWon,
  drops,
  netContribution,
  buttonLabels = 'POINT_DROP',
  layout = 'comfortable',
  disabled = false,
  testIdPrefix,
  onPoint,
  onDrop,
  onLongPress,
}) => {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const startLongPress = () => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (onLongPress) {
        onLongPress(playerId);
      }
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Label text
  let pointLabel = 'POINT';
  let dropLabel = 'DROP';
  if (buttonLabels === 'WINNER_ERROR') {
    pointLabel = 'WINNER';
    dropLabel = 'ERROR';
  } else if (buttonLabels === 'PLUS_MINUS') {
    pointLabel = '+1 PT';
    dropLabel = '-1 DROP';
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  const netFormatted = netContribution > 0 ? `+${netContribution}` : `${netContribution}`;
  const prefix = testIdPrefix ? `${testIdPrefix}-` : '';

  return (
    <div
      data-testid={`${prefix}player-card-${playerId}`}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress(playerId);
        }
      }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      className={`relative flex flex-col justify-between rounded-2xl p-3 sm:p-4 transition-all border ${
        side === 'A'
          ? 'bg-slate-50 dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800'
          : 'bg-slate-50 dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800'
      } ${
        isServer ? 'ring-2 ring-emerald-500/80 shadow-md shadow-emerald-500/10' : ''
      }`}
    >
      {/* Top Header Row: Avatar, Name, Court & Serve Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              side === 'A'
                ? 'bg-blue-600 text-white'
                : 'bg-purple-600 text-white'
            }`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {name}
              </span>
              {courtPosition && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-slate-500 dark:text-zinc-400">
                  {courtPosition === 'RIGHT' ? 'R' : 'L'}
                </span>
              )}
            </div>
            {/* Live Stat line */}
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{pointsWon} pts</span>
              {' · '}
              <span className="text-rose-500 dark:text-rose-400 font-semibold">{drops} drops</span>
              {' · '}
              <span className="font-semibold text-slate-700 dark:text-zinc-300">({netFormatted})</span>
            </div>
          </div>
        </div>

        {/* Serving Badge */}
        {isServer && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500 text-white shadow-xs shrink-0">
            <Sparkles className="w-2.5 h-2.5" />
            SERVING
          </span>
        )}
      </div>

      {/* Action Buttons: POINT (Green) & DROP (Orange/Red) */}
      <div className={`grid grid-cols-2 gap-3 mt-1`}>
        {/* POINT Button */}
        <button
          type="button"
          data-testid={`${prefix}point-btn-${playerId}`}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLongPressTriggeredRef.current) {
              onPoint(playerId);
            }
          }}
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center justify-center gap-2 rounded-xl font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50 select-none ${
            layout === 'comfortable' ? 'min-h-[64px] text-sm' : 'min-h-[52px] text-xs'
          } bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:bg-emerald-700`}
          aria-label={`Point for ${name}`}
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          <span>{pointLabel}</span>
        </button>

        {/* DROP Button */}
        <button
          type="button"
          data-testid={`${prefix}drop-btn-${playerId}`}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLongPressTriggeredRef.current) {
              onDrop(playerId);
            }
          }}
          style={{ touchAction: 'manipulation' }}
          className={`flex items-center justify-center gap-2 rounded-xl font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50 select-none ${
            layout === 'comfortable' ? 'min-h-[64px] text-sm' : 'min-h-[52px] text-xs'
          } bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:bg-rose-700`}
          aria-label={`Drop by ${name}`}
        >
          <ArrowDown className="w-5 h-5 stroke-[2.5]" />
          <span>{dropLabel}</span>
        </button>
      </div>
    </div>
  );
};
