import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeMatchAwards } from './mvp.js';
import type { RankingMatchEvent } from './types.js';

function act(
  seq: number,
  playerId: string,
  side: 'A' | 'B',
  action: 'POINT' | 'DROP',
  servingSideAtRally: 'A' | 'B' = side,
  extra: Partial<RankingMatchEvent> = {}
): RankingMatchEvent {
  return {
    id: `ev-${seq}`,
    sequenceNumber: seq,
    eventType: 'PLAYER_ACTION',
    playerId,
    side,
    action,
    isPoint: true,
    payload: { servingSideAtRally },
    ...extra,
  };
}

const DOUBLES_PARTICIPANTS = [
  { playerId: 'a1', displayName: 'Anu', side: 'A' as const },
  { playerId: 'a2', displayName: 'Vikram', side: 'A' as const },
  { playerId: 'b1', displayName: 'Rahul', side: 'B' as const },
  { playerId: 'b2', displayName: 'Deepa', side: 'B' as const },
];

describe('Phase 3: MVP 12 Golden Cases & Property Tests', () => {
  it('1. Doubles Rally 21 match picks top-scoring winner + Fighter on losing side', () => {
    const events: RankingMatchEvent[] = [];
    let seq = 1;
    // Interleave rallies realistically so Side B isn't trailing 0-21 before scoring
    for (let i = 0; i < 10; i++) {
      events.push(act(seq++, 'a1', 'A', 'POINT', 'A'));
      events.push(act(seq++, 'b1', 'B', 'POINT', 'B'));
    }
    for (let i = 0; i < 5; i++) {
      events.push(act(seq++, 'a2', 'A', 'POINT', 'A'));
      events.push(act(seq++, 'b2', 'B', 'POINT', 'B'));
    }
    events.push(act(seq++, 'a1', 'A', 'POINT', 'A'));
    events.push(act(seq++, 'a1', 'A', 'POINT', 'A'));
    events.push(act(seq++, 'a2', 'A', 'POINT', 'A'));
    events.push(act(seq++, 'a2', 'A', 'POINT', 'A'));
    events.push(act(seq++, 'a2', 'A', 'POINT', 'A'));
    events.push(act(seq++, 'a2', 'A', 'POINT', 'A'));
    const res = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'RALLY_21',
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    expect(res.isQualified).toBe(true);
    expect(res.mvp?.playerId).toBe('a1');
    expect(res.fighter?.playerId).toBe('b1');
  });

  it('2. Service Point 15 with side-outs applies 1.5x serve regain multiplier', () => {
    const events: RankingMatchEvent[] = [
      // a1 regains serve 6 times (receiving while B serves)
      ...Array.from({ length: 6 }, (_, i) => act(i + 1, 'a1', 'A', 'POINT', 'B', { isPoint: false, isSideOut: true })),
      // a2 scores 6 points while serving
      ...Array.from({ length: 6 }, (_, i) => act(i + 7, 'a2', 'A', 'POINT', 'A', { isPoint: true })),
      ...Array.from({ length: 5 }, (_, i) => act(i + 13, 'b1', 'B', 'POINT', 'B', { isPoint: true })),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'SERVICE_POINT_15',
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    expect(res.mvp?.playerId).toBe('a1');
    expect(res.mvp?.serveRegained).toBe(6);
  });

  it('3. Setting game (14-all set to 17) activates clutch points via SETTING_CHOICE', () => {
    const events: RankingMatchEvent[] = [
      ...Array.from({ length: 6 }, (_, i) => act(i + 1, 'a1', 'A', 'POINT', 'A')),
      ...Array.from({ length: 6 }, (_, i) => act(i + 7, 'b1', 'B', 'POINT', 'B')),
      { id: 'set-1', sequenceNumber: 13, eventType: 'SETTING_CHOICE' },
      act(14, 'a2', 'A', 'POINT', 'A'),
      act(15, 'a2', 'A', 'POINT', 'A'),
      act(16, 'a2', 'A', 'POINT', 'A'),
      act(17, 'a2', 'A', 'POINT', 'A'),
      act(18, 'a2', 'A', 'POINT', 'A'),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'SERVICE_POINT_15',
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    const a2 = res.allContributions.find((c) => c.playerId === 'a2');
    expect(a2?.clutchPoints).toBe(5);
  });

  it('4. Comeback match awards comebackPoints when trailing by >= 4', () => {
    const events: RankingMatchEvent[] = [
      ...Array.from({ length: 6 }, (_, i) => act(i + 1, 'b1', 'B', 'POINT', 'B')),
      // Side A trails 0-6, then a1 scores 6 comeback/streak points
      ...Array.from({ length: 6 }, (_, i) => act(i + 7, 'a1', 'A', 'POINT', 'A')),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'SINGLES',
      scoringFormat: 'RALLY_21',
      winnerSide: 'A',
      participants: [
        { playerId: 'a1', displayName: 'Anu', side: 'A' },
        { playerId: 'b1', displayName: 'Rahul', side: 'B' },
      ],
    });
    const a1 = res.allContributions.find((c) => c.playerId === 'a1');
    expect(a1?.comebackPoints).toBeGreaterThanOrEqual(2);
  });

  it('5. Shutout game (7-0) uses relative qualification (>= 2) and disables clutch points', () => {
    const events: RankingMatchEvent[] = [
      act(1, 'a1', 'A', 'POINT', 'A'),
      act(2, 'a1', 'A', 'POINT', 'A'),
      act(3, 'a1', 'A', 'POINT', 'A'),
      act(4, 'a1', 'A', 'POINT', 'A'),
      act(5, 'a2', 'A', 'POINT', 'A'),
      act(6, 'a2', 'A', 'POINT', 'A'),
      act(7, 'a2', 'A', 'POINT', 'A'),
      { id: 'ge-1', sequenceNumber: 8, eventType: 'GAME_END', payload: { gameNumber: 1, reason: 'SHUTOUT' } },
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      scoringFormat: 'RALLY_11',
      targetPoints: 11,
      isShutout: true,
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    expect(res.isQualified).toBe(true);
    expect(res.mvp?.playerId).toBe('a1');
    expect(res.mvp?.clutchPoints).toBe(0);
  });

  it('6. All-drops match still ranks deterministically', () => {
    const events: RankingMatchEvent[] = [
      ...Array.from({ length: 5 }, (_, i) => act(i + 1, 'a1', 'A', 'DROP', 'A')),
      ...Array.from({ length: 6 }, (_, i) => act(i + 6, 'b1', 'B', 'DROP', 'B')),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'SINGLES',
      winnerSide: 'A',
      participants: [
        { playerId: 'a1', displayName: 'Anu', side: 'A' },
        { playerId: 'b1', displayName: 'Rahul', side: 'B' },
      ],
    });
    expect(res.isQualified).toBe(true);
    expect(res.mvp?.playerId).toBe('a1');
  });

  it('7. Unattributed rallies never credit any player and report unassignedCount', () => {
    const events: RankingMatchEvent[] = [
      { id: 'u1', sequenceNumber: 1, eventType: 'POINT', side: 'B', isPoint: true },
      { id: 'u2', sequenceNumber: 2, eventType: 'POINT', side: 'B', isPoint: true },
      ...Array.from({ length: 5 }, (_, i) => act(i + 3, 'a1', 'A', 'POINT', 'A')),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'SINGLES',
      winnerSide: 'A',
      participants: [
        { playerId: 'a1', displayName: 'Anu', side: 'A' },
        { playerId: 'b1', displayName: 'Rahul', side: 'B' },
      ],
    });
    expect(res.unassignedCount).toBe(2);
    expect(res.allContributions.find((c) => c.playerId === 'b1')?.pointsWon).toBe(0);
  });

  it('8. Singles match defaults MVP to match winner when singlesMvpEnabled is false', () => {
    const events: RankingMatchEvent[] = [
      ...Array.from({ length: 5 }, (_, i) => act(i + 1, 'a1', 'A', 'POINT', 'A')),
      ...Array.from({ length: 10 }, (_, i) => act(i + 6, 'b1', 'B', 'POINT', 'B')),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'SINGLES',
      winnerSide: 'A',
      participants: [
        { playerId: 'a1', displayName: 'Anu', side: 'A' },
        { playerId: 'b1', displayName: 'Rahul', side: 'B' },
      ],
    });
    expect(res.mvp?.playerId).toBe('a1');
    expect(res.fighter?.playerId).toBe('b1');
  });

  it('9. Exact tie on all 5 criteria produces coMvps', () => {
    const events: RankingMatchEvent[] = [
      act(1, 'a1', 'A', 'POINT', 'A'),
      act(2, 'a2', 'A', 'POINT', 'A'),
      act(3, 'a1', 'A', 'POINT', 'A'),
      act(4, 'a2', 'A', 'POINT', 'A'),
      act(5, 'a1', 'A', 'POINT', 'A'),
      act(6, 'a2', 'A', 'POINT', 'A'),
      act(7, 'a1', 'A', 'POINT', 'A'),
      act(8, 'a2', 'A', 'POINT', 'A'),
      act(9, 'a1', 'A', 'POINT', 'A'),
      act(10, 'a2', 'A', 'POINT', 'A'),
    ];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'DOUBLES',
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    expect(res.coMvps).toHaveLength(2);
  });

  it('10. Match where no player qualifies (< 2 actions) returns MVP not available', () => {
    const events: RankingMatchEvent[] = [act(1, 'a1', 'A', 'POINT', 'A')];
    const res = computeMatchAwards(events, undefined, {
      matchType: 'SINGLES',
      winnerSide: 'A',
      participants: [
        { playerId: 'a1', displayName: 'Anu', side: 'A' },
        { playerId: 'b1', displayName: 'Rahul', side: 'B' },
      ],
    });
    expect(res.isQualified).toBe(false);
    expect(res.mvp).toBeNull();
    expect(res.disqualificationReason).toContain('MVP not available');
  });

  it('11. Archived player still receives MVP award for historical matches', () => {
    const events: RankingMatchEvent[] = Array.from({ length: 6 }, (_, i) =>
      act(i + 1, 'archived-anu', 'A', 'POINT', 'A')
    );
    const res = computeMatchAwards(events, undefined, {
      matchType: 'SINGLES',
      winnerSide: 'A',
      participants: [
        { playerId: 'archived-anu', displayName: 'Anu (Archived)', side: 'A' },
        { playerId: 'b1', displayName: 'Rahul', side: 'B' },
      ],
    });
    expect(res.mvp?.playerId).toBe('archived-anu');
    expect(res.mvp?.name).toBe('Anu (Archived)');
  });

  it('12. Re-attributing an action after the fact recomputes MVP cleanly', () => {
    const original: RankingMatchEvent[] = [
      ...Array.from({ length: 5 }, (_, i) => act(i + 1, 'a1', 'A', 'POINT', 'A')),
      ...Array.from({ length: 4 }, (_, i) => act(i + 6, 'a2', 'A', 'POINT', 'A')),
    ];
    const before = computeMatchAwards(original, undefined, {
      matchType: 'DOUBLES',
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    expect(before.mvp?.playerId).toBe('a1');

    const edited = original.map((ev, idx) => (idx < 2 ? { ...ev, playerId: 'a2' } : ev));
    const after = computeMatchAwards(edited, undefined, {
      matchType: 'DOUBLES',
      winnerSide: 'A',
      participants: DOUBLES_PARTICIPANTS,
    });
    expect(after.mvp?.playerId).toBe('a2');
  });

  it('property test: walkover returns no MVP and out-of-order events produce identical MVP once sequenced', () => {
    const wo = computeMatchAwards(
      [act(1, 'a1', 'A', 'POINT', 'A'), { id: 'wo', sequenceNumber: 2, eventType: 'WALKOVER' }],
      undefined,
      { matchType: 'SINGLES', status: 'WALKOVER', winnerSide: 'A' }
    );
    expect(wo.mvp).toBeNull();
    expect(wo.isQualified).toBe(false);

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<'a1' | 'a2' | 'b1' | 'b2'>('a1', 'a2', 'b1', 'b2'), {
          minLength: 8,
          maxLength: 30,
        }),
        (actors) => {
          const ordered = actors.map((p, idx) =>
            act(idx + 1, p, p.startsWith('a') ? 'A' : 'B', 'POINT', 'A')
          );
          const shuffled = [...ordered].reverse();
          const r1 = computeMatchAwards(ordered, undefined, {
            matchType: 'DOUBLES',
            winnerSide: 'A',
            participants: DOUBLES_PARTICIPANTS,
          });
          const r2 = computeMatchAwards(shuffled, undefined, {
            matchType: 'DOUBLES',
            winnerSide: 'A',
            participants: DOUBLES_PARTICIPANTS,
          });
          expect(r1.mvp?.playerId).toBe(r2.mvp?.playerId);
          expect(r1.mvp?.mvpScore).toBe(r2.mvp?.mvpScore);
        }
      )
    );
  });
});
