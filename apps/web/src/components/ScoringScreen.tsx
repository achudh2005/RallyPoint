import React, { useEffect, useState } from 'react';
import type { RallyEndType, Side } from '@rallypoint/engine';
import { useMatchStore } from '../store/matchStore.js';
import { useRankingStore } from '../store/rankingStore.js';
import { CourtView } from './CourtView.js';
import { RallyTagModal } from './RallyTagModal.js';
import { PointLog } from './PointLog.js';
import { MiniLeaderboardStrip } from './ranking/MiniLeaderboardStrip.js';
import { QuickMarkLayer } from './ranking/QuickMarkLayer.js';
import { PointEditModal } from './ranking/PointEditModal.js';

export const ScoringScreen: React.FC = () => {
  const {
    match,
    events,
    enableRallyTagging,
    pendingPointSide,
    largeTextMode,
    announcement,
    recordPoint,
    undo,
    recordServeFault,
    toggleInterval,
    setPendingPointSide,
  } = useMatchStore();

  const { taggingMode, matches, updateMatchEvents } = useRankingStore();

  const [showLog, setShowLog] = useState(false);
  const [showEditPointModal, setShowEditPointModal] = useState(false);
  const [quickMarkTarget, setQuickMarkTarget] = useState<{ side: 'A' | 'B' } | null>(null);
  const [sideSwapAlert, setSideSwapAlert] = useState(false);

  if (!match) return null;

  const { endsSwapped, config, currentScoreA, currentScoreB, serveState, gamesWonA, gamesWonB, currentGameNumber } = match;

  // Determine physical Left and Right sides based on endsSwapped
  const leftSide: Side = endsSwapped ? 'B' : 'A';
  const rightSide: Side = endsSwapped ? 'A' : 'B';

  const leftName = leftSide === 'A' ? config.sideA.name : config.sideB.name;
  const rightName = rightSide === 'A' ? config.sideA.name : config.sideB.name;

  const leftScore = leftSide === 'A' ? currentScoreA : currentScoreB;
  const rightScore = rightSide === 'A' ? currentScoreA : currentScoreB;

  const leftGames = leftSide === 'A' ? gamesWonA : gamesWonB;
  const rightGames = rightSide === 'A' ? gamesWonA : gamesWonB;

  const isLeftServing = serveState.serverSide === leftSide;
  const isRightServing = serveState.serverSide === rightSide;

  // Players formatted for QuickMarkLayer and PointEditModal
  const playersA = (config.sideA.playerIds || [config.sideA.name]).map((id, idx) => ({
    id,
    name: config.mode === 'doubles' && idx === 1 ? 'Partner A' : config.sideA.name,
  }));
  const playersB = (config.sideB.playerIds || [config.sideB.name]).map((id, idx) => ({
    id,
    name: config.mode === 'doubles' && idx === 1 ? 'Partner B' : config.sideB.name,
  }));

  // Alert when ends swap
  useEffect(() => {
    if (match.history.length > 0) {
      setSideSwapAlert(true);
      const timer = setTimeout(() => setSideSwapAlert(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [endsSwapped]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'a' || e.key === '1') {
        handlePointTap('A');
      } else if (e.key === 'b' || e.key === '2') {
        handlePointTap('B');
      } else if (e.key === 'u' || e.key === 'Backspace') {
        undo();
      } else if (e.key === 's') {
        recordServeFault(serveState.serverSide);
      } else if (e.key === 'i') {
        toggleInterval();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [match, enableRallyTagging]);

  const handlePointTap = (side: Side) => {
    if (enableRallyTagging) {
      setPendingPointSide(side);
    } else {
      recordPoint(side);
      if (taggingMode !== 'FAST') {
        setQuickMarkTarget({ side });
      }
    }
  };

  const handleSelectRallyTag = (tag?: RallyEndType) => {
    if (pendingPointSide) {
      recordPoint(pendingPointSide, tag);
    }
  };

  const handleApplyQuickMarkTag = (tag: {
    shotType?: any;
    rallyEndResult?: any;
    pointWinnerPlayerId?: string;
    errorPlayerId?: string;
  }) => {
    const currentRankingMatch = matches.find((m) => m.id === config.id);
    if (currentRankingMatch && currentRankingMatch.events.length > 0) {
      const updatedEvents = [...currentRankingMatch.events];
      const lastPointIdx = updatedEvents.map((e) => e.eventType).lastIndexOf('POINT');
      if (lastPointIdx !== -1) {
        const targetEvt = updatedEvents[lastPointIdx]!;
        updatedEvents[lastPointIdx] = {
          ...targetEvt,
          id: targetEvt.id,
          sequenceNumber: targetEvt.sequenceNumber,
          eventType: targetEvt.eventType,
          shotType: tag.shotType,
          rallyEndResult: tag.rallyEndResult,
          pointWinnerPlayerId: tag.pointWinnerPlayerId,
          errorPlayerId: tag.errorPlayerId,
        };
        updateMatchEvents(config.id, updatedEvents);
      }
    }
    setQuickMarkTarget(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[calc(100vh-2rem)] justify-between select-none p-2 relative">
      {/* Hidden Live Region for Screen Readers */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Mini Leaderboard Live Strip */}
      <div className="mb-2">
        <MiniLeaderboardStrip />
      </div>

      {/* Top Header / Match Status Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider">
              GAME {currentGameNumber}
            </span>
            <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-medium">
              Best of {config.bestOf}
            </span>
            {match.status === 'INTERVAL' && (
              <span className="text-[10px] bg-amber-500 text-gray-950 font-bold px-1.5 py-0.5 rounded animate-pulse">
                INTERVAL (11 PTS)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 font-medium mt-0.5">
            Games: <span className="text-white font-mono font-bold">{gamesWonA} - {gamesWonB}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEditPointModal(true)}
            title="Edit Past Points"
            className="text-xs bg-gray-800 hover:bg-gray-700 text-amber-300 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          >
            Log
          </button>
          <button
            onClick={() => undo()}
            disabled={events.length === 0}
            className="text-xs bg-amber-950 hover:bg-amber-900 border border-amber-800/80 disabled:opacity-40 text-amber-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all tap-active"
          >
            <span>↶</span> Undo
          </button>
        </div>
      </div>

      {/* Side Swap Animated Banner */}
      {sideSwapAlert && (
        <div className="my-1 py-1.5 px-3 bg-amber-500 text-gray-950 font-bold text-xs text-center rounded-xl animate-bounce shadow-md">
          🔄 Sides Swapped! Ends have changed.
        </div>
      )}

      {/* Interactive Court View */}
      <CourtView state={match} />

      {/* Giant Scoring Tap Targets (Left End vs Right End) */}
      <div className="flex-1 grid grid-cols-2 gap-3 my-2">
        {/* Left Side Giant Tap Target */}
        <button
          type="button"
          data-testid="tap-left-side"
          onClick={() => handlePointTap(leftSide)}
          className={`relative rounded-3xl p-4 flex flex-col justify-between items-center text-center transition-all tap-active border-2 shadow-2xl ${
            leftSide === 'A'
              ? 'bg-gradient-to-b from-emerald-950/70 to-emerald-900/90 border-emerald-500/80 hover:border-emerald-400'
              : 'bg-gradient-to-b from-cyan-950/70 to-cyan-900/90 border-cyan-500/80 hover:border-cyan-400'
          }`}
        >
          {/* Side Indicator */}
          <div className="w-full flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {leftSide === 'A' ? 'Side A' : 'Side B'}
            </span>
            <span className="text-xs bg-black/40 px-2 py-0.5 rounded-full text-gray-300 font-mono">
              G: {leftGames}
            </span>
          </div>

          {/* Player Name */}
          <div className="text-base font-extrabold text-white truncate max-w-[95%]">
            {leftName}
          </div>

          {/* Giant Score */}
          <div
            className={`font-mono font-black tracking-tight text-white transition-all ${
              largeTextMode ? 'text-8xl' : 'text-7xl'
            }`}
          >
            {leftScore}
          </div>

          {/* Serve Badge */}
          <div className="h-6 flex items-center justify-center">
            {isLeftServing && (
              <span className="bg-amber-400 text-gray-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
                🏸 SERVE ({serveState.serviceCourt})
              </span>
            )}
          </div>

          <div className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
            Tap to add point [Key: {leftSide === 'A' ? 'A' : 'B'}]
          </div>
        </button>

        {/* Right Side Giant Tap Target */}
        <button
          type="button"
          data-testid="tap-right-side"
          onClick={() => handlePointTap(rightSide)}
          className={`relative rounded-3xl p-4 flex flex-col justify-between items-center text-center transition-all tap-active border-2 shadow-2xl ${
            rightSide === 'A'
              ? 'bg-gradient-to-b from-emerald-950/70 to-emerald-900/90 border-emerald-500/80 hover:border-emerald-400'
              : 'bg-gradient-to-b from-cyan-950/70 to-cyan-900/90 border-cyan-500/80 hover:border-cyan-400'
          }`}
        >
          {/* Side Indicator */}
          <div className="w-full flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {rightSide === 'A' ? 'Side A' : 'Side B'}
            </span>
            <span className="text-xs bg-black/40 px-2 py-0.5 rounded-full text-gray-300 font-mono">
              G: {rightGames}
            </span>
          </div>

          {/* Player Name */}
          <div className="text-base font-extrabold text-white truncate max-w-[95%]">
            {rightName}
          </div>

          {/* Giant Score */}
          <div
            className={`font-mono font-black tracking-tight text-white transition-all ${
              largeTextMode ? 'text-8xl' : 'text-7xl'
            }`}
          >
            {rightScore}
          </div>

          {/* Serve Badge */}
          <div className="h-6 flex items-center justify-center">
            {isRightServing && (
              <span className="bg-amber-400 text-gray-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
                🏸 SERVE ({serveState.serviceCourt})
              </span>
            )}
          </div>

          <div className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
            Tap to add point [Key: {rightSide === 'A' ? 'A' : 'B'}]
          </div>
        </button>
      </div>

      {/* Bottom Utility Bar */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          type="button"
          onClick={() => recordServeFault(serveState.serverSide)}
          className="py-2.5 bg-rose-950/80 border border-rose-800/70 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-bold tracking-wide uppercase transition-colors tap-active"
        >
          🚫 Service Fault (S)
        </button>
        <button
          type="button"
          onClick={() => toggleInterval()}
          className="py-2.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold tracking-wide uppercase transition-colors tap-active"
        >
          ⏱️ Interval (I)
        </button>
      </div>

      {/* Quick Mark Chip Layer */}
      {quickMarkTarget && (
        <div className="absolute inset-x-2 bottom-16 z-30 shadow-2xl">
          <QuickMarkLayer
            pointSide={quickMarkTarget.side}
            playersA={playersA}
            playersB={playersB}
            onApplyTag={handleApplyQuickMarkTag}
            onDismiss={() => setQuickMarkTarget(null)}
          />
        </div>
      )}

      {/* Point Edit Modal */}
      {showEditPointModal && (
        <PointEditModal
          matchId={config.id}
          playersA={playersA}
          playersB={playersB}
          onClose={() => setShowEditPointModal(false)}
        />
      )}

      {/* Rally Tag Modal Drawer */}
      {pendingPointSide && (
        <RallyTagModal
          side={pendingPointSide}
          sideName={pendingPointSide === 'A' ? config.sideA.name : config.sideB.name}
          onSelectTag={handleSelectRallyTag}
          onCancel={() => setPendingPointSide(null)}
        />
      )}

      {/* Point Log Drawer */}
      {showLog && (
        <PointLog
          events={events}
          state={match}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
};
