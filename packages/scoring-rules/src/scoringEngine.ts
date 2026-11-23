import {
  MatchConfig,
  MatchState,
  FormatConfig,
  FORMAT_PRESETS,
  GameState,
  ScoringEvent,
  RallyWonEvent,
  PointScoredEvent,
  SideOutEvent,
  SettingChoiceEvent,
  GameEndEvent,
  MatchEndEvent,
  IntervalEvent,
  CourtPosition,
  ShotType,
  RallyEndResult,
} from './types.js';

export function createMatch(config: MatchConfig): MatchState {
  const preset = FORMAT_PRESETS[config.scoringFormat] || FORMAT_PRESETS.RALLY_21;
  const formatConfig: FormatConfig = {
    ...preset,
    ...(config.customFormatConfig || {}),
  };

  const initialGame: GameState = {
    gameNumber: 1,
    scoreA: 0,
    scoreB: 0,
    isComplete: false,
    targetPoints: formatConfig.targetPoints,
    reachedSettingThresholds: [],
    settingDecidedForScores: [],
    firstSideToReachScore: {},
    sidesSwappedMidpoint: false,
  };

  const sideACourt = {
    rightPlayerId: config.sideA.player1.id,
    leftPlayerId: config.sideA.player2 ? config.sideA.player2.id : config.sideA.player1.id,
  };

  const sideBCourt = {
    rightPlayerId: config.sideB.player1.id,
    leftPlayerId: config.sideB.player2 ? config.sideB.player2.id : config.sideB.player1.id,
  };

  const servingSide = config.firstServerSide || 'A';
  const servingCourt: CourtPosition = 'RIGHT';

  // In service point doubles, the "one down" rule means first serving side gets only 1 server (serverNumber = 2)
  const isServicePoint = formatConfig.scoringType === 'SERVICE';
  const isDoubles = config.matchType === 'DOUBLES';
  const isOneDown = isServicePoint && isDoubles;
  const serverNumber: 1 | 2 = isOneDown ? 2 : 1;

  const servingPlayerId =
    servingSide === 'A' ? sideACourt.rightPlayerId : sideBCourt.rightPlayerId;
  const receivingPlayerId =
    servingSide === 'A' ? sideBCourt.rightPlayerId : sideACourt.rightPlayerId;

  return {
    config,
    formatConfig,
    status: 'IN_PROGRESS',
    currentGameNumber: 1,
    games: [initialGame],
    gamesWonA: 0,
    gamesWonB: 0,
    servingSide,
    servingCourt,
    servingPlayerId,
    receivingPlayerId,
    serverNumber,
    isOneDownInitialTurn: isOneDown,
    sideACourt,
    sideBCourt,
    sidesSwappedInDecidingGame: false,
    pendingSettingChoice: null,
    events: [],
  };
}

export interface RallyInput {
  winningSide: 'A' | 'B';
  pointWinnerPlayerId?: string;
  shotType?: ShotType;
  rallyEndResult?: RallyEndResult;
  errorPlayerId?: string;
}

export function recordRally(
  state: MatchState,
  input: RallyInput
): { state: MatchState; events: ScoringEvent[] } {
  if (state.status !== 'IN_PROGRESS') {
    throw new Error('Cannot score rally: Match is not in progress');
  }

  if (state.pendingSettingChoice) {
    throw new Error(
      `Must resolve pending setting choice for side ${state.pendingSettingChoice.eligibleSide} before playing next rally`
    );
  }

  const newEvents: ScoringEvent[] = [];
  let nextSeq = state.events.length + 1;
  const now = Date.now();

  const currentGame = state.games[state.currentGameNumber - 1];
  if (!currentGame || currentGame.isComplete) {
    throw new Error('Current game is complete or missing');
  }

  const isServicePoint = state.formatConfig.scoringType === 'SERVICE';
  const isDoubles = state.config.matchType === 'DOUBLES';
  const isServerWinner = input.winningSide === state.servingSide;

  let isPoint = false;
  let isSideOut = false;

  if (!isServicePoint) {
    // RALLY POINT: Every rally winner scores a point
    isPoint = true;
  } else {
    // SERVICE POINT: Only the serving side scores
    if (isServerWinner) {
      isPoint = true;
    } else {
      isSideOut = true;
    }
  }

  // 1. Create RALLY_WON event
  const rallyWonEvent: RallyWonEvent = {
    id: `ev-${state.config.id}-${nextSeq}`,
    sequenceNumber: nextSeq++,
    timestamp: now,
    type: 'RALLY_WON',
    winningSide: input.winningSide,
    servingSideAtRally: state.servingSide,
    serverPlayerId: state.servingPlayerId,
    isPoint,
    isSideOut,
    pointWinnerPlayerId: input.pointWinnerPlayerId,
    shotType: input.shotType,
    rallyEndResult: input.rallyEndResult,
    errorPlayerId: input.errorPlayerId,
  };
  newEvents.push(rallyWonEvent);

  // Deep clone state for mutation
  const next = cloneMatchState(state);
  const game = next.games[next.currentGameNumber - 1]!;

  if (isPoint) {
    // Point scored
    if (input.winningSide === 'A') {
      game.scoreA += 1;
      // Record first side to reach score
      if (!game.firstSideToReachScore[game.scoreA]) {
        game.firstSideToReachScore[game.scoreA] = 'A';
      }
    } else {
      game.scoreB += 1;
      if (!game.firstSideToReachScore[game.scoreB]) {
        game.firstSideToReachScore[game.scoreB] = 'B';
      }
    }

    const pointEvent: PointScoredEvent = {
      id: `ev-${state.config.id}-${nextSeq}`,
      sequenceNumber: nextSeq++,
      timestamp: now,
      type: 'POINT_SCORED',
      side: input.winningSide,
      scoreA: game.scoreA,
      scoreB: game.scoreB,
      scorerPlayerId: input.pointWinnerPlayerId,
    };
    newEvents.push(pointEvent);

    // Update serve positions for Point
    if (!isServicePoint) {
      // RALLY POINT rotation
      if (isServerWinner) {
        // Serving side continues to serve
        if (isDoubles) {
          // Serving partners swap courts
          swapPartnerCourts(next, state.servingSide);
          const score = state.servingSide === 'A' ? game.scoreA : game.scoreB;
          next.servingCourt = score % 2 === 0 ? 'RIGHT' : 'LEFT';
          next.servingPlayerId = getPlayerInCourt(next, state.servingSide, next.servingCourt);
          const receiverCourt = next.servingCourt;
          const otherSide = state.servingSide === 'A' ? 'B' : 'A';
          next.receivingPlayerId = getPlayerInCourt(next, otherSide, receiverCourt);
        } else {
          // Singles: serve court determined by server's score
          const score = state.servingSide === 'A' ? game.scoreA : game.scoreB;
          next.servingCourt = score % 2 === 0 ? 'RIGHT' : 'LEFT';
          next.servingPlayerId = getPlayerInCourt(next, state.servingSide, next.servingCourt);
          next.receivingPlayerId = getPlayerInCourt(
            next,
            state.servingSide === 'A' ? 'B' : 'A',
            next.servingCourt
          );
        }
      } else {
        // Receiving side won the rally! They serve next.
        next.servingSide = input.winningSide;
        const score = next.servingSide === 'A' ? game.scoreA : game.scoreB;
        next.servingCourt = score % 2 === 0 ? 'RIGHT' : 'LEFT';
        next.servingPlayerId = getPlayerInCourt(next, next.servingSide, next.servingCourt);
        const otherSide = next.servingSide === 'A' ? 'B' : 'A';
        next.receivingPlayerId = getPlayerInCourt(next, otherSide, next.servingCourt);
      }
    } else {
      // SERVICE POINT: Server scored a point
      if (isDoubles) {
        // Serving pair swaps courts; server continues
        swapPartnerCourts(next, state.servingSide);
        next.servingCourt = next.servingCourt === 'RIGHT' ? 'LEFT' : 'RIGHT';
        // Same server serves, receiving court mirrors serving court
        const otherSide = state.servingSide === 'A' ? 'B' : 'A';
        next.receivingPlayerId = getPlayerInCourt(next, otherSide, next.servingCourt);
      } else {
        // Singles: server alternates court
        next.servingCourt = next.servingCourt === 'RIGHT' ? 'LEFT' : 'RIGHT';
        next.receivingPlayerId = getPlayerInCourt(
          next,
          state.servingSide === 'A' ? 'B' : 'A',
          next.servingCourt
        );
      }
    }
  } else if (isSideOut) {
    // SERVICE POINT: Receiver won the rally
    if (!isDoubles) {
      // Singles: Side-out immediately
      const newServingSide = input.winningSide;
      next.servingSide = newServingSide;
      const score = newServingSide === 'A' ? game.scoreA : game.scoreB;
      next.servingCourt = score % 2 === 0 ? 'RIGHT' : 'LEFT';
      next.servingPlayerId = getPlayerInCourt(next, newServingSide, next.servingCourt);
      const otherSide = newServingSide === 'A' ? 'B' : 'A';
      next.receivingPlayerId = getPlayerInCourt(next, otherSide, next.servingCourt);

      const sideOutEvent: SideOutEvent = {
        id: `ev-${state.config.id}-${nextSeq}`,
        sequenceNumber: nextSeq++,
        timestamp: now,
        type: 'SIDE_OUT',
        previousServingSide: state.servingSide,
        newServingSide,
        serverNumber: 1,
        servingPlayerId: next.servingPlayerId,
        receivingPlayerId: next.receivingPlayerId,
      };
      newEvents.push(sideOutEvent);
    } else {
      // Doubles Service Point
      if (next.serverNumber === 1 && !next.isOneDownInitialTurn) {
        // First server is down, second server now serves!
        next.serverNumber = 2;
        // Partner serves from their current court
        const otherCourt: CourtPosition = next.servingCourt === 'RIGHT' ? 'LEFT' : 'RIGHT';
        next.servingCourt = otherCourt;
        next.servingPlayerId = getPlayerInCourt(next, next.servingSide, next.servingCourt);
        const otherSide = next.servingSide === 'A' ? 'B' : 'A';
        next.receivingPlayerId = getPlayerInCourt(next, otherSide, next.servingCourt);

        const sideOutEvent: SideOutEvent = {
          id: `ev-${state.config.id}-${nextSeq}`,
          sequenceNumber: nextSeq++,
          timestamp: now,
          type: 'SIDE_OUT',
          previousServingSide: state.servingSide,
          newServingSide: state.servingSide,
          serverNumber: 2,
          servingPlayerId: next.servingPlayerId,
          receivingPlayerId: next.receivingPlayerId,
        };
        newEvents.push(sideOutEvent);
      } else {
        // Second server is down (or one-down turn ended) -> Full side-out!
        const newServingSide = input.winningSide;
        next.servingSide = newServingSide;
        next.serverNumber = 1;
        next.isOneDownInitialTurn = false;

        const score = newServingSide === 'A' ? game.scoreA : game.scoreB;
        next.servingCourt = score % 2 === 0 ? 'RIGHT' : 'LEFT';
        next.servingPlayerId = getPlayerInCourt(next, newServingSide, next.servingCourt);
        const otherSide = newServingSide === 'A' ? 'B' : 'A';
        next.receivingPlayerId = getPlayerInCourt(next, otherSide, next.servingCourt);

        const sideOutEvent: SideOutEvent = {
          id: `ev-${state.config.id}-${nextSeq}`,
          sequenceNumber: nextSeq++,
          timestamp: now,
          type: 'SIDE_OUT',
          previousServingSide: state.servingSide,
          newServingSide,
          serverNumber: 1,
          servingPlayerId: next.servingPlayerId,
          receivingPlayerId: next.receivingPlayerId,
        };
        newEvents.push(sideOutEvent);
      }
    }
  }

  // Check Setting Option (for service point format with thresholds)
  if (isServicePoint && state.formatConfig.settingThresholds.length > 0) {
    for (const thresh of state.formatConfig.settingThresholds) {
      if (
        game.scoreA === thresh.atScore &&
        game.scoreB === thresh.atScore &&
        !game.settingDecidedForScores.includes(thresh.atScore)
      ) {
        // The side that reached this score first has the option to set
        const eligibleSide = game.firstSideToReachScore[thresh.atScore] || 'A';
        next.pendingSettingChoice = {
          eligibleSide,
          atScore: thresh.atScore,
          setToTarget: thresh.setToTarget,
          extraPoints: thresh.extraPoints,
        };
        break;
      }
    }
  }

  // Check Midpoint Switch in deciding game
  const isDecidingGame = next.currentGameNumber === next.config.bestOf;
  const midpoint = next.formatConfig.midpointSideChange;
  const maxScore = Math.max(game.scoreA, game.scoreB);
  if (isDecidingGame && !game.sidesSwappedMidpoint && maxScore >= midpoint) {
    game.sidesSwappedMidpoint = true;
    next.sidesSwappedInDecidingGame = true;
    const intervalEvent: IntervalEvent = {
      id: `ev-${state.config.id}-${nextSeq}`,
      sequenceNumber: nextSeq++,
      timestamp: now,
      type: 'INTERVAL',
      reason: 'MIDPOINT_SWITCH',
      scoreA: game.scoreA,
      scoreB: game.scoreB,
    };
    newEvents.push(intervalEvent);
  }

  // Check Game Completion
  const gameWon = checkGameWon(game, next.formatConfig);
  if (gameWon) {
    game.isComplete = true;
    game.winnerSide = gameWon;

    if (gameWon === 'A') {
      next.gamesWonA += 1;
    } else {
      next.gamesWonB += 1;
    }

    const gameEndEvent: GameEndEvent = {
      id: `ev-${state.config.id}-${nextSeq}`,
      sequenceNumber: nextSeq++,
      timestamp: now,
      type: 'GAME_END',
      gameNumber: next.currentGameNumber,
      winnerSide: gameWon,
      scoreA: game.scoreA,
      scoreB: game.scoreB,
    };
    newEvents.push(gameEndEvent);

    // Check Match Completion
    const gamesNeeded = Math.ceil(next.config.bestOf / 2);
    if (next.gamesWonA >= gamesNeeded || next.gamesWonB >= gamesNeeded) {
      next.status = 'COMPLETED';
      next.winnerSide = next.gamesWonA >= gamesNeeded ? 'A' : 'B';
      const matchEndEvent: MatchEndEvent = {
        id: `ev-${state.config.id}-${nextSeq}`,
        sequenceNumber: nextSeq++,
        timestamp: now,
        type: 'MATCH_END',
        winnerSide: next.winnerSide,
        gamesA: next.gamesWonA,
        gamesB: next.gamesWonB,
      };
      newEvents.push(matchEndEvent);
    } else {
      // Start next game
      next.currentGameNumber += 1;
      const nextGame: GameState = {
        gameNumber: next.currentGameNumber,
        scoreA: 0,
        scoreB: 0,
        isComplete: false,
        targetPoints: next.formatConfig.targetPoints,
        reachedSettingThresholds: [],
        settingDecidedForScores: [],
        firstSideToReachScore: {},
        sidesSwappedMidpoint: false,
      };
      next.games.push(nextGame);

      // Game winner serves first in next game
      next.servingSide = gameWon;
      next.servingCourt = 'RIGHT';
      const isOneDownNext = isServicePoint && isDoubles;
      next.serverNumber = isOneDownNext ? 2 : 1;
      next.isOneDownInitialTurn = isOneDownNext;

      next.servingPlayerId = getPlayerInCourt(next, next.servingSide, 'RIGHT');
      const otherSide = next.servingSide === 'A' ? 'B' : 'A';
      next.receivingPlayerId = getPlayerInCourt(next, otherSide, 'RIGHT');
    }
  }

  next.events = [...next.events, ...newEvents];
  return { state: next, events: newEvents };
}

export function chooseSetting(
  state: MatchState,
  setGame: boolean
): { state: MatchState; event: SettingChoiceEvent } {
  if (!state.pendingSettingChoice) {
    throw new Error('No pending setting choice at this moment');
  }

  const choice = state.pendingSettingChoice;
  const next = cloneMatchState(state);
  const game = next.games[next.currentGameNumber - 1]!;

  const newTargetPoints = setGame ? choice.setToTarget : game.targetPoints;
  game.targetPoints = newTargetPoints;
  game.settingDecidedForScores.push(choice.atScore);
  next.pendingSettingChoice = null;

  const event: SettingChoiceEvent = {
    id: `ev-${state.config.id}-${next.events.length + 1}`,
    sequenceNumber: next.events.length + 1,
    timestamp: Date.now(),
    type: 'SETTING_CHOICE',
    chosenBySide: choice.eligibleSide,
    atScore: choice.atScore,
    setGame,
    newTargetPoints,
  };

  next.events.push(event);
  return { state: next, event };
}

export function undo(state: MatchState): MatchState {
  if (state.events.length === 0) {
    return state;
  }

  // Find the last action to undo:
  // If the last event is MATCH_END / GAME_END, we need to roll back to the state before the point
  const allEvents = [...state.events];

  // Pop events until we have popped a RALLY_WON or SETTING_CHOICE
  let poppedRallyOrSetting = false;
  while (allEvents.length > 0 && !poppedRallyOrSetting) {
    const last = allEvents[allEvents.length - 1]!;
    allEvents.pop();
    if (last.type === 'RALLY_WON' || last.type === 'SETTING_CHOICE') {
      poppedRallyOrSetting = true;
    }
  }

  // Replay from initial config
  return replay(allEvents, state.config);
}

export function replay(events: ScoringEvent[], config: MatchConfig): MatchState {
  let current = createMatch(config);

  for (const ev of events) {
    if (ev.type === 'SETTING_CHOICE') {
      const res = chooseSetting(current, ev.setGame);
      current = res.state;
    } else if (ev.type === 'RALLY_WON') {
      const res = recordRally(current, {
        winningSide: ev.winningSide,
        pointWinnerPlayerId: ev.pointWinnerPlayerId,
        shotType: ev.shotType,
        rallyEndResult: ev.rallyEndResult,
        errorPlayerId: ev.errorPlayerId,
      });
      current = res.state;
    }
  }

  return current;
}

function checkGameWon(game: GameState, format: FormatConfig): 'A' | 'B' | null {
  const target = game.targetPoints;
  const { winBy, cap, scoringType } = format;

  if (scoringType === 'SERVICE') {
    // Service point: whoever reaches target first wins
    if (game.scoreA >= target) return 'A';
    if (game.scoreB >= target) return 'B';
    return null;
  }

  // Rally point: win by 2 up to cap
  if (game.scoreA >= cap) return 'A';
  if (game.scoreB >= cap) return 'B';

  if (game.scoreA >= target && game.scoreA - game.scoreB >= winBy) return 'A';
  if (game.scoreB >= target && game.scoreB - game.scoreA >= winBy) return 'B';

  return null;
}

function swapPartnerCourts(state: MatchState, side: 'A' | 'B'): void {
  const court = side === 'A' ? state.sideACourt : state.sideBCourt;
  const tmp = court.rightPlayerId;
  court.rightPlayerId = court.leftPlayerId;
  court.leftPlayerId = tmp;
}

function getPlayerInCourt(state: MatchState, side: 'A' | 'B', court: CourtPosition): string {
  const placement = side === 'A' ? state.sideACourt : state.sideBCourt;
  return court === 'RIGHT' ? placement.rightPlayerId : placement.leftPlayerId;
}

function cloneMatchState(s: MatchState): MatchState {
  return {
    ...s,
    formatConfig: { ...s.formatConfig },
    games: s.games.map((g) => ({
      ...g,
      reachedSettingThresholds: [...g.reachedSettingThresholds],
      settingDecidedForScores: [...g.settingDecidedForScores],
      firstSideToReachScore: { ...g.firstSideToReachScore },
    })),
    sideACourt: { ...s.sideACourt },
    sideBCourt: { ...s.sideBCourt },
    pendingSettingChoice: s.pendingSettingChoice ? { ...s.pendingSettingChoice } : null,
    events: [...s.events],
  };
}
