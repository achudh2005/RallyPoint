export type Side = 'A' | 'B';

export type CourtSide = 'left' | 'right';
export type ServiceCourt = 'left' | 'right';

export type MatchMode = 'singles' | 'doubles';

export type RallyEndType =
  | 'SMASH'
  | 'DROP'
  | 'NET'
  | 'OUT'
  | 'UNFORCED_ERROR'
  | 'SERVICE_FAULT'
  | 'WINNER';

export type EventType =
  | 'POINT'
  | 'PLAYER_ACTION'
  | 'UNDO'
  | 'GAME_END'
  | 'MATCH_END'
  | 'SERVE_FAULT'
  | 'RETIRE'
  | 'WALKOVER'
  | 'INTERVAL';

export interface SideConfig {
  id: string;
  name: string;
  playerIds: string[];
  playerNames?: string[];
}

export interface MatchConfig {
  id: string;
  mode: MatchMode;
  bestOf: number;
  pointsToWinGame: number;
  tiebreakCap: number;
  sideA: SideConfig;
  sideB: SideConfig;
  initialServerSide: Side;
  initialServerPlayerId: string;
  initialReceiverPlayerId?: string;
  startTime?: number;
}

export interface DoublesSidePositions {
  leftPlayerId: string;
  rightPlayerId: string;
}

export interface DoublesPositions {
  sideA: DoublesSidePositions;
  sideB: DoublesSidePositions;
}

export interface ServeState {
  serverSide: Side;
  serverPlayerId: string;
  receiverSide: Side;
  receiverPlayerId: string;
  serviceCourt: ServiceCourt;
  receiverCourt: ServiceCourt;
}

export interface GameScore {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: Side;
  isFinished: boolean;
  intervalTaken: boolean;
  decidingGameSideSwitched: boolean;
  startTime: number;
  endTime?: number;
}

export type MatchStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'INTERVAL'
  | 'GAME_PAUSE'
  | 'COMPLETED';

export type IntervalType = 'ELEVEN_POINT' | 'GAME_BREAK';

export interface BaseEvent {
  id: string;
  matchId: string;
  timestamp: number;
  type: EventType;
}

export interface PointEvent extends BaseEvent {
  type: 'POINT';
  side: Side;
  rallyEndType?: RallyEndType;
  serverPlayerId?: string;
  receiverPlayerId?: string;
  gameNumber?: number;
}

export interface PlayerActionEvent extends BaseEvent {
  type: 'PLAYER_ACTION';
  side: Side;
  action: 'POINT' | 'DROP';
  playerId: string;
  resultingWinnerSide: Side;
  isPoint?: boolean;
  isSideOut?: boolean;
  shotType?: string;
  rallyEndType?: RallyEndType;
}

export interface UndoEvent extends BaseEvent {
  type: 'UNDO';
}

export interface GameEndEvent extends BaseEvent {
  type: 'GAME_END';
  gameNumber: number;
  winnerSide: Side;
  scoreA: number;
  scoreB: number;
}

export interface MatchEndEvent extends BaseEvent {
  type: 'MATCH_END';
  winnerSide: Side;
  reason?: 'NORMAL' | 'RETIRE' | 'WALKOVER';
}

export interface ServeFaultEvent extends BaseEvent {
  type: 'SERVE_FAULT';
  faultySide: Side;
  player?: string;
}

export interface RetireEvent extends BaseEvent {
  type: 'RETIRE';
  retiringSide: Side;
  reason?: string;
}

export interface WalkoverEvent extends BaseEvent {
  type: 'WALKOVER';
  concedingSide: Side;
  reason?: string;
}

export interface IntervalEvent extends BaseEvent {
  type: 'INTERVAL';
  intervalType: IntervalType;
  gameNumber: number;
}

export type MatchEvent =
  | PointEvent
  | PlayerActionEvent
  | UndoEvent
  | GameEndEvent
  | MatchEndEvent
  | ServeFaultEvent
  | RetireEvent
  | WalkoverEvent
  | IntervalEvent;

export interface MatchState {
  config: MatchConfig;
  status: MatchStatus;
  currentGameNumber: number;
  gamesWonA: number;
  gamesWonB: number;
  games: GameScore[];
  currentScoreA: number;
  currentScoreB: number;
  serveState: ServeState;
  doublesPositions?: DoublesPositions;
  endsSwapped: boolean;
  winnerSide?: Side;
  winReason?: 'NORMAL' | 'RETIRE' | 'WALKOVER';
  history: MatchEvent[];
  lastPointWinner?: Side;
}

export interface MomentumPoint {
  sequenceNumber: number;
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  diff: number;
  winningSide: Side;
  timestamp: number;
}

export interface MatchStats {
  longestStreak: { sideA: number; sideB: number };
  currentStreak: { side: Side; count: number };
  leadChanges: number;
  comebackDeficits: { sideA: number; sideB: number };
  pointsWonOnServeVsReceive: {
    sideA: { serve: number; receive: number };
    sideB: { serve: number; receive: number };
  };
  gameDurations: Array<{ gameNumber: number; durationMs: number }>;
  momentumSeries: MomentumPoint[];
  shotBreakdown: {
    sideA: Record<RallyEndType, number>;
    sideB: Record<RallyEndType, number>;
  };
  pressurePoints: {
    sideA: { won: number; lost: number };
    sideB: { won: number; lost: number };
  };
}
