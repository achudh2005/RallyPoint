import React from 'react';
import type { MatchState } from '@rallypoint/engine';

interface CourtViewProps {
  state: MatchState;
}

export const CourtView: React.FC<CourtViewProps> = ({ state }) => {
  const { endsSwapped, serveState, config, doublesPositions } = state;
  const isDoubles = config.mode === 'doubles';

  // Physical left end vs right end
  const leftEndSide = endsSwapped ? 'B' : 'A';
  const rightEndSide = endsSwapped ? 'A' : 'B';

  const leftEndName = leftEndSide === 'A' ? config.sideA.name : config.sideB.name;
  const rightEndName = rightEndSide === 'A' ? config.sideA.name : config.sideB.name;

  // Resolve player names in positions
  const getPlayerLabel = (side: 'A' | 'B', court: 'left' | 'right'): string => {
    if (!isDoubles) {
      const pId = side === 'A' ? config.sideA.playerIds[0] : config.sideB.playerIds[0];
      const name = side === 'A' ? config.sideA.name : config.sideB.name;
      const isServer = serveState.serverSide === side;
      const matchesCourt = isServer
        ? serveState.serviceCourt === court
        : serveState.receiverCourt === court;
      return matchesCourt ? (name || pId || '') : '';
    }

    if (!doublesPositions) return '';
    const pos = side === 'A' ? doublesPositions.sideA : doublesPositions.sideB;
    const pId = court === 'left' ? pos.leftPlayerId : pos.rightPlayerId;
    return pId;
  };

  const isLeftEndServing = serveState.serverSide === leftEndSide;
  const isRightEndServing = serveState.serverSide === rightEndSide;

  return (
    <div className="w-full max-w-lg mx-auto my-2 p-2 bg-gray-950/70 border border-emerald-900/60 rounded-xl shadow-lg">
      <div className="flex justify-between items-center text-xs font-semibold px-2 pb-1 text-gray-400">
        <span className="flex items-center gap-1">
          {leftEndName}
          {isLeftEndServing && (
            <span className="bg-amber-400 text-gray-950 font-bold px-1.5 py-0.5 rounded text-[10px] animate-pulse">
              SERVE
            </span>
          )}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          Court (Net in center)
        </span>
        <span className="flex items-center gap-1">
          {isRightEndServing && (
            <span className="bg-amber-400 text-gray-950 font-bold px-1.5 py-0.5 rounded text-[10px] animate-pulse">
              SERVE
            </span>
          )}
          {rightEndName}
        </span>
      </div>

      {/* Badminton Court Container */}
      <div className="relative w-full h-32 bg-emerald-800 rounded-lg border-2 border-white/90 grid grid-cols-2 overflow-hidden shadow-inner">
        {/* Net Line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white/90 z-20 shadow-md">
          <div className="absolute top-0 bottom-0 -left-1 -right-1 border-x border-dashed border-gray-400/80"></div>
        </div>

        {/* Left Court (West End) */}
        <div className="relative border-r border-white/60 grid grid-rows-2">
          {/* Left End - Top Box (Player's Left Court) */}
          <div
            className={`border-b border-white/50 flex flex-col items-center justify-center p-1 relative transition-colors ${
              isLeftEndServing && serveState.serviceCourt === 'left'
                ? 'bg-amber-400/30'
                : !isLeftEndServing && serveState.receiverCourt === 'left'
                ? 'bg-blue-400/20'
                : 'bg-transparent'
            }`}
          >
            <span className="text-[10px] font-mono text-emerald-200 truncate max-w-[90%]">
              {getPlayerLabel(leftEndSide, 'left')}
            </span>
            {isLeftEndServing && serveState.serviceCourt === 'left' && (
              <span className="text-xs">🏸</span>
            )}
          </div>

          {/* Left End - Bottom Box (Player's Right Court) */}
          <div
            className={`flex flex-col items-center justify-center p-1 relative transition-colors ${
              isLeftEndServing && serveState.serviceCourt === 'right'
                ? 'bg-amber-400/30'
                : !isLeftEndServing && serveState.receiverCourt === 'right'
                ? 'bg-blue-400/20'
                : 'bg-transparent'
            }`}
          >
            <span className="text-[10px] font-mono text-emerald-200 truncate max-w-[90%]">
              {getPlayerLabel(leftEndSide, 'right')}
            </span>
            {isLeftEndServing && serveState.serviceCourt === 'right' && (
              <span className="text-xs">🏸</span>
            )}
          </div>
        </div>

        {/* Right Court (East End) */}
        <div className="relative border-l border-white/60 grid grid-rows-2">
          {/* Right End - Top Box (Player's Left Court) */}
          <div
            className={`border-b border-white/50 flex flex-col items-center justify-center p-1 relative transition-colors ${
              isRightEndServing && serveState.serviceCourt === 'left'
                ? 'bg-amber-400/30'
                : !isRightEndServing && serveState.receiverCourt === 'left'
                ? 'bg-blue-400/20'
                : 'bg-transparent'
            }`}
          >
            <span className="text-[10px] font-mono text-emerald-200 truncate max-w-[90%]">
              {getPlayerLabel(rightEndSide, 'left')}
            </span>
            {isRightEndServing && serveState.serviceCourt === 'left' && (
              <span className="text-xs">🏸</span>
            )}
          </div>

          {/* Right End - Bottom Box (Player's Right Court) */}
          <div
            className={`flex flex-col items-center justify-center p-1 relative transition-colors ${
              isRightEndServing && serveState.serviceCourt === 'right'
                ? 'bg-amber-400/30'
                : !isRightEndServing && serveState.receiverCourt === 'right'
                ? 'bg-blue-400/20'
                : 'bg-transparent'
            }`}
          >
            <span className="text-[10px] font-mono text-emerald-200 truncate max-w-[90%]">
              {getPlayerLabel(rightEndSide, 'right')}
            </span>
            {isRightEndServing && serveState.serviceCourt === 'right' && (
              <span className="text-xs">🏸</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
