import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  createMatch,
  recordPlayerAction,
  recordRally,
  replay,
  undoLastAction,
} from './scoringEngine.js';
import type { MatchConfig, ShutoutConfig } from './types.js';

function makeConfig(
  overrides: Partial<MatchConfig> & { shutout?: ShutoutConfig } = {}
): MatchConfig {
  return {
    id: 'shutout-test-1',
    matchType: 'SINGLES',
    scoringFormat: 'RALLY_21',
    bestOf: 3,
    sideA: { player1: { id: 'a1', name: 'Anu' } },
    sideB: { player1: { id: 'b1', name: 'Rahul' } },
    firstServerSide: 'A',
    ...overrides,
  };
}

describe('Shutout Rule (Phase 2A)', () => {
  it('ends game immediately at 7-0 in Rally Point Singles with GAME_END reason SHUTOUT', () => {
    let state = createMatch(
      makeConfig({
        shutout: { enabled: true, target: 7, effect: 'GAME', applyInDecider: true },
      })
    );

    for (let i = 0; i < 6; i++) {
      state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state;
      expect(state.games[0]!.isComplete).toBe(false);
    }

    const res = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' });
    state = res.state;
    const gameEnd = res.events.find((e) => e.type === 'GAME_END');
    expect(gameEnd).toBeDefined();
    if (gameEnd && gameEnd.type === 'GAME_END') {
      expect(gameEnd.reason).toBe('SHUTOUT');
      expect(gameEnd.scoreA).toBe(7);
      expect(gameEnd.scoreB).toBe(0);
    }
    expect(state.gamesWonA).toBe(1);
    expect(state.currentGameNumber).toBe(2);
    expect(state.servingSide).toBe('A'); // Game winner serves first in next game
  });

  it('works in Service Point Doubles (server-only scoring) and ignores 6-1 / 7-1', () => {
    let state = createMatch(
      makeConfig({
        matchType: 'DOUBLES',
        scoringFormat: 'SERVICE_POINT_15',
        sideA: { player1: { id: 'a1', name: 'Anu' }, player2: { id: 'a2', name: 'Vikram' } },
        sideB: { player1: { id: 'b1', name: 'Rahul' }, player2: { id: 'b2', name: 'Deepa' } },
        shutout: { enabled: true, target: 7, effect: 'GAME', applyInDecider: true },
      })
    );

    // Side A scores 6 points while serving -> 6-0
    for (let i = 0; i < 6; i++) {
      state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state;
    }
    expect(state.games[0]!.scoreA).toBe(6);
    expect(state.games[0]!.scoreB).toBe(0);

    // Side B wins a rally -> side-out (still 6-0), then Side B scores 1 -> 6-1
    state = recordPlayerAction(state, { playerId: 'b1', action: 'POINT' }).state;
    state = recordPlayerAction(state, { playerId: 'b1', action: 'POINT' }).state;
    expect(state.games[0]!.scoreA).toBe(6);
    expect(state.games[0]!.scoreB).toBe(1);

    // Side A wins rally (side-out) then scores 1 -> 7-1 (NOT a shutout!)
    state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state; // side-out 1
    state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state; // side-out 2
    state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state; // Side A scores -> 7-1
    expect(state.games[0]!.scoreA).toBe(7);
    expect(state.games[0]!.isComplete).toBe(false);
  });

  it('supports custom target (5-0, 10-0) and MATCH effect (SHUTOUT_MATCH)', () => {
    let s5 = createMatch(
      makeConfig({
        shutout: { enabled: true, target: 5, effect: 'MATCH', applyInDecider: true },
      })
    );
    for (let i = 0; i < 5; i++) {
      s5 = recordRally(s5, { winningSide: 'B' }).state;
    }
    expect(s5.status).toBe('COMPLETED');
    expect(s5.winnerSide).toBe('B');
    const matchEnd = s5.events.find((e) => e.type === 'MATCH_END');
    expect(matchEnd?.type).toBe('MATCH_END');
    if (matchEnd && matchEnd.type === 'MATCH_END') {
      expect(matchEnd.reason).toBe('SHUTOUT_MATCH');
    }

    let s10 = createMatch(
      makeConfig({
        shutout: { enabled: true, target: 10, effect: 'GAME', applyInDecider: true },
      })
    );
    for (let i = 0; i < 9; i++) {
      s10 = recordRally(s10, { winningSide: 'A' }).state;
    }
    expect(s10.games[0]!.isComplete).toBe(false);
    s10 = recordRally(s10, { winningSide: 'A' }).state;
    expect(s10.games[0]!.isComplete).toBe(true);
    expect(s10.games[0]!.winReason).toBe('SHUTOUT');
  });

  it('respects applyInDecider=false and skips midpoint switch on shutout win', () => {
    // Game 1 & 2 split, now in Game 3 (decider)
    let state = createMatch(
      makeConfig({
        shutout: { enabled: true, target: 7, effect: 'GAME', applyInDecider: false },
      })
    );
    for (let i = 0; i < 7; i++) state = recordRally(state, { winningSide: 'A' }).state; // G1: 7-0 A
    for (let i = 0; i < 7; i++) state = recordRally(state, { winningSide: 'B' }).state; // G2: 0-7 B
    expect(state.currentGameNumber).toBe(3);

    // In decider with applyInDecider=false, 7-0 does NOT end game
    for (let i = 0; i < 7; i++) state = recordRally(state, { winningSide: 'A' }).state;
    expect(state.games[2]!.isComplete).toBe(false);

    // With applyInDecider=true and target=11, reaching 11-0 ends by shutout without MIDPOINT_SWITCH
    let sDecider = createMatch(
      makeConfig({
        bestOf: 1,
        shutout: { enabled: true, target: 11, effect: 'GAME', applyInDecider: true },
      })
    );
    for (let i = 0; i < 11; i++) sDecider = recordRally(sDecider, { winningSide: 'A' }).state;
    expect(sDecider.games[0]!.isComplete).toBe(true);
    expect(sDecider.events.some((e) => e.type === 'INTERVAL')).toBe(false);
  });

  it('undoes across a shutout game end and restores 6-0 state', () => {
    let state = createMatch(
      makeConfig({
        shutout: { enabled: true, target: 7, effect: 'GAME', applyInDecider: true },
      })
    );
    for (let i = 0; i < 7; i++) {
      state = recordPlayerAction(state, { playerId: 'a1', action: 'POINT' }).state;
    }
    expect(state.currentGameNumber).toBe(2);
    expect(state.gamesWonA).toBe(1);

    const undone = undoLastAction(state).state;
    expect(undone.currentGameNumber).toBe(1);
    expect(undone.gamesWonA).toBe(0);
    expect(undone.games[0]!.scoreA).toBe(6);
    expect(undone.games[0]!.scoreB).toBe(0);
    expect(undone.games[0]!.isComplete).toBe(false);
  });

  it('property test: replay equals incremental state with shutout enabled', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<'A' | 'B'>('A', 'B'), { minLength: 1, maxLength: 50 }),
        (winners) => {
          const cfg = makeConfig({
            shutout: { enabled: true, target: 7, effect: 'GAME', applyInDecider: true },
          });
          let incremental = createMatch(cfg);
          for (const w of winners) {
            if (incremental.status !== 'IN_PROGRESS') break;
            incremental = recordRally(incremental, { winningSide: w }).state;
          }
          const replayed = replay(incremental.events, cfg);
          expect(replayed.status).toBe(incremental.status);
          expect(replayed.gamesWonA).toBe(incremental.gamesWonA);
          expect(replayed.gamesWonB).toBe(incremental.gamesWonB);
          expect(replayed.games.length).toBe(incremental.games.length);
        }
      )
    );
  });
});
