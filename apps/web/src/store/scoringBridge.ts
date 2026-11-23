import type { MatchConfig as EngineMatchConfig, MatchState as EngineMatchState, Side } from '@rallypoint/engine';
import {
  createMatch as createScoringMatch,
  recordRally,
  chooseSetting as scoringChooseSetting,
  undo as scoringUndo,
  MatchConfig as ScoringRulesMatchConfig,
  MatchState as ScoringRulesMatchState,
  ScoringFormat,
  FormatConfig,
  FORMAT_PRESETS,
  ShotType,
  RallyEndResult,
} from '@rallypoint/scoring-rules';

export function convertEngineConfigToScoringConfig(
  engineConfig: EngineMatchConfig & {
    scoringFormat?: ScoringFormat;
    customFormatConfig?: Partial<FormatConfig>;
    firstServerSide?: 'A' | 'B';
    firstServerPlayerId?: string;
  }
): ScoringRulesMatchConfig {
  const matchType = engineConfig.mode === 'doubles' ? 'DOUBLES' : 'SINGLES';
  const format: ScoringFormat = engineConfig.scoringFormat || 'RALLY_21';

  const sideAPlayer1 = {
    id: engineConfig.sideA.playerIds[0] || 'p1',
    name: engineConfig.sideA.name.split('&')[0]?.trim() || engineConfig.sideA.name,
  };
  const sideAPlayer2 =
    engineConfig.mode === 'doubles'
      ? {
          id: engineConfig.sideA.playerIds[1] || 'p2',
          name: engineConfig.sideA.name.split('&')[1]?.trim() || 'Partner A',
        }
      : undefined;

  const sideBPlayer1 = {
    id: engineConfig.sideB.playerIds[0] || 'p3',
    name: engineConfig.sideB.name.split('&')[0]?.trim() || engineConfig.sideB.name,
  };
  const sideBPlayer2 =
    engineConfig.mode === 'doubles'
      ? {
          id: engineConfig.sideB.playerIds[1] || 'p4',
          name: engineConfig.sideB.name.split('&')[1]?.trim() || 'Partner B',
        }
      : undefined;

  return {
    id: engineConfig.id,
    matchType,
    scoringFormat: format,
    customFormatConfig: engineConfig.customFormatConfig,
    bestOf: engineConfig.bestOf || 3,
    sideA: {
      player1: sideAPlayer1,
      player2: sideAPlayer2,
    },
    sideB: {
      player1: sideBPlayer1,
      player2: sideBPlayer2,
    },
    firstServerSide: (engineConfig.initialServerSide || engineConfig.firstServerSide || 'A') as 'A' | 'B',
    firstServerPlayerId: engineConfig.initialServerPlayerId || sideAPlayer1.id,
  };
}

export function syncScoringStateToEngineState(
  scoringState: ScoringRulesMatchState,
  originalEngineConfig: EngineMatchConfig
): EngineMatchState {
  const currentGame =
    scoringState.games[scoringState.currentGameNumber - 1] || {
      gameNumber: scoringState.currentGameNumber,
      scoreA: 0,
      scoreB: 0,
      isComplete: false,
      targetPoints: scoringState.formatConfig.targetPoints,
      reachedSettingThresholds: [],
      settingDecidedForScores: [],
      firstSideToReachScore: {},
      sidesSwappedMidpoint: false,
    };

  // Ends swapped logic:
  // Game 1: not swapped
  // Game 2: swapped
  // Game 3: not swapped until midpoint swap in deciding game
  const isDecidingGame =
    scoringState.currentGameNumber === scoringState.config.bestOf;
  let endsSwapped = scoringState.currentGameNumber % 2 === 0;
  if (isDecidingGame && scoringState.sidesSwappedInDecidingGame) {
    endsSwapped = !endsSwapped;
  }

  const serverSide: Side = scoringState.servingSide;
  const serviceCourt: 'left' | 'right' =
    scoringState.servingCourt === 'RIGHT' ? 'right' : 'left';
  const receiverCourt: 'left' | 'right' =
    serviceCourt === 'right' ? 'right' : 'left';

  const receiverSide: Side = serverSide === 'A' ? 'B' : 'A';

  return {
    config: originalEngineConfig,
    status: scoringState.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
    winnerSide: scoringState.winnerSide as Side | undefined,
    currentGameNumber: scoringState.currentGameNumber,
    currentScoreA: currentGame.scoreA,
    currentScoreB: currentGame.scoreB,
    gamesWonA: scoringState.gamesWonA,
    gamesWonB: scoringState.gamesWonB,
    games: scoringState.games.map((g) => ({
      gameNumber: g.gameNumber,
      scoreA: g.scoreA,
      scoreB: g.scoreB,
      winnerSide: g.winnerSide as Side | undefined,
      isFinished: g.isComplete,
      intervalTaken: false,
      decidingGameSideSwitched: g.sidesSwappedMidpoint,
      startTime: Date.now(),
    })),
    endsSwapped,
    history: [],
    serveState: {
      serverSide,
      serviceCourt,
      receiverCourt,
      serverPlayerId: scoringState.servingPlayerId,
      receiverPlayerId: scoringState.receivingPlayerId,
      receiverSide,
    },
    doublesPositions: {
      sideA: {
        leftPlayerId: scoringState.sideACourt.leftPlayerId,
        rightPlayerId: scoringState.sideACourt.rightPlayerId,
      },
      sideB: {
        leftPlayerId: scoringState.sideBCourt.leftPlayerId,
        rightPlayerId: scoringState.sideBCourt.rightPlayerId,
      },
    },
  };
}

export {
  createScoringMatch,
  recordRally,
  scoringChooseSetting,
  scoringUndo,
  FORMAT_PRESETS,
};

export type {
  ScoringFormat,
  FormatConfig,
  ShotType,
  RallyEndResult,
  ScoringRulesMatchState,
};
