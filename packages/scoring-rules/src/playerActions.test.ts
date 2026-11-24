import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createMatch,
  recordPlayerAction,
  recordUnattributedPoint,
  undoLastAction,
  editAction,
  replay,
  MatchConfig,
} from './index.js';

describe('Player Action Buttons (POINT / DROP) Feature Tests', () => {
  const sampleDoublesRallyConfig: MatchConfig = {
    id: 'm-doubles-rally-21',
    matchType: 'DOUBLES',
    scoringFormat: 'RALLY_21',
    bestOf: 3,
    sideA: {
      player1: { id: 'p-viktor', name: 'Viktor Axelsen' },
      player2: { id: 'p-antonsen', name: 'Anders Antonsen' },
    },
    sideB: {
      player1: { id: 'p-lee', name: 'Lee Zii Jia' },
      player2: { id: 'p-ginting', name: 'Anthony Ginting' },
    },
  };

  const sampleDoublesServiceConfig: MatchConfig = {
    id: 'm-doubles-service-15',
    matchType: 'DOUBLES',
    scoringFormat: 'SERVICE_POINT_15',
    bestOf: 3,
    sideA: {
      player1: { id: 'p-viktor', name: 'Viktor Axelsen' },
      player2: { id: 'p-antonsen', name: 'Anders Antonsen' },
    },
    sideB: {
      player1: { id: 'p-lee', name: 'Lee Zii Jia' },
      player2: { id: 'p-ginting', name: 'Anthony Ginting' },
    },
  };

  describe('Rally Point Scoring System', () => {
    it('POINT gives the player side +1, increments player pointsWon, and updates netContribution', () => {
      let state = createMatch(sampleDoublesRallyConfig);

      // Viktor Axelsen (Side A) scores POINT
      const res = recordPlayerAction(state, {
        playerId: 'p-viktor',
        action: 'POINT',
      });
      state = res.state;

      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.games[0]!.scoreB).toBe(0);
      expect(state.playerStats['p-viktor']!.pointsWon).toBe(1);
      expect(state.playerStats['p-viktor']!.drops).toBe(0);
      expect(state.playerStats['p-viktor']!.netContribution).toBe(1);
      expect(state.playerStats['p-viktor']!.pointShareWithinTeam).toBe(100);
      expect(res.actionEvent.isPoint).toBe(true);
      expect(res.actionEvent.isSideOut).toBe(false);
    });

    it('DROP by a player gives the opposing side +1 and increments player drops', () => {
      let state = createMatch(sampleDoublesRallyConfig);

      // Lee Zii Jia (Side B) commits a DROP (own unforced mistake)
      const res = recordPlayerAction(state, {
        playerId: 'p-lee',
        action: 'DROP',
      });
      state = res.state;

      // Side A gets the rally win and +1
      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.games[0]!.scoreB).toBe(0);
      expect(state.playerStats['p-lee']!.drops).toBe(1);
      expect(state.playerStats['p-lee']!.pointsWon).toBe(0);
      expect(state.playerStats['p-lee']!.netContribution).toBe(-1);
      expect(state.playerStats['p-lee']!.dropShareWithinTeam).toBe(100);
      expect(res.actionEvent.isPoint).toBe(true);
      expect(res.actionEvent.resultingWinnerSide).toBe('A');
    });

    it('computes point shares and drop shares across partners in doubles', () => {
      let state = createMatch(sampleDoublesRallyConfig);

      // Viktor scores 3 points, Antonsen scores 1 point
      state = recordPlayerAction(state, { playerId: 'p-viktor', action: 'POINT' }).state;
      state = recordPlayerAction(state, { playerId: 'p-viktor', action: 'POINT' }).state;
      state = recordPlayerAction(state, { playerId: 'p-antonsen', action: 'POINT' }).state;
      state = recordPlayerAction(state, { playerId: 'p-viktor', action: 'POINT' }).state;

      expect(state.games[0]!.scoreA).toBe(4);
      expect(state.playerStats['p-viktor']!.pointsWon).toBe(3);
      expect(state.playerStats['p-antonsen']!.pointsWon).toBe(1);
      expect(state.playerStats['p-viktor']!.pointShareWithinTeam).toBe(75);
      expect(state.playerStats['p-antonsen']!.pointShareWithinTeam).toBe(25);
    });
  });

  describe('Service Point Scoring System', () => {
    it('serving player POINT awards +1 and serve is held', () => {
      let state = createMatch(sampleDoublesServiceConfig);
      // Side A serves first. Viktor is serving.
      expect(state.servingSide).toBe('A');

      const res = recordPlayerAction(state, {
        playerId: 'p-viktor',
        action: 'POINT',
      });
      state = res.state;

      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.games[0]!.scoreB).toBe(0);
      expect(state.servingSide).toBe('A');
      expect(res.actionEvent.isPoint).toBe(true);
      expect(res.actionEvent.isSideOut).toBe(false);
      expect(state.playerStats['p-viktor']!.servicePointsWon).toBe(1);
    });

    it('receiving player POINT causes a SIDE-OUT (no score change, serve rotates)', () => {
      let state = createMatch(sampleDoublesServiceConfig);
      expect(state.servingSide).toBe('A');

      // Receiver Lee Zii Jia (Side B) wins rally with a POINT
      const res = recordPlayerAction(state, {
        playerId: 'p-lee',
        action: 'POINT',
      });
      state = res.state;

      // Score must NOT change on a side-out in service point
      expect(state.games[0]!.scoreA).toBe(0);
      expect(state.games[0]!.scoreB).toBe(0);
      expect(res.actionEvent.isPoint).toBe(false);
      expect(res.actionEvent.isSideOut).toBe(true);
      // Because first serving turn in doubles service point has "one down" rule,
      // a side-out switches serve to Side B!
      expect(state.servingSide).toBe('B');
      expect(state.playerStats['p-lee']!.sideOutsCaused).toBe(1);
      expect(state.playerStats['p-lee']!.pointsWon).toBe(1);
    });

    it('server DROP causes a SIDE-OUT; receiver DROP awards +1 to serving side', () => {
      let state = createMatch(sampleDoublesServiceConfig);
      expect(state.servingSide).toBe('A');

      // Server Viktor Axelsen (Side A) commits DROP
      const res1 = recordPlayerAction(state, {
        playerId: 'p-viktor',
        action: 'DROP',
      });
      state = res1.state;
      expect(res1.actionEvent.isPoint).toBe(false);
      expect(res1.actionEvent.isSideOut).toBe(true);
      expect(state.games[0]!.scoreA).toBe(0);
      expect(state.games[0]!.scoreB).toBe(0);
      expect(state.servingSide).toBe('B');

      // Now Side B is serving. Receiver Antonsen (Side A) commits DROP
      const res2 = recordPlayerAction(state, {
        playerId: 'p-antonsen',
        action: 'DROP',
      });
      state = res2.state;
      expect(res2.actionEvent.isPoint).toBe(true);
      expect(res2.actionEvent.isSideOut).toBe(false);
      expect(state.games[0]!.scoreB).toBe(1);
      expect(state.games[0]!.scoreA).toBe(0);
    });
  });

  describe('Unattributed Points & Counters', () => {
    it('records unassigned points when big team score area is tapped', () => {
      let state = createMatch(sampleDoublesRallyConfig);

      state = recordUnattributedPoint(state, 'A').state;
      state = recordUnattributedPoint(state, 'A').state;
      state = recordUnattributedPoint(state, 'B').state;

      expect(state.games[0]!.scoreA).toBe(2);
      expect(state.games[0]!.scoreB).toBe(1);
      expect(state.unassignedPoints.sideA).toBe(2);
      expect(state.unassignedPoints.sideB).toBe(1);
    });
  });

  describe('Undo & Action Editing', () => {
    it('undoLastAction reverts both score and player stats across side-outs', () => {
      let state = createMatch(sampleDoublesRallyConfig);

      state = recordPlayerAction(state, { playerId: 'p-viktor', action: 'POINT' }).state;
      state = recordPlayerAction(state, { playerId: 'p-lee', action: 'DROP' }).state;
      expect(state.games[0]!.scoreA).toBe(2);
      expect(state.playerStats['p-lee']!.drops).toBe(1);

      // Undo last action (Lee's DROP)
      const undoRes = undoLastAction(state);
      state = undoRes.state;

      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.playerStats['p-lee']!.drops).toBe(0);
      expect(state.playerStats['p-lee']!.netContribution).toBe(0);
      expect(state.playerStats['p-viktor']!.pointsWon).toBe(1);
    });

    it('editAction correctly re-attributes an action to another player and recomputes stats', () => {
      let state = createMatch(sampleDoublesRallyConfig);

      const act1 = recordPlayerAction(state, { playerId: 'p-viktor', action: 'POINT' });
      state = act1.state;
      expect(state.playerStats['p-viktor']!.pointsWon).toBe(1);
      expect(state.playerStats['p-antonsen']!.pointsWon).toBe(0);

      // Re-attribute act1 from Viktor to Antonsen
      const editRes = editAction(state, act1.actionEvent.id, { playerId: 'p-antonsen' });
      expect(editRes.success).toBe(true);
      state = editRes.state;

      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.playerStats['p-viktor']!.pointsWon).toBe(0);
      expect(state.playerStats['p-antonsen']!.pointsWon).toBe(1);
      expect(state.playerStats['p-antonsen']!.netContribution).toBe(1);
    });
  });

  describe('Property-Based Testing (fast-check)', () => {
    it('proves replaying remaining actions always exactly matches incremental state', () => {
      const players = ['p-viktor', 'p-antonsen', 'p-lee', 'p-ginting'];
      const actions: ('POINT' | 'DROP')[] = ['POINT', 'DROP'];

      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              playerIdx: fc.integer({ min: 0, max: 3 }),
              actionIdx: fc.integer({ min: 0, max: 1 }),
            }),
            { minLength: 1, maxLength: 25 }
          ),
          (steps) => {
            let incremental = createMatch(sampleDoublesRallyConfig);
            for (const step of steps) {
              if (incremental.status !== 'IN_PROGRESS') break;
              const pId = players[step.playerIdx]!;
              const act = actions[step.actionIdx]!;
              incremental = recordPlayerAction(incremental, { playerId: pId, action: act }).state;
            }

            const replayed = replay(incremental.events, sampleDoublesRallyConfig);

            expect(replayed.games[0]!.scoreA).toBe(incremental.games[0]!.scoreA);
            expect(replayed.games[0]!.scoreB).toBe(incremental.games[0]!.scoreB);
            for (const p of players) {
              expect(replayed.playerStats[p]?.pointsWon).toBe(incremental.playerStats[p]?.pointsWon);
              expect(replayed.playerStats[p]?.drops).toBe(incremental.playerStats[p]?.drops);
              expect(replayed.playerStats[p]?.netContribution).toBe(
                incremental.playerStats[p]?.netContribution
              );
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
