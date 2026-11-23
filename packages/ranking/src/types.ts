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

export interface RallyTag {
  pointWinnerSide: 'A' | 'B';
  pointWinnerPlayerId?: string;
  shotType?: ShotType;
  rallyEndResult?: RallyEndResult;
  errorPlayerId?: string;
}

export interface RankingMatchEvent {
  id: string;
  sequenceNumber: number;
  eventType:
    | 'POINT'
    | 'UNDO'
    | 'SERVE_FAULT'
    | 'INTERVAL'
    | 'RETIRE'
    | 'WALKOVER'
    | 'GAME_END'
    | 'MATCH_END';
  side?: 'A' | 'B' | null;
  shotType?: ShotType | null;
  rallyEndResult?: RallyEndResult | null;
  pointWinnerPlayerId?: string | null;
  errorPlayerId?: string | null;
  serverPlayerId?: string | null;
  occurredAt?: Date | string;
  payload?: Record<string, unknown> | null;
}

export interface RankingParticipant {
  playerId: string;
  displayName: string;
  side: 'A' | 'B';
  position: 1 | 2;
}

export interface RankingGame {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: 'A' | 'B' | null;
}

export interface RankingMatch {
  id: string;
  seasonId?: string | null;
  matchType: 'SINGLES' | 'DOUBLES' | 'MIXED';
  teamAId?: string | null;
  teamBId?: string | null;
  participants: RankingParticipant[];
  winnerSide?: 'A' | 'B' | null;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'RETIRED' | 'WALKOVER';
  games: RankingGame[];
  events: RankingMatchEvent[];
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
}

export interface PlayerStats {
  playerId: string;
  displayName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // 0 to 100 percentage
  pointsScored: number;
  pointsConceded: number; // points dropped
  pointDifference: number;
  gamesWon: number;
  gamesLost: number;
  dropShotsPlayed: number;
  dropShotWinners: number;
  dropShotErrors: number;
  unforcedErrors: number;
  smashWinners: number;
  longestWinStreak: number;
  currentStreak: number;
  currentForm: ('W' | 'L')[]; // last 5 results (newest last)
}

export interface TeamStats {
  teamId: string;
  name: string;
  type: 'FIXED_PAIR' | 'CLUB_TEAM';
  playerIds: string[];
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // 0 to 100 percentage
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  gamesWon: number;
  gamesLost: number;
  currentStreak: number;
  bestStreak: number;
}

export type RankingCategory =
  | 'OVERALL'
  | 'MOST_WINS'
  | 'MOST_POINTS'
  | 'MOST_LOSSES'
  | 'MOST_DROPS_PLAYED'
  | 'MOST_DROPS_CONCEDED'
  | 'MOST_UNFORCED_ERRORS'
  | 'BEST_WIN_RATE';

export type TeamRankingCategory =
  | 'OVERALL_TEAM'
  | 'MOST_TEAM_WINS'
  | 'MOST_TEAM_LOSSES'
  | 'BEST_TEAM_WIN_RATE'
  | 'BEST_POINT_DIFFERENCE';

export type RankMovement = 'UP' | 'DOWN' | 'SAME';

export interface LeaderboardEntry<T = PlayerStats | TeamStats> {
  rank: number;
  id: string; // playerId or teamId
  name: string;
  matchesPlayed: number; // Displayed as "Matches: N"
  headlineValue: number;
  headlineFormatted: string;
  rankMovement: RankMovement;
  movementDelta: number;
  stats: T;
}

export interface OverallRankingWeights {
  winRateWeight: number; // Default 0.40
  pointDiffPerMatchWeight: number; // Default 0.25
  winsWeight: number; // Default 0.15
  currentFormWeight: number; // Default 0.10
  consistencyWeight: number; // Default 0.10
  minMatchesThreshold: number; // Default 5
}

export const DEFAULT_RANKING_WEIGHTS: OverallRankingWeights = {
  winRateWeight: 0.4,
  pointDiffPerMatchWeight: 0.25,
  winsWeight: 0.15,
  currentFormWeight: 0.1,
  consistencyWeight: 0.1,
  minMatchesThreshold: 5,
};
