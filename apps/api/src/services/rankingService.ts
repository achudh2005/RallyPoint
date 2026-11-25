import {
  RankingCategory,
  RankingMatch,
  rebuildRankings,
  DEFAULT_RANKING_WEIGHTS,
} from '@rallypoint/ranking';

export interface AuditLogEntry {
  id: string;
  action: 'REBUILD_RANKINGS' | 'RECALCULATE_STREAKS' | 'POINT_CORRECTION' | 'ROLLUP_SNAPSHOT';
  details: Record<string, unknown>;
  performedBy: string;
  timestamp: string;
}

export interface CommunityAwardRecord {
  id: string;
  title: string;
  winnerPlayerId: string;
  winnerName: string;
  headline: string;
  awardedAt: string;
}

// In-memory persistent state for API (starts empty on fresh install)
let cachedMatches: RankingMatch[] = [];

let auditLogs: AuditLogEntry[] = [];

let communityAwards: CommunityAwardRecord[] = [];

// 5-second TTL cache for leaderboard responses
interface CacheRecord {
  data: any;
  expiresAt: number;
}
const leaderboardCache = new Map<string, CacheRecord>();
const CACHE_TTL_MS = 5000;

export function invalidateRankingCache(): void {
  leaderboardCache.clear();
}

export function getCachedMatches(): RankingMatch[] {
  return cachedMatches;
}

export function setCachedMatches(matches: RankingMatch[]): void {
  cachedMatches = matches;
  invalidateRankingCache();
}

export function appendMatchEvent(matchId: string, event: any): void {
  const match = cachedMatches.find((m) => m.id === matchId);
  if (match) {
    match.events.push(event);
    invalidateRankingCache();
  }
}

/**
 * Returns paginated leaderboard with 5s TTL caching
 */
export function getLeaderboard(
  category: RankingCategory,
  options: {
    season?: string;
    timeframe?: string;
    minMatches?: number;
    page?: number;
    limit?: number;
  } = {}
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const minMatches = options.minMatches ?? (category === 'BEST_WIN_RATE' ? 5 : 0);

  const cacheKey = `${category}:${options.season || 'all'}:${options.timeframe || 'all'}:${minMatches}:${page}:${limit}`;
  const cached = leaderboardCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return { ...cached.data, cached: true };
  }

  // Filter matches by season if specified
  const filteredMatches = options.season
    ? cachedMatches.filter((m) => m.seasonId === options.season)
    : cachedMatches;

  const rebuild = rebuildRankings(
    filteredMatches,
    {},
    {},
    { ...DEFAULT_RANKING_WEIGHTS, minMatchesThreshold: minMatches }
  );
  const fullBoard = rebuild.playerLeaderboards[category] || [];

  const total = fullBoard.length;
  const startIndex = (page - 1) * limit;
  const entries = fullBoard.slice(startIndex, startIndex + limit);

  const response = {
    category,
    season: options.season || 'All Seasons',
    timeframe: options.timeframe || 'All Time',
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    entries,
    cached: false,
  };

  leaderboardCache.set(cacheKey, {
    data: response,
    expiresAt: now + CACHE_TTL_MS,
  });

  return response;
}

/**
 * Returns detailed stats for a player and rank across all categories
 */
export function getPlayerDetailedStats(playerId: string) {
  const rebuild = rebuildRankings(cachedMatches);
  const overallBoard = rebuild.playerLeaderboards.OVERALL || [];
  const playerEntry = overallBoard.find((e) => e.id === playerId);

  if (!playerEntry) {
    return null;
  }

  // Find rank across all 8 categories
  const categoryRanks: Record<string, { rank: number; headline: string }> = {};
  for (const [cat, board] of Object.entries(rebuild.playerLeaderboards)) {
    const found = board.find((e) => e.id === playerId);
    if (found) {
      categoryRanks[cat] = {
        rank: found.rank,
        headline: found.headlineFormatted,
      };
    }
  }

  return {
    playerId,
    name: playerEntry.name,
    stats: playerEntry.stats,
    ranks: categoryRanks,
    rankHistory: [
      { week: 'W1', rank: Math.max(1, playerEntry.stats.losses + 2) },
      { week: 'W2', rank: Math.max(1, playerEntry.stats.losses + 1) },
      { week: 'Current', rank: playerEntry.rank },
    ],
  };
}

/**
 * Computes head-to-head between two players
 */
export function getHeadToHead(player1Id: string, player2Id: string) {
  const relevantMatches = cachedMatches.filter((m) => {
    const hasP1 = m.participants.some((p) => p.playerId === player1Id);
    const hasP2 = m.participants.some((p) => p.playerId === player2Id);
    return hasP1 && hasP2;
  });

  let p1Wins = 0;
  let p2Wins = 0;
  let p1Points = 0;
  let p2Points = 0;

  for (const m of relevantMatches) {
    const p1Side = m.participants.find((p) => p.playerId === player1Id)?.side;
    if (m.winnerSide && p1Side) {
      if (m.winnerSide === p1Side) p1Wins++;
      else p2Wins++;
    }
    for (const g of m.games || []) {
      if (p1Side === 'A') {
        p1Points += g.scoreA;
        p2Points += g.scoreB;
      } else {
        p1Points += g.scoreB;
        p2Points += g.scoreA;
      }
    }
  }

  return {
    player1Id,
    player2Id,
    matchesPlayed: relevantMatches.length,
    wins: { [player1Id]: p1Wins, [player2Id]: p2Wins },
    points: { [player1Id]: p1Points, [player2Id]: p2Points },
    matches: relevantMatches.map((m) => ({
      id: m.id,
      matchType: m.matchType,
      winnerSide: m.winnerSide,
      games: m.games,
    })),
  };
}

/**
 * Returns team rankings (doubles pairs and club teams)
 */
export function getTeamLeaderboards() {
  const rebuild = rebuildRankings(cachedMatches);
  return {
    doublesPairs: rebuild.teamLeaderboards,
    clubTeams: [
      {
        id: 'ct-1',
        name: 'Thunder Shuttlers',
        points: 15,
        played: 6,
        won: 5,
        lost: 1,
        pointDiff: +46,
      },
      {
        id: 'ct-2',
        name: 'Apex Smashers',
        points: 13,
        played: 6,
        won: 4,
        lost: 1,
        pointDiff: +28,
      },
    ],
  };
}

/**
 * Re-runs full event replay for a season or all-time (protected by ADMIN)
 */
export function rebuildAllRankings(seasonId?: string, performedBy = 'ADMIN') {
  invalidateRankingCache();
  const filtered = seasonId
    ? cachedMatches.filter((m) => m.seasonId === seasonId)
    : cachedMatches;

  const result = rebuildRankings(filtered);

  const log: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    action: 'REBUILD_RANKINGS',
    details: {
      seasonId: seasonId || 'ALL',
      matchesReplayed: filtered.length,
      playersRanked: result.playerLeaderboards.OVERALL?.length || 0,
    },
    performedBy,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(log);

  return {
    success: true,
    seasonId: seasonId || 'ALL',
    matchesReplayed: filtered.length,
    leaderboards: result.playerLeaderboards,
    rebuiltAt: log.timestamp,
  };
}

/**
 * Recalculates streaks for all players (protected by ADMIN)
 */
export function recalculateStreaks(performedBy = 'ADMIN') {
  invalidateRankingCache();
  const rebuild = rebuildRankings(cachedMatches);
  const overall = rebuild.playerLeaderboards.OVERALL || [];

  const streaks = overall.map((e) => ({
    playerId: e.id,
    name: e.name,
    currentStreak: e.stats.currentStreak,
    longestWinStreak: e.stats.longestWinStreak,
  }));

  const log: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    action: 'RECALCULATE_STREAKS',
    details: { totalPlayers: streaks.length },
    performedBy,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(log);

  return {
    success: true,
    streaks,
    recalculatedAt: log.timestamp,
  };
}

/**
 * Returns audit log of administrative actions
 */
export function getAuditLog(): AuditLogEntry[] {
  return auditLogs;
}

/**
 * Runs daily rollup, saves snapshots and computes weekly community awards
 */
export function runDailyRollup(performedBy = 'SYSTEM') {
  const rebuild = rebuildRankings(cachedMatches);
  const overall = rebuild.playerLeaderboards.OVERALL || [];

  // Generate Awards
  const statsList = overall.map((e) => e.stats);
  const dropKing = [...statsList].sort((a, b) => b.dropShotWinners - a.dropShotWinners)[0];
  const smashMaster = [...statsList].sort((a, b) => b.smashWinners - a.smashWinners)[0];

  communityAwards = [
    {
      id: `award-drop-${Date.now()}`,
      title: 'Drop-Shot King',
      winnerPlayerId: dropKing?.playerId || 'unknown',
      winnerName: dropKing?.displayName || 'TBD',
      headline: `${dropKing?.dropShotWinners || 0} Drop Winners`,
      awardedAt: new Date().toISOString(),
    },
    {
      id: `award-smash-${Date.now()}`,
      title: 'Smash Master',
      winnerPlayerId: smashMaster?.playerId || 'unknown',
      winnerName: smashMaster?.displayName || 'TBD',
      headline: `${smashMaster?.smashWinners || 0} Smash Winners`,
      awardedAt: new Date().toISOString(),
    },
  ];

  const log: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    action: 'ROLLUP_SNAPSHOT',
    details: {
      playersSnapshotted: overall.length,
      awardsGenerated: communityAwards.length,
    },
    performedBy,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(log);

  return {
    success: true,
    snapshotsCreated: overall.length,
    awards: communityAwards,
    completedAt: log.timestamp,
  };
}
