import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RallyPointRepository,
  GetPlayerProfileSchema,
  SearchPlayersSchema,
  GetMatchHistorySchema,
  GetHeadToHeadSchema,
  AnonymizePlayerSchema,
  ExportPlayerDataSchema,
} from './repository.js';
import { PlayerStatus, MatchStatus } from '@prisma/client';

describe('RallyPointRepository - Unit Tests & Zod Validation', () => {
  describe('Zod Input Validation', () => {
    it('validates GetPlayerProfileSchema correctly', () => {
      expect(() => GetPlayerProfileSchema.parse({ playerId: 'player-123' })).not.toThrow();
      expect(() => GetPlayerProfileSchema.parse({ playerId: '' })).toThrow();
      expect(() => GetPlayerProfileSchema.parse({})).toThrow();
    });

    it('validates SearchPlayersSchema defaults and constraints', () => {
      const parsed = SearchPlayersSchema.parse({});
      expect(parsed.limit).toBe(20);
      expect(parsed.query).toBeUndefined();

      const custom = SearchPlayersSchema.parse({
        query: 'Viktor',
        status: PlayerStatus.ACTIVE,
        limit: 10,
        cursor: 'cuid_xyz',
      });
      expect(custom.query).toBe('Viktor');
      expect(custom.status).toBe('ACTIVE');
      expect(custom.limit).toBe(10);
      expect(custom.cursor).toBe('cuid_xyz');

      // Invalid limit (> 100)
      expect(() => SearchPlayersSchema.parse({ limit: 500 })).toThrow();
    });

    it('validates GetMatchHistorySchema with status and pagination', () => {
      const parsed = GetMatchHistorySchema.parse({
        playerId: 'p-1',
        status: MatchStatus.COMPLETED,
        limit: 15,
      });
      expect(parsed.playerId).toBe('p-1');
      expect(parsed.status).toBe('COMPLETED');
      expect(parsed.limit).toBe(15);
    });

    it('validates GetHeadToHeadSchema requiring both player IDs', () => {
      expect(() =>
        GetHeadToHeadSchema.parse({ playerAId: 'p-1', playerBId: 'p-2' })
      ).not.toThrow();
      expect(() => GetHeadToHeadSchema.parse({ playerAId: 'p-1' })).toThrow();
      expect(() => GetHeadToHeadSchema.parse({ playerAId: '', playerBId: 'p-2' })).toThrow();
    });
  });

  describe('Repository Methods with Mock DB', () => {
    let mockPrisma: any;
    let repo: RallyPointRepository;

    beforeEach(() => {
      mockPrisma = {
        player: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
        },
        match: {
          findMany: vi.fn(),
        },
        playerCareerStats: {
          findUnique: vi.fn(),
        },
        playerFormTrend: {
          findUnique: vi.fn(),
        },
        playerRankingSnapshot: {
          findMany: vi.fn(),
        },
        headToHead: {
          findUnique: vi.fn(),
        },
        matchParticipant: {
          findMany: vi.fn(),
        },
        playerProfileHistory: {
          findMany: vi.fn(),
        },
        auditLog: {
          create: vi.fn(),
        },
        user: {
          update: vi.fn(),
        },
        $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
      };
      repo = new RallyPointRepository(mockPrisma as any);
    });

    it('searchPlayers implements cursor pagination properly', async () => {
      mockPrisma.player.findMany.mockResolvedValue([
        { id: 'p-1', displayName: 'Viktor Axelsen' },
        { id: 'p-2', displayName: 'Lee Zii Jia' },
        { id: 'p-3', displayName: 'Next Cursor Sentinel' }, // extra item for cursor
      ]);

      const result = await repo.searchPlayers({ limit: 2 });
      expect(mockPrisma.player.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        })
      );
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('p-3');
      expect(result.hasMore).toBe(true);
    });

    it('getHeadToHead resolves inverted player pairs correctly', async () => {
      // Standard A-B not found, B-A found
      mockPrisma.headToHead.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          playerAId: 'p-b',
          playerBId: 'p-a',
          matchesPlayed: 4,
          aWins: 3, // B's wins
          bWins: 1, // A's wins
          gamesPlayed: 10,
          aGameWins: 7,
          bGameWins: 3,
          lastMatchId: 'm-99',
        });

      const h2h = await repo.getHeadToHead({ playerAId: 'p-a', playerBId: 'p-b' });
      expect(h2h.matchesPlayed).toBe(4);
      expect(h2h.winsA).toBe(1);
      expect(h2h.winsB).toBe(3);
      expect(h2h.gameWinsA).toBe(3);
      expect(h2h.gameWinsB).toBe(7);
      expect(h2h.lastMatchId).toBe('m-99');
    });

    it('anonymizePlayer scrubs personal PII, unlinks user, and logs audit', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'p-private',
        userId: 'u-private',
        firstName: 'Secret',
        lastName: 'Agent',
        displayName: 'Secret Agent',
        email: 'secret@agent.com',
        phone: '+1234567890',
        bio: 'Classified player bio',
      });

      mockPrisma.player.update.mockResolvedValue({
        id: 'p-private',
        firstName: 'Anonymized',
        lastName: 'Player',
        displayName: 'Player #vate',
        email: null,
        phone: null,
        bio: null,
        status: PlayerStatus.INACTIVE,
      });

      const scrubbed = await repo.anonymizePlayer({
        playerId: 'p-private',
        performedBy: 'DPO_OFFICER',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tableName: 'players',
            rowId: 'p-private',
            action: 'ANONYMIZE',
            changedBy: 'DPO_OFFICER',
          }),
        })
      );

      expect(mockPrisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-private' },
          data: expect.objectContaining({
            firstName: 'Anonymized',
            lastName: 'Player',
            displayName: 'Player #vate',
            email: null,
            phone: null,
            bio: null,
            status: PlayerStatus.INACTIVE,
          }),
        })
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-private' },
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );

      expect(scrubbed.email).toBeNull();
    });

    it('exportPlayerData compiles a complete GDPR dossier', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'p-export',
        displayName: 'Kento Momota',
        club: { id: 'c-1', name: 'NTT East' },
        user: { email: 'kento@ntt.jp' },
        teamMemberships: [],
      });
      mockPrisma.playerProfileHistory.findMany.mockResolvedValue([]);
      mockPrisma.playerCareerStats.findUnique.mockResolvedValue({
        matchesPlayed: 45,
        winRate: 88.5,
      });
      mockPrisma.playerFormTrend.findUnique.mockResolvedValue({
        recentResults: '["W","W","W"]',
      });
      mockPrisma.playerRankingSnapshot.findMany.mockResolvedValue([]);
      mockPrisma.matchParticipant.findMany.mockResolvedValue([
        {
          matchId: 'm-1',
          side: 'A',
          position: 1,
          match: {
            matchType: 'SINGLES',
            scoringFormat: 'RALLY_21',
            status: 'COMPLETED',
            startedAt: new Date('2026-01-01'),
            endedAt: new Date('2026-01-01'),
            winnerSide: 'A',
            tournament: { name: 'All England' },
            games: [{ gameNumber: 1, scoreA: 21, scoreB: 15, winnerSide: 'A' }],
          },
        },
      ]);

      const dossier = await repo.exportPlayerData({ playerId: 'p-export' });
      expect(dossier.format).toBe('GDPR_DATA_PORTABILITY_V1');
      expect(dossier.player.displayName).toBe('Kento Momota');
      expect(dossier.careerStats.matchesPlayed).toBe(45);
      expect(dossier.matches).toHaveLength(1);
      expect(dossier.matches[0].tournament).toBe('All England');
    });
  });
});
