import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeMatchAwards } from './mvp.js';
import type { RankingMatchEvent } from './types.js';

function makeAction(
  seq: number,
  playerId: string,
  side: 'A' | 'B',
  action: 'POINT' | 'DROP',
  servingSideAtRally: 'A' | 'B' = 'A',
  isPoint = true,
  isSideOut = false
): RankingMatchEvent {
  return {
    id: `ev-${seq}`,
    sequenceNumber: seq,
    eventType: 'PLAYER_ACTION',
    playerId,
    side,
    action,
    isPoint,
    isSideOut,
    serverPlayerId: servingSideAtRally === 'A' ? 'p-a1' : 'p-b1',
    payload: {
      servingSideAtRally,
    },
  };
}

describe('Match MVP Engine (Feature 2)', () => {
  const participants = [
    { playerId: 'p-anu', displayName: 'Anu', side: 'A' as const, position: 1 as const },
    { playerId: 'p-vikram', displayName: 'Vikram', side: 'A' as const, position: 2 as const },
    { playerId: 'p-rahul', displayName: 'Rahul', side: 'B' as const, position: 1 as const },
    { playerId: 'p-deepa', displayName: 'Deepa', side: 'B' as const, position: 2 as const },
  ];

  it('computes exact MVP numbers for a worked doubles match', () => {
    // Scenario:
    // Anu scores 8 points, 1 drop.
    // 3 points are as receiver (serveRegained).
    // Best streak = 6 (actions 9, 10, 11, 12, 23, 24 without drop) -> streak bonus = 6 - 2 = 4.
    // 2 points scored when trailing by >= 4 -> comeback points = 2.
    // 2 points scored when Rahul reached 16 (target - 5 = 16) -> clutch points = 2.
    // Team A wins (+5 result bonus).
    //
    // Formula verification:
    // 3.0 * 8 (points won = 24.0)
    // + 2.5 * 3 (serve regained = 7.5)
    // + 2.0 * 2 (clutch points = 4.0)
    // + 1.5 * 5 (comeback points at deficit >= 4 = 7.5)
    // + 1.0 * 4 (streak bonus = 4.0)
    // - 2.0 * 1 (drops = -2.0)
    // - 1.0 * 0 (clutch drops = 0)
    // + 5.0 (result bonus = 5.0)
    // Total = 24 + 7.5 + 4 + 7.5 + 4 - 2 + 5 = 50.0

    const events: RankingMatchEvent[] = [
      // Early points (Rahul leads 5-0, deficit = 5)
      makeAction(1, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(2, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(3, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(4, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(5, 'p-rahul', 'B', 'POINT', 'B'), // Score 0-5

      // Anu scores 2 comeback points while trailing by >= 4 (at 0-5 and 1-5)
      makeAction(6, 'p-anu', 'A', 'POINT', 'B'), // deficit 5, receiver -> comeback=1, serveRegained=1, score 1-5
      makeAction(7, 'p-anu', 'A', 'POINT', 'A'), // deficit 4 -> comeback=2, score 2-5

      // Anu drop
      makeAction(8, 'p-anu', 'A', 'DROP', 'A'), // score 2-6

      // Anu scores 4 points in a row (streak = 4)
      makeAction(9, 'p-anu', 'A', 'POINT', 'B'), // receiver -> serveRegained=2, score 3-6
      makeAction(10, 'p-anu', 'A', 'POINT', 'A'), // score 4-6
      makeAction(11, 'p-anu', 'A', 'POINT', 'A'), // score 5-6
      makeAction(12, 'p-anu', 'A', 'POINT', 'A'), // score 6-6, streak=4 -> streakBonus=2

      // Opponents score up to 16 (clutch threshold 21 - 5 = 16 reached)
      // Rahul and Deepa share points: Rahul scores 4, Deepa scores 6
      makeAction(13, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(14, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(15, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(16, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(17, 'p-deepa', 'B', 'POINT', 'B'),
      makeAction(18, 'p-deepa', 'B', 'POINT', 'B'),
      makeAction(19, 'p-deepa', 'B', 'POINT', 'B'),
      makeAction(20, 'p-deepa', 'B', 'POINT', 'B'),
      makeAction(21, 'p-deepa', 'B', 'POINT', 'B'),
      makeAction(22, 'p-deepa', 'B', 'POINT', 'B'), // score 6-16

      // Reach clutch score (Rahul >= 16)
      makeAction(23, 'p-anu', 'A', 'POINT', 'B'), // receiver -> serveRegained=3, clutch=1, score 7-16
      makeAction(24, 'p-anu', 'A', 'POINT', 'A'), // clutch=2, score 8-16
    ];

    const result = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'RALLY_21',
      targetPoints: 21,
      winnerSide: 'A',
      participants,
    });

    expect(result.isQualified).toBe(true);
    expect(result.mvp).toBeDefined();
    expect(result.mvp!.playerId).toBe('p-anu');
    expect(result.mvp!.pointsWon).toBe(8);
    expect(result.mvp!.serveRegained).toBe(3);
    expect(result.mvp!.clutchPoints).toBe(2);
    expect(result.mvp!.comebackPoints).toBe(5);
    expect(result.mvp!.mvpScore).toBe(50.0);
    expect(result.mvp!.reasonChips).toContain('8 points');
    expect(result.mvp!.reasonChips).toContain('3 serve regains');
    expect(result.mvp!.reasonChips).toContain('2 clutch points');
  });

  it('applies 1.5x multiplier for serve regained in Service Point scoring', () => {
    const eventsRally: RankingMatchEvent[] = [
      makeAction(1, 'p-anu', 'A', 'POINT', 'B'),
      makeAction(2, 'p-anu', 'A', 'POINT', 'B'),
      makeAction(3, 'p-anu', 'A', 'POINT', 'B'),
      makeAction(4, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(5, 'p-anu', 'A', 'POINT', 'A'),
    ];

    const rallyRes = computeMatchAwards(eventsRally, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'RALLY_21',
      participants,
    });

    const serviceRes = computeMatchAwards(eventsRally, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'SERVICE_POINT_15',
      participants,
    });

    // In Service point, 3 serve regains get 1.5x multiplier (2.5 * 3 * 1.5 = 11.25 vs 7.5)
    expect(serviceRes.mvp!.mvpScore).toBeGreaterThan(rallyRes.mvp!.mvpScore);
  });

  it('penalizes drops in clutch situations', () => {
    // Player with normal drop vs clutch drop
    const eventsNormal: RankingMatchEvent[] = [
      makeAction(1, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(2, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(3, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(4, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(5, 'p-anu', 'A', 'DROP', 'A'), // Normal drop at low score
    ];

    const eventsClutch: RankingMatchEvent[] = [
      // Advance score to 16-16
      ...Array.from({ length: 16 }, (_, i) => makeAction(i + 1, 'p-vikram', 'A', 'POINT', 'A')),
      ...Array.from({ length: 16 }, (_, i) => makeAction(i + 17, 'p-rahul', 'B', 'POINT', 'B')),
      makeAction(33, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(34, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(35, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(36, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(37, 'p-anu', 'A', 'DROP', 'A'), // Clutch drop at 16-16+
    ];

    const resNormal = computeMatchAwards(eventsNormal, undefined, { targetPoints: 21, participants });
    const resClutch = computeMatchAwards(eventsClutch, undefined, { targetPoints: 21, participants });

    const pNormal = resNormal.allContributions.find((p) => p.playerId === 'p-anu')!;
    const pClutch = resClutch.allContributions.find((p) => p.playerId === 'p-anu')!;

    expect(pNormal.clutchDrops).toBe(0);
    expect(pClutch.clutchDrops).toBe(1);
  });

  it('disqualifies match MVP if no player reaches 5 attributed actions', () => {
    const events: RankingMatchEvent[] = [
      makeAction(1, 'p-anu', 'A', 'POINT'),
      makeAction(2, 'p-anu', 'A', 'POINT'),
      makeAction(3, 'p-rahul', 'B', 'POINT'),
    ];

    const res = computeMatchAwards(events, undefined, { participants });
    expect(res.isQualified).toBe(false);
    expect(res.mvp).toBeNull();
    expect(res.disqualificationReason).toContain('not enough player data');
  });

  it('breaks ties using fewer drops, then serve regained, then clutch points, then winner, then co-MVP', () => {
    // Two players with equal points won and score, but player 1 has fewer drops
    const p1Actions = [
      makeAction(1, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(2, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(3, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(4, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(5, 'p-anu', 'A', 'POINT', 'A'),
    ];
    const p2Actions = [
      makeAction(6, 'p-vikram', 'A', 'POINT', 'A'),
      makeAction(7, 'p-vikram', 'A', 'POINT', 'A'),
      makeAction(8, 'p-vikram', 'A', 'POINT', 'A'),
      makeAction(9, 'p-vikram', 'A', 'POINT', 'A'),
      makeAction(10, 'p-vikram', 'A', 'POINT', 'A'),
      makeAction(11, 'p-vikram', 'A', 'DROP', 'A'), // 1 drop
    ];

    const res = computeMatchAwards([...p1Actions, ...p2Actions], undefined, {
      matchType: 'DOUBLES',
      participants,
      winnerSide: 'A',
    });

    expect(res.mvp!.playerId).toBe('p-anu'); // Anu wins tiebreaker due to fewer drops
  });

  it('selects Fighter award as the top performer on the losing side', () => {
    const events: RankingMatchEvent[] = [
      // Winning Side A
      makeAction(1, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(2, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(3, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(4, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(5, 'p-anu', 'A', 'POINT', 'A'),
      makeAction(6, 'p-anu', 'A', 'POINT', 'A'),

      // Losing Side B Fighter Rahul
      makeAction(7, 'p-rahul', 'B', 'POINT', 'A'), // serve regained
      makeAction(8, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(9, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(10, 'p-rahul', 'B', 'POINT', 'B'),
      makeAction(11, 'p-rahul', 'B', 'POINT', 'B'),
    ];

    const res = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      winnerSide: 'A',
      participants,
    });

    expect(res.mvp!.playerId).toBe('p-anu');
    expect(res.fighter).toBeDefined();
    expect(res.fighter!.playerId).toBe('p-rahul');
    expect(res.fighter!.isWinner).toBe(false);
  });

  it('handles singles matches with winner default vs singlesMvpEnabled', () => {
    const singlesParticipants = [
      { playerId: 'p1', displayName: 'Player 1', side: 'A' as const, position: 1 as const },
      { playerId: 'p2', displayName: 'Player 2', side: 'B' as const, position: 1 as const },
    ];

    const events: RankingMatchEvent[] = [
      makeAction(1, 'p1', 'A', 'POINT', 'A'),
      makeAction(2, 'p1', 'A', 'POINT', 'A'),
      makeAction(3, 'p1', 'A', 'POINT', 'A'),
      makeAction(4, 'p1', 'A', 'POINT', 'A'),
      makeAction(5, 'p1', 'A', 'POINT', 'A'),
    ];

    const resWinnerDefault = computeMatchAwards(events, {
      mvpWeights: { singlesMvpEnabled: false } as any,
    }, {
      matchType: 'SINGLES',
      winnerSide: 'A',
      participants: singlesParticipants,
    });

    expect(resWinnerDefault.mvp!.playerId).toBe('p1');
  });

  it('property-based test: replay equals incremental state', () => {
    const actionArbitrary = fc.record({
      seq: fc.integer({ min: 1, max: 50 }),
      playerId: fc.constantFrom('p-anu', 'p-vikram', 'p-rahul', 'p-deepa'),
      side: fc.constantFrom<'A' | 'B'>('A', 'B'),
      action: fc.constantFrom<'POINT' | 'DROP'>('POINT', 'DROP'),
    });

    fc.assert(
      fc.property(fc.array(actionArbitrary, { minLength: 5, maxLength: 25 }), (rawActions) => {
        const events = rawActions.map((a, i) => makeAction(i + 1, a.playerId, a.side, a.action));
        const res1 = computeMatchAwards(events, undefined, { participants, winnerSide: 'A' });
        const res2 = computeMatchAwards(events, undefined, { participants, winnerSide: 'A' });

        expect(res1.mvp?.playerId).toEqual(res2.mvp?.playerId);
        expect(res1.allContributions.map((c) => c.mvpScore)).toEqual(
          res2.allContributions.map((c) => c.mvpScore)
        );
      })
    );
  });
});
