import React, { useState } from 'react';
import type { ShotType, RallyEndResult } from '@rallypoint/ranking';
import { useRankingStore } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';

interface PointEditModalProps {
  matchId: string;
  playersA: { id: string; name: string }[];
  playersB: { id: string; name: string }[];
  onClose: () => void;
}

export const PointEditModal: React.FC<PointEditModalProps> = ({
  matchId,
  playersA: _playersA,
  playersB: _playersB,
  onClose,
}) => {
  const { matches, editPastPoint } = useRankingStore();
  const { undo } = useMatchStore();

  const currentMatch = matches.find((m) => m.id === matchId);
  const pointEvents = (currentMatch?.events || [])
    .filter((e) => e.eventType === 'POINT')
    .slice(-10)
    .reverse();

  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [editWinnerSide, setEditWinnerSide] = useState<'A' | 'B'>('A');
  const [editShotType, setEditShotType] = useState<ShotType | undefined>(undefined);
  const [editRallyResult, setEditRallyResult] = useState<RallyEndResult | undefined>(undefined);
  const [editWinnerPlayerId, setEditWinnerPlayerId] = useState<string | undefined>(undefined);
  const [editErrorPlayerId, setEditErrorPlayerId] = useState<string | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);

  const allPointEventsCount = (currentMatch?.events || []).filter((e) => e.eventType === 'POINT').length;

  const handleOpenEdit = (revIdx: number) => {
    const originalIndex = allPointEventsCount - 1 - revIdx;
    const evt = pointEvents[revIdx];
    if (!evt) return;

    setSelectedPointIndex(originalIndex);
    setEditWinnerSide((evt.side as 'A' | 'B') || 'A');
    setEditShotType(evt.shotType || undefined);
    setEditRallyResult(evt.rallyEndResult || undefined);
    setEditWinnerPlayerId(evt.pointWinnerPlayerId || undefined);
    setEditErrorPlayerId(evt.errorPlayerId || undefined);
  };

  const handleApplyEdit = () => {
    if (selectedPointIndex === null) return;
    editPastPoint(matchId, {
      pointIndex: selectedPointIndex,
      winnerSide: editWinnerSide,
      pointWinnerPlayerId: editWinnerPlayerId,
      shotType: editShotType,
      rallyEndResult: editRallyResult,
      errorPlayerId: editErrorPlayerId,
    });
    setShowConfirm(false);
    setSelectedPointIndex(null);
  };

  const handleUndoLastPoint = async () => {
    await undo();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 text-xs">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>✏️ Point History & Corrections</span>
            </h3>
            <p className="text-[11px] text-gray-400">Review or correct the last 10 points</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2.5 py-1 bg-gray-800 rounded-lg text-xs"
          >
            ✕
          </button>
        </div>

        {/* Quick Undo Action */}
        <button
          onClick={handleUndoLastPoint}
          className="w-full py-2 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-600/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          <span>↺ Undo Very Last Point</span>
        </button>

        {/* Points List */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {pointEvents.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No points scored yet in this match.</p>
          ) : (
            pointEvents.map((pt, idx) => (
              <div
                key={pt.id || idx}
                onClick={() => handleOpenEdit(idx)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  selectedPointIndex === allPointEventsCount - 1 - idx
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-gray-800 bg-gray-800/40 hover:bg-gray-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-500 text-[10px]">#{pt.sequenceNumber}</span>
                  <span
                    className={`font-black px-1.5 py-0.5 rounded text-[11px] ${
                      pt.side === 'A' ? 'bg-blue-600/30 text-blue-300' : 'bg-red-600/30 text-red-300'
                    }`}
                  >
                    Side {pt.side}
                  </span>
                  <span className="text-gray-300">
                    {pt.shotType ? `${pt.shotType}` : 'Standard Rally'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {pt.rallyEndResult || 'Winner'} • Click to Edit ✎
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Form */}
        {selectedPointIndex !== null && (
          <div className="bg-gray-800/80 p-3 rounded-2xl border border-gray-700 flex flex-col gap-2.5 animate-in fade-in duration-150">
            <span className="font-bold text-emerald-400">
              Editing Point #{selectedPointIndex + 1}
            </span>

            {/* Winner Side */}
            <div className="flex gap-2">
              <button
                onClick={() => setEditWinnerSide('A')}
                className={`flex-1 py-1.5 rounded-lg font-bold ${
                  editWinnerSide === 'A' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Side A Wins
              </button>
              <button
                onClick={() => setEditWinnerSide('B')}
                className={`flex-1 py-1.5 rounded-lg font-bold ${
                  editWinnerSide === 'B' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Side B Wins
              </button>
            </div>

            {/* Shot Type */}
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {(['SMASH', 'DROP', 'NET', 'CLEAR', 'DRIVE', 'LOB'] as ShotType[]).map((shot) => (
                <button
                  key={shot}
                  onClick={() => setEditShotType(shot)}
                  className={`py-1 rounded ${
                    editShotType === shot
                      ? 'bg-emerald-500 text-gray-950 font-bold'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {shot}
                </button>
              ))}
            </div>

            {/* Confirmation & Save */}
            {showConfirm ? (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-700">
                <span className="text-amber-400 font-bold text-center">
                  ⚠️ Confirm correction? Rankings will recompute.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyEdit}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                  >
                    Yes, Apply
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl mt-1 transition-colors"
              >
                Save Correction
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
