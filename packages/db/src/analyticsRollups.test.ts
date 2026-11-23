import { describe, it, expect, vi } from 'vitest';
import {
  calculateCareerStats,
  rebuildPlayerStats,
  MatchRecordForStats,
} from './statsProjection.js';

describe('Database Phase 3: Derived Analytics Rollup Layer', () => {
  const sampleMatchHistory: MatchRecordForStats[] = [
    {
      id: 'm-1',
      winnerSide: 'A',
      endedAt: new Date('2026-03-01T10:00:00Z'),
      playerSide: 'A', // Player won match
      games: [
        { scoreA: 21, scoreB: 18, winnerSide: 'A' },
        { scoreA: 19, scoreB: 21, winnerSide: 'B' },
        { scoreA: 21, scoreB: 15, winnerSide: 'A' },
      ],
    },
    {
      id: 'm-2',
      winnerSide: 'A',
      endedAt: new Date('2026-03-02T10:00:00Z'),
      playerSide: 'A', // Player won match (Streak: 2)
      games: [
        { scoreA: 21, scoreB: 14, winnerSide: 'A' },
        { scoreA: 21, scoreB: 17, winnerSide: 'A' },
      ],
    },
    {
      id: 'm-3',
      winnerSide: 'B',
      endedAt: new Date('2026-03-03T10:00:00Z'),
      playerSide: 'A', // Player lost match (Streak reset to 0)
      games: [
        { scoreA: 18, scoreB: 21, winnerSide: 'B' },
        { scoreA: 15, scoreB: 21, winnerSide: 'B' },
      ],
    },
    {
      id: 'm-4',
      winnerSide: 'B',
      endedAt: new Date('2026-03-04T10:00:00Z'),
      playerSide: 'B', // Player was on Side B and won! (Streak: 1)
      games: [
        { scoreA: 12, scoreB: 21, winnerSide: 'B' },
        { scoreA: 19, scoreB: 21, winnerSide: 'B' },
      ],
    },
  ];

  it('calculates player career rollups strictly from match history projection', () => {
    const stats = calculateCareerStats('player-viktor', sampleMatchHistory);

    expect(stats.playerId).toBe('player-viktor');
    expect(stats.matchesPlayed).toBe(4);
    expect(stats.matchesWon).toBe(3); // Won m-1, m-2, m-4
    expect(stats.matchesLost).toBe(1); // Lost m-3
    expect(stats.winRate).toBe(75.0);

    // Games:
    // m-1: 2 won, 1 lost (Score: 21+19+21=61 won, 18+21+15=54 lost)
    // m-2: 2 won, 0 lost (Score: 42 won, 31 lost)
    // m-3: 0 won, 2 lost (Score: 33 won, 42 lost)
    // m-4: 2 won, 0 lost (Score: 42 won, 31 lost)
    // Total games: 6 won, 3 lost
    expect(stats.gamesWon).toBe(6);
    expect(stats.gamesLost).toBe(3);

    // Total points: 61 + 42 + 33 + 42 = 178 won; 54 + 31 + 42 + 31 = 158 lost
    expect(stats.pointsWon).toBe(178);
    expect(stats.pointsLost).toBe(158);

    // Streaks: m-1 (1), m-2 (2), m-3 (reset to 0), m-4 (1)
    expect(stats.bestStreak).toBe(2);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastPlayedAt).toEqual(new Date('2026-03-04T10:00:00Z'));
  });

  it('rebuildPlayerStats queries match participants and upserts into database rollup', async () => {
    const mockTx = {
      matchParticipant: {
        findMany: vi.fn().mockResolvedValue([
          {
            side: 'A',
            match: {
              id: 'm-1',
              winnerSide: 'A',
              endedAt: new Date('2026-03-01T10:00:00Z'),
              games: [
                { scoreA: 21, scoreB: 19, winnerSide: 'A' },
                { scoreA: 21, scoreB: 18, winnerSide: 'A' },
              ],
            },
          },
        ]),
      },
      playerCareerStats: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve(create)),
      },
    };

    const res = await rebuildPlayerStats('player-viktor', mockTx as any);
    expect(mockTx.matchParticipant.findMany).toHaveBeenCalled();
    expect(mockTx.playerCareerStats.upsert).toHaveBeenCalled();
    expect(res.matchesWon).toBe(1);
    expect(res.winRate).toBe(100.0);
  });
});
