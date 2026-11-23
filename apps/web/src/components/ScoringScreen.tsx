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
    scoringFormat,
    scoringRulesState,
    pendingSettingChoice,
    chooseSettingChoice,
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

  const isServicePoint =
    scoringFormat === 'SERVICE_POINT_15' ||
    scoringFormat === 'SERVICE_POINT_11' ||
    (scoringRulesState && scoringRulesState.formatConfig.scoringType === 'SERVICE');

  const isOneDown = scoringRulesState?.isOneDownInitialTurn;
  const serverNumber = scoringRulesState?.serverNumber; // 1 or 2
  const servingPlayerName =
    scoringRulesState?.servingPlayerId === config.sideA.playerIds[0]
      ? config.sideA.playerNames?.[0] || config.sideA.name
      : scoringRulesState?.servingPlayerId === config.sideA.playerIds[1]
      ? config.sideA.playerNames?.[1] || 'Partner A'
      : scoringRulesState?.servingPlayerId === config.sideB.playerIds[0]
      ? config.sideB.playerNames?.[0] || config.sideB.name
      : config.sideB.playerNames?.[1] || 'Partner B';

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
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              {scoringFormat.replace(/_/g, ' ')}
            </span>
            {match.status === 'INTERVAL' && (
              <span className="text-[10px] bg-amber-500 text-gray-950 font-bold px-1.5 py-0.5 rounded animate-pulse">
                INTERVAL
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

      {/* Service Point Live Callout Banner */}
      {isServicePoint && (
        <div className="bg-gradient-to-r from-amber-950/80 to-amber-900/60 border border-amber-500/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs my-1 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-black flex items-center gap-1">
              <span>⚡</span> SERVICE POINT SCORING
            </span>
            {config.mode === 'doubles' && (
              <span className="bg-amber-400 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full shadow">
                {isOneDown ? 'ONE DOWN (1st Turn)' : `Server ${serverNumber || 1} of 2`}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-gray-300">
            Server: <span className="text-white font-mono font-black">{servingPlayerName}</span>
          </span>
        </div>
      )}

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

          {/* Action Prediction Badge */}
          <div className="my-1">
            {isServicePoint ? (
              isLeftServing ? (
                <span className="bg-emerald-500 text-gray-950 font-black text-xs px-3 py-1 rounded-xl shadow-lg inline-block">
                  +1 POINT
                </span>
              ) : (
                <span className="bg-amber-500 text-gray-950 font-black text-xs px-3 py-1 rounded-xl shadow-lg inline-block">
                  {config.mode === 'doubles' && serverNumber === 1 && !isOneDown
                    ? 'SECOND SERVER'
                    : 'SIDE OUT'}
                </span>
              )
            ) : (
              <span className="bg-emerald-500/80 text-white font-black text-[11px] px-2.5 py-0.5 rounded-lg inline-block">
                +1 POINT
              </span>
            )}
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
            {isServicePoint
              ? isLeftServing
                ? `Server wins rally (+1 pt) [Key: ${leftSide === 'A' ? 'A' : 'B'}]`
                : `Receiver wins rally (0 pts) [Key: ${leftSide === 'A' ? 'A' : 'B'}]`
              : `Tap to add point [Key: ${leftSide === 'A' ? 'A' : 'B'}]`}
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

          {/* Action Prediction Badge */}
          <div className="my-1">
            {isServicePoint ? (
              isRightServing ? (
                <span className="bg-emerald-500 text-gray-950 font-black text-xs px-3 py-1 rounded-xl shadow-lg inline-block">
                  +1 POINT
                </span>
              ) : (
                <span className="bg-amber-500 text-gray-950 font-black text-xs px-3 py-1 rounded-xl shadow-lg inline-block">
                  {config.mode === 'doubles' && serverNumber === 1 && !isOneDown
                    ? 'SECOND SERVER'
                    : 'SIDE OUT'}
                </span>
              )
            ) : (
              <span className="bg-emerald-500/80 text-white font-black text-[11px] px-2.5 py-0.5 rounded-lg inline-block">
                +1 POINT
              </span>
            )}
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
            {isServicePoint
              ? isRightServing
                ? `Server wins rally (+1 pt) [Key: ${rightSide === 'A' ? 'A' : 'B'}]`
                : `Receiver wins rally (0 pts) [Key: ${rightSide === 'A' ? 'A' : 'B'}]`
              : `Tap to add point [Key: ${rightSide === 'A' ? 'A' : 'B'}]`}
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

      {/* Setting Choice Modal (Service Point Scoring) */}
      {pendingSettingChoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border-2 border-amber-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="text-3xl">⚖️</div>
            <div>
              <h3 className="text-xl font-black text-white">
                {pendingSettingChoice.atScore}-All Reached!
              </h3>
              <p className="text-xs text-amber-300 font-bold mt-1">
                Side {pendingSettingChoice.eligibleSide} ({pendingSettingChoice.eligibleSide === 'A' ? config.sideA.name : config.sideB.name}) has the option to Set!
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Set to {pendingSettingChoice.extraPoints} more points (game to {pendingSettingChoice.setToTarget}) or Play to target without setting?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                data-testid="choose-set-game"
                onClick={() => chooseSettingChoice(true)}
                className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-2xl shadow-lg transition-transform active:scale-95 text-xs uppercase"
              >
                Set to {pendingSettingChoice.setToTarget}
              </button>
              <button
                type="button"
                data-testid="choose-no-set"
                onClick={() => chooseSettingChoice(false)}
                className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-2xl border border-gray-700 transition-colors text-xs uppercase"
              >
                No Set (Play on)
              </button>
            </div>
          </div>
        </div>
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
