import {
  RankingMatch,
  RankingCategory,
  TeamRankingCategory,
  LeaderboardEntry,
  PlayerStats,
  TeamStats,
  ScoringSystemFilter,
  RankingConfig,
  DEFAULT_RANKING_CONFIG,
  OverallRankingWeights,
} from './types.js';
import { computeAllPlayerStats, computeAllTeamStats } from './stats.js';
import {
  generatePlayerLeaderboard,
  generateTeamLeaderboard,
  RankingSnapshotLookup,
} from './rankingEngine.js';

export interface CompleteRankingSystemResult {
  playerStats: Record<string, PlayerStats>;
  teamStats: Record<string, TeamStats>;
  playerLeaderboards: Record<RankingCategory, LeaderboardEntry<PlayerStats>[]>;
  teamLeaderboards: Record<TeamRankingCategory, LeaderboardEntry<TeamStats>[]>;
  computedAt: string;
}

export function rebuildRankings(
  matches: RankingMatch[],
  previousPlayerRanks: Partial<Record<RankingCategory, RankingSnapshotLookup>> = {},
  previousTeamRanks: Partial<Record<TeamRankingCategory, RankingSnapshotLookup>> = {},
  configOrWeights: RankingConfig | OverallRankingWeights = DEFAULT_RANKING_CONFIG,
  formatFilter: ScoringSystemFilter = 'ALL'
): CompleteRankingSystemResult {
  const config: RankingConfig =
    'weights' in configOrWeights
      ? configOrWeights
      : { ...DEFAULT_RANKING_CONFIG, weights: configOrWeights };

  // 1. Accumulate stats with format filter and config
  const playerStats = computeAllPlayerStats(matches, config, formatFilter);
  const teamStats = computeAllTeamStats(matches, config, formatFilter);

  const playerStatsList = Object.values(playerStats);
  const teamStatsList = Object.values(teamStats);

  // 2. Generate all player leaderboards
  const playerCategories: RankingCategory[] = [
    'OVERALL',
    'LEAGUE_TABLE',
    'TOP_POINT_SCORERS',
    'MOST_DROPS',
    'BEST_NET_CONTRIBUTION',
    'MOST_MVPS',
    'BEST_CLUTCH_PLAYER',
    'SERVE_WINNER',
    'LONGEST_STREAK',
    'MOST_WINS',
    'MOST_POINTS',
    'MOST_LOSSES',
    'MOST_DROPS_PLAYED',
    'MOST_DROPS_CONCEDED',
    'MOST_UNFORCED_ERRORS',
    'BEST_WIN_RATE',
    'BEST_SERVICE_GAME',
  ];

  const playerLeaderboards = {} as Record<RankingCategory, LeaderboardEntry<PlayerStats>[]>;
  for (const cat of playerCategories) {
    playerLeaderboards[cat] = generatePlayerLeaderboard(
      playerStatsList,
      cat,
      previousPlayerRanks[cat] || {},
      config.weights,
      formatFilter
    );
  }

  // 3. Generate all team leaderboards
  const teamCategories: TeamRankingCategory[] = [
    'OVERALL_TEAM',
    'TEAM_LEAGUE_TABLE',
    'MOST_TEAM_WINS',
    'MOST_TEAM_LOSSES',
    'BEST_TEAM_WIN_RATE',
    'BEST_POINT_DIFFERENCE',
  ];

  const teamLeaderboards = {} as Record<TeamRankingCategory, LeaderboardEntry<TeamStats>[]>;
  for (const cat of teamCategories) {
    teamLeaderboards[cat] = generateTeamLeaderboard(
      teamStatsList,
      cat,
      previousTeamRanks[cat] || {}
    );
  }

  return {
    playerStats,
    teamStats,
    playerLeaderboards,
    teamLeaderboards,
    computedAt: new Date().toISOString(),
  };
}
