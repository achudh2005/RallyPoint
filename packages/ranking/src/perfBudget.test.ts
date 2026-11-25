import { describe, expect, it } from 'vitest';
import { computeMatchAwards, type RankingMatchEvent } from './index.js';

describe('QA Phase 4: MVP Performance Budget', () => {
  it('computes Match MVP over 200 rallies in under 10ms', () => {
    const participants = [
      { playerId: 'a1', displayName: 'Anu', side: 'A' as const },
      { playerId: 'a2', displayName: 'Vikram', side: 'A' as const },
      { playerId: 'b1', displayName: 'Rahul', side: 'B' as const },
      { playerId: 'b2', displayName: 'Deepa', side: 'B' as const },
    ];

    const events: RankingMatchEvent[] = Array.from({ length: 200 }, (_, i) => ({
      id: `ev-${i}`,
      sequenceNumber: i + 1,
      eventType: 'PLAYER_ACTION',
      playerId: participants[i % 4]!.playerId,
      side: i % 4 < 2 ? 'A' : 'B',
      action: i % 7 === 0 ? 'DROP' : 'POINT',
      isPoint: true,
      isSideOut: false,
      payload: { servingSideAtRally: i % 2 === 0 ? 'A' : 'B' },
    }));

    const t0 = performance.now();
    const result = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'RALLY_21',
      winnerSide: 'A',
      participants,
    });
    const elapsed = performance.now() - t0;

    expect(result.isQualified).toBe(true);
    expect(elapsed).toBeLessThan(10);
  });
});
