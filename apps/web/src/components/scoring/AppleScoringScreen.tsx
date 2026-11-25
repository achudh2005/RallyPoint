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
import { useMatchStore, type ExtendedMatchConfig } from '../../store/matchStore.js';
import { Side, RallyEndType } from '@rallypoint/engine';
import { TVScoreboardScreen } from '../scoreboard/TVScoreboardScreen.js';
import { nativeKeepAwake } from '../../mobile/keepAwake.js';
import { registerBackHandler } from '../../mobile/backButton.js';
import { nativeHaptics } from '../../mobile/haptics.js';
import { nativeNotifications } from '../../mobile/notifications.js';
import { PlayerCard } from './PlayerCard.js';
import { QuickEditSheet } from './QuickEditSheet.js';
import { PlayerDetailSheet } from './PlayerDetailSheet.js';
import { computeStreaks, type StreakMilestoneAlert, type StreakAlertsConfig } from '@rallypoint/scoring-rules';
import { computeMatchAwards, type MatchAwardsResult, type RankingMatchEvent } from '@rallypoint/ranking';
import { StreakBanner } from './StreakBanner.js';
import { useAlertsSettingsStore } from '../../store/alertsSettingsStore.js';

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
    updateShutoutConfig,
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
  const [showLiveMvpPeek, setShowLiveMvpPeek] = useState(false);
  const [showDetailedRallySheet, setShowDetailedRallySheet] = useState(false);
  const [rallyWinnerSide, setRallyWinnerSide] = useState<'A' | 'B'>('A');
  const [rallyScorerId, setRallyScorerId] = useState<string>('');
  const [rallyDropperMode, setRallyDropperMode] = useState<'single' | 'both' | 'none'>('single');
  const [rallyDropperId, setRallyDropperId] = useState<string>('');
  const [rallyNote, setRallyNote] = useState<string>('');
  const [currentStreakAlert, setCurrentStreakAlert] = useState<StreakMilestoneAlert | null>(null);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const [lastTaggedPointSide, setLastTaggedPointSide] = useState<Side | null>(null);
  const [serveNotice, setServeNotice] = useState<string | null>(null);

  // Auto Drop Attribution Popup state
  const [showDropperSheet, setShowDropperSheet] = useState(false);
  const [pendingPointPlayerId, setPendingPointPlayerId] = useState<string | null>(null);
  const [pendingPointSide, setPendingPointSide] = useState<'A' | 'B' | null>(null);
  const [pendingScoreTapSide, setPendingScoreTapSide] = useState<Side | null>(null);

  const tagTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevServeSideRef = useRef<string | null>(null);
  const lastActionTimestampRef = useRef<number>(0);

  // Android Back Button handler for options bottom sheet
  useEffect(() => {
    if (!showMoreMenu && !showQuickEditSheet && !selectedPlayerForDetail && !showDropperSheet) return;
    return registerBackHandler(() => {
      if (showDropperSheet) {
        setShowDropperSheet(false);
        setPendingPointPlayerId(null);
        setPendingPointSide(null);
        setPendingScoreTapSide(null);
        return true;
      }
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

  // Player lists (prefer explicit playerNames, then split team name)
  const playerA1 = {
    id: config.sideA.playerIds[0] || 'p1',
    name:
      config.sideA.playerNames?.[0] ||
      config.sideA.name.split('&')[0]?.trim() ||
      config.sideA.name,
    side: 'A' as const,
  };
  const playerA2 = isDoubles
    ? {
        id: config.sideA.playerIds[1] || 'p2',
        name:
          config.sideA.playerNames?.[1] ||
          config.sideA.name.split('&')[1]?.trim() ||
          'Partner A',
        side: 'A' as const,
      }
    : null;

  const playerB1 = {
    id: config.sideB.playerIds[0] || 'p3',
    name:
      config.sideB.playerNames?.[0] ||
      config.sideB.name.split('&')[0]?.trim() ||
      config.sideB.name,
    side: 'B' as const,
  };
  const playerB2 = isDoubles
    ? {
        id: config.sideB.playerIds[1] || 'p4',
        name:
          config.sideB.playerNames?.[1] ||
          config.sideB.name.split('&')[1]?.trim() ||
          'Partner B',
        side: 'B' as const,
      }
    : null;

  const allPlayers = [playerA1, playerA2, playerB1, playerB2].filter(Boolean) as {
    id: string;
    name: string;
    side: 'A' | 'B';
  }[];

  // Live Streak Detection
  const streakAlertsEnabled = useAlertsSettingsStore((s) => s.streakAlertsEnabled);
  const pointStreakEnabled = useAlertsSettingsStore((s) => s.pointStreakEnabled);
  const dropStreakEnabled = useAlertsSettingsStore((s) => s.dropStreakEnabled);
  const teamRunEnabled = useAlertsSettingsStore((s) => s.teamRunEnabled);
  const strictMode = useAlertsSettingsStore((s) => s.strictMode);
  const streakSnappedEnabled = useAlertsSettingsStore((s) => s.streakSnappedEnabled);
  const alertLanguage = useAlertsSettingsStore((s) => s.language);
  const pointThresholds = useAlertsSettingsStore((s) => s.pointThresholds);
  const dropThresholds = useAlertsSettingsStore((s) => s.dropThresholds);
  const teamRunThresholds = useAlertsSettingsStore((s) => s.teamRunThresholds);
  const shutoutBannerEnabled = useAlertsSettingsStore((s) => s.shutoutBannerEnabled);
  const shutoutConfig =
    scoringRulesState?.formatConfig.shutout ?? (config as ExtendedMatchConfig).shutout;
  const shutoutTarget = shutoutConfig?.target || 7;
  const shutoutAllowedInGame = !(
    currentGameNumber === config.bestOf && shutoutConfig?.applyInDecider === false
  );
  const isOnePointToShutout = Boolean(
    shutoutConfig?.enabled &&
      shutoutBannerEnabled &&
      shutoutAllowedInGame &&
      ((currentScoreA === shutoutTarget - 1 && currentScoreB === 0) ||
        (currentScoreB === shutoutTarget - 1 && currentScoreA === 0))
  );

  const streakConfig: StreakAlertsConfig = React.useMemo(() => ({
    pointStreakThresholds: streakAlertsEnabled && pointStreakEnabled ? pointThresholds : [],
    dropStreakThresholds: streakAlertsEnabled && dropStreakEnabled ? dropThresholds : [],
    teamRunThresholds: streakAlertsEnabled && teamRunEnabled ? teamRunThresholds : [],
    strictMode,
    streakSnappedEnabled,
    dropStreaksEnabled: streakAlertsEnabled && dropStreakEnabled,
    language: alertLanguage,
  }), [
    streakAlertsEnabled,
    pointStreakEnabled,
    dropStreakEnabled,
    teamRunEnabled,
    strictMode,
    streakSnappedEnabled,
    alertLanguage,
    pointThresholds,
    dropThresholds,
    teamRunThresholds,
  ]);

  useEffect(() => {
    if (!streakAlertsEnabled || events.length === 0) {
      setCurrentStreakAlert(null);
      return;
    }

    const adaptedEvents = events.map((ev: any, idx: number) => ({
      ...ev,
      id: ev.id || `ev-${idx}`,
      type: ev.type || 'PLAYER_ACTION',
      playerId: ev.playerId,
      side: ev.side,
      action: ev.action,
      resultingWinnerSide: ev.resultingWinnerSide || (ev.action === 'POINT' ? ev.side : ev.side === 'A' ? 'B' : 'A'),
      isPoint: ev.isPoint !== false,
      isSideOut: !!ev.isSideOut,
      timestamp: ev.timestamp || Date.now(),
    }));

    const lookup = {
      getPlayerName: (id: string) => {
        if (playerA1.id === id) return playerA1.name;
        if (playerA2?.id === id) return playerA2.name;
        if (playerB1.id === id) return playerB1.name;
        if (playerB2?.id === id) return playerB2.name;
        return id;
      },
      getTeamName: (side: 'A' | 'B') => {
        return side === 'A' ? config.sideA.name : config.sideB.name;
      },
    };

    const res = computeStreaks(adaptedEvents as any, streakConfig, lookup);
    setCurrentStreakAlert((prev) => {
      const next = res.currentMilestone || null;
      if (prev?.id === next?.id) return prev;
      return next;
    });
  }, [events, streakConfig, config]);

  // Mid-Match Live MVP Calculation
  const liveAwards: MatchAwardsResult | null = React.useMemo(() => {
    if (events.length === 0) return null;

    const rankingEvents: RankingMatchEvent[] = events.map((ev: any, idx: number) => ({
      id: ev.id || `ev-${idx}`,
      sequenceNumber: ev.sequenceNumber || idx + 1,
      eventType: ev.type || 'PLAYER_ACTION',
      playerId: ev.playerId,
      side: ev.side,
      action: ev.action,
      isPoint: ev.isPoint,
      isSideOut: ev.isSideOut,
      attributedPointPlayerId: ev.attributedPointPlayerId,
      attributedDropPlayerIds: ev.attributedDropPlayerIds,
      isBothFault: ev.isBothFault,
      note: ev.note,
      payload: {
        servingSideAtRally: ev.servingSideAtRally,
      },
    }));

    const participants = [
      {
        playerId: playerA1.id,
        displayName: playerA1.name,
        side: 'A' as const,
      },
      ...(playerA2
        ? [
            {
              playerId: playerA2.id,
              displayName: playerA2.name,
              side: 'A' as const,
            },
          ]
        : []),
      {
        playerId: playerB1.id,
        displayName: playerB1.name,
        side: 'B' as const,
      },
      ...(playerB2
        ? [
            {
              playerId: playerB2.id,
              displayName: playerB2.name,
              side: 'B' as const,
            },
          ]
        : []),
    ];

    return computeMatchAwards(rankingEvents, undefined, {
      matchType: isDoubles ? 'DOUBLES' : 'SINGLES',
      scoringFormat,
      winnerSide: match?.status === 'COMPLETED' ? (match.winnerSide as 'A' | 'B') : undefined,
      participants,
    });
  }, [events, config, isDoubles, scoringFormat, match?.status, match?.winnerSide]);

  const checkMatchCompletedHaptics = async () => {
    const currentRules = useMatchStore.getState().scoringRulesState;
    if (currentRules && currentRules.status === 'COMPLETED') {
      await nativeHaptics.matchWon();
      if (liveAwards?.isQualified && liveAwards.mvp) {
        nativeNotifications.notifyMatchMvp(
          liveAwards.mvp.name,
          liveAwards.mvp.mvpScore,
          `${config.sideA.name} vs ${config.sideB.name}`
        );
      }
    }
  };

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
      const scoringSide: 'A' | 'B' =
        playerId === playerA1.id || playerId === playerA2?.id ? 'A' : 'B';
      const oppPlayers =
        scoringSide === 'A'
          ? [playerB1, playerB2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[]
          : [playerA1, playerA2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[];

      if (isDoubles && oppPlayers.length >= 2) {
        setPendingPointPlayerId(playerId);
        setPendingPointSide(scoringSide);
        setPendingScoreTapSide(null);
        setShowDropperSheet(true);
        return;
      }

      // Singles: auto-attribute single opposing player
      await recordPlayerAction(playerId, 'POINT', {
        attributedDropPlayerIds: oppPlayers[0] ? [oppPlayers[0].id] : undefined,
      });
      await checkMatchCompletedHaptics();
      return;
    }

    await nativeHaptics.dropScored();
    await recordPlayerAction(playerId, action);
    await checkMatchCompletedHaptics();
  };

  const handleConfirmDropperSelection = async (
    mode: 'single' | 'both' | 'skip',
    dropperId?: string
  ) => {
    const side = pendingPointSide;
    const scorerId = pendingPointPlayerId;
    const scoreTapSide = pendingScoreTapSide;

    setShowDropperSheet(false);
    setPendingPointPlayerId(null);
    setPendingPointSide(null);
    setPendingScoreTapSide(null);

    if (!side) return;

    const oppPlayers =
      side === 'A'
        ? ([playerB1, playerB2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[])
        : ([playerA1, playerA2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[]);

    nativeHaptics.selection();

    if (scorerId) {
      if (mode === 'single' && dropperId) {
        await recordPlayerAction(scorerId, 'POINT', {
          attributedDropPlayerIds: [dropperId],
        });
      } else if (mode === 'both' && oppPlayers.length >= 2) {
        await recordPlayerAction(scorerId, 'POINT', {
          attributedDropPlayerIds: [oppPlayers[0]!.id, oppPlayers[1]!.id],
          isBothFault: true,
          note: 'Both fault (0.5 each)',
        });
      } else {
        await recordPlayerAction(scorerId, 'POINT');
      }
    } else if (scoreTapSide) {
      if (mode === 'single' && dropperId) {
        await recordPlayerAction(dropperId, 'DROP');
      } else if (mode === 'both' && oppPlayers.length >= 2) {
        await recordPlayerAction(oppPlayers[0]!.id, 'DROP', {
          attributedDropPlayerIds: [oppPlayers[0]!.id, oppPlayers[1]!.id],
          isBothFault: true,
          note: 'Both fault (0.5 each)',
        });
      } else {
        await recordUnattributedPoint(scoreTapSide);
      }
    }

    await checkMatchCompletedHaptics();
  };

  // Big team score tap
  const handleScoreTap = async (side: Side) => {
    if (isCompleted || isInterval) return;

    const now = Date.now();
    if (now - lastActionTimestampRef.current < 300) return;
    lastActionTimestampRef.current = now;

    await nativeHaptics.pointScored();
    if (showPlayerActionButtons) {
      const oppPlayers =
        side === 'A'
          ? ([playerB1, playerB2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[])
          : ([playerA1, playerA2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[]);

      if (isDoubles && oppPlayers.length >= 2) {
        setPendingPointPlayerId(null);
        setPendingPointSide(side);
        setPendingScoreTapSide(side);
        setShowDropperSheet(true);
        return;
      }

      await recordUnattributedPoint(side);
      await checkMatchCompletedHaptics();
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
      {/* Top Streak Alert Banner */}
      <StreakBanner
        currentAlert={currentStreakAlert}
        suppressed={showMoreMenu || showQuickEditSheet || !!selectedPlayerForDetail || showScoreboard || !!activeSettingChoice}
      />

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

        {/* Center Pill: Game status, scoring format & live MVP peek */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-zinc-100">
            Game {currentGameNumber} of {totalGames}
          </span>
          <Badge variant="accent" size="sm">
            {formatLabel}
          </Badge>
          {liveAwards?.isQualified && liveAwards.mvp && (
            <button
              data-testid="mid-match-mvp-peek-chip"
              onClick={() => {
                nativeHaptics.selection();
                setShowLiveMvpPeek(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-all ml-0.5"
              title="Live Match MVP Standings"
            >
              <span>🌟 {liveAwards.mvp.name}</span>
              <span className="font-mono text-[9px] opacity-80">{liveAwards.mvp.mvpScore.toFixed(1)}</span>
            </button>
          )}
          {shutoutConfig?.enabled && (
            <span
              data-testid="shutout-rule-badge"
              className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400"
            >
              Shutout rule: {shutoutTarget}-0
            </span>
          )}
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

      {/* One Point to Shutout Banner */}
      {isOnePointToShutout && (
        <div
          data-testid="one-point-to-shutout-banner"
          className="bg-amber-500/15 border-b border-amber-500/30 py-1 px-4 text-center text-xs font-bold text-amber-700 dark:text-amber-300"
        >
          ⚡ One point to shutout ({shutoutTarget}-0)
        </div>
      )}

      {/* Deuce / 14-all Win-by-2 Banner */}
      {(() => {
        const fmt = scoringRulesState?.formatConfig;
        const target = fmt?.targetPoints || config.pointsToWinGame || 21;
        const cap = fmt?.cap || 30;
        const winBy = fmt?.winBy || 2;
        const isDeuce =
          !isCompleted &&
          winBy >= 2 &&
          currentScoreA >= target - 1 &&
          currentScoreB >= target - 1 &&
          currentScoreA < cap &&
          currentScoreB < cap &&
          Math.abs(currentScoreA - currentScoreB) < winBy;
        if (!isDeuce) return null;
        return (
          <div
            data-testid="deuce-rule-banner"
            className="bg-emerald-500/15 border-b border-emerald-500/30 py-1 px-4 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300"
          >
            🔥 {target - 1}-all Deuce — First team to lead by {winBy} points wins!
          </div>
        );
      })()}

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

          {/* Portrait Team-Grouped Player Action Cards (Lower 55% Thumb Zone) */}
          {showPlayerActionButtons && (
            <div className="flex-1 landscape:hidden p-3 flex flex-col justify-end gap-2.5 overflow-y-auto">
              {/* Team A Container Card */}
              <div
                data-testid="team-card-A"
                className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-950/20 p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
                    Team A: {playerA1.name}{playerA2 ? ` + ${playerA2.name}` : ''}
                  </span>
                </div>
                <div className={`grid gap-2 ${isDoubles ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                </div>
              </div>

              {/* Team B Container Card */}
              <div
                data-testid="team-card-B"
                className="rounded-2xl border border-blue-500/35 bg-blue-500/[0.04] dark:bg-blue-950/20 p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
                    Team B: {playerB1.name}{playerB2 ? ` + ${playerB2.name}` : ''}
                  </span>
                </div>
                <div className={`grid gap-2 ${isDoubles ? 'grid-cols-2' : 'grid-cols-1'}`}>
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

      {/* Auto Drop Attribution Popup (after a team/player scores in doubles) */}
      <BottomSheet
        isOpen={showDropperSheet}
        onClose={() => {
          setShowDropperSheet(false);
          setPendingPointPlayerId(null);
          setPendingPointSide(null);
          setPendingScoreTapSide(null);
        }}
        title={
          pendingPointSide === 'A'
            ? `Who from ${config.sideB.name} dropped this point?`
            : `Who from ${config.sideA.name} dropped this point?`
        }
      >
        {(() => {
          const oppPlayers =
            pendingPointSide === 'A'
              ? ([playerB1, playerB2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[])
              : ([playerA1, playerA2].filter(Boolean) as { id: string; name: string; side: 'A' | 'B' }[]);
          const scorerName = pendingPointPlayerId
            ? allPlayers.find((p) => p.id === pendingPointPlayerId)?.name
            : pendingPointSide === 'A'
            ? config.sideA.name
            : config.sideB.name;

          return (
            <div className="space-y-3 pt-1 pb-4" data-testid="auto-dropper-sheet">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Point scored by <strong className="text-slate-900 dark:text-white">{scorerName}</strong>. Select who dropped the point:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {oppPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    data-testid={`dropper-btn-${p.id}`}
                    onClick={() => handleConfirmDropperSelection('single', p.id)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-sm text-left flex items-center justify-between transition-colors"
                  >
                    <span>{p.name} dropped</span>
                    <span className="text-xs font-mono opacity-80">+1 Drop</span>
                  </button>
                ))}

                {oppPlayers.length >= 2 && (
                  <button
                    type="button"
                    data-testid="dropper-btn-both-fault"
                    onClick={() => handleConfirmDropperSelection('both')}
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-sm text-left flex items-center justify-between transition-colors"
                  >
                    <span>Both Fault ({oppPlayers[0]!.name} &amp; {oppPlayers[1]!.name})</span>
                    <span className="text-xs font-mono opacity-80">0.5 each</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="dropper-btn-skip"
                  onClick={() => handleConfirmDropperSelection('skip')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Skip (Unattributed)
                </button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

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
          {events.length === 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div>
                <p className="text-sm font-semibold">Shutout rule (win at {shutoutTarget}-0)</p>
                <p className="text-[11px] text-slate-500">Editable before the first point</p>
              </div>
              <input
                type="checkbox"
                aria-label="Toggle shutout rule before first point"
                checked={Boolean(shutoutConfig?.enabled)}
                onChange={(e) =>
                  updateShutoutConfig({
                    enabled: e.target.checked,
                    target: shutoutTarget,
                    effect: shutoutConfig?.effect || 'GAME',
                    applyInDecider: shutoutConfig?.applyInDecider ?? true,
                  })
                }
                className="w-4 h-4 accent-amber-500"
              />
            </div>
          )}

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

      {/* Live MVP Standings Bottom Sheet */}
      <BottomSheet
        isOpen={showLiveMvpPeek}
        onClose={() => setShowLiveMvpPeek(false)}
        title="Live Match MVP Standings"
      >
        <div className="space-y-4 pb-6 text-xs text-neutral-800 dark:text-neutral-200">
          {liveAwards?.mvp ? (
            <div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-amber-500">
                    Leader so far
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {liveAwards.mvp.mvpScore.toFixed(1)} pts
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                  {liveAwards.mvp.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {liveAwards.mvp.summaryLine}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {liveAwards.mvp.reasonChips.map((c, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-2">
                All Players
              </span>
              <div className="space-y-1.5">
                {liveAwards.allContributions.map((p, idx) => (
                  <div
                    key={p.playerId}
                    className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400 font-bold w-4">#{idx + 1}</span>
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-white">{p.name}</span>
                        <span className="block text-[10px] text-neutral-500">
                          {p.pointsWon} pts · {p.drops} drops · Streak {p.bestPointStreak}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      {p.mvpScore.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-neutral-500 py-4">
              MVP rankings will unlock after 5 attributed points.
            </p>
          )}

          <Button variant="secondary" size="md" fullWidth onClick={() => setShowLiveMvpPeek(false)}>
            Close
          </Button>
        </div>
      </BottomSheet>

      {/* Detailed Rally Attribution Sheet (Scorer + Opposing Dropper / Both Fault + Note) */}
      <BottomSheet
        isOpen={showDetailedRallySheet}
        onClose={() => setShowDetailedRallySheet(false)}
        title="Record Detailed Rally"
      >
        {(() => {
          const winningTeamPlayers =
            rallyWinnerSide === 'A'
              ? [playerA1, playerA2].filter(Boolean) as typeof allPlayers
              : [playerB1, playerB2].filter(Boolean) as typeof allPlayers;
          const losingTeamPlayers =
            rallyWinnerSide === 'A'
              ? [playerB1, playerB2].filter(Boolean) as typeof allPlayers
              : [playerA1, playerA2].filter(Boolean) as typeof allPlayers;

          return (
            <div className="space-y-4 pb-6 text-sm">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  1. Winning Team
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRallyWinnerSide('A');
                      setRallyScorerId(playerA1.id);
                      setRallyDropperId(playerB1.id);
                    }}
                    className={`p-2.5 rounded-xl font-bold border text-xs ${
                      rallyWinnerSide === 'A'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-black/5 dark:bg-white/5 border-transparent'
                    }`}
                  >
                    Team A ({playerA1.name}{playerA2 ? ` + ${playerA2.name}` : ''})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRallyWinnerSide('B');
                      setRallyScorerId(playerB1.id);
                      setRallyDropperId(playerA1.id);
                    }}
                    className={`p-2.5 rounded-xl font-bold border text-xs ${
                      rallyWinnerSide === 'B'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-black/5 dark:bg-white/5 border-transparent'
                    }`}
                  >
                    Team B ({playerB1.name}{playerB2 ? ` + ${playerB2.name}` : ''})
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  2. Who Scored (+1 Point)?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {winningTeamPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRallyScorerId(p.id)}
                      className={`p-2.5 rounded-xl font-semibold border text-xs ${
                        rallyScorerId === p.id
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-black/5 dark:bg-white/5 border-transparent'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  3. Opposing Player Who Dropped / Faulted
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {losingTeamPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setRallyDropperMode('single');
                        setRallyDropperId(p.id);
                      }}
                      className={`p-2.5 rounded-xl font-semibold border text-xs ${
                        rallyDropperMode === 'single' && rallyDropperId === p.id
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-black/5 dark:bg-white/5 border-transparent'
                      }`}
                    >
                      {p.name} (-1.0)
                    </button>
                  ))}
                  {losingTeamPlayers.length === 2 && (
                    <button
                      type="button"
                      onClick={() => setRallyDropperMode('both')}
                      className={`col-span-2 p-2.5 rounded-xl font-bold border text-xs ${
                        rallyDropperMode === 'both'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      }`}
                    >
                      Both Fault ({losingTeamPlayers[0]!.name} & {losingTeamPlayers[1]!.name} — 0.5 each)
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Optional Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g., Smash winner, net fault, miscommunication"
                  value={rallyNote}
                  onChange={(e) => setRallyNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  type="button"
                  onClick={() => setShowDetailedRallySheet(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="button"
                  onClick={async () => {
                    const scorerId = rallyScorerId || winningTeamPlayers[0]!.id;
                    const dropIds =
                      rallyDropperMode === 'both'
                        ? losingTeamPlayers.map((p) => p.id)
                        : rallyDropperMode === 'single' && rallyDropperId
                        ? [rallyDropperId]
                        : undefined;
                    await recordPlayerAction(scorerId, 'POINT', {
                      attributedDropPlayerIds: dropIds,
                      isBothFault: rallyDropperMode === 'both',
                      note: rallyNote.trim() || undefined,
                    });
                    setShowDetailedRallySheet(false);
                  }}
                >
                  Save Rally
                </Button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
};
