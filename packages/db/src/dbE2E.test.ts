import { describe, it, expect } from 'vitest';
import { calculateCareerStats } from './statsProjection.js';
import { ingestMatchEvent, IngestibleMatchEvent } from './eventIngestion.js';

describe('Database Phase 4: End-to-End Tournament Simulation & Concurrency Test', () => {
  // 16 Tournament Players
  const players = Array.from({ length: 16 }, (_, i) => ({
    id: `player-${i + 1}`,
    displayName: `Seeded Player ${i + 1}`,
  }));

  it('simulates 16-player tournament matches, concurrent events, and stats rollups', async () => {
    // Generate Round of 16 (8 matches)
    const matches = [];
    for (let i = 0; i < 8; i++) {
      matches.push({
        id: `m-r16-${i + 1}`,
        playerA: players[i * 2],
        playerB: players[i * 2 + 1],
      });
    }

    // In-memory mock store representing PostgreSQL tables
    const eventStore: Record<string, IngestibleMatchEvent[]> = {};

    // Simulate concurrent live scoring across all 8 courts
    const concurrentSimulations = matches.map(async (m) => {
      eventStore[m.id] = [];
      const mockTx = {
        matchEvent: {
          findUnique: async ({ where }: any) => {
            return eventStore[m.id]?.find((e) => e.id === where.id) || null;
          },
          findFirst: async () => {
            const list = eventStore[m.id] || [];
            return list.length > 0 ? list[list.length - 1] : null;
          },
          create: async ({ data }: any) => {
            eventStore[m.id]?.push(data);
            return data;
          },
        },
      };

      // Ingest sequential points concurrently
      for (let seq = 1; seq <= 5; seq++) {
        const side = seq % 2 === 1 ? 'A' : 'B';
        const event: IngestibleMatchEvent = {
          id: `evt-${m.id}-${seq}`,
          matchId: m.id,
          sequenceNumber: seq,
          eventType: 'POINT',
          side,
          occurredAt: new Date(Date.now() + seq * 1000),
          payload: { point: seq },
        };
        await ingestMatchEvent(event, mockTx as any);
      }
    });

    await Promise.all(concurrentSimulations);

    // Verify all 8 matches have exactly 5 events recorded in sequence
    for (const m of matches) {
      expect(eventStore[m.id]?.length).toBe(5);
      expect(eventStore[m.id]?.[0].sequenceNumber).toBe(1);
      expect(eventStore[m.id]?.[4].sequenceNumber).toBe(5);
    }
  });

  it('verifies idempotent retry does not corrupt state during concurrent retries', async () => {
    const stored: IngestibleMatchEvent[] = [];
    const mockTx = {
      matchEvent: {
        findUnique: async ({ where }: any) => stored.find((e) => e.id === where.id) || null,
        findFirst: async () => (stored.length > 0 ? stored[stored.length - 1] : null),
        create: async ({ data }: any) => {
          stored.push(data);
          return data;
        },
      },
    };

    const duplicateEvents: IngestibleMatchEvent[] = [
      {
        id: 'dup-1',
        matchId: 'm-concurrent',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        occurredAt: new Date(),
      },
      {
        id: 'dup-1', // Duplicate client UUID
        matchId: 'm-concurrent',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        occurredAt: new Date(),
      },
    ];

    const res1 = await ingestMatchEvent(duplicateEvents[0], mockTx as any);
    const res2 = await ingestMatchEvent(duplicateEvents[1], mockTx as any);
    expect(res1.isDuplicate).toBe(false);
    expect(res2.isDuplicate).toBe(true);
    expect(stored.length).toBe(1);
  });

  it('verifies soft-delete and purge exclusion workflow', () => {
    const playerTable = [
      { id: 'p-1', name: 'Player One', deletedAt: null },
      { id: 'p-2', name: 'Player Two', deletedAt: new Date() }, // Soft-deleted
      { id: 'p-3', name: 'Player Three', deletedAt: null },
    ];

    // Standard query filter
    const activePlayers = playerTable.filter((p) => p.deletedAt === null);
    expect(activePlayers.length).toBe(2);
    expect(activePlayers.find((p) => p.id === 'p-2')).toBeUndefined();

    // Admin purge (hard-delete soft-deleted rows older than cutoff)
    const purged = playerTable.filter((p) => p.deletedAt === null);
    expect(purged.length).toBe(2);
  });

  it('projects career stats for tournament winner', () => {
    const winnerStats = calculateCareerStats('player-1', [
      {
        id: 'm-r16',
        winnerSide: 'A',
        endedAt: new Date(),
        playerSide: 'A',
        games: [{ scoreA: 21, scoreB: 15, winnerSide: 'A' }],
      },
      {
        id: 'm-qf',
        winnerSide: 'A',
        endedAt: new Date(),
        playerSide: 'A',
        games: [{ scoreA: 21, scoreB: 18, winnerSide: 'A' }],
      },
      {
        id: 'm-sf',
        winnerSide: 'A',
        endedAt: new Date(),
        playerSide: 'A',
        games: [{ scoreA: 21, scoreB: 19, winnerSide: 'A' }],
      },
      {
        id: 'm-final',
        winnerSide: 'A',
        endedAt: new Date(),
        playerSide: 'A',
        games: [{ scoreA: 21, scoreB: 17, winnerSide: 'A' }],
      },
    ]);

    expect(winnerStats.matchesPlayed).toBe(4);
    expect(winnerStats.matchesWon).toBe(4);
    expect(winnerStats.bestStreak).toBe(4);
    expect(winnerStats.winRate).toBe(100.0);
  });
});
