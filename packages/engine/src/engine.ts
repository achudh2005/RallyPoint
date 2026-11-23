import {
  isGameFinished,
  isMatchFinished,
  shouldSwitchDecidingGameEnds,
  shouldTriggerInterval,
} from './rules.js';
import { computeNextServeState, initializeDoublesPositions } from './serve.js';
import { getStats } from './stats.js';
import {
  DoublesPositions,
  GameScore,
  MatchConfig,
  MatchEvent,
  MatchState,
  ServeState,
  Side,
} from './types.js';

export function getServeState(state: MatchState): ServeState {
  return { ...state.serveState };
}

export function createMatch(config: MatchConfig): MatchState {
  const pointsToWinGame = config.pointsToWinGame ?? 21;
  const tiebreakCap = config.tiebreakCap ?? 30;
  const bestOf = config.bestOf ?? 3;

  const resolvedConfig: MatchConfig = {
    ...config,
    pointsToWinGame,
    tiebreakCap,
    bestOf,
  };

  const serverSide = resolvedConfig.initialServerSide;
  const serverPlayerId = resolvedConfig.initialServerPlayerId;
  const receiverSide: Side = serverSide === 'A' ? 'B' : 'A';
  const receiverPlayerId =
    resolvedConfig.initialReceiverPlayerId ??
    (receiverSide === 'A'
      ? (resolvedConfig.sideA.playerIds[0] ?? 'A1')
      : (resolvedConfig.sideB.playerIds[0] ?? 'B1'));

  let doublesPositions: DoublesPositions | undefined;
  if (resolvedConfig.mode === 'doubles') {
    doublesPositions = initializeDoublesPositions(
      resolvedConfig,
      serverSide,
      serverPlayerId,
      receiverPlayerId
    );
  }

  const initialServeState: ServeState = {
    serverSide,
    serverPlayerId,
    receiverSide,
    receiverPlayerId,
    serviceCourt: 'right',
    receiverCourt: 'right',
  };

  const initialGame: GameScore = {
    gameNumber: 1,
    scoreA: 0,
    scoreB: 0,
    isFinished: false,
    intervalTaken: false,
    decidingGameSideSwitched: false,
    startTime: resolvedConfig.startTime ?? Date.now(),
  };

  return {
    config: resolvedConfig,
    status: 'IN_PROGRESS',
    currentGameNumber: 1,
    gamesWonA: 0,
    gamesWonB: 0,
    games: [initialGame],
    currentScoreA: 0,
    currentScoreB: 0,
    serveState: initialServeState,
    doublesPositions,
    endsSwapped: false,
    history: [],
  };
}

export function applyEvent(state: MatchState, event: MatchEvent): MatchState {
  if (event.type === 'UNDO') {
    if (state.history.length === 0) {
      return state;
    }
    // Filter out the last scoring/action event and replay
    const newHistory = [...state.history];
    // Find the last point or serve fault or game/match modifying event
    for (let i = newHistory.length - 1; i >= 0; i--) {
      const e = newHistory[i];
      if (
        e &&
        (e.type === 'POINT' ||
          e.type === 'SERVE_FAULT' ||
          e.type === 'RETIRE' ||
          e.type === 'WALKOVER')
      ) {
        newHistory.splice(i, 1);
        break;
      }
    }
    return replay(newHistory, state.config);
  }

  if (state.status === 'COMPLETED') {
    return state;
  }

  const timestamp = event.timestamp ?? Date.now();

  if (event.type === 'RETIRE') {
    const retiringSide = event.retiringSide;
    const winnerSide: Side = retiringSide === 'A' ? 'B' : 'A';
    return {
      ...state,
      status: 'COMPLETED',
      winnerSide,
      winReason: 'RETIRE',
      history: [...state.history, event],
    };
  }

  if (event.type === 'WALKOVER') {
    const concedingSide = event.concedingSide;
    const winnerSide: Side = concedingSide === 'A' ? 'B' : 'A';
    return {
      ...state,
      status: 'COMPLETED',
      winnerSide,
      winReason: 'WALKOVER',
      history: [...state.history, event],
    };
  }

  if (event.type === 'INTERVAL') {
    const currentGames = [...state.games];
    const currentGameIndex = state.currentGameNumber - 1;
    const currentGame = currentGames[currentGameIndex];
    if (currentGame) {
      currentGames[currentGameIndex] = {
        ...currentGame,
        intervalTaken: true,
      };
    }
    return {
      ...state,
      status: state.status === 'INTERVAL' ? 'IN_PROGRESS' : 'INTERVAL',
      games: currentGames,
      history: [...state.history, event],
    };
  }

  if (event.type === 'POINT' || event.type === 'SERVE_FAULT') {
    const winningSide: Side =
      event.type === 'POINT'
        ? event.side
        : event.faultySide === 'A'
          ? 'B'
          : 'A';

    let scoreA = state.currentScoreA;
    let scoreB = state.currentScoreB;
    if (winningSide === 'A') {
      scoreA++;
    } else {
      scoreB++;
    }

    const currentGames = [...state.games];
    const currentGameIndex = state.currentGameNumber - 1;
    let currentGame = currentGames[currentGameIndex]!;

    let intervalTaken = currentGame.intervalTaken;
    let status = state.status;
    if (shouldTriggerInterval(scoreA, scoreB, intervalTaken)) {
      intervalTaken = true;
      status = 'INTERVAL';
    }

    let endsSwapped = state.endsSwapped;
    let decidingSwitched = currentGame.decidingGameSideSwitched;
    if (
      shouldSwitchDecidingGameEnds(
        state.currentGameNumber,
        scoreA,
        scoreB,
        decidingSwitched,
        state.config.bestOf
      )
    ) {
      endsSwapped = !endsSwapped;
      decidingSwitched = true;
    }

    const gameCheck = isGameFinished(
      scoreA,
      scoreB,
      state.config.pointsToWinGame,
      state.config.tiebreakCap
    );

    if (gameCheck.finished && gameCheck.winner) {
      const gameWinner = gameCheck.winner;
      const gamesWonA = state.gamesWonA + (gameWinner === 'A' ? 1 : 0);
      const gamesWonB = state.gamesWonB + (gameWinner === 'B' ? 1 : 0);

      currentGame = {
        ...currentGame,
        scoreA,
        scoreB,
        winnerSide: gameWinner,
        isFinished: true,
        intervalTaken,
        decidingGameSideSwitched: decidingSwitched,
        endTime: timestamp,
      };
      currentGames[currentGameIndex] = currentGame;

      const matchCheck = isMatchFinished(
        gamesWonA,
        gamesWonB,
        state.config.bestOf
      );

      if (matchCheck.finished && matchCheck.winner) {
        return {
          ...state,
          status: 'COMPLETED',
          gamesWonA,
          gamesWonB,
          games: currentGames,
          currentScoreA: scoreA,
          currentScoreB: scoreB,
          winnerSide: matchCheck.winner,
          winReason: 'NORMAL',
          lastPointWinner: winningSide,
          history: [...state.history, event],
        };
      } else {
        // Game finished, prepare next game
        const nextGameNumber = state.currentGameNumber + 1;
        // Ends swap after each game
        const nextEndsSwapped = !endsSwapped;

        // Next game server: winner of previous game serves first
        const nextServerSide = gameWinner;
        let nextServerPlayerId: string;
        let nextReceiverPlayerId: string;
        let nextDoublesPositions: DoublesPositions | undefined;

        if (state.config.mode === 'doubles' && state.doublesPositions) {
          nextServerPlayerId =
            nextServerSide === 'A'
              ? state.doublesPositions.sideA.rightPlayerId
              : state.doublesPositions.sideB.rightPlayerId;
          const nextReceiverSide: Side = nextServerSide === 'A' ? 'B' : 'A';
          nextReceiverPlayerId =
            nextReceiverSide === 'A'
              ? state.doublesPositions.sideA.rightPlayerId
              : state.doublesPositions.sideB.rightPlayerId;

          nextDoublesPositions = initializeDoublesPositions(
            state.config,
            nextServerSide,
            nextServerPlayerId,
            nextReceiverPlayerId
          );
        } else {
          nextServerPlayerId =
            nextServerSide === 'A'
              ? (state.config.sideA.playerIds[0] ?? 'A1')
              : (state.config.sideB.playerIds[0] ?? 'B1');
          const nextReceiverSide: Side = nextServerSide === 'A' ? 'B' : 'A';
          nextReceiverPlayerId =
            nextReceiverSide === 'A'
              ? (state.config.sideA.playerIds[0] ?? 'A1')
              : (state.config.sideB.playerIds[0] ?? 'B1');
        }

        const nextServeState: ServeState = {
          serverSide: nextServerSide,
          serverPlayerId: nextServerPlayerId,
          receiverSide: nextServerSide === 'A' ? 'B' : 'A',
          receiverPlayerId: nextReceiverPlayerId,
          serviceCourt: 'right',
          receiverCourt: 'right',
        };

        const nextGame: GameScore = {
          gameNumber: nextGameNumber,
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          intervalTaken: false,
          decidingGameSideSwitched: false,
          startTime: timestamp,
        };
        currentGames.push(nextGame);

        return {
          ...state,
          status: 'GAME_PAUSE',
          currentGameNumber: nextGameNumber,
          gamesWonA,
          gamesWonB,
          games: currentGames,
          currentScoreA: 0,
          currentScoreB: 0,
          serveState: nextServeState,
          doublesPositions: nextDoublesPositions,
          endsSwapped: nextEndsSwapped,
          lastPointWinner: winningSide,
          history: [...state.history, event],
        };
      }
    }

    // Game is ongoing, update serve state
    const { nextServeState, nextPositions } = computeNextServeState(
      state.config.mode,
      state.serveState,
      winningSide,
      scoreA,
      scoreB,
      state.doublesPositions
    );

    currentGame = {
      ...currentGame,
      scoreA,
      scoreB,
      intervalTaken,
      decidingGameSideSwitched: decidingSwitched,
    };
    currentGames[currentGameIndex] = currentGame;

    return {
      ...state,
      status: status === 'INTERVAL' ? 'INTERVAL' : 'IN_PROGRESS',
      games: currentGames,
      currentScoreA: scoreA,
      currentScoreB: scoreB,
      serveState: nextServeState,
      doublesPositions: nextPositions,
      endsSwapped,
      lastPointWinner: winningSide,
      history: [...state.history, event],
    };
  }

  return {
    ...state,
    history: [...state.history, event],
  };
}

export function replay(
  events: MatchEvent[],
  initialConfig?: MatchConfig
): MatchState {
  if (events.length === 0) {
    if (!initialConfig) {
      throw new Error(
        'Cannot replay empty events without providing initialConfig'
      );
    }
    return createMatch(initialConfig);
  }

  // Derive initial config from first event or provided config
  let config = initialConfig;
  if (!config) {
    // If not provided, assume minimal default singles config
    config = {
      id: events[0]?.matchId ?? 'match-1',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'side-a', name: 'Side A', playerIds: ['p1'] },
      sideB: { id: 'side-b', name: 'Side B', playerIds: ['p2'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p1',
    };
  }

  let state = createMatch(config);
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

export { getStats };
