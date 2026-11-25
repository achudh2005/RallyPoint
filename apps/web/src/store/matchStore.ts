import { create } from 'zustand';
import {
  applyEvent,
  createMatch,
  MatchConfig,
  MatchEvent,
  MatchState,
  RallyEndType,
  replay,
  Side,
} from '@rallypoint/engine';
import { db } from '../db/index.js';
import { getMobileStorage } from '../db/storage.js';
import { useRankingStore } from './rankingStore.js';
import type { RankingMatch, RankingMatchEvent, ScoringFormat as RankingScoringFormat } from '@rallypoint/ranking';
import {
  convertEngineConfigToScoringConfig,
  createScoringMatch,
  recordRally,
  recordPlayerAction as recordScoringPlayerAction,
  recordUnattributedPoint as recordScoringUnattributedPoint,
  undoLastAction as scoringUndoLastAction,
  editAction as scoringEditAction,
  scoringChooseSetting,
  scoringUndo,
  syncScoringStateToEngineState,
  ScoringFormat,
  FormatConfig,
  ShutoutConfig,
  ShotType,
  RallyEndResult,
  ScoringRulesMatchState,
  PlayerActionEvent,
} from './scoringBridge.js';

export interface PlayerActionOptions {
  attributedPointPlayerId?: string;
  attributedDropPlayerIds?: string[];
  isBothFault?: boolean;
  note?: string;
  shotType?: ShotType;
  rallyEndResult?: RallyEndResult;
}

export interface ExtendedMatchConfig extends MatchConfig {
  scoringFormat?: ScoringFormat;
  customFormatConfig?: Partial<FormatConfig>;
  shutout?: ShutoutConfig;
  firstServerSide?: 'A' | 'B';
  firstServerPlayerId?: string;
}

export interface PendingShutoutCelebration {
  eventId: string;
  winnerSide: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  gameNumber: number;
  isMatchWin: boolean;
}

interface MatchStore {
  match: MatchState | null;
  events: MatchEvent[];
  scoringFormat: ScoringFormat;
  scoringRulesState: ScoringRulesMatchState | null;
  pendingSettingChoice: {
    eligibleSide: 'A' | 'B';
    atScore: number;
    setToTarget: number;
    extraPoints: number;
  } | null;
  enableRallyTagging: boolean;
  pendingPointSide: Side | null;
  theme: 'dark' | 'light';
  largeTextMode: boolean;
  announcement: string;

  // Player Action Settings
  showPlayerActionButtons: boolean;
  playerActionButtonLabels: 'POINT_DROP' | 'WINNER_ERROR' | 'PLUS_MINUS';
  playerActionButtonLayout: 'comfortable' | 'compact';

  // Shutout celebration state (plays live once per shutout event)
  pendingShutoutCelebration: PendingShutoutCelebration | null;
  playedCelebrationIds: string[];

  // Actions
  dismissShutoutCelebration: () => void;
  updateShutoutConfig: (shutout: ShutoutConfig) => void;
  finalizeMatchToRankings: () => void;
  startMatch: (config: ExtendedMatchConfig, enableRallyTagging?: boolean) => Promise<void>;
  recordPoint: (side: Side, rallyEndType?: RallyEndType) => Promise<void>;
  recordPlayerAction: (
    playerId: string,
    action: 'POINT' | 'DROP',
    options?: PlayerActionOptions
  ) => Promise<void>;
  recordUnattributedPoint: (side: Side) => Promise<void>;
  undoAction: () => Promise<string | null>;
  editAction: (
    eventId: string,
    updates: { playerId?: string; action?: 'POINT' | 'DROP' }
  ) => Promise<boolean>;
  chooseSettingChoice: (setGame: boolean) => Promise<void>;
  undo: () => Promise<void>;
  recordServeFault: (faultySide: Side) => Promise<void>;
  toggleInterval: () => Promise<void>;
  retireMatch: (retiringSide: Side, reason?: string) => Promise<void>;
  walkoverMatch: (concedingSide: Side, reason?: string) => Promise<void>;
  setPendingPointSide: (side: Side | null) => void;
  toggleTheme: () => void;
  toggleLargeText: () => void;
  setShowPlayerActionButtons: (val: boolean) => void;
  setPlayerActionButtonLabels: (labels: 'POINT_DROP' | 'WINNER_ERROR' | 'PLUS_MINUS') => void;
  setPlayerActionButtonLayout: (layout: 'comfortable' | 'compact') => void;
  resumeLastMatch: () => Promise<boolean>;
  resetMatch: () => void;
}

function triggerHaptic(duration = 40): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch {
    // Ignore in unsupported environments
  }
}

function generateAriaAnnouncement(state: MatchState): string {
  const nameA = state.config.sideA.name;
  const nameB = state.config.sideB.name;
  const scoreA = state.currentScoreA;
  const scoreB = state.currentScoreB;
  const server = state.serveState.serverSide === 'A' ? nameA : nameB;
  const court = state.serveState.serviceCourt;

  if (state.status === 'COMPLETED') {
    const winner = state.winnerSide === 'A' ? nameA : nameB;
    return `Match completed. ${winner} wins!`;
  }
  if (state.status === 'INTERVAL') {
    return `Interval. Score is ${nameA} ${scoreA}, ${nameB} ${scoreB}.`;
  }
  return `${nameA} ${scoreA}, ${nameB} ${scoreB}. ${server} serving from ${court} court.`;
}

function syncCompletedMatchToRankingStore(
  matchState: MatchState,
  events: MatchEvent[],
  scoringFormat: ScoringFormat,
  scoringRulesState: ScoringRulesMatchState | null
): void {
  if (matchState.status !== 'COMPLETED') return;
  const rankingStore = useRankingStore.getState();
  const playerMap = new Map(rankingStore.communityPlayers.map((p) => [p.id, p.displayName]));

  const resolveName = (id: string, fallbackList: string[] | undefined, idx: number, sideName: string) =>
    playerMap.get(id) ||
    fallbackList?.[idx] ||
    sideName.split('&')[idx]?.trim() ||
    sideName;

  const participants = [
    ...matchState.config.sideA.playerIds.map((id, idx) => ({
      playerId: id,
      displayName: resolveName(id, matchState.config.sideA.playerNames, idx, matchState.config.sideA.name),
      side: 'A' as const,
      position: (idx === 0 ? 1 : 2) as 1 | 2,
    })),
    ...matchState.config.sideB.playerIds.map((id, idx) => ({
      playerId: id,
      displayName: resolveName(id, matchState.config.sideB.playerNames, idx, matchState.config.sideB.name),
      side: 'B' as const,
      position: (idx === 0 ? 1 : 2) as 1 | 2,
    })),
  ];

  const rankingEvents: RankingMatchEvent[] = (events || []).map((ev: any, idx: number) => ({
    id: ev.id || `ev-${idx}`,
    sequenceNumber: ev.sequenceNumber || idx + 1,
    eventType: ev.type || ev.eventType || 'PLAYER_ACTION',
    playerId: ev.playerId,
    side: ev.side,
    action: ev.action,
    shotType: ev.shotType,
    rallyEndResult: ev.rallyEndResult,
    pointWinnerPlayerId: ev.pointWinnerPlayerId,
    errorPlayerId: ev.errorPlayerId,
    serverPlayerId: ev.serverAtRally || ev.serverPlayerId,
    isPoint: ev.isPoint,
    isSideOut: ev.isSideOut,
    attributedPointPlayerId: ev.attributedPointPlayerId,
    attributedDropPlayerIds: ev.attributedDropPlayerIds,
    isBothFault: ev.isBothFault,
    note: ev.note,
    payload: {
      servingSideAtRally: ev.servingSideAtRally,
      reason: ev.reason,
    },
  }));

  const games = matchState.games.map((g, idx) => {
    const srGame = scoringRulesState?.games[idx];
    return {
      gameNumber: g.gameNumber,
      scoreA: g.scoreA,
      scoreB: g.scoreB,
      winnerSide: g.winnerSide as 'A' | 'B' | undefined,
      winReason: srGame?.winReason,
    };
  });

  const rankingMatch: RankingMatch = {
    id: matchState.config.id,
    seasonId: rankingStore.activeSeason || 'Season 1',
    matchType: matchState.config.mode === 'doubles' ? 'DOUBLES' : 'SINGLES',
    scoringFormat: (scoringRulesState?.formatConfig.format || scoringFormat || 'RALLY_21') as RankingScoringFormat,
    status: matchState.winReason === 'WALKOVER' ? 'WALKOVER' : matchState.winReason === 'RETIRE' ? 'RETIRED' : 'COMPLETED',
    winnerSide: matchState.winnerSide,
    participants,
    games,
    events: rankingEvents,
    targetPoints: scoringRulesState?.formatConfig.targetPoints || matchState.config.pointsToWinGame,
    endedAt: new Date().toISOString(),
  };

  rankingStore.attachMatch(rankingMatch);
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  match: null,
  events: [],
  scoringFormat: 'RALLY_21',
  scoringRulesState: null,
  pendingSettingChoice: null,
  enableRallyTagging: false,
  pendingPointSide: null,
  theme: 'dark',
  largeTextMode: false,
  announcement: '',
  showPlayerActionButtons: true,
  playerActionButtonLabels: 'POINT_DROP',
  playerActionButtonLayout: 'comfortable',
  pendingShutoutCelebration: null,
  playedCelebrationIds: [],
  dismissShutoutCelebration: () => set({ pendingShutoutCelebration: null }),
  finalizeMatchToRankings: () => {
    const { match, events, scoringFormat, scoringRulesState } = get();
    if (!match || match.status !== 'COMPLETED') return;
    syncCompletedMatchToRankingStore(match, events, scoringFormat, scoringRulesState);
  },
  updateShutoutConfig: (shutout) => {
    const { match, events, scoringRulesState } = get();
    if (!match || events.length > 0 || !scoringRulesState) return;
    const updatedConfig: ExtendedMatchConfig = { ...match.config, shutout };
    const updatedScoringState: ScoringRulesMatchState = {
      ...scoringRulesState,
      config: { ...scoringRulesState.config, shutout },
      formatConfig: { ...scoringRulesState.formatConfig, shutout },
    };
    set({
      match: { ...match, config: updatedConfig },
      scoringRulesState: updatedScoringState,
    });
  },
  setShowPlayerActionButtons: (val: boolean) => set({ showPlayerActionButtons: val }),
  setPlayerActionButtonLabels: (labels) => set({ playerActionButtonLabels: labels }),
  setPlayerActionButtonLayout: (layout) => set({ playerActionButtonLayout: layout }),

  startMatch: async (config, enableRallyTagging = false) => {
    const scoringFormat = config.scoringFormat || 'RALLY_21';
    const scoringConfig = convertEngineConfigToScoringConfig(config);
    const scoringRulesState = createScoringMatch(scoringConfig);

    let state = createMatch(config);
    if (scoringFormat !== 'RALLY_21') {
      state = syncScoringStateToEngineState(scoringRulesState, config);
    }
    const announcement = generateAriaAnnouncement(state);

    set({
      match: state,
      events: [],
      scoringFormat,
      scoringRulesState,
      pendingSettingChoice: null,
      enableRallyTagging,
      pendingPointSide: null,
      announcement,
    });

    await db.matches.put({
      id: config.id,
      config,
      state,
      events: [],
      updatedAt: Date.now(),
      completed: false,
    });
  },

  chooseSettingChoice: async (setGame: boolean) => {
    const { scoringRulesState, match, events, pendingSettingChoice } = get();
    if (!match) return;

    triggerHaptic(40);
    let nextEngineState = match;
    let nextScoringState = scoringRulesState;

    if (scoringRulesState) {
      const activeChoice = scoringRulesState.pendingSettingChoice || pendingSettingChoice;
      if (activeChoice) {
        const stateWithChoice = {
          ...scoringRulesState,
          pendingSettingChoice: activeChoice,
        };
        const result = scoringChooseSetting(stateWithChoice, setGame);
        nextScoringState = result.state;
        nextEngineState = syncScoringStateToEngineState(result.state, match.config);
      }
    }

    const announcement = generateAriaAnnouncement(nextEngineState);

    const settingEvent: MatchEvent = {
      id: `setting-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'INTERVAL',
      intervalType: 'GAME_BREAK',
      gameNumber: match.currentGameNumber,
    };

    const nextEvents = [...events, settingEvent];
    set({
      scoringRulesState: nextScoringState,
      pendingSettingChoice: null,
      match: nextEngineState,
      events: nextEvents,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextEngineState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextEngineState.status === 'COMPLETED',
    });
  },

  recordPoint: async (side, rallyEndType) => {
    const { match, events, pendingPointSide, scoringRulesState, scoringFormat } = get();
    if (!match || match.status === 'COMPLETED') return;

    triggerHaptic(50);
    const targetSide = pendingPointSide ?? side;

    if (scoringRulesState && (scoringFormat !== 'RALLY_21' || scoringRulesState.formatConfig.shutout?.enabled)) {
      const rallyRes = recordRally(scoringRulesState, {
        winningSide: targetSide as 'A' | 'B',
      });
      const nextEngineState = syncScoringStateToEngineState(rallyRes.state, match.config);
      const announcement = generateAriaAnnouncement(nextEngineState);

      const gameEndShutout = rallyRes.events.find(
        (e) => e.type === 'GAME_END' && e.reason === 'SHUTOUT'
      );
      const matchEndShutout = rallyRes.events.find(
        (e) => e.type === 'MATCH_END' && e.reason === 'SHUTOUT_MATCH'
      );
      const { playedCelebrationIds } = get();
      let nextCelebration = get().pendingShutoutCelebration;
      let nextPlayedIds = playedCelebrationIds;
      if (
        gameEndShutout &&
        gameEndShutout.type === 'GAME_END' &&
        !playedCelebrationIds.includes(gameEndShutout.id)
      ) {
        nextPlayedIds = [...playedCelebrationIds, gameEndShutout.id];
        nextCelebration = {
          eventId: gameEndShutout.id,
          winnerSide: gameEndShutout.winnerSide,
          scoreA: gameEndShutout.scoreA,
          scoreB: gameEndShutout.scoreB,
          gameNumber: gameEndShutout.gameNumber,
          isMatchWin: Boolean(matchEndShutout),
        };
      }

      const event: MatchEvent = {
        id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        matchId: match.config.id,
        timestamp: Date.now(),
        type: 'POINT',
        side: targetSide,
        rallyEndType,
      };

      const nextEvents = [...events, event];
      set({
        scoringRulesState: rallyRes.state,
        pendingSettingChoice: rallyRes.state.pendingSettingChoice,
        match: nextEngineState,
        events: nextEvents,
        pendingPointSide: null,
        announcement,
        pendingShutoutCelebration: nextCelebration,
        playedCelebrationIds: nextPlayedIds,
      });

      await db.matches.put({
        id: match.config.id,
        config: match.config,
        state: nextEngineState,
        events: nextEvents,
        updatedAt: Date.now(),
        completed: nextEngineState.status === 'COMPLETED',
      });
      return;
    }

    const event: MatchEvent = {
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'POINT',
      side: targetSide,
      rallyEndType,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];
    const announcement = generateAriaAnnouncement(nextState);

    set({
      match: nextState,
      events: nextEvents,
      pendingPointSide: null,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextState.status === 'COMPLETED',
    });
  },

  recordPlayerAction: async (
    playerId: string,
    action: 'POINT' | 'DROP',
    options?: PlayerActionOptions
  ) => {
    const { match, events, scoringRulesState } = get();
    if (!match || match.status === 'COMPLETED') return;

    let scoringState = scoringRulesState;
    if (!scoringState) {
      const scoringConfig = convertEngineConfigToScoringConfig(match.config);
      scoringState = createScoringMatch(scoringConfig);
    }

    const res = recordScoringPlayerAction(scoringState, {
      playerId,
      action,
      attributedPointPlayerId: options?.attributedPointPlayerId,
      attributedDropPlayerIds: options?.attributedDropPlayerIds,
      isBothFault: options?.isBothFault,
      note: options?.note,
      shotType: options?.shotType,
      rallyEndResult: options?.rallyEndResult,
    });
    const nextEngineState = syncScoringStateToEngineState(res.state, match.config);
    const announcement = generateAriaAnnouncement(nextEngineState);

    const gameEndShutout = res.events.find(
      (e) => e.type === 'GAME_END' && e.reason === 'SHUTOUT'
    );
    const matchEndShutout = res.events.find(
      (e) => e.type === 'MATCH_END' && e.reason === 'SHUTOUT_MATCH'
    );
    const { playedCelebrationIds } = get();
    let nextCelebration = get().pendingShutoutCelebration;
    let nextPlayedIds = playedCelebrationIds;
    if (
      gameEndShutout &&
      gameEndShutout.type === 'GAME_END' &&
      !playedCelebrationIds.includes(gameEndShutout.id)
    ) {
      nextPlayedIds = [...playedCelebrationIds, gameEndShutout.id];
      nextCelebration = {
        eventId: gameEndShutout.id,
        winnerSide: gameEndShutout.winnerSide,
        scoreA: gameEndShutout.scoreA,
        scoreB: gameEndShutout.scoreB,
        gameNumber: gameEndShutout.gameNumber,
        isMatchWin: Boolean(matchEndShutout),
      };
    }

    const nextEvents = [...events, res.actionEvent as any];

    set({
      scoringRulesState: res.state,
      pendingSettingChoice: res.state.pendingSettingChoice,
      match: nextEngineState,
      events: nextEvents,
      announcement,
      pendingShutoutCelebration: nextCelebration,
      playedCelebrationIds: nextPlayedIds,
    });

    if (nextEngineState.status === 'COMPLETED') {
      syncCompletedMatchToRankingStore(nextEngineState, nextEvents, get().scoringFormat, res.state);
    }

    try {
      const storage = getMobileStorage();
      await storage.recordActionLocally(match.config.id, res.actionEvent, res.state);
    } catch {
      await db.matches.put({
        id: match.config.id,
        config: match.config,
        state: nextEngineState,
        events: nextEvents,
        updatedAt: Date.now(),
        completed: nextEngineState.status === 'COMPLETED',
      });
    }
  },

  recordUnattributedPoint: async (side: Side) => {
    const { match, events, scoringRulesState } = get();
    if (!match || match.status === 'COMPLETED') return;

    let scoringState = scoringRulesState;
    if (!scoringState) {
      const scoringConfig = convertEngineConfigToScoringConfig(match.config);
      scoringState = createScoringMatch(scoringConfig);
    }

    const res = recordScoringUnattributedPoint(scoringState, side);
    const nextEngineState = syncScoringStateToEngineState(res.state, match.config);
    const announcement = generateAriaAnnouncement(nextEngineState);

    const nextEvents = [...events, ...(res.events as any)];

    set({
      scoringRulesState: res.state,
      pendingSettingChoice: res.state.pendingSettingChoice,
      match: nextEngineState,
      events: nextEvents,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextEngineState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextEngineState.status === 'COMPLETED',
    });
  },

  undoAction: async (): Promise<string | null> => {
    const { match, events, scoringRulesState } = get();
    if (!match || events.length === 0) return null;

    if (scoringRulesState) {
      const undoRes = scoringUndoLastAction(scoringRulesState);
      const nextEngineState = syncScoringStateToEngineState(undoRes.state, match.config);
      const nextEvents = [...(undoRes.state.events as any)];
      const announcement = `Undone. Score: ${generateAriaAnnouncement(nextEngineState)}`;

      set({
        scoringRulesState: undoRes.state,
        pendingSettingChoice: undoRes.state.pendingSettingChoice,
        match: nextEngineState,
        events: nextEvents,
        announcement,
        pendingShutoutCelebration: null,
      });

      await db.matches.put({
        id: match.config.id,
        config: match.config,
        state: nextEngineState,
        events: nextEvents,
        updatedAt: Date.now(),
        completed: nextEngineState.status === 'COMPLETED',
      });

      if (undoRes.undoneEvent && undoRes.undoneEvent.type === 'PLAYER_ACTION') {
        const act = undoRes.undoneEvent as PlayerActionEvent;
        const player =
          match.config.sideA.playerIds[0] === act.playerId
            ? match.config.sideA.name.split('&')[0]?.trim()
            : match.config.sideB.playerIds[0] === act.playerId
            ? match.config.sideB.name.split('&')[0]?.trim()
            : act.playerId;
        const game = undoRes.state.currentGameNumber;
        const scA = nextEngineState.currentScoreA;
        const scB = nextEngineState.currentScoreB;
        return `${player} ${act.action} undone (Game ${game}, ${scA}-${scB})`;
      }
      return 'Point undone';
    } else {
      await get().undo();
      return 'Action undone';
    }
  },

  editAction: async (
    eventId: string,
    updates: { playerId?: string; action?: 'POINT' | 'DROP' }
  ): Promise<boolean> => {
    const { match, scoringRulesState } = get();
    if (!match || !scoringRulesState) return false;

    const editRes = scoringEditAction(scoringRulesState, eventId, updates);
    if (!editRes.success) return false;

    const nextEngineState = syncScoringStateToEngineState(editRes.state, match.config);
    const nextEvents = [...(editRes.state.events as any)];

    set({
      scoringRulesState: editRes.state,
      pendingSettingChoice: editRes.state.pendingSettingChoice,
      match: nextEngineState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextEngineState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextEngineState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextEngineState.status === 'COMPLETED',
    });

    return true;
  },

  undo: async () => {
    const { match, events, scoringRulesState, scoringFormat } = get();
    if (!match || events.length === 0) return;

    triggerHaptic(30);

    if (scoringRulesState && (scoringFormat !== 'RALLY_21' || scoringRulesState.formatConfig.shutout?.enabled)) {
      const undoneScoringState = scoringUndo(scoringRulesState);
      const nextEngineState = syncScoringStateToEngineState(undoneScoringState, match.config);
      const nextEvents = [...events];
      nextEvents.pop();
      const announcement = `Undone. Score: ${generateAriaAnnouncement(nextEngineState)}`;

      set({
        scoringRulesState: undoneScoringState,
        pendingSettingChoice: undoneScoringState.pendingSettingChoice,
        match: nextEngineState,
        events: nextEvents,
        pendingPointSide: null,
        announcement,
      });

      await db.matches.put({
        id: match.config.id,
        config: match.config,
        state: nextEngineState,
        events: nextEvents,
        updatedAt: Date.now(),
        completed: nextEngineState.status === 'COMPLETED',
      });
      return;
    }

    const undoEvent: MatchEvent = {
      id: `undo-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'UNDO',
    };

    const nextState = applyEvent(match, undoEvent);
    // Remove the last action from events list
    const nextEvents = [...events];
    for (let i = nextEvents.length - 1; i >= 0; i--) {
      const e = nextEvents[i];
      if (
        e &&
        (e.type === 'POINT' ||
          e.type === 'SERVE_FAULT' ||
          e.type === 'RETIRE' ||
          e.type === 'WALKOVER')
      ) {
        nextEvents.splice(i, 1);
        break;
      }
    }

    const announcement = `Undone. Score: ${generateAriaAnnouncement(nextState)}`;

    set({
      match: nextState,
      events: nextEvents,
      pendingPointSide: null,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextState.status === 'COMPLETED',
    });
  },

  recordServeFault: async (faultySide) => {
    const { match, events } = get();
    if (!match || match.status === 'COMPLETED') return;

    triggerHaptic(60);

    const event: MatchEvent = {
      id: `sf-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'SERVE_FAULT',
      faultySide,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];
    const announcement = `Service fault on side ${faultySide}. ${generateAriaAnnouncement(nextState)}`;

    set({
      match: nextState,
      events: nextEvents,
      announcement,
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: nextState.status === 'COMPLETED',
    });
  },

  toggleInterval: async () => {
    const { match, events } = get();
    if (!match) return;

    const event: MatchEvent = {
      id: `int-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'INTERVAL',
      intervalType: 'ELEVEN_POINT',
      gameNumber: match.currentGameNumber,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];

    set({
      match: nextState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: false,
    });
  },

  retireMatch: async (retiringSide, reason) => {
    const { match, events } = get();
    if (!match) return;

    const event: MatchEvent = {
      id: `ret-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'RETIRE',
      retiringSide,
      reason,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];

    set({
      match: nextState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: true,
    });
  },

  walkoverMatch: async (concedingSide, reason) => {
    const { match, events } = get();
    if (!match) return;

    const event: MatchEvent = {
      id: `wo-${Date.now()}`,
      matchId: match.config.id,
      timestamp: Date.now(),
      type: 'WALKOVER',
      concedingSide,
      reason,
    };

    const nextState = applyEvent(match, event);
    const nextEvents = [...events, event];

    set({
      match: nextState,
      events: nextEvents,
      announcement: generateAriaAnnouncement(nextState),
    });

    await db.matches.put({
      id: match.config.id,
      config: match.config,
      state: nextState,
      events: nextEvents,
      updatedAt: Date.now(),
      completed: true,
    });
  },

  setPendingPointSide: (side) => set({ pendingPointSide: side }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  toggleLargeText: () =>
    set((state) => ({ largeTextMode: !state.largeTextMode })),

  resumeLastMatch: async () => {
    try {
      const latest = await db.matches.orderBy('updatedAt').reverse().first();
      if (latest && !latest.completed) {
        // Re-derive state from events to ensure event-sourcing fidelity
        const derivedState =
          latest.events.length > 0
            ? replay(latest.events, latest.config)
            : createMatch(latest.config);

        set({
          match: derivedState,
          events: latest.events,
          announcement: generateAriaAnnouncement(derivedState),
        });
        return true;
      }
    } catch (e) {
      console.warn('Failed to resume match from IndexedDB', e);
    }
    return false;
  },

  resetMatch: () =>
    set({
      match: null,
      events: [],
      pendingPointSide: null,
      announcement: '',
    }),
}));
