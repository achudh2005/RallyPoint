import React, { useEffect, useState } from 'react';
import type { ShotType, RallyEndResult } from '@rallypoint/ranking';
import { useRankingStore } from '../../store/rankingStore.js';

interface QuickMarkLayerProps {
  pointSide: 'A' | 'B';
  playersA: { id: string; name: string }[];
  playersB: { id: string; name: string }[];
  onApplyTag: (tag: {
    shotType?: ShotType;
    rallyEndResult?: RallyEndResult;
    pointWinnerPlayerId?: string;
    errorPlayerId?: string;
  }) => void;
  onDismiss: () => void;
}

const SHOT_TYPES: { type: ShotType; label: string; icon: string }[] = [
  { type: 'SMASH', label: 'Smash', icon: '⚡' },
  { type: 'DROP', label: 'Drop', icon: '🪶' },
  { type: 'NET', label: 'Net', icon: '🕸️' },
  { type: 'CLEAR', label: 'Clear', icon: '🏹' },
  { type: 'DRIVE', label: 'Drive', icon: '💨' },
  { type: 'LOB', label: 'Lob', icon: '🎯' },
];

export const QuickMarkLayer: React.FC<QuickMarkLayerProps> = ({
  pointSide,
  playersA,
  playersB,
  onApplyTag,
  onDismiss,
}) => {
  const { taggingMode } = useRankingStore();
  const [selectedShot, setSelectedShot] = useState<ShotType | undefined>(undefined);
  const [selectedResult, setSelectedResult] = useState<RallyEndResult | undefined>(undefined);
  const [winnerPlayerId, setWinnerPlayerId] = useState<string | undefined>(
    pointSide === 'A' ? playersA[0]?.id : playersB[0]?.id
  );
  const [errorPlayerId, setErrorPlayerId] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss in QUICK mode after 3 seconds
  useEffect(() => {
    if (taggingMode === 'FULL') return;

    const interval = 30; // 30ms step
    const totalDuration = 3000;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [taggingMode, onDismiss]);

  const handleApply = (shot?: ShotType, result?: RallyEndResult, winnerId?: string, errId?: string) => {
    onApplyTag({
      shotType: shot || selectedShot,
      rallyEndResult: result || selectedResult,
      pointWinnerPlayerId: winnerId || winnerPlayerId,
      errorPlayerId: errId || errorPlayerId,
    });
    onDismiss();
  };

  const winningPlayers = pointSide === 'A' ? playersA : playersB;
  const losingPlayers = pointSide === 'A' ? playersB : playersA;

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 bg-gray-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col gap-2">
      {/* Auto-Dismiss Timer Bar (QUICK mode) */}
      {taggingMode !== 'FULL' && (
        <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mb-1">
          <div
            className="bg-emerald-400 h-full transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header and Fast Dismiss */}
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-emerald-400 flex items-center gap-1">
          <span>⚡ Mark Point Details</span>
          <span className="text-[10px] text-gray-400">({pointSide === 'A' ? 'Side A' : 'Side B'} Point)</span>
        </span>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white px-2 py-0.5 rounded text-[11px]"
        >
          Skip ✕
        </button>
      </div>

      {/* Row 1: Shot Types (One Tap) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SHOT_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => {
              setSelectedShot(type);
              if (taggingMode === 'QUICK') {
                handleApply(type, selectedResult || 'WINNER');
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
              selectedShot === type
                ? 'bg-emerald-500 text-gray-950 font-bold shadow-md scale-105'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Row 2: Result & Attribution */}
      <div className="flex justify-between items-center gap-2 pt-1 border-t border-gray-800 text-xs">
        {/* Outcome Chips */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              setSelectedResult('WINNER');
              if (taggingMode === 'QUICK' && selectedShot) handleApply(selectedShot, 'WINNER');
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
              selectedResult === 'WINNER'
                ? 'bg-emerald-500 text-gray-950'
                : 'bg-gray-800 text-emerald-400 hover:bg-gray-700'
            }`}
          >
            ✓ Winner
          </button>
          <button
            onClick={() => {
              setSelectedResult('UNFORCED_ERROR');
              if (taggingMode === 'QUICK' && selectedShot) handleApply(selectedShot, 'UNFORCED_ERROR');
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
              selectedResult === 'UNFORCED_ERROR'
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-red-400 hover:bg-gray-700'
            }`}
          >
            ✗ Error
          </button>
        </div>

        {/* Player Attribution */}
        {selectedResult === 'UNFORCED_ERROR' ? (
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-gray-400">By:</span>
            {losingPlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setErrorPlayerId(p.id);
                  if (taggingMode === 'QUICK' && selectedShot) {
                    handleApply(selectedShot, 'UNFORCED_ERROR', winnerPlayerId, p.id);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] truncate max-w-[80px] ${
                  errorPlayerId === p.id ? 'bg-red-600 text-white font-bold' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-gray-400">Winner:</span>
            {winningPlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setWinnerPlayerId(p.id);
                  if (taggingMode === 'QUICK' && selectedShot) {
                    handleApply(selectedShot, selectedResult || 'WINNER', p.id);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] truncate max-w-[80px] ${
                  winnerPlayerId === p.id ? 'bg-emerald-600 text-white font-bold' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {taggingMode === 'FULL' && (
        <button
          onClick={() => handleApply()}
          className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
        >
          Confirm Tag
        </button>
      )}
    </div>
  );
};
