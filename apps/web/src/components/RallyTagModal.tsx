import React from 'react';
import type { RallyEndType, Side } from '@rallypoint/engine';

interface RallyTagModalProps {
  side: Side;
  sideName: string;
  onSelectTag: (tag?: RallyEndType) => void;
  onCancel: () => void;
}

const TAG_OPTIONS: Array<{ type: RallyEndType; label: string; icon: string; color: string }> = [
  { type: 'SMASH', label: 'Smash', icon: '⚡', color: 'bg-red-600 hover:bg-red-500' },
  { type: 'DROP', label: 'Drop Shot', icon: '🪶', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { type: 'NET', label: 'Net Kill', icon: '🕸️', color: 'bg-cyan-600 hover:bg-cyan-500' },
  { type: 'OUT', label: 'Opponent Out', icon: '⛔', color: 'bg-amber-600 hover:bg-amber-500' },
  { type: 'UNFORCED_ERROR', label: 'Unforced Error', icon: '⚠️', color: 'bg-purple-600 hover:bg-purple-500' },
  { type: 'SERVICE_FAULT', label: 'Service Fault', icon: '🚫', color: 'bg-rose-600 hover:bg-rose-500' },
  { type: 'WINNER', label: 'Winner (General)', icon: '🎯', color: 'bg-blue-600 hover:bg-blue-500' },
];

export const RallyTagModal: React.FC<RallyTagModalProps> = ({
  sideName,
  onSelectTag,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Tag Rally Ending</h3>
            <p className="text-xs text-gray-400">Point won by <span className="text-emerald-400 font-semibold">{sideName}</span></p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {TAG_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelectTag(opt.type)}
              className={`${opt.color} text-white font-medium p-3 rounded-xl flex items-center gap-2 text-sm shadow-md tap-active transition-all`}
            >
              <span className="text-lg">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => onSelectTag(undefined)}
          className="w-full mt-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          Skip Tagging
        </button>
      </div>
    </div>
  );
};
