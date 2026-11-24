import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeStreaks } from './streaks.js';
import type { PlayerActionEvent } from './types.js';

function makeAction(
  seq: number,
  playerId: string,
  side: 'A' | 'B',
  action: 'POINT' | 'DROP',
  resultingWinnerSide?: 'A' | 'B',
  isPoint = true,
  isSideOut = false
): PlayerActionEvent {
  return {
    type: 'PLAYER_ACTION',
    id: `ev-${seq}`,
    clientUuid: `uuid-${seq}`,
    sequenceNumber: seq,
    timestamp: 1000 + seq * 10,
    matchId: 'm-test',
    gameNumber: 1,
    playerId,
    side,
    action,
    resultingWinnerSide: resultingWinnerSide || (action === 'POINT' ? side : side === 'A' ? 'B' : 'A'),
    serverAtRally: 'p1',
    servingSideAtRally: 'A',
    isPoint,
    isSideOut,
    scoringFormat: 'RALLY_21',
    occurredAt: new Date(1000 + seq * 10).toISOString(),
  };
}

describe('Streaks Engine (Feature 1)', () => {
  it('triggers POINT streak alerts at thresholds 3, 5, 7, and 10', () => {
    const events: PlayerActionEvent[] = [];
    for (let i = 1; i <= 10; i++) {
      events.push(makeAction(i, 'p-anu', 'A', 'POINT'));
    }

    const res = computeStreaks(events, {}, {
      getPlayerName: () => 'Anu',
      getTeamName: () => 'Team A',
    });

    const playerAlerts = res.milestoneHistory.filter((m) => m.type === 'PLAYER_POINT');
    expect(playerAlerts).toHaveLength(4);
    expect(playerAlerts[0]!.count).toBe(3);
    expect(playerAlerts[0]!.message).toContain('Anu is on fire: 3 points in a row!');
    expect(playerAlerts[1]!.count).toBe(5);
    expect(playerAlerts[1]!.message).toContain('Anu has won 5 points in a row!');
    expect(playerAlerts[2]!.count).toBe(7);
    expect(playerAlerts[2]!.message).toContain('Anu is unstoppable: 7 points in a row!');
    expect(playerAlerts[3]!.count).toBe(10);
    expect(playerAlerts[3]!.message).toContain('Anu is in the zone: 10 points in a row!');

    expect(res.playerStreaks['p-anu']!.currentPointStreak).toBe(10);
    expect(res.playerStreaks['p-anu']!.bestPointStreak).toBe(10);
  });

  it('triggers DROP streak alerts at 3 and 5 only, with gentle and kind wording', () => {
    const events: PlayerActionEvent[] = [];
    for (let i = 1; i <= 6; i++) {
      events.push(makeAction(i, 'p-rahul', 'A', 'DROP'));
    }

    const res = computeStreaks(events, {}, {
      getPlayerName: () => 'Rahul',
    });

    const dropAlerts = res.milestoneHistory.filter((m) => m.type === 'PLAYER_DROP');
    expect(dropAlerts).toHaveLength(2);
    expect(dropAlerts[0]!.count).toBe(3);
    expect(dropAlerts[0]!.message).toContain('Rahul: 3 drops in a row, take a breath');
    expect(dropAlerts[1]!.count).toBe(5);
    expect(dropAlerts[1]!.message).toContain('Shake it off, Rahul, next point is yours');
  });

  it('does not fire drop streak alerts when drop alerts are disabled in config', () => {
    const events: PlayerActionEvent[] = [];
    for (let i = 1; i <= 5; i++) {
      events.push(makeAction(i, 'p-rahul', 'A', 'DROP'));
    }

    const res = computeStreaks(events, { dropStreaksEnabled: false });
    const dropAlerts = res.milestoneHistory.filter((m) => m.type === 'PLAYER_DROP');
    expect(dropAlerts).toHaveLength(0);
  });

  it('triggers team runs at 5, 8, and 10 without breaking on opponent side-outs in Service Point', () => {
    const events: PlayerActionEvent[] = [];
    // Side A scores 4 points
    for (let i = 1; i <= 4; i++) {
      events.push(makeAction(i, 'p-a', 'A', 'POINT', 'A', true, false));
    }
    // Receiver Side B causes a side-out in Service Point (no score, serve rotates)
    events.push(makeAction(5, 'p-b', 'B', 'POINT', 'B', false, true));

    // Side A gets serve back and scores 1 more point (total 5-0 run)
    events.push(makeAction(6, 'p-a', 'A', 'POINT', 'A', true, false));

    const res = computeStreaks(events, {}, {
      getTeamName: (s) => (s === 'A' ? 'Team Alpha' : 'Team Beta'),
    });

    const teamRunAlerts = res.milestoneHistory.filter((m) => m.type === 'TEAM_RUN');
    expect(teamRunAlerts).toHaveLength(1);
    expect(teamRunAlerts[0]!.count).toBe(5);
    expect(teamRunAlerts[0]!.message).toContain('Team Alpha is on a 5-0 run!');
    expect(res.teamRuns.A).toBe(5);
  });

  it('strict mode vs non-strict mode: other player points break streak only in strict mode', () => {
    // Player 1 wins 2 points, Player 2 wins 1 point, Player 1 wins 1 point
    const eventsNonStrict: PlayerActionEvent[] = [
      makeAction(1, 'p1', 'A', 'POINT'),
      makeAction(2, 'p1', 'A', 'POINT'),
      makeAction(3, 'p2', 'B', 'POINT'),
      makeAction(4, 'p1', 'A', 'POINT'),
    ];

    const nonStrictRes = computeStreaks(eventsNonStrict, { strictMode: false });
    // In non-strict mode, p1's streak counts only p1's actions, so p1 has 3 consecutive points!
    expect(nonStrictRes.playerStreaks['p1']!.currentPointStreak).toBe(3);

    const strictRes = computeStreaks(eventsNonStrict, { strictMode: true });
    // In strict mode, p2's point breaks p1's streak, so p1 has only 1 point streak at end
    expect(strictRes.playerStreaks['p1']!.currentPointStreak).toBe(1);
  });

  it('streak snapped alert fires when enabled and streak >= 3 is broken by drop', () => {
    const events: PlayerActionEvent[] = [
      makeAction(1, 'p-anu', 'A', 'POINT'),
      makeAction(2, 'p-anu', 'A', 'POINT'),
      makeAction(3, 'p-anu', 'A', 'POINT'),
      makeAction(4, 'p-anu', 'A', 'POINT'),
      makeAction(5, 'p-anu', 'A', 'DROP'),
    ];

    const res = computeStreaks(events, { streakSnappedEnabled: true }, {
      getPlayerName: () => 'Anu',
    });

    const snapped = res.milestoneHistory.find((m) => m.type === 'STREAK_SNAPPED');
    expect(snapped).toBeDefined();
    expect(snapped!.snappedCount).toBe(4);
    expect(snapped!.message).toContain("Anu's 4-point streak ended");
  });

  it('idempotent replay and UNDO rollback', () => {
    const events: PlayerActionEvent[] = [
      makeAction(1, 'p1', 'A', 'POINT'),
      makeAction(2, 'p1', 'A', 'POINT'),
      makeAction(3, 'p1', 'A', 'POINT'), // threshold 3
    ];

    const resBefore = computeStreaks(events);
    expect(resBefore.currentMilestone).toBeDefined();
    expect(resBefore.currentMilestone!.count).toBe(3);

    // UNDO: remove the last action
    const undoneEvents = events.slice(0, 2);
    const resAfterUndo = computeStreaks(undoneEvents);
    expect(resAfterUndo.playerStreaks['p1']!.currentPointStreak).toBe(2);
    expect(resAfterUndo.currentMilestone).toBeNull();
    expect(resAfterUndo.milestoneHistory).toHaveLength(0);
  });

  it('property-based test: replay determinism with arbitrary action sequences', () => {
    const actionArbitrary = fc.record({
      seq: fc.integer({ min: 1, max: 100 }),
      playerId: fc.constantFrom('p1', 'p2', 'p3', 'p4'),
      side: fc.constantFrom<'A' | 'B'>('A', 'B'),
      action: fc.constantFrom<'POINT' | 'DROP'>('POINT', 'DROP'),
    });

    fc.assert(
      fc.property(fc.array(actionArbitrary, { minLength: 1, maxLength: 30 }), (rawActions) => {
        const events = rawActions.map((a, i) => makeAction(i + 1, a.playerId, a.side, a.action));
        const res1 = computeStreaks(events);
        const res2 = computeStreaks(events);

        expect(res1.playerStreaks).toEqual(res2.playerStreaks);
        expect(res1.teamRuns).toEqual(res2.teamRuns);
        expect(res1.milestoneHistory.length).toBe(res2.milestoneHistory.length);
      })
    );
  });
});
