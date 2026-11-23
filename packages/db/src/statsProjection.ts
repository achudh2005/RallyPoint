import { PrismaClient, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from './index.js';

export interface MatchRecordForStats {
  id: string;
  winnerSide: 'A' | 'B' | null;
  endedAt: Date | null;
  playerSide: 'A' | 'B';
  games: Array<{
    scoreA: number;
    scoreB: number;
    winnerSide: 'A' | 'B' | null;
  }>;
}

export interface ComputedCareerStats {
  playerId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  pointsWon: number;
  pointsLost: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedAt: Date | null;
}

/**
 * Pure projection: Rebuilds PlayerCareerStats strictly from match history
 */
export function calculateCareerStats(
  playerId: string,
  matches: MatchRecordForStats[]
): ComputedCareerStats {
  let matchesWon = 0;
  let matchesLost = 0;
  let gamesWon = 0;
  let gamesLost = 0;
  let pointsWon = 0;
  let pointsLost = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let lastPlayedAt: Date | null = null;

  for (const m of matches) {
    if (m.endedAt) lastPlayedAt = m.endedAt;

    const wonMatch = m.winnerSide === m.playerSide;
    if (wonMatch) {
      matchesWon++;
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else if (m.winnerSide !== null) {
      matchesLost++;
      currentStreak = 0;
    }

    for (const g of m.games) {
      const wonGame = g.winnerSide === m.playerSide;
      if (wonGame) gamesWon++;
      else if (g.winnerSide !== null) gamesLost++;

      if (m.playerSide === 'A') {
        pointsWon += g.scoreA;
        pointsLost += g.scoreB;
      } else {
        pointsWon += g.scoreB;
        pointsLost += g.scoreA;
      }
    }
  }

  const matchesPlayed = matchesWon + matchesLost;
  const winRate =
    matchesPlayed > 0 ? Number(((matchesWon / matchesPlayed) * 100).toFixed(2)) : 0;

  return {
    playerId,
    matchesPlayed,
    matchesWon,
    matchesLost,
    gamesWon,
    gamesLost,
    pointsWon,
    pointsLost,
    winRate,
    currentStreak,
    bestStreak,
    lastPlayedAt,
  };
}

/**
 * Recomputes and persists player stats from events & matches into rollup tables
 */
export async function rebuildPlayerStats(
  playerId: string,
  tx: PrismaClient | Prisma.TransactionClient = defaultPrisma
) {
  // Query all completed matches for player
  const participations = await tx.matchParticipant.findMany({
    where: {
      playerId,
      match: { status: 'COMPLETED' },
    },
    include: {
      match: {
        include: {
          games: true,
        },
      },
    },
    orderBy: {
      match: { endedAt: 'asc' },
    },
  });

  const matchRecords: MatchRecordForStats[] = participations.map((p) => ({
    id: p.match.id,
    winnerSide: p.match.winnerSide as 'A' | 'B' | null,
    endedAt: p.match.endedAt,
    playerSide: p.side as 'A' | 'B',
    games: p.match.games.map((g) => ({
      scoreA: g.scoreA,
      scoreB: g.scoreB,
      winnerSide: g.winnerSide as 'A' | 'B' | null,
    })),
  }));

  const stats = calculateCareerStats(playerId, matchRecords);

  // Persist into player_career_stats rollup table
  return tx.playerCareerStats.upsert({
    where: { playerId },
    create: stats,
    update: stats,
  });
}
