import { z } from 'zod';
import { PrismaClient, Prisma, PlayerStatus, MatchStatus, MatchEventType, RallyEndTypeEnum, ShotType, RallyEndResult } from '@prisma/client';
import { prisma as defaultPrisma } from './index.js';
import { ingestEventBatch, IngestibleMatchEvent } from './eventIngestion.js';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const GetPlayerProfileSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
});

export const SearchPlayersSchema = z.object({
  query: z.string().optional(),
  clubId: z.string().optional(),
  status: z.nativeEnum(PlayerStatus).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const GetMatchHistorySchema = z.object({
  playerId: z.string().optional(),
  tournamentId: z.string().optional(),
  status: z.nativeEnum(MatchStatus).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const GetPlayerStatsSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
});

export const GetHeadToHeadSchema = z.object({
  playerAId: z.string().min(1, 'Player A ID is required'),
  playerBId: z.string().min(1, 'Player B ID is required'),
});

export const GetLeaderboardSchema = z.object({
  category: z.string().default('OVERALL'),
  period: z.string().default('ALL_TIME'),
  scoringFormat: z.string().default('ALL'),
  seasonId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const IngestEventsSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  events: z.array(
    z.object({
      id: z.string().min(1, 'Client UUID is required'),
      matchId: z.string().min(1),
      gameId: z.string().nullable().optional(),
      sequenceNumber: z.number().int().nonnegative(),
      eventType: z.nativeEnum(MatchEventType),
      side: z.enum(['A', 'B']).nullable().optional(),
      rallyEndType: z.nativeEnum(RallyEndTypeEnum).nullable().optional(),
      shotType: z.nativeEnum(ShotType).nullable().optional(),
      rallyEndResult: z.nativeEnum(RallyEndResult).nullable().optional(),
      pointWinnerPlayerId: z.string().nullable().optional(),
      errorPlayerId: z.string().nullable().optional(),
      serverPlayerId: z.string().nullable().optional(),
      payload: z.record(z.unknown()).nullable().optional(),
      occurredAt: z.union([z.date(), z.string()]),
      recordedAt: z.union([z.date(), z.string()]).optional(),
      deviceId: z.string().nullable().optional(),
    })
  ),
});

export const AnonymizePlayerSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  performedBy: z.string().default('GDPR_ADMIN'),
});

export const ExportPlayerDataSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
});

// ==========================================
// REPOSITORY IMPLEMENTATION
// ==========================================

export class RallyPointRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  /**
   * Retrieves player profile with club details and career stats
   */
  async getPlayerProfile(rawInput: z.infer<typeof GetPlayerProfileSchema>) {
    const { playerId } = GetPlayerProfileSchema.parse(rawInput);

    const player = await this.db.player.findUnique({
      where: { id: playerId },
      include: {
        club: true,
        careerStats: true,
        formTrend: true,
        teamMemberships: {
          include: { team: true },
          where: { leftAt: null },
        },
      },
    });

    if (!player) {
      return null;
    }

    return player;
  }

  /**
   * Search players with fuzzy matching and cursor-based pagination
   */
  async searchPlayers(rawInput: z.infer<typeof SearchPlayersSchema>) {
    const { query, clubId, status, cursor, limit } = SearchPlayersSchema.parse(rawInput);

    const where: Prisma.PlayerWhereInput = {
      deletedAt: null,
      ...(clubId ? { clubId } : {}),
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { displayName: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await this.db.player.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      include: {
        club: { select: { id: true, name: true, city: true } },
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return {
      items,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  /**
   * Cursor-paginated match history filtered by player, tournament, or status
   */
  async getMatchHistory(rawInput: z.infer<typeof GetMatchHistorySchema>) {
    const { playerId, tournamentId, status, cursor, limit } = GetMatchHistorySchema.parse(rawInput);

    const where: Prisma.MatchWhereInput = {
      ...(tournamentId ? { tournamentId } : {}),
      ...(status ? { status } : {}),
      ...(playerId
        ? {
            participants: {
              some: { playerId },
            },
          }
        : {}),
    };

    const items = await this.db.match.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sides: {
          include: { team: true },
        },
        participants: {
          include: {
            player: {
              select: { id: true, displayName: true, photoUrl: true },
            },
          },
        },
        games: {
          orderBy: { gameNumber: 'asc' },
        },
        analyticsRollup: true,
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return {
      items,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  /**
   * Retrieves full player analytics and statistics snapshot
   */
  async getPlayerStats(rawInput: z.infer<typeof GetPlayerStatsSchema>) {
    const { playerId } = GetPlayerStatsSchema.parse(rawInput);

    const [careerStats, formTrend, latestRankings] = await Promise.all([
      this.db.playerCareerStats.findUnique({
        where: { playerId },
      }),
      this.db.playerFormTrend.findUnique({
        where: { playerId },
      }),
      this.db.playerRankingSnapshot.findMany({
        where: { playerId },
        orderBy: { snapshotDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      playerId,
      careerStats,
      formTrend,
      latestRankings,
    };
  }

  /**
   * Retrieves pairwise head-to-head statistics between two players
   */
  async getHeadToHead(rawInput: z.infer<typeof GetHeadToHeadSchema>) {
    const { playerAId, playerBId } = GetHeadToHeadSchema.parse(rawInput);

    // Look for both ordered pair orientations (A-B or B-A)
    const [h2hStandard, h2hInverted] = await Promise.all([
      this.db.headToHead.findUnique({
        where: {
          playerAId_playerBId: {
            playerAId,
            playerBId,
          },
        },
      }),
      this.db.headToHead.findUnique({
        where: {
          playerAId_playerBId: {
            playerAId: playerBId,
            playerBId: playerAId,
          },
        },
      }),
    ]);

    if (h2hStandard) {
      return {
        playerAId,
        playerBId,
        matchesPlayed: h2hStandard.matchesPlayed,
        winsA: h2hStandard.aWins,
        winsB: h2hStandard.bWins,
        gamesPlayed: h2hStandard.gamesPlayed,
        gameWinsA: h2hStandard.aGameWins,
        gameWinsB: h2hStandard.bGameWins,
        lastMatchId: h2hStandard.lastMatchId,
      };
    } else if (h2hInverted) {
      return {
        playerAId,
        playerBId,
        matchesPlayed: h2hInverted.matchesPlayed,
        winsA: h2hInverted.bWins,
        winsB: h2hInverted.aWins,
        gamesPlayed: h2hInverted.gamesPlayed,
        gameWinsA: h2hInverted.bGameWins,
        gameWinsB: h2hInverted.aGameWins,
        lastMatchId: h2hInverted.lastMatchId,
      };
    }

    return {
      playerAId,
      playerBId,
      matchesPlayed: 0,
      winsA: 0,
      winsB: 0,
      gamesPlayed: 0,
      gameWinsA: 0,
      gameWinsB: 0,
      lastMatchId: null,
    };
  }

  /**
   * Retrieves community leaderboard with cursor-based pagination
   */
  async getLeaderboard(rawInput: z.infer<typeof GetLeaderboardSchema>) {
    const { category, period, scoringFormat, seasonId, cursor, limit } =
      GetLeaderboardSchema.parse(rawInput);

    const where: Prisma.PlayerRankingSnapshotWhereInput = {
      category,
      period,
      scoringFormat,
      ...(seasonId ? { seasonId } : {}),
    };

    const items = await this.db.playerRankingSnapshot.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { rank: 'asc' },
      include: {
        player: {
          select: {
            id: true,
            displayName: true,
            photoUrl: true,
            club: { select: { id: true, name: true } },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return {
      items,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  /**
   * Idempotent ingestion of match events
   */
  async ingestEvents(rawInput: z.infer<typeof IngestEventsSchema>) {
    const { matchId, events } = IngestEventsSchema.parse(rawInput);

    const typedEvents: IngestibleMatchEvent[] = events.map((e) => ({
      ...e,
      matchId,
    }));

    return ingestEventBatch(typedEvents, this.db);
  }

  /**
   * GDPR-compliant player anonymization.
   * Scrubs all personally identifiable information (PII) while preserving match history,
   * career statistics, and event sequencing.
   */
  async anonymizePlayer(rawInput: z.infer<typeof AnonymizePlayerSchema>) {
    const { playerId, performedBy } = AnonymizePlayerSchema.parse(rawInput);

    return this.db.$transaction(async (tx) => {
      const existing = await tx.player.findUnique({
        where: { id: playerId },
      });

      if (!existing) {
        throw new Error(`Player with ID ${playerId} not found`);
      }

      // Record pre-anonymization snapshot in audit log
      await tx.auditLog.create({
        data: {
          tableName: 'players',
          rowId: playerId,
          action: 'ANONYMIZE',
          oldData: existing as unknown as Prisma.InputJsonValue,
          newData: { anonymized: true, anonymizedAt: new Date().toISOString() },
          changedBy: performedBy,
        },
      });

      // Scrub PII columns
      const scrubbed = await tx.player.update({
        where: { id: playerId },
        data: {
          firstName: 'Anonymized',
          lastName: 'Player',
          displayName: `Player #${playerId.slice(-4)}`,
          email: null,
          phone: null,
          bio: null,
          photoUrl: null,
          dateOfBirth: null,
          nationality: null,
          city: null,
          state: null,
          country: null,
          externalIds: Prisma.DbNull,
          status: PlayerStatus.INACTIVE,
          deletedAt: new Date(),
        },
      });

      // Also unlink or disable associated User account if linked
      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            isActive: false,
            email: `anonymized_${playerId}@rallypoint.local`,
          },
        });
      }

      return scrubbed;
    });
  }

  /**
   * GDPR Data Portability Export.
   * Generates a complete JSON dossier of the player's personal profile,
   * club/team memberships, historical audit trail, career stats, and match records.
   */
  async exportPlayerData(rawInput: z.infer<typeof ExportPlayerDataSchema>) {
    const { playerId } = ExportPlayerDataSchema.parse(rawInput);

    const [player, history, careerStats, formTrend, rankingSnapshots, matchParticipations] =
      await Promise.all([
        this.db.player.findUnique({
          where: { id: playerId },
          include: {
            club: true,
            user: { select: { id: true, email: true, role: true, createdAt: true } },
            teamMemberships: { include: { team: true } },
          },
        }),
        this.db.playerProfileHistory.findMany({
          where: { playerId },
          orderBy: { changedAt: 'desc' },
        }),
        this.db.playerCareerStats.findUnique({
          where: { playerId },
        }),
        this.db.playerFormTrend.findUnique({
          where: { playerId },
        }),
        this.db.playerRankingSnapshot.findMany({
          where: { playerId },
          orderBy: { snapshotDate: 'desc' },
        }),
        this.db.matchParticipant.findMany({
          where: { playerId },
          include: {
            match: {
              include: {
                games: true,
                tournament: true,
              },
            },
          },
        }),
      ]);

    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    return {
      exportedAt: new Date().toISOString(),
      format: 'GDPR_DATA_PORTABILITY_V1',
      player,
      auditHistory: history,
      careerStats,
      formTrend,
      rankingSnapshots,
      matches: matchParticipations.map((p) => ({
        matchId: p.matchId,
        side: p.side,
        position: p.position,
        matchType: p.match.matchType,
        scoringFormat: p.match.scoringFormat,
        status: p.match.status,
        startedAt: p.match.startedAt,
        endedAt: p.match.endedAt,
        winnerSide: p.match.winnerSide,
        tournament: p.match.tournament?.name ?? null,
        games: p.match.games.map((g) => ({
          gameNumber: g.gameNumber,
          scoreA: g.scoreA,
          scoreB: g.scoreB,
          winnerSide: g.winnerSide,
        })),
      })),
    };
  }
}
