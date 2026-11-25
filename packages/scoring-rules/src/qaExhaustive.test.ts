import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  createMatch,
  recordRally,
  recordPlayerAction,
  recordUnattributedPoint,
  chooseSetting,
  undo,
  undoLastAction,
  editAction,
  replay,
  computeStreaks,
  type MatchConfig,
  type ScoringEvent,
} from './index.js';

function makeDoublesConfig(
  scoringFormat: MatchConfig['scoringFormat'],
  customFormatConfig?: MatchConfig['customFormatConfig']
): MatchConfig {
  return {
    id: `m-${scoringFormat}`,
    matchType: 'DOUBLES',
    scoringFormat,
    customFormatConfig,
    bestOf: 3,
    sideA: {
      player1: { id: 'a1', name: 'Anu' },
      player2: { id: 'a2', name: 'Vikram' },
    },
    sideB: {
      player1: { id: 'b1', name: 'Rahul' },
      player2: { id: 'b2', name: 'Deepa' },
    },
    firstServerSide: 'A',
    firstServerPlayerId: 'a1',
  };
}

function makeSinglesConfig(scoringFormat: MatchConfig['scoringFormat']): MatchConfig {
  return {
    id: `ms-${scoringFormat}`,
    matchType: 'SINGLES',
    scoringFormat,
    bestOf: 3,
    sideA: { player1: { id: 'a1', name: 'Anu' } },
    sideB: { player1: { id: 'b1', name: 'Rahul' } },
    firstServerSide: 'A',
    firstServerPlayerId: 'a1',
  };
}

describe('QA Phase 2: Exhaustive Scoring Rules & Boundary Matrix', () => {
  it('Rally Point 21: enforces win-by-2 at 20-20 and hard cap at 29-29 (30-29 wins)', () => {
    let state = createMatch(makeSinglesConfig('RALLY_21'));

    for (let i = 0; i < 29; i++) {
      state = recordRally(state, { winningSide: 'A' }).state;
      state = recordRally(state, { winningSide: 'B' }).state;
    }

    const g1 = state.games[0]!;
    expect(g1.scoreA).toBe(29);
    expect(g1.scoreB).toBe(29);
    expect(g1.isComplete).toBe(false);

    state = recordRally(state, { winningSide: 'A' }).state;
    expect(state.games[0]!.scoreA).toBe(30);
    expect(state.games[0]!.isComplete).toBe(true);
    expect(state.games[0]!.winnerSide).toBe('A');
    expect(state.currentGameNumber).toBe(2);
  });

  it('Rally Point 15 & 11: handles deuce, cap, and deciding-game midpoint side swap', () => {
    let s15 = createMatch(makeSinglesConfig('RALLY_15'));
    for (let i = 0; i < 14; i++) {
      s15 = recordRally(s15, { winningSide: 'A' }).state;
      s15 = recordRally(s15, { winningSide: 'B' }).state;
    }
    expect(s15.games[0]!.isComplete).toBe(false);
    s15 = recordRally(s15, { winningSide: 'A' }).state;
    expect(s15.games[0]!.isComplete).toBe(false);
    s15 = recordRally(s15, { winningSide: 'A' }).state;
    expect(s15.games[0]!.winnerSide).toBe('A');

    let s11 = createMatch(makeSinglesConfig('RALLY_11'));
    for (let i = 0; i < 11; i++) s11 = recordRally(s11, { winningSide: 'A' }).state;
    for (let i = 0; i < 11; i++) s11 = recordRally(s11, { winningSide: 'B' }).state;
    expect(s11.currentGameNumber).toBe(3);
    expect(s11.sidesSwappedInDecidingGame).toBe(false);

    for (let i = 0; i < 6; i++) s11 = recordRally(s11, { winningSide: 'A' }).state;
    expect(s11.sidesSwappedInDecidingGame).toBe(true);
  });

  it('Service Point 15: handles 1-down initial turn, side-outs, 13-all & 14-all setting choices', () => {
    let state = createMatch(makeDoublesConfig('SERVICE_POINT_15'));
    expect(state.isOneDownInitialTurn).toBe(true);
    expect(state.serverNumber).toBe(2);

    state = recordRally(state, { winningSide: 'B' }).state;
    expect(state.servingSide).toBe('B');
    expect(state.serverNumber).toBe(1);
    expect(state.games[0]!.scoreA).toBe(0);
    expect(state.games[0]!.scoreB).toBe(0);

    state = recordRally(state, { winningSide: 'A' }).state;
    expect(state.servingSide).toBe('B');
    expect(state.serverNumber).toBe(2);
    state = recordRally(state, { winningSide: 'A' }).state;
    expect(state.servingSide).toBe('A');
    expect(state.serverNumber).toBe(1);

    for (let i = 0; i < 13; i++) {
      state = recordRally(state, { winningSide: 'A' }).state;
    }
    state = recordRally(state, { winningSide: 'B' }).state;
    state = recordRally(state, { winningSide: 'B' }).state;
    for (let i = 0; i < 13; i++) {
      state = recordRally(state, { winningSide: 'B' }).state;
    }
    expect(state.games[0]!.scoreA).toBe(13);
    expect(state.games[0]!.scoreB).toBe(13);
    expect(state.pendingSettingChoice).not.toBeNull();
    expect(state.pendingSettingChoice!.eligibleSide).toBe('A');

    const noSet = chooseSetting(state, false).state;
    expect(noSet.games[0]!.targetPoints).toBe(15);

    const setTo18 = chooseSetting(state, true).state;
    expect(setTo18.games[0]!.targetPoints).toBe(18);
  });

  it('Service Point 11: handles 9-all and 10-all setting choices', () => {
    let state = createMatch(makeSinglesConfig('SERVICE_POINT_11'));
    for (let i = 0; i < 9; i++) state = recordRally(state, { winningSide: 'A' }).state;
    state = recordRally(state, { winningSide: 'B' }).state;
    for (let i = 0; i < 9; i++) state = recordRally(state, { winningSide: 'B' }).state;

    expect(state.pendingSettingChoice?.atScore).toBe(9);
    state = chooseSetting(state, false).state;
    expect(state.games[0]!.targetPoints).toBe(11);

    state = recordRally(state, { winningSide: 'B' }).state;
    state = recordRally(state, { winningSide: 'A' }).state;
    state = recordRally(state, { winningSide: 'A' }).state;
    expect(state.pendingSettingChoice?.atScore).toBe(10);
    state = chooseSetting(state, true).state;
    expect(state.games[0]!.targetPoints).toBe(13);
  });

  it('CUSTOM scoring format applies custom targetPoints, winBy, and cap', () => {
    let state = createMatch({
      ...makeSinglesConfig('CUSTOM'),
      customFormatConfig: { targetPoints: 7, winBy: 1, cap: 7 },
    });
    for (let i = 0; i < 7; i++) {
      state = recordRally(state, { winningSide: 'A' }).state;
    }
    expect(state.games[0]!.isComplete).toBe(true);
    expect(state.games[0]!.scoreA).toBe(7);
  });

  it('UNDO works across match end and editAction recomputes stats', () => {
    let state = createMatch({
      ...makeSinglesConfig('RALLY_11'),
      bestOf: 1,
    });
    for (let i = 0; i < 11; i++) {
      state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state;
    }
    expect(state.status).toBe('COMPLETED');
    expect(state.winnerSide).toBe('A');

    const { state: afterUndo, undoneEvent } = undoLastAction(state);
    expect(afterUndo.status).toBe('IN_PROGRESS');
    expect(afterUndo.games[0]!.scoreA).toBe(10);
    expect(undoneEvent?.type).toBe('PLAYER_ACTION');

    const withUnassigned = recordUnattributedPoint(afterUndo, 'B').state;
    expect(withUnassigned.unassignedPoints.sideB).toBe(1);

    const lastAct = afterUndo.actionHistory[afterUndo.actionHistory.length - 1]!;
    const editedRes = editAction(afterUndo, lastAct.id, { action: 'DROP' });
    expect(editedRes.success).toBe(true);
    expect(editedRes.state.games[0]!.scoreA).toBe(9);
    expect(editedRes.state.games[0]!.scoreB).toBe(1);
    expect(editedRes.state.playerStats['a1']!.drops).toBe(1);

    const fresh = createMatch(makeSinglesConfig('RALLY_21'));
    expect(undo(fresh).events.length).toBe(0);
  });

  it('property-based: replay(events) === incremental state for random action + undo sequences', () => {
    const cfg = makeDoublesConfig('RALLY_21');
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              op: fc.constant('ACT' as const),
              player: fc.constantFrom('a1', 'a2', 'b1', 'b2'),
              action: fc.constantFrom('POINT' as const, 'DROP' as const),
            }),
            fc.record({ op: fc.constant('UNDO' as const) })
          ),
          { minLength: 1, maxLength: 35 }
        ),
        (steps) => {
          let state = createMatch(cfg);
          for (const step of steps) {
            if (state.status === 'COMPLETED') break;
            if (step.op === 'ACT') {
              state = recordPlayerAction(state, {
                playerId: step.player,
                action: step.action,
              }).state;
            } else {
              state = undoLastAction(state).state;
            }
          }
          const replayed = replay(state.events, cfg);
          expect(replayed.games.map((g) => [g.scoreA, g.scoreB])).toEqual(
            state.games.map((g) => [g.scoreA, g.scoreB])
          );
          expect(replayed.status).toBe(state.status);
          expect(replayed.servingSide).toBe(state.servingSide);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('streaks.ts handles legacy POINT_SCORED, RALLY_WON (point & side-out), and UNDO events', () => {
    const events: ScoringEvent[] = [
      { id: 'u1', sequenceNumber: 0, timestamp: 100, type: 'UNDO' } as unknown as ScoringEvent,
      {
        id: 'r0',
        sequenceNumber: 1,
        timestamp: 200,
        type: 'RALLY_WON',
        winningSide: 'A',
        servingSideAtRally: 'B',
        serverPlayerId: 'b1',
        isPoint: false,
        isSideOut: true,
      },
      ...Array.from({ length: 10 }, (_, idx) => ({
        id: `p-${idx}`,
        sequenceNumber: idx + 2,
        timestamp: 300 + idx * 10,
        type: 'POINT_SCORED' as const,
        side: 'A' as const,
        scoreA: idx + 1,
        scoreB: 0,
      })),
    ];

    const res = computeStreaks(events, { teamRunThresholds: [5, 8, 10] });
    expect(res.bestTeamRuns.A).toBe(10);
    expect(res.milestoneHistory.map((m) => m.count)).toEqual([5, 8, 10]);
  });
});
