export type ScoringFormat =
  | 'RALLY_21'
  | 'RALLY_15'
  | 'RALLY_11'
  | 'SERVICE_POINT_15'
  | 'SERVICE_POINT_11'
  | 'CUSTOM';

export type ScoringSystemFilter = 'ALL' | 'RALLY' | 'SERVICE';

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
    | 'RALLY_WON'
    | 'PLAYER_ACTION'
    | 'SIDE_OUT'
    | 'SETTING_CHOICE'
    | 'UNDO'
    | 'SERVE_FAULT'
    | 'INTERVAL'
    | 'RETIRE'
    | 'WALKOVER'
    | 'GAME_END'
    | 'MATCH_END';
  side?: 'A' | 'B' | null;
  action?: 'POINT' | 'DROP' | null;
  playerId?: string | null;
  shotType?: ShotType | null;
  rallyEndResult?: RallyEndResult | null;
  pointWinnerPlayerId?: string | null;
  errorPlayerId?: string | null;
  serverPlayerId?: string | null;
  occurredAt?: Date | string;
  isPoint?: boolean;
  isSideOut?: boolean;
  isCompensated?: boolean;
  attributedPointPlayerId?: string | null;
  attributedDropPlayerIds?: string[] | null;
  isBothFault?: boolean;
  note?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface RankingParticipant {
  playerId: string;
  displayName: string;
  side: 'A' | 'B';
  position: 1 | 2;
  initialRank?: number; // For giant killer bonus calculation
}

export interface RankingGame {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: 'A' | 'B' | null;
  isSettingGame?: boolean;
  winReason?: 'NORMAL' | 'SHUTOUT';
}

export interface RankingMatch {
  id: string;
  seasonId?: string | null;
  matchType: 'SINGLES' | 'DOUBLES' | 'MIXED';
  scoringFormat?: ScoringFormat;
  teamAId?: string | null;
  teamBId?: string | null;
  participants: RankingParticipant[];
  winnerSide?: 'A' | 'B' | null;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'RETIRED' | 'WALKOVER';
  games: RankingGame[];
  events: RankingMatchEvent[];
  targetPoints?: number;
  winBy?: number;
  cap?: number;
  isSettingGame?: boolean;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
}

export interface PlayerStats {
  playerId: string;
  displayName: string;
  matchesPlayed: number;
  rallyMatchesPlayed: number;
  serviceMatchesPlayed: number;
  matchesSplitFormatted: string; // e.g. "R:8 S:4"
  rankingPoints: number; // League Points (RP)
  wins: number;
  losses: number;
  winRate: number; // 0 to 100 percentage
  pointsScored: number;
  pointsConceded: number; // points dropped
  pointDifference: number;
  pointSharePct: number; // pointsScored / (pointsScored + pointsConceded) * 100
  gamesWon: number;
  gamesLost: number;

  // Player action stats
  pointsWon: number;
  drops: number;
  netContribution: number;
  pointShareWithinTeam: number;
  dropShareWithinTeam: number;
  currentPointStreak: number;
  bestPointStreak: number;
  sideOutsCaused: number;

  // Streak & MVP aggregate stats
  mvpCount: number;
  fighterCount: number;
  mvpRate: number;
  serveRegainedTotal: number;
  clutchPointsTotal: number;
  bestMatchStreak: number;

  dropShotsPlayed: number;
  dropShotWinners: number;
  dropShotErrors: number;
  unforcedErrors: number;
  smashWinners: number;
  longestWinStreak: number;
  currentStreak: number;
  currentForm: ('W' | 'L')[]; // last 5 results (newest last)

  // Service point stats
  servicePointsWon: number;
  sideOutsWon: number;
  serviceHolds: number;
  serviceBreaks: number;
  avgPointsPerServiceTurn: number;
  longestServiceRun: number;

  // Rally point stats
  pointsWonOnServe: number;
  pointsWonOnReceive: number;
  longestPointStreak: number;
  comebackPoints: number;

  // Shutout stats
  shutoutWins: number;
  shutoutsConceded: number;

  // Shared / Both-fault count
  sharedFaults: number;
}

export interface TeamStats {
  teamId: string;
  name: string;
  type: 'FIXED_PAIR' | 'CLUB_TEAM';
  playerIds: string[];
  matchesPlayed: number;
  rallyMatchesPlayed: number;
  serviceMatchesPlayed: number;
  rankingPoints: number;
  wins: number;
  losses: number;
  winRate: number; // 0 to 100 percentage
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  pointSharePct: number;
  gamesWon: number;
  gamesLost: number;
  totalPointsWon: number;
  totalDrops: number;
  netContribution: number;
  currentStreak: number;
  bestStreak: number;
  shutoutWins: number;
  shutoutsConceded: number;
}

export type RankingCategory =
  | 'OVERALL'
  | 'LEAGUE_TABLE'
  | 'TOP_POINT_SCORERS'
  | 'MOST_DROPS'
  | 'BEST_NET_CONTRIBUTION'
  | 'MOST_MVPS'
  | 'MOST_SHUTOUT_WINS'
  | 'BEST_CLUTCH_PLAYER'
  | 'SERVE_WINNER'
  | 'LONGEST_STREAK'
  | 'MOST_WINS'
  | 'MOST_POINTS'
  | 'MOST_LOSSES'
  | 'MOST_DROPS_PLAYED'
  | 'MOST_DROPS_CONCEDED'
  | 'MOST_UNFORCED_ERRORS'
  | 'BEST_WIN_RATE'
  | 'BEST_SERVICE_GAME';

export type TeamRankingCategory =
  | 'OVERALL_TEAM'
  | 'TEAM_LEAGUE_TABLE'
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
  matchesSplitFormatted: string; // e.g. "R:8 S:4"
  headlineValue: number;
  headlineFormatted: string;
  secondaryValue?: number;
  secondaryFormatted?: string;
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
  netContributionWeight?: number;
  mvpRateWeight?: number; // Optional MVP rate weight
}

export interface MvpWeights {
  pointsWonWeight: number; // Default 3.0
  serveRegainedWeight: number; // Default 2.5
  clutchPointsWeight: number; // Default 2.0
  comebackPointsWeight: number; // Default 1.5
  streakBonusWeight: number; // Default 1.0
  dropsPenalty: number; // Default 2.0
  clutchDropsPenalty: number; // Default 1.0
  resultBonus: number; // Default 5.0
  servicePointServeRegainMultiplier: number; // Default 1.5
  rallyPointServeRegainMultiplier: number; // Default 1.0
  qualificationMinActions: number; // Default 5
  singlesMvpEnabled: boolean; // Default false
  formulaVersion: string; // 'v1.0.0'
}

export const DEFAULT_MVP_WEIGHTS: MvpWeights = {
  pointsWonWeight: 3.0,
  serveRegainedWeight: 2.5,
  clutchPointsWeight: 2.0,
  comebackPointsWeight: 1.5,
  streakBonusWeight: 1.0,
  dropsPenalty: 2.0,
  clutchDropsPenalty: 1.0,
  resultBonus: 5.0,
  servicePointServeRegainMultiplier: 1.5,
  rallyPointServeRegainMultiplier: 1.0,
  qualificationMinActions: 5,
  singlesMvpEnabled: false,
  formulaVersion: 'v1.0.0',
};

export interface RankingConfig {
  weights: OverallRankingWeights;
  mvpWeights: MvpWeights;
  minMatchesThreshold: number;
  // RP Defaults
  rallyWinRp: number;
  rallyLossRp: number;
  rallyStraightGamesBonus: number;
  rallyGiantKillerBonus: number;
  serviceWinRp: number;
  serviceLossRp: number;
  serviceStraightGamesBonus: number;
  serviceGiantKillerBonus: number;
  serviceSettingBonus: number;
  rallyMultiplier: number;
  serviceMultiplier: number;
  shutoutWinBonus: number;
}

export const DEFAULT_RANKING_WEIGHTS: OverallRankingWeights = {
  winRateWeight: 0.4,
  pointDiffPerMatchWeight: 0.25,
  winsWeight: 0.15,
  currentFormWeight: 0.1,
  consistencyWeight: 0.1,
  minMatchesThreshold: 5,
  netContributionWeight: 0.05,
  mvpRateWeight: 0.0,
};

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  weights: DEFAULT_RANKING_WEIGHTS,
  mvpWeights: DEFAULT_MVP_WEIGHTS,
  minMatchesThreshold: 5,
  rallyWinRp: 3,
  rallyLossRp: 1,
  rallyStraightGamesBonus: 1,
  rallyGiantKillerBonus: 1,
  serviceWinRp: 3,
  serviceLossRp: 1,
  serviceStraightGamesBonus: 1,
  serviceGiantKillerBonus: 1,
  serviceSettingBonus: 1,
  rallyMultiplier: 1.0,
  serviceMultiplier: 1.0,
  shutoutWinBonus: 1,
};

export interface PlayerMvpContribution {
  playerId: string;
  name: string;
  teamSide: 'A' | 'B';
  isWinner: boolean;
  pointsWon: number;
  serveRegained: number;
  clutchPoints: number;
  comebackPoints: number;
  streakBonusPoints: number;
  drops: number;
  clutchDrops: number;
  bestPointStreak: number;
  totalAttributedActions: number;
  isQualified: boolean;
  mvpScore: number;
  reasonChips: string[];
  summaryLine: string;
}

export interface MatchAwardRecord {
  matchId: string;
  playerId: string;
  playerName: string;
  awardType: 'MVP' | 'FIGHTER' | 'CO_MVP';
  score: number;
  reasons: string[];
  summaryLine: string;
  formulaVersion: string;
  createdAt?: string;
}

export interface MatchAwardsResult {
  mvp: PlayerMvpContribution | null;
  fighter: PlayerMvpContribution | null;
  coMvps: PlayerMvpContribution[];
  allContributions: PlayerMvpContribution[];
  isQualified: boolean;
  disqualificationReason?: string;
  formulaVersion: string;
  unassignedCount?: number;
  qualificationThreshold?: number;
  isShutoutMatch?: boolean;
}

