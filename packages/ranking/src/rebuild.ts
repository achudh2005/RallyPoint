import {
  RankingMatch,
  OverallRankingWeights,
  DEFAULT_RANKING_WEIGHTS,
  RankingCategory,
  TeamRankingCategory,
  LeaderboardEntry,
  PlayerStats,
  TeamStats,
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
  weights: OverallRankingWeights = DEFAULT_RANKING_WEIGHTS
): CompleteRankingSystemResult {
  // 1. Accumulate stats
  const playerStats = computeAllPlayerStats(matches);
  const teamStats = computeAllTeamStats(matches);

  const playerStatsList = Object.values(playerStats);
  const teamStatsList = Object.values(teamStats);

  // 2. Generate all player leaderboards
  const playerCategories: RankingCategory[] = [
    'OVERALL',
    'MOST_WINS',
    'MOST_POINTS',
    'MOST_LOSSES',
    'MOST_DROPS_PLAYED',
    'MOST_DROPS_CONCEDED',
    'MOST_UNFORCED_ERRORS',
    'BEST_WIN_RATE',
  ];

  const playerLeaderboards = {} as Record<RankingCategory, LeaderboardEntry<PlayerStats>[]>;
  for (const cat of playerCategories) {
    playerLeaderboards[cat] = generatePlayerLeaderboard(
      playerStatsList,
      cat,
      previousPlayerRanks[cat] || {},
      weights
    );
  }

  // 3. Generate all team leaderboards
  const teamCategories: TeamRankingCategory[] = [
    'OVERALL_TEAM',
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
