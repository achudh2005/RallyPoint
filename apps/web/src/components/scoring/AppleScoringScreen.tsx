import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  MoreHorizontal,
  ChevronLeft,
  X,
  AlertCircle,
  HelpCircle,
  FileText,
  Tv,
  Edit3,
} from 'lucide-react';
import {
  ScoreNumberRoll,
  BottomSheet,
  Button,
  Badge,
} from '@rallypoint/ui';
import { useMatchStore } from '../../store/matchStore.js';
import { Side, RallyEndType } from '@rallypoint/engine';
import { TVScoreboardScreen } from '../scoreboard/TVScoreboardScreen.js';
import { nativeKeepAwake } from '../../mobile/keepAwake.js';
import { registerBackHandler } from '../../mobile/backButton.js';
import { nativeHaptics } from '../../mobile/haptics.js';
import { PlayerCard } from './PlayerCard.js';
import { QuickEditSheet } from './QuickEditSheet.js';
import { PlayerDetailSheet } from './PlayerDetailSheet.js';

export const AppleScoringScreen: React.FC = () => {
  const {
    match,
    events,
    scoringFormat,
    scoringRulesState,
    pendingSettingChoice,
    enableRallyTagging,
    showPlayerActionButtons,
    playerActionButtonLabels,
    playerActionButtonLayout,
    recordPoint,
    recordPlayerAction,
    recordUnattributedPoint,
    undoAction,
    editAction,
    chooseSettingChoice,
    toggleInterval,
    retireMatch,
    resetMatch,
  } = useMatchStore();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showRulesSheet, setShowRulesSheet] = useState(false);
  const [showQuickEditSheet, setShowQuickEditSheet] = useState(false);
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<{
    id: string;
    name: string;
    side: 'A' | 'B';
  } | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const [lastTaggedPointSide, setLastTaggedPointSide] = useState<Side | null>(null);
  const [serveNotice, setServeNotice] = useState<string | null>(null);

  const tagTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevServeSideRef = useRef<string | null>(null);
  const lastActionTimestampRef = useRef<number>(0);

  // Android Back Button handler for options bottom sheet
  useEffect(() => {
    if (!showMoreMenu && !showQuickEditSheet && !selectedPlayerForDetail) return;
    return registerBackHandler(() => {
      if (selectedPlayerForDetail) {
        setSelectedPlayerForDetail(null);
        return true;
      }
      if (showQuickEditSheet) {
        setShowQuickEditSheet(false);
        return true;
      }
      if (showMoreMenu) {
        setShowMoreMenu(false);
        return true;
      }
      return false;
    });
  }, [showMoreMenu, showQuickEditSheet, selectedPlayerForDetail]);

  // Screen Keep-Awake management during live scoring
  useEffect(() => {
    if (match && match.status === 'IN_PROGRESS') {
      nativeKeepAwake.enable();
    } else {
      nativeKeepAwake.disable();
    }
    return () => {
      nativeKeepAwake.disable();
    };
  }, [match?.status]);

  // Detect serve change in Service Point scoring
  useEffect(() => {
    if (!match) return;
    const currentServer = match.serveState?.serverSide;
    if (
      scoringFormat.startsWith('SERVICE_') &&
      prevServeSideRef.current &&
      currentServer &&
      prevServeSideRef.current !== currentServer
    ) {
      setServeNotice('Serve changes side');
      const timer = setTimeout(() => setServeNotice(null), 2500);
      return () => clearTimeout(timer);
    }
    prevServeSideRef.current = currentServer || null;
    return undefined;
  }, [match?.serveState?.serverSide, scoringFormat]);

  if (!match) {
    return null;
  }

  if (showScoreboard) {
    return (
      <TVScoreboardScreen
        state={match}
        onExit={() => setShowScoreboard(false)}
      />
    );
  }

  const { config, currentScoreA, currentScoreB, currentGameNumber, status, serveState } = match;
  const isInterval = status === 'INTERVAL';
  const isCompleted = status === 'COMPLETED';
  const totalGames = config.bestOf || 3;
  const isDoubles = config.mode === 'doubles';

  // Format label
  const formatLabel =
    scoringFormat === 'RALLY_21'
      ? 'Rally 21'
      : scoringFormat === 'RALLY_15'
      ? 'Rally 15'
      : scoringFormat === 'RALLY_11'
      ? 'Rally 11'
      : scoringFormat === 'SERVICE_POINT_15'
      ? 'Service 15'
      : scoringFormat === 'SERVICE_POINT_11'
      ? 'Service 11'
      : 'Custom';

  // Player lists
  const playerA1 = {
    id: config.sideA.playerIds[0] || 'p1',
    name: config.sideA.name.split('&')[0]?.trim() || config.sideA.name,
    side: 'A' as const,
  };
  const playerA2 = isDoubles
    ? {
        id: config.sideA.playerIds[1] || 'p2',
        name: config.sideA.name.split('&')[1]?.trim() || 'Partner A',
        side: 'A' as const,
      }
    : null;

  const playerB1 = {
    id: config.sideB.playerIds[0] || 'p3',
    name: config.sideB.name.split('&')[0]?.trim() || config.sideB.name,
    side: 'B' as const,
  };
  const playerB2 = isDoubles
    ? {
        id: config.sideB.playerIds[1] || 'p4',
        name: config.sideB.name.split('&')[1]?.trim() || 'Partner B',
        side: 'B' as const,
      }
    : null;

  const allPlayers = [playerA1, playerA2, playerB1, playerB2].filter(Boolean) as {
    id: string;
    name: string;
    side: 'A' | 'B';
  }[];

  // Debounced player actions (300ms accidental tap prevention)
  const handlePlayerAction = async (playerId: string, action: 'POINT' | 'DROP') => {
    if (isCompleted || isInterval) return;

    const now = Date.now();
    if (now - lastActionTimestampRef.current < 300) {
      return; // Debounce guard
    }
    lastActionTimestampRef.current = now;

    if (action === 'POINT') {
      await nativeHaptics.pointScored();
    } else {
      await nativeHaptics.dropScored();
    }

    await recordPlayerAction(playerId, action);

    // Check if match was completed by this action
    const currentRules = useMatchStore.getState().scoringRulesState;
    if (currentRules && currentRules.status === 'COMPLETED') {
      await nativeHaptics.matchWon();
    }
  };

  // Big team score tap (unattributed points)
  const handleScoreTap = async (side: Side) => {
    if (isCompleted || isInterval) return;

    const now = Date.now();
    if (now - lastActionTimestampRef.current < 300) return;
    lastActionTimestampRef.current = now;

    await nativeHaptics.pointScored();
    if (showPlayerActionButtons) {
      await recordUnattributedPoint(side);
    } else {
      await recordPoint(side);
    }

    if (enableRallyTagging) {
      setLastTaggedPointSide(side);
      if (tagTimeoutRef.current) clearTimeout(tagTimeoutRef.current);
      tagTimeoutRef.current = setTimeout(() => {
        setLastTaggedPointSide(null);
      }, 3000);
    }
  };

  const handleTagShot = (_type: RallyEndType) => {
    if (lastTaggedPointSide) {
      nativeHaptics.selection();
      setLastTaggedPointSide(null);
      if (tagTimeoutRef.current) clearTimeout(tagTimeoutRef.current);
    }
  };

  const handleUndo = async () => {
    if (events.length === 0) return;
    await nativeHaptics.undo();
    const undoneMsg = await undoAction();

    if (undoneMsg) {
      setUndoToast(undoneMsg);
      if (undoToastTimeoutRef.current) clearTimeout(undoToastTimeoutRef.current);
      undoToastTimeoutRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 3000);
    }
  };

  const activeSettingChoice =
    pendingSettingChoice || scoringRulesState?.pendingSettingChoice;

  // Stats helper
  const getPlayerStats = (id: string) => {
    return scoringRulesState?.playerStats?.[id] || {
      playerId: id,
      pointsWon: 0,
      drops: 0,
      netContribution: 0,
      pointShareWithinTeam: 0,
      dropShareWithinTeam: 0,
      currentPointStreak: 0,
      bestPointStreak: 0,
      servicePointsWon: 0,
      sideOutsCaused: 0,
    };
  };

  // Court position helpers
  const getCourtPosition = (side: 'A' | 'B', playerId: string): 'LEFT' | 'RIGHT' | undefined => {
    if (!scoringRulesState) return undefined;
    if (side === 'A') {
      if (scoringRulesState.sideACourt.rightPlayerId === playerId) return 'RIGHT';
      if (scoringRulesState.sideACourt.leftPlayerId === playerId) return 'LEFT';
    } else {
      if (scoringRulesState.sideBCourt.rightPlayerId === playerId) return 'RIGHT';
      if (scoringRulesState.sideBCourt.leftPlayerId === playerId) return 'LEFT';
    }
    return undefined;
  };

  const unassignedA = scoringRulesState?.unassignedPoints?.sideA || 0;
  const unassignedB = scoringRulesState?.unassignedPoints?.sideB || 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-black text-slate-900 dark:text-white select-none overflow-hidden safe-left safe-right">
      {/* Top Quiet Bar */}
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2 border-b border-black/5 dark:border-white/10 shrink-0">
        <button
          onClick={() => {
            nativeHaptics.selection();
            setShowMoreMenu(true);
          }}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          aria-label="Match Options"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Matches</span>
        </button>

        {/* Center Pill: Game status & scoring format */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-zinc-100">
            Game {currentGameNumber} of {totalGames}
          </span>
          <Badge variant="accent" size="sm">
            {formatLabel}
          </Badge>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              nativeHaptics.selection();
              setShowQuickEditSheet(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 transition-colors"
            aria-label="Edit recent actions"
            title="Edit recent actions"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              nativeHaptics.selection();
              setShowScoreboard(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 transition-colors"
            aria-label="TV Scoreboard"
            title="TV Scoreboard"
          >
            <Tv className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              nativeHaptics.selection();
              setShowMoreMenu(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 transition-colors"
            aria-label="Match Menu"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Serve Notice Banner (Service Point mode) */}
      <AnimatePresence>
        {serveNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border-b border-amber-500/20 py-1 px-4 text-center text-xs font-semibold text-amber-600 dark:text-amber-400"
          >
            🏸 {serveNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Scoring Arena */}
      <main className="flex-1 flex flex-col landscape:flex-row overflow-hidden relative">
        {/* Landscape Left Column: Side A Player Cards */}
        <div className="hidden landscape:flex landscape:w-1/3 flex-col gap-3 p-3 overflow-y-auto border-r border-black/5 dark:border-white/10">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {config.sideA.name}
          </div>
          <PlayerCard
            playerId={playerA1.id}
            name={playerA1.name}
            side="A"
            testIdPrefix="landscape"
            isServer={serveState?.serverPlayerId === playerA1.id}
            courtPosition={getCourtPosition('A', playerA1.id)}
            pointsWon={getPlayerStats(playerA1.id).pointsWon}
            drops={getPlayerStats(playerA1.id).drops}
            netContribution={getPlayerStats(playerA1.id).netContribution}
            buttonLabels={playerActionButtonLabels}
            layout={playerActionButtonLayout}
            disabled={isCompleted || isInterval}
            onPoint={() => handlePlayerAction(playerA1.id, 'POINT')}
            onDrop={() => handlePlayerAction(playerA1.id, 'DROP')}
            onLongPress={() => setSelectedPlayerForDetail(playerA1)}
          />
          {playerA2 && (
            <PlayerCard
              playerId={playerA2.id}
              name={playerA2.name}
              side="A"
              testIdPrefix="landscape"
              isServer={serveState?.serverPlayerId === playerA2.id}
              courtPosition={getCourtPosition('A', playerA2.id)}
              pointsWon={getPlayerStats(playerA2.id).pointsWon}
              drops={getPlayerStats(playerA2.id).drops}
              netContribution={getPlayerStats(playerA2.id).netContribution}
              buttonLabels={playerActionButtonLabels}
              layout={playerActionButtonLayout}
              disabled={isCompleted || isInterval}
              onPoint={() => handlePlayerAction(playerA2.id, 'POINT')}
              onDrop={() => handlePlayerAction(playerA2.id, 'DROP')}
              onLongPress={() => setSelectedPlayerForDetail(playerA2)}
            />
          )}
        </div>

        {/* Center / Middle Scoreboard (Big numbers readable from 10 feet) */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* Upper Scoreboard: Tappable for quick unattributed points */}
          <div className="flex flex-row items-center justify-around py-3 sm:py-5 px-3 border-b border-black/5 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-zinc-950/50">
            {/* Side A Score Tap Card */}
            <button
              type="button"
              data-testid="team-score-btn-A"
              onClick={() => handleScoreTap('A')}
              disabled={isCompleted || isInterval}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-98 ${
                serveState?.serverSide === 'A'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/20 ring-2 ring-emerald-500/60 shadow-xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[120px]">
                  {config.sideA.name}
                </span>
                {serveState?.serverSide === 'A' && (
                  <span className="text-xs">🏸</span>
                )}
              </div>
              <ScoreNumberRoll
                score={currentScoreA}
                size="giant"
                className="text-slate-900 dark:text-white font-extrabold"
              />
              {unassignedA > 0 && (
                <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Unassigned: {unassignedA}
                </span>
              )}
            </button>

            {/* Quiet Center Divider */}
            <div className="px-3 flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-400">VS</span>
              {serveState?.serviceCourt && (
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase mt-1">
                  {serveState.serviceCourt}
                </span>
              )}
            </div>

            {/* Side B Score Tap Card */}
            <button
              type="button"
              data-testid="team-score-btn-B"
              onClick={() => handleScoreTap('B')}
              disabled={isCompleted || isInterval}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-98 ${
                serveState?.serverSide === 'B'
                  ? 'bg-blue-50/80 dark:bg-blue-950/20 ring-2 ring-blue-500/60 shadow-xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[120px]">
                  {config.sideB.name}
                </span>
                {serveState?.serverSide === 'B' && (
                  <span className="text-xs">🏸</span>
                )}
              </div>
              <ScoreNumberRoll
                score={currentScoreB}
                size="giant"
                className="text-slate-900 dark:text-white font-extrabold"
              />
              {unassignedB > 0 && (
                <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Unassigned: {unassignedB}
                </span>
              )}
            </button>
          </div>

          {/* Portrait Player Action Cards (Lower 55% Thumb Zone) */}
          {showPlayerActionButtons && (
            <div className="flex-1 landscape:hidden p-3 flex flex-col justify-end gap-2.5 overflow-y-auto">
              <div
                className={`grid gap-2.5 ${
                  isDoubles ? 'grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {/* Side A Player Cards */}
                <PlayerCard
                  playerId={playerA1.id}
                  name={playerA1.name}
                  side="A"
                  isServer={serveState?.serverPlayerId === playerA1.id}
                  courtPosition={getCourtPosition('A', playerA1.id)}
                  pointsWon={getPlayerStats(playerA1.id).pointsWon}
                  drops={getPlayerStats(playerA1.id).drops}
                  netContribution={getPlayerStats(playerA1.id).netContribution}
                  buttonLabels={playerActionButtonLabels}
                  layout={playerActionButtonLayout}
                  disabled={isCompleted || isInterval}
                  onPoint={() => handlePlayerAction(playerA1.id, 'POINT')}
                  onDrop={() => handlePlayerAction(playerA1.id, 'DROP')}
                  onLongPress={() => setSelectedPlayerForDetail(playerA1)}
                />
                {playerA2 && (
                  <PlayerCard
                    playerId={playerA2.id}
                    name={playerA2.name}
                    side="A"
                    isServer={serveState?.serverPlayerId === playerA2.id}
                    courtPosition={getCourtPosition('A', playerA2.id)}
                    pointsWon={getPlayerStats(playerA2.id).pointsWon}
                    drops={getPlayerStats(playerA2.id).drops}
                    netContribution={getPlayerStats(playerA2.id).netContribution}
                    buttonLabels={playerActionButtonLabels}
                    layout={playerActionButtonLayout}
                    disabled={isCompleted || isInterval}
                    onPoint={() => handlePlayerAction(playerA2.id, 'POINT')}
                    onDrop={() => handlePlayerAction(playerA2.id, 'DROP')}
                    onLongPress={() => setSelectedPlayerForDetail(playerA2)}
                  />
                )}

                {/* Side B Player Cards */}
                <PlayerCard
                  playerId={playerB1.id}
                  name={playerB1.name}
                  side="B"
                  isServer={serveState?.serverPlayerId === playerB1.id}
                  courtPosition={getCourtPosition('B', playerB1.id)}
                  pointsWon={getPlayerStats(playerB1.id).pointsWon}
                  drops={getPlayerStats(playerB1.id).drops}
                  netContribution={getPlayerStats(playerB1.id).netContribution}
                  buttonLabels={playerActionButtonLabels}
                  layout={playerActionButtonLayout}
                  disabled={isCompleted || isInterval}
                  onPoint={() => handlePlayerAction(playerB1.id, 'POINT')}
                  onDrop={() => handlePlayerAction(playerB1.id, 'DROP')}
                  onLongPress={() => setSelectedPlayerForDetail(playerB1)}
                />
                {playerB2 && (
                  <PlayerCard
                    playerId={playerB2.id}
                    name={playerB2.name}
                    side="B"
                    isServer={serveState?.serverPlayerId === playerB2.id}
                    courtPosition={getCourtPosition('B', playerB2.id)}
                    pointsWon={getPlayerStats(playerB2.id).pointsWon}
                    drops={getPlayerStats(playerB2.id).drops}
                    netContribution={getPlayerStats(playerB2.id).netContribution}
                    buttonLabels={playerActionButtonLabels}
                    layout={playerActionButtonLayout}
                    disabled={isCompleted || isInterval}
                    onPoint={() => handlePlayerAction(playerB2.id, 'POINT')}
                    onDrop={() => handlePlayerAction(playerB2.id, 'DROP')}
                    onLongPress={() => setSelectedPlayerForDetail(playerB2)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Landscape Right Column: Side B Player Cards */}
        <div className="hidden landscape:flex landscape:w-1/3 flex-col gap-3 p-3 overflow-y-auto border-l border-black/5 dark:border-white/10">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {config.sideB.name}
          </div>
          <PlayerCard
            playerId={playerB1.id}
            name={playerB1.name}
            side="B"
            testIdPrefix="landscape"
            isServer={serveState?.serverPlayerId === playerB1.id}
            courtPosition={getCourtPosition('B', playerB1.id)}
            pointsWon={getPlayerStats(playerB1.id).pointsWon}
            drops={getPlayerStats(playerB1.id).drops}
            netContribution={getPlayerStats(playerB1.id).netContribution}
            buttonLabels={playerActionButtonLabels}
            layout={playerActionButtonLayout}
            disabled={isCompleted || isInterval}
            onPoint={() => handlePlayerAction(playerB1.id, 'POINT')}
            onDrop={() => handlePlayerAction(playerB1.id, 'DROP')}
            onLongPress={() => setSelectedPlayerForDetail(playerB1)}
          />
          {playerB2 && (
            <PlayerCard
              playerId={playerB2.id}
              name={playerB2.name}
              side="B"
              testIdPrefix="landscape"
              isServer={serveState?.serverPlayerId === playerB2.id}
              courtPosition={getCourtPosition('B', playerB2.id)}
              pointsWon={getPlayerStats(playerB2.id).pointsWon}
              drops={getPlayerStats(playerB2.id).drops}
              netContribution={getPlayerStats(playerB2.id).netContribution}
              buttonLabels={playerActionButtonLabels}
              layout={playerActionButtonLayout}
              disabled={isCompleted || isInterval}
              onPoint={() => handlePlayerAction(playerB2.id, 'POINT')}
              onDrop={() => handlePlayerAction(playerB2.id, 'DROP')}
              onLongPress={() => setSelectedPlayerForDetail(playerB2)}
            />
          )}
        </div>
      </main>

      {/* Floating Pill Toast for Undo Actions */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-2 pointer-events-none"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>{undoToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Tagging Bar */}
      <AnimatePresence>
        {lastTaggedPointSide && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="px-4 py-2 border-t border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/90 flex items-center justify-center gap-2"
          >
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mr-1">
              Tag:
            </span>
            {(['SMASH', 'DROP', 'NET', 'ERROR'] as RallyEndType[]).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagShot(tag)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-zinc-200 transition-colors"
              >
                {tag.charAt(0) + tag.slice(1).toLowerCase()}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Thumb Zone: Undo Button */}
      <footer className="px-6 pt-2 pb-[max(env(safe-area-inset-bottom,0px),12px)] border-t border-black/5 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-black">
        {/* Left: Quick Edit sheet shortcut */}
        <button
          type="button"
          onClick={() => {
            nativeHaptics.selection();
            setShowQuickEditSheet(true);
          }}
          className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Actions ({events.length})</span>
        </button>

        {/* Center: Prominent Undo Button */}
        <button
          onClick={handleUndo}
          disabled={events.length === 0}
          className="flex items-center justify-center gap-2 px-6 py-2.5 min-h-[48px] rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-transform active:scale-95 shadow-xs"
          aria-label="Undo last point"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>Undo</span>
        </button>

        {/* Right: Game counter */}
        <div className="text-xs text-slate-400 dark:text-zinc-500 font-mono font-medium">
          G{currentGameNumber}/{totalGames}
        </div>
      </footer>

      {/* Quick Edit Sheet */}
      <QuickEditSheet
        isOpen={showQuickEditSheet}
        onClose={() => setShowQuickEditSheet(false)}
        actions={scoringRulesState?.actionHistory || []}
        players={allPlayers}
        onEditAction={async (eventId, updates) => {
          return editAction(eventId, updates);
        }}
      />

      {/* Player Detail & Options Bottom Sheet */}
      <PlayerDetailSheet
        isOpen={Boolean(selectedPlayerForDetail)}
        onClose={() => setSelectedPlayerForDetail(null)}
        player={selectedPlayerForDetail}
        stats={
          selectedPlayerForDetail
            ? getPlayerStats(selectedPlayerForDetail.id)
            : undefined
        }
        onOpenEditSheet={() => {
          setSelectedPlayerForDetail(null);
          setShowQuickEditSheet(true);
        }}
      />

      {/* Setting Choice Modal (Service Point: Set to 17 or Play to 15) */}
      <BottomSheet
        isOpen={Boolean(activeSettingChoice)}
        onClose={() => {}}
        title="Game Setting Option"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            The score reached{' '}
            <strong className="text-slate-900 dark:text-white">
              {activeSettingChoice?.atScore}-all
            </strong>
            . Does Side {activeSettingChoice?.eligibleSide} want to set the game?
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => chooseSettingChoice(true)}
            >
              Set to {activeSettingChoice?.setToTarget}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => chooseSettingChoice(false)}
            >
              No, play to {activeSettingChoice?.atScore! + 1}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Interval / Side Change Modal */}
      <BottomSheet
        isOpen={isInterval}
        onClose={() => {}}
        title="Interval & Side Change"
      >
        <div className="space-y-5 pt-2 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
            🏸
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              60-Second Break & Switch Sides
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Score: {config.sideA.name} {currentScoreA} — {currentScoreB}{' '}
              {config.sideB.name}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              nativeHaptics.sideChange();
              toggleInterval();
            }}
          >
            Resume Play
          </Button>
        </div>
      </BottomSheet>

      {/* More Options Bottom Sheet */}
      <BottomSheet
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        title="Match Options"
      >
        <div className="space-y-2 pt-2 pb-4">
          <button
            onClick={() => {
              setShowMoreMenu(false);
              setShowQuickEditSheet(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-3">
              <Edit3 className="w-5 h-5 text-emerald-500" />
              <span>Edit Actions & Attribution</span>
            </div>
            <span className="text-xs text-slate-400">Manage</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              setShowRulesSheet(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              <span>Rules & Format Explanation</span>
            </div>
            <span className="text-xs text-slate-400">View</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              setShowDetailsSheet(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <span>Match Details & Events Log</span>
            </div>
            <span className="text-xs text-slate-400">
              {events.length} events
            </span>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/10 my-2" />

          <button
            onClick={() => {
              setShowMoreMenu(false);
              retireMatch('A', 'Retired');
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-rose-500/10 text-left text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Retire Match ({config.sideA.name})</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              retireMatch('B', 'Retired');
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-rose-500/10 text-left text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Retire Match ({config.sideB.name})</span>
          </button>

          <button
            onClick={() => {
              setShowMoreMenu(false);
              resetMatch();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-sm font-medium text-slate-600 dark:text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Abandon / Reset Match</span>
          </button>
        </div>
      </BottomSheet>

      {/* Rules Explanation Sheet */}
      <BottomSheet
        isOpen={showRulesSheet}
        onClose={() => setShowRulesSheet(false)}
        title="Scoring System Guide"
      >
        <div className="space-y-4 pt-2 text-sm text-slate-600 dark:text-zinc-300">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              {formatLabel} System
            </h4>
            <p className="text-xs mt-1 leading-relaxed">
              {scoringFormat.startsWith('SERVICE_')
                ? 'Only the serving side scores a point when they win a rally. If the receiving side wins, they win the serve without scoring. Game is won at target points with setting available on ties.'
                : 'Every rally won results in a point scored, regardless of who served. Active server changes whenever the receiving side wins a point.'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-black/5 dark:border-white/10 text-xs space-y-1">
            <p className="font-semibold text-slate-800 dark:text-zinc-200">
              Serve Rules:
            </p>
            <p>• Even score = Right court</p>
            <p>• Odd score = Left court</p>
            <p>• 11-point interval in Rally 21 / 8-point in 15</p>
          </div>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setShowRulesSheet(false)}
          >
            Done
          </Button>
        </div>
      </BottomSheet>

      {/* Match Details & Event Log Sheet */}
      <BottomSheet
        isOpen={showDetailsSheet}
        onClose={() => setShowDetailsSheet(false)}
        title="Point-by-Point Events"
      >
        <div className="max-h-72 overflow-y-auto space-y-2 pt-2 pr-1">
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No points recorded yet.
            </p>
          ) : (
            [...events].reverse().map((ev, i) => (
              <div
                key={ev.id || i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-xs"
              >
                <div className="font-medium text-slate-800 dark:text-zinc-200">
                  {ev.type === 'PLAYER_ACTION'
                    ? `${(ev as any).action} by ${(ev as any).playerId} (Side ${(ev as any).side})`
                    : ev.type === 'POINT'
                    ? `Point won by Side ${(ev as any).side || 'A'}`
                    : ev.type}
                </div>
                <div className="font-mono text-slate-500 dark:text-zinc-400">
                  {new Date(ev.timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </div>
  );
};
