export type ScoringFormat =
  | 'RALLY_21'
  | 'RALLY_15'
  | 'RALLY_11'
  | 'SERVICE_POINT_15'
  | 'SERVICE_POINT_11'
  | 'CUSTOM';

export type ScoringType = 'RALLY' | 'SERVICE';

export type ShotType =
  | 'SMASH'
  | 'DROP'
  | 'NET'
  | 'CLEAR'
  | 'DRIVE'
  | 'LOB'
  | 'SERVE';

export type RallyEndResult =
  | 'WINNER'
  | 'UNFORCED_ERROR'
  | 'FORCED_ERROR'
  | 'OUT'
  | 'NET_FAULT'
  | 'SERVICE_FAULT';

export type CourtPosition = 'LEFT' | 'RIGHT';

export interface SettingThreshold {
  atScore: number;
  setToTarget: number;
  extraPoints: number;
}

export interface FormatConfig {
  format: ScoringFormat;
  scoringType: ScoringType;
  targetPoints: number;
  winBy: number;
  cap: number;
  midpointSideChange: number;
  settingThresholds: SettingThreshold[];
}

export const FORMAT_PRESETS: Record<ScoringFormat, FormatConfig> = {
  RALLY_21: {
    format: 'RALLY_21',
    scoringType: 'RALLY',
    targetPoints: 21,
    winBy: 2,
    cap: 30,
    midpointSideChange: 11,
    settingThresholds: [],
  },
  RALLY_15: {
    format: 'RALLY_15',
    scoringType: 'RALLY',
    targetPoints: 15,
    winBy: 2,
    cap: 24, // target + 9
    midpointSideChange: 8,
    settingThresholds: [],
  },
  RALLY_11: {
    format: 'RALLY_11',
    scoringType: 'RALLY',
    targetPoints: 11,
    winBy: 2,
    cap: 20, // target + 9
    midpointSideChange: 6,
    settingThresholds: [],
  },
  SERVICE_POINT_15: {
    format: 'SERVICE_POINT_15',
    scoringType: 'SERVICE',
    targetPoints: 15,
    winBy: 1, // Traditional setting: game ends at target or set target
    cap: 18,
    midpointSideChange: 8,
    settingThresholds: [
      { atScore: 13, setToTarget: 18, extraPoints: 5 },
      { atScore: 14, setToTarget: 17, extraPoints: 3 },
    ],
  },
  SERVICE_POINT_11: {
    format: 'SERVICE_POINT_11',
    scoringType: 'SERVICE',
    targetPoints: 11,
    winBy: 1,
    cap: 14,
    midpointSideChange: 6,
    settingThresholds: [
      { atScore: 9, setToTarget: 14, extraPoints: 5 },
      { atScore: 10, setToTarget: 13, extraPoints: 3 },
    ],
  },
  CUSTOM: {
    format: 'CUSTOM',
    scoringType: 'RALLY',
    targetPoints: 21,
    winBy: 2,
    cap: 30,
    midpointSideChange: 11,
    settingThresholds: [],
  },
};

export interface PlayerInfo {
  id: string;
  name: string;
}

export interface MatchParticipantSide {
  player1: PlayerInfo;
  player2?: PlayerInfo;
}

export interface MatchConfig {
  id: string;
  matchType: 'SINGLES' | 'DOUBLES';
  scoringFormat: ScoringFormat;
  customFormatConfig?: Partial<FormatConfig>;
  bestOf: number; // e.g. 3
  sideA: MatchParticipantSide;
  sideB: MatchParticipantSide;
  firstServerSide?: 'A' | 'B';
  firstServerPlayerId?: string;
}

export type ScoringEventType =
  | 'RALLY_WON'
  | 'POINT_SCORED'
  | 'PLAYER_ACTION'
  | 'SIDE_OUT'
  | 'SETTING_CHOICE'
  | 'SERVICE_FAULT'
  | 'GAME_END'
  | 'MATCH_END'
  | 'INTERVAL'
  | 'RETIRE'
  | 'WALKOVER'
  | 'UNDO';

export interface BaseScoringEvent {
  id: string;
  sequenceNumber: number;
  timestamp: number;
}

export interface RallyWonEvent extends BaseScoringEvent {
  type: 'RALLY_WON';
  winningSide: 'A' | 'B';
  servingSideAtRally: 'A' | 'B';
  serverPlayerId: string;
  isPoint: boolean;
  isSideOut: boolean;
  pointWinnerPlayerId?: string;
  shotType?: ShotType;
  rallyEndResult?: RallyEndResult;
  errorPlayerId?: string;
}

export interface PointScoredEvent extends BaseScoringEvent {
  type: 'POINT_SCORED';
  side: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  scorerPlayerId?: string;
}

export type PlayerActionType = 'POINT' | 'DROP';

export interface PlayerActionEvent extends BaseScoringEvent {
  type: 'PLAYER_ACTION';
  clientUuid: string;
  matchId: string;
  gameNumber: number;
  sequenceNumber: number;
  playerId: string;
  side: 'A' | 'B';
  action: PlayerActionType;
  resultingWinnerSide: 'A' | 'B';
  serverAtRally: string;
  servingSideAtRally: 'A' | 'B';
  isPoint: boolean;
  isSideOut: boolean;
  scoringFormat: ScoringFormat;
  occurredAt: string;
  deviceId?: string;
  shotType?: ShotType;
  rallyEndResult?: RallyEndResult;
}

export interface PlayerMatchActionStats {
  playerId: string;
  pointsWon: number;
  drops: number;
  netContribution: number;
  pointShareWithinTeam: number;
  dropShareWithinTeam: number;
  currentPointStreak: number;
  bestPointStreak: number;
  servicePointsWon: number;
  sideOutsCaused: number;
}

export interface SideOutEvent extends BaseScoringEvent {
  type: 'SIDE_OUT';
  previousServingSide: 'A' | 'B';
  newServingSide: 'A' | 'B';
  serverNumber: 1 | 2; // For doubles service point: 1 = first server, 2 = second server
  servingPlayerId: string;
  receivingPlayerId: string;
}

export interface SettingChoiceEvent extends BaseScoringEvent {
  type: 'SETTING_CHOICE';
  chosenBySide: 'A' | 'B';
  atScore: number;
  setGame: boolean;
  newTargetPoints: number;
}

export interface ServiceFaultEvent extends BaseScoringEvent {
  type: 'SERVICE_FAULT';
  faultSide: 'A' | 'B';
  faultPlayerId: string;
}

export interface GameEndEvent extends BaseScoringEvent {
  type: 'GAME_END';
  gameNumber: number;
  winnerSide: 'A' | 'B';
  scoreA: number;
  scoreB: number;
}

export interface MatchEndEvent extends BaseScoringEvent {
  type: 'MATCH_END';
  winnerSide: 'A' | 'B';
  gamesA: number;
  gamesB: number;
}

export interface IntervalEvent extends BaseScoringEvent {
  type: 'INTERVAL';
  reason: 'MIDPOINT_SWITCH' | 'GAME_BREAK';
  scoreA: number;
  scoreB: number;
}

export interface RetireEvent extends BaseScoringEvent {
  type: 'RETIRE';
  retiringSide: 'A' | 'B';
}

export interface WalkoverEvent extends BaseScoringEvent {
  type: 'WALKOVER';
  forfeitingSide: 'A' | 'B';
}

export type ScoringEvent =
  | RallyWonEvent
  | PointScoredEvent
  | PlayerActionEvent
  | SideOutEvent
  | SettingChoiceEvent
  | ServiceFaultEvent
  | GameEndEvent
  | MatchEndEvent
  | IntervalEvent
  | RetireEvent
  | WalkoverEvent;

export interface GameState {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: 'A' | 'B';
  isComplete: boolean;
  targetPoints: number;
  reachedSettingThresholds: number[]; // e.g. [13, 14] or [9, 10]
  settingDecidedForScores: number[];
  firstSideToReachScore: Record<number, 'A' | 'B'>; // e.g. { 13: 'A', 14: 'B' }
  sidesSwappedMidpoint: boolean;
}

export interface DoublesCourtPlacement {
  rightPlayerId: string;
  leftPlayerId: string;
}

export interface MatchState {
  config: MatchConfig;
  formatConfig: FormatConfig;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'RETIRED' | 'WALKOVER';
  winnerSide?: 'A' | 'B';
  currentGameNumber: number;
  games: GameState[];
  gamesWonA: number;
  gamesWonB: number;

  // Live in-game serve & position tracking
  servingSide: 'A' | 'B';
  servingCourt: CourtPosition;
  servingPlayerId: string;
  receivingPlayerId: string;
  serverNumber: 1 | 2; // For service point doubles (1 or 2 down)
  isOneDownInitialTurn: boolean; // First server of the game has only 1 hand

  // Doubles court positions
  sideACourt: DoublesCourtPlacement;
  sideBCourt: DoublesCourtPlacement;

  // Midpoint & side change
  sidesSwappedInDecidingGame: boolean;

  // Pending UI prompts
  pendingSettingChoice: {
    eligibleSide: 'A' | 'B';
    atScore: number;
    setToTarget: number;
    extraPoints: number;
  } | null;

  events: ScoringEvent[];
  actionHistory: PlayerActionEvent[];
  playerStats: Record<string, PlayerMatchActionStats>;
  unassignedPoints: { sideA: number; sideB: number };
}

export type StreakType = 'PLAYER_POINT' | 'PLAYER_DROP' | 'TEAM_RUN' | 'STREAK_SNAPPED';

export interface StreakMilestoneAlert {
  id: string;
  type: StreakType;
  playerId?: string;
  playerName?: string;
  side?: 'A' | 'B';
  teamName?: string;
  count: number;
  snappedCount?: number;
  message: string;
  priority: number;
  timestamp: number;
}

export interface PlayerStreakRecord {
  playerId: string;
  currentPointStreak: number;
  currentDropStreak: number;
  bestPointStreak: number;
  longestDropStreak: number;
}

export interface StreakAlertsConfig {
  pointStreakThresholds?: number[];
  dropStreakThresholds?: number[];
  teamRunThresholds?: number[];
  strictMode?: boolean;
  streakSnappedEnabled?: boolean;
  hapticsEnabled?: boolean;
  dropStreaksEnabled?: boolean;
  language?: 'en' | 'ml';
}

export interface StreaksResult {
  playerStreaks: Record<string, PlayerStreakRecord>;
  teamRuns: {
    A: number;
    B: number;
  };
  bestTeamRuns: {
    A: number;
    B: number;
  };
  currentMilestone: StreakMilestoneAlert | null;
  milestoneHistory: StreakMilestoneAlert[];
}

