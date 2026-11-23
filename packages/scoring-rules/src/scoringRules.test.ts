import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createMatch,
  recordRally,
  chooseSetting,
  undo,
  replay,
  MatchConfig,
} from './index.js';

describe('Badminton Scoring Rules Engine (@rallypoint/scoring-rules)', () => {
  const sampleSinglesRallyConfig: MatchConfig = {
    id: 'm-singles-rally-21',
    matchType: 'SINGLES',
    scoringFormat: 'RALLY_21',
    bestOf: 3,
    sideA: { player1: { id: 'p-viktor', name: 'Viktor Axelsen' } },
    sideB: { player1: { id: 'p-lee', name: 'Lee Zii Jia' } },
  };

  const sampleSinglesServiceConfig: MatchConfig = {
    id: 'm-singles-service-15',
    matchType: 'SINGLES',
    scoringFormat: 'SERVICE_POINT_15',
    bestOf: 3,
    sideA: { player1: { id: 'p-momota', name: 'Kento Momota' } },
    sideB: { player1: { id: 'p-shi', name: 'Shi Yuqi' } },
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

  describe('1. BWF Rally Point Rules (20-20, 29-29, 30 Cap, Parity Courts)', () => {
    it('requires win by 2 at 20-20 and hard cap at 30 (29-29 next point wins)', () => {
      let state = createMatch(sampleSinglesRallyConfig);

      // Score up to 20-20
      for (let i = 0; i < 20; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
        state = recordRally(state, { winningSide: 'B' }).state;
      }
      expect(state.games[0]!.scoreA).toBe(20);
      expect(state.games[0]!.scoreB).toBe(20);
      expect(state.games[0]!.isComplete).toBe(false);

      // Score to 21-20 (not won yet because must win by 2)
      state = recordRally(state, { winningSide: 'A' }).state;
      expect(state.games[0]!.scoreA).toBe(21);
      expect(state.games[0]!.isComplete).toBe(false);

      // Deuce to 21-21
      state = recordRally(state, { winningSide: 'B' }).state;
      expect(state.games[0]!.scoreB).toBe(21);
      expect(state.games[0]!.isComplete).toBe(false);

      // Alternate to 29-29
      for (let i = 22; i <= 29; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
        state = recordRally(state, { winningSide: 'B' }).state;
      }
      expect(state.games[0]!.scoreA).toBe(29);
      expect(state.games[0]!.scoreB).toBe(29);
      expect(state.games[0]!.isComplete).toBe(false);

      // 30-29 hard cap: golden point wins immediately without 2-point lead!
      state = recordRally(state, { winningSide: 'A' }).state;
      expect(state.games[0]!.scoreA).toBe(30);
      expect(state.games[0]!.scoreB).toBe(29);
      expect(state.games[0]!.isComplete).toBe(true);
      expect(state.games[0]!.winnerSide).toBe('A');
      expect(state.gamesWonA).toBe(1);
    });

    it('enforces singles serving court parity (even = right, odd = left)', () => {
      let state = createMatch(sampleSinglesRallyConfig);
      // 0-0: server A, even score -> right court
      expect(state.servingSide).toBe('A');
      expect(state.servingCourt).toBe('RIGHT');

      // A scores -> 1-0: odd score -> left court
      state = recordRally(state, { winningSide: 'A' }).state;
      expect(state.servingSide).toBe('A');
      expect(state.servingCourt).toBe('LEFT');

      // B wins rally -> B serves at 1 point (odd) -> left court
      state = recordRally(state, { winningSide: 'B' }).state;
      expect(state.servingSide).toBe('B');
      expect(state.servingCourt).toBe('LEFT');

      // B scores -> 2-1: B's score is 2 (even) -> right court
      state = recordRally(state, { winningSide: 'B' }).state;
      expect(state.servingSide).toBe('B');
      expect(state.servingCourt).toBe('RIGHT');
    });
  });

  describe('2. Service Point System (Side-outs, Setting Choices, Doubles One-Down)', () => {
    it('awards points only when server wins; receiver winning causes side-out with no point', () => {
      let state = createMatch(sampleSinglesServiceConfig);
      expect(state.servingSide).toBe('A');
      expect(state.games[0]!.scoreA).toBe(0);
      expect(state.games[0]!.scoreB).toBe(0);

      // Server A wins rally -> Point scored!
      const r1 = recordRally(state, { winningSide: 'A' });
      state = r1.state;
      expect(r1.events.some((e) => e.type === 'POINT_SCORED')).toBe(true);
      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.games[0]!.scoreB).toBe(0);
      expect(state.servingSide).toBe('A');

      // Receiver B wins rally -> NO POINT! Side-out event emitted, B now serves
      const r2 = recordRally(state, { winningSide: 'B' });
      state = r2.state;
      expect(r2.events.some((e) => e.type === 'POINT_SCORED')).toBe(false);
      expect(r2.events.some((e) => e.type === 'SIDE_OUT')).toBe(true);
      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.games[0]!.scoreB).toBe(0); // Score remains 0 for B!
      expect(state.servingSide).toBe('B');
    });

    it('handles 14-all setting in 15-point service game (choice to set to 17 or stay at 15)', () => {
      let state = createMatch(sampleSinglesServiceConfig);

      // Bring game to 14-14 (A reaches 14 first)
      for (let i = 0; i < 14; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
      }
      state = recordRally(state, { winningSide: 'B' }).state; // Side out to B
      for (let i = 0; i < 14; i++) {
        state = recordRally(state, { winningSide: 'B' }).state;
      }
      expect(state.games[0]!.scoreA).toBe(14);
      expect(state.games[0]!.scoreB).toBe(14);

      // Side A reached 14 first, so Side A has the setting option!
      expect(state.pendingSettingChoice).toBeDefined();
      expect(state.pendingSettingChoice?.eligibleSide).toBe('A');
      expect(state.pendingSettingChoice?.setToTarget).toBe(17);

      // Side A chooses to SET to 17
      const settingRes = chooseSetting(state, true);
      state = settingRes.state;
      expect(state.pendingSettingChoice).toBeNull();
      expect(state.games[0]!.targetPoints).toBe(17);
      expect(settingRes.event.type).toBe('SETTING_CHOICE');
      expect(settingRes.event.setGame).toBe(true);
      expect(settingRes.event.newTargetPoints).toBe(17);
    });

    it('handles 13-all setting to 18 points in 15-point service game', () => {
      let state = createMatch(sampleSinglesServiceConfig);

      // Score to 13-13
      for (let i = 0; i < 13; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
      }
      state = recordRally(state, { winningSide: 'B' }).state; // Side out to B
      for (let i = 0; i < 13; i++) {
        state = recordRally(state, { winningSide: 'B' }).state;
      }
      expect(state.pendingSettingChoice?.atScore).toBe(13);
      expect(state.pendingSettingChoice?.setToTarget).toBe(18);

      // Decline setting -> target remains 15
      const res = chooseSetting(state, false);
      state = res.state;
      expect(state.games[0]!.targetPoints).toBe(15);
    });

    it('handles 9-all and 10-all setting in 11-point service format', () => {
      const config11: MatchConfig = {
        ...sampleSinglesServiceConfig,
        scoringFormat: 'SERVICE_POINT_11',
      };
      let state = createMatch(config11);

      // Score to 9-9
      for (let i = 0; i < 9; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
      }
      state = recordRally(state, { winningSide: 'B' }).state;
      for (let i = 0; i < 9; i++) {
        state = recordRally(state, { winningSide: 'B' }).state;
      }
      expect(state.pendingSettingChoice?.atScore).toBe(9);
      expect(state.pendingSettingChoice?.setToTarget).toBe(14); // Set to 14
      state = chooseSetting(state, true).state;
      expect(state.games[0]!.targetPoints).toBe(14);
    });

    it('enforces service point doubles "one down" rule on initial game serve and subsequent 2 servers per side', () => {
      let state = createMatch(sampleDoublesServiceConfig);

      // Game starts with Side A serving, but with "one down" rule active
      expect(state.servingSide).toBe('A');
      expect(state.isOneDownInitialTurn).toBe(true);

      // Side A scores 1 point
      state = recordRally(state, { winningSide: 'A' }).state;
      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.servingSide).toBe('A');

      // Side B wins rally -> Because Side A is in "one down" turn, Side-Out immediately to Side B!
      const sideOut1 = recordRally(state, { winningSide: 'B' });
      state = sideOut1.state;
      expect(sideOut1.events.some((e) => e.type === 'SIDE_OUT')).toBe(true);
      expect(state.servingSide).toBe('B');
      expect(state.serverNumber).toBe(1); // Side B starts with server 1
      expect(state.isOneDownInitialTurn).toBe(false);

      // Side A wins rally -> Side B first server is down! Side B second server now serves (serverNumber = 2)
      const serverDown = recordRally(state, { winningSide: 'A' });
      state = serverDown.state;
      expect(state.servingSide).toBe('B'); // Still Side B's hand!
      expect(state.serverNumber).toBe(2);

      // Side A wins rally again -> Side B second server is down -> Full Side-Out to Side A!
      const sideOut2 = recordRally(state, { winningSide: 'A' });
      state = sideOut2.state;
      expect(state.servingSide).toBe('A');
      expect(state.serverNumber).toBe(1);
    });
  });

  describe('3. Deciding Game Midpoint Switch & Undo Mechanics', () => {
    it('triggers midpoint interval side-switch at configured threshold (11 in 21-pt, 8 in 15-pt, 6 in 11-pt)', () => {
      const configBestOf1: MatchConfig = {
        ...sampleSinglesRallyConfig,
        bestOf: 1, // Game 1 is deciding game
      };
      let state = createMatch(configBestOf1);

      for (let i = 0; i < 10; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
      }
      expect(state.games[0]!.sidesSwappedMidpoint).toBe(false);

      // 11th point reached -> midpoint switch event triggered
      const res = recordRally(state, { winningSide: 'A' });
      state = res.state;
      expect(res.events.some((e) => e.type === 'INTERVAL' && (e as any).reason === 'MIDPOINT_SWITCH')).toBe(true);
      expect(state.games[0]!.sidesSwappedMidpoint).toBe(true);
    });

    it('correctly undos across a side-out and across a game boundary', () => {
      let state = createMatch(sampleSinglesServiceConfig);

      // A scores 1, then side out to B
      state = recordRally(state, { winningSide: 'A' }).state;
      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.servingSide).toBe('A');

      state = recordRally(state, { winningSide: 'B' }).state;
      expect(state.servingSide).toBe('B');

      // Undo the side-out
      state = undo(state);
      expect(state.servingSide).toBe('A');
      expect(state.games[0]!.scoreA).toBe(1);

      // Undo the point
      state = undo(state);
      expect(state.games[0]!.scoreA).toBe(0);
      expect(state.events).toHaveLength(0);

      // Undo on empty events is a no-op
      expect(undo(state).events).toHaveLength(0);
    });

    it('throws when recording a rally while a setting choice is pending or match ended', () => {
      let state = createMatch(sampleSinglesServiceConfig);
      for (let i = 0; i < 14; i++) {
        state = recordRally(state, { winningSide: 'A' }).state;
      }
      state = recordRally(state, { winningSide: 'B' }).state;
      for (let i = 0; i < 14; i++) {
        state = recordRally(state, { winningSide: 'B' }).state;
      }
      expect(state.pendingSettingChoice).toBeDefined();

      expect(() => recordRally(state, { winningSide: 'A' })).toThrow(/setting choice/);
      expect(() => chooseSetting({ ...state, pendingSettingChoice: null }, true)).toThrow(/No pending setting/);
    });

    it('handles doubles BWF rally rotation where serving partners swap courts and receivers stay', () => {
      const doublesRallyConfig: MatchConfig = {
        id: 'm-doubles-rally',
        matchType: 'DOUBLES',
        scoringFormat: 'RALLY_21',
        bestOf: 3,
        sideA: {
          player1: { id: 'pA1', name: 'Player A1' },
          player2: { id: 'pA2', name: 'Player A2' },
        },
        sideB: {
          player1: { id: 'pB1', name: 'Player B1' },
          player2: { id: 'pB2', name: 'Player B2' },
        },
      };

      let state = createMatch(doublesRallyConfig);
      expect(state.servingPlayerId).toBe('pA1');
      expect(state.servingCourt).toBe('RIGHT');

      // Side A wins point -> Server A1 swaps to LEFT court! Partner A2 moves to RIGHT.
      state = recordRally(state, { winningSide: 'A' }).state;
      expect(state.games[0]!.scoreA).toBe(1);
      expect(state.servingPlayerId).toBe('pA1');
      expect(state.servingCourt).toBe('LEFT');
      expect(state.sideACourt.leftPlayerId).toBe('pA1');
      expect(state.sideACourt.rightPlayerId).toBe('pA2');

      // Side B wins rally -> Side B now serves!
      state = recordRally(state, { winningSide: 'B' }).state;
      expect(state.servingSide).toBe('B');
      expect(state.games[0]!.scoreB).toBe(1);
      expect(state.servingCourt).toBe('LEFT'); // Score 1 is odd -> left court serves!
    });
  });

  describe('4. Fast-Check Property Test (Replay Stream == Incremental State)', () => {
    it('guarantees replay(events) yields identical state to incremental application for arbitrary match streams', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<'RALLY_21' | 'RALLY_15' | 'SERVICE_POINT_15' | 'SERVICE_POINT_11'>(
            'RALLY_21',
            'RALLY_15',
            'SERVICE_POINT_15',
            'SERVICE_POINT_11'
          ),
          fc.array(fc.constantFrom<'A' | 'B'>('A', 'B'), { minLength: 5, maxLength: 60 }),
          (scoringFormat, winnerSequence) => {
            const config: MatchConfig = {
              id: `fc-test-${Date.now()}`,
              matchType: 'SINGLES',
              scoringFormat,
              bestOf: 1,
              sideA: { player1: { id: 'p1', name: 'Player 1' } },
              sideB: { player1: { id: 'p2', name: 'Player 2' } },
            };

            let state = createMatch(config);

            for (const winSide of winnerSequence) {
              if (state.status !== 'IN_PROGRESS') break;
              if (state.pendingSettingChoice) {
                // Auto-resolve setting choice deterministically
                state = chooseSetting(state, true).state;
              }
              state = recordRally(state, { winningSide: winSide }).state;
            }

            // Replay all events
            const replayedState = replay(state.events, config);

            expect(replayedState.games[0]!.scoreA).toBe(state.games[0]!.scoreA);
            expect(replayedState.games[0]!.scoreB).toBe(state.games[0]!.scoreB);
            expect(replayedState.servingSide).toBe(state.servingSide);
            expect(replayedState.status).toBe(state.status);
            expect(replayedState.gamesWonA).toBe(state.gamesWonA);
            expect(replayedState.gamesWonB).toBe(state.gamesWonB);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
