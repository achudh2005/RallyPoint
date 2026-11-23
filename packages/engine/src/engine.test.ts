import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  applyEvent,
  createMatch,
  getServeState,
  getStats,
  replay,
} from './engine.js';
import {
  MatchConfig,
  MatchEvent,
  PointEvent,
  RallyEndType,
  Side,
} from './types.js';
import { computeNextServeState } from './serve.js';

const singlesConfigA: MatchConfig = {
  id: 'match-singles-1',
  mode: 'singles',
  bestOf: 3,
  pointsToWinGame: 21,
  tiebreakCap: 30,
  sideA: { id: 'sa', name: 'Viktor Axelsen', playerIds: ['va'] },
  sideB: { id: 'sb', name: 'Lee Zii Jia', playerIds: ['lzj'] },
  initialServerSide: 'A',
  initialServerPlayerId: 'va',
  initialReceiverPlayerId: 'lzj',
};

const singlesConfigB: MatchConfig = {
  id: 'match-singles-2',
  mode: 'singles',
  bestOf: 3,
  pointsToWinGame: 21,
  tiebreakCap: 30,
  sideA: { id: 'sa', name: 'Player A', playerIds: ['pA'] },
  sideB: { id: 'sb', name: 'Player B', playerIds: ['pB'] },
  initialServerSide: 'B',
  initialServerPlayerId: 'pB',
  initialReceiverPlayerId: 'pA',
};

const doublesConfigA: MatchConfig = {
  id: 'match-doubles-1',
  mode: 'doubles',
  bestOf: 3,
  pointsToWinGame: 21,
  tiebreakCap: 30,
  sideA: { id: 'sa', name: 'Minions', playerIds: ['gideon', 'sukamuljo'] },
  sideB: { id: 'sb', name: 'Daddies', playerIds: ['ahsan', 'setiawan'] },
  initialServerSide: 'A',
  initialServerPlayerId: 'gideon',
  initialReceiverPlayerId: 'ahsan',
};

const doublesConfigB: MatchConfig = {
  id: 'match-doubles-2',
  mode: 'doubles',
  bestOf: 3,
  pointsToWinGame: 21,
  tiebreakCap: 30,
  sideA: { id: 'sa', name: 'Minions', playerIds: ['gideon', 'sukamuljo'] },
  sideB: { id: 'sb', name: 'Daddies', playerIds: ['ahsan', 'setiawan'] },
  initialServerSide: 'B',
  initialServerPlayerId: 'ahsan',
  initialReceiverPlayerId: 'gideon',
};

function makePoint(
  side: Side,
  matchId = 'match-singles-1',
  rallyEndType?: RallyEndType,
  timestamp = Date.now()
): PointEvent {
  return {
    id: `pt-${Math.random()}`,
    matchId,
    timestamp,
    type: 'POINT',
    side,
    rallyEndType,
  };
}

describe('BWF Scoring Engine - Singles', () => {
  it('initializes match with correct starting serve state for server A and server B', () => {
    const stateA = createMatch(singlesConfigA);
    expect(stateA.status).toBe('IN_PROGRESS');
    expect(stateA.currentGameNumber).toBe(1);
    const serveA = getServeState(stateA);
    expect(serveA.serverSide).toBe('A');
    expect(serveA.serverPlayerId).toBe('va');
    expect(serveA.receiverPlayerId).toBe('lzj');

    const stateB = createMatch(singlesConfigB);
    const serveB = getServeState(stateB);
    expect(serveB.serverSide).toBe('B');
    expect(serveB.serverPlayerId).toBe('pB');
    expect(serveB.receiverPlayerId).toBe('pA');
  });

  it('updates singles serve court based on score parity (even = right, odd = left)', () => {
    let state = createMatch(singlesConfigA);
    state = applyEvent(state, makePoint('A'));
    expect(state.currentScoreA).toBe(1);
    expect(state.serveState.serviceCourt).toBe('left');

    state = applyEvent(state, makePoint('A'));
    expect(state.currentScoreA).toBe(2);
    expect(state.serveState.serviceCourt).toBe('right');

    state = applyEvent(state, makePoint('B'));
    expect(state.currentScoreB).toBe(1);
    expect(state.serveState.serverSide).toBe('B');
    expect(state.serveState.serviceCourt).toBe('left');
  });

  it('handles 11-point interval and game interval toggle', () => {
    let state = createMatch(singlesConfigA);
    for (let i = 0; i < 11; i++) {
      state = applyEvent(state, makePoint('A'));
    }
    expect(state.currentScoreA).toBe(11);
    expect(state.status).toBe('INTERVAL');
    expect(state.games[0]?.intervalTaken).toBe(true);

    state = applyEvent(state, {
      id: 'int-1',
      matchId: singlesConfigA.id,
      timestamp: Date.now(),
      type: 'INTERVAL',
      intervalType: 'ELEVEN_POINT',
      gameNumber: 1,
    });
    expect(state.status).toBe('IN_PROGRESS');
  });

  it('handles deuce at 20-20 and 2-point lead win for both sides', () => {
    let state = createMatch(singlesConfigA);
    for (let i = 0; i < 20; i++) {
      state = applyEvent(state, makePoint('A'));
      state = applyEvent(state, makePoint('B'));
    }
    expect(state.currentScoreA).toBe(20);
    expect(state.currentScoreB).toBe(20);

    state = applyEvent(state, makePoint('A'));
    expect(state.currentScoreA).toBe(21);
    expect(state.gamesWonA).toBe(0);

    state = applyEvent(state, makePoint('A'));
    expect(state.gamesWonA).toBe(1);
    expect(state.currentGameNumber).toBe(2);
    expect(state.games[0]?.winnerSide).toBe('A');
  });

  it('handles 30-29 hard cap when Side A reaches 30 and when Side B reaches 30', () => {
    let stateA = createMatch(singlesConfigA);
    for (let i = 0; i < 29; i++) {
      stateA = applyEvent(stateA, makePoint('A'));
      stateA = applyEvent(stateA, makePoint('B'));
    }
    stateA = applyEvent(stateA, makePoint('A'));
    expect(stateA.gamesWonA).toBe(1);
    expect(stateA.games[0]?.scoreA).toBe(30);
    expect(stateA.games[0]?.scoreB).toBe(29);
    expect(stateA.games[0]?.winnerSide).toBe('A');

    let stateB = createMatch(singlesConfigA);
    for (let i = 0; i < 29; i++) {
      stateB = applyEvent(stateB, makePoint('A'));
      stateB = applyEvent(stateB, makePoint('B'));
    }
    stateB = applyEvent(stateB, makePoint('B'));
    expect(stateB.gamesWonB).toBe(1);
    expect(stateB.games[0]?.scoreA).toBe(29);
    expect(stateB.games[0]?.scoreB).toBe(30);
    expect(stateB.games[0]?.winnerSide).toBe('B');
  });

  it('detects match winner for Side B (0-2)', () => {
    let state = createMatch(singlesConfigA);
    for (let i = 0; i < 21; i++) state = applyEvent(state, makePoint('B'));
    expect(state.gamesWonB).toBe(1);
    expect(state.status).toBe('GAME_PAUSE');

    for (let i = 0; i < 21; i++) state = applyEvent(state, makePoint('B'));
    expect(state.gamesWonB).toBe(2);
    expect(state.status).toBe('COMPLETED');
    expect(state.winnerSide).toBe('B');

    const postState = applyEvent(state, makePoint('A'));
    expect(postState).toBe(state);
  });

  it('switches sides at 11 points in deciding game (Game 3)', () => {
    let state = createMatch(singlesConfigA);
    for (let i = 0; i < 21; i++) state = applyEvent(state, makePoint('A'));
    for (let i = 0; i < 21; i++) state = applyEvent(state, makePoint('B'));
    expect(state.currentGameNumber).toBe(3);
    expect(state.endsSwapped).toBe(false);

    for (let i = 0; i < 11; i++) state = applyEvent(state, makePoint('B'));
    expect(state.endsSwapped).toBe(true);
    expect(state.games[2]?.decidingGameSideSwitched).toBe(true);
  });
});

describe('BWF Scoring Engine - Doubles', () => {
  it('correctly rotates doubles positions when Side A serves and wins/loses', () => {
    let state = createMatch(doublesConfigA);

    state = applyEvent(state, makePoint('A', doublesConfigA.id));
    expect(state.currentScoreA).toBe(1);
    expect(state.doublesPositions?.sideA.leftPlayerId).toBe('gideon');
    expect(state.doublesPositions?.sideA.rightPlayerId).toBe('sukamuljo');

    state = applyEvent(state, makePoint('B', doublesConfigA.id));
    expect(state.currentScoreB).toBe(1);
    expect(state.serveState.serverSide).toBe('B');
  });

  it('correctly rotates doubles positions when Side B starts serve and wins/loses', () => {
    let state = createMatch(doublesConfigB);
    expect(state.serveState.serverSide).toBe('B');
    expect(state.serveState.serverPlayerId).toBe('ahsan');

    state = applyEvent(state, makePoint('B', doublesConfigB.id));
    expect(state.currentScoreB).toBe(1);
    expect(state.doublesPositions?.sideB.leftPlayerId).toBe('ahsan');
    expect(state.doublesPositions?.sideB.rightPlayerId).toBe('setiawan');
    expect(state.serveState.serverPlayerId).toBe('ahsan');
    expect(state.serveState.serviceCourt).toBe('left');

    state = applyEvent(state, makePoint('A', doublesConfigB.id));
    expect(state.currentScoreA).toBe(1);
    expect(state.serveState.serverSide).toBe('A');
  });

  it('throws error if computeNextServeState is called in doubles mode without positions', () => {
    expect(() => {
      computeNextServeState(
        'doubles',
        {
          serverSide: 'A',
          serverPlayerId: 'p1',
          receiverSide: 'B',
          receiverPlayerId: 'p2',
          serviceCourt: 'right',
          receiverCourt: 'right',
        },
        'A',
        1,
        0,
        undefined
      );
    }).toThrow('Doubles positions required');
  });

  it('handles game transition in doubles when Side B wins Game 1', () => {
    let state = createMatch(doublesConfigB);
    for (let i = 0; i < 21; i++) {
      state = applyEvent(state, makePoint('B', doublesConfigB.id));
    }
    expect(state.gamesWonB).toBe(1);
    expect(state.currentGameNumber).toBe(2);
    expect(state.serveState.serverSide).toBe('B');
  });

  it('handles game transition in doubles when Side A wins Game 1', () => {
    let state = createMatch(doublesConfigA);
    for (let i = 0; i < 21; i++) {
      state = applyEvent(state, makePoint('A', doublesConfigA.id));
    }
    expect(state.gamesWonA).toBe(1);
    expect(state.currentGameNumber).toBe(2);
    expect(state.serveState.serverSide).toBe('A');
  });
});

describe('Undo, Retire, Walkover & Edge Cases', () => {
  it('returns state if undo is called on empty history', () => {
    const state = createMatch(singlesConfigA);
    const undone = applyEvent(state, {
      id: 'undo-empty',
      matchId: singlesConfigA.id,
      timestamp: Date.now(),
      type: 'UNDO',
    });
    expect(undone).toBe(state);
  });

  it('throws when replay is called with empty events and no config', () => {
    expect(() => replay([])).toThrow(
      'Cannot replay empty events without providing initialConfig'
    );
  });

  it('replays using inferred default config when no config provided', () => {
    const pt = makePoint('A', 'custom-match');
    const state = replay([pt]);
    expect(state.currentScoreA).toBe(1);
    expect(state.config.id).toBe('custom-match');
  });

  it('handles retire event for side B', () => {
    let state = createMatch(singlesConfigA);
    state = applyEvent(state, {
      id: 'retire-b',
      matchId: singlesConfigA.id,
      timestamp: Date.now(),
      type: 'RETIRE',
      retiringSide: 'B',
    });
    expect(state.status).toBe('COMPLETED');
    expect(state.winnerSide).toBe('A');
  });

  it('handles walkover event for side A', () => {
    let state = createMatch(singlesConfigA);
    state = applyEvent(state, {
      id: 'wo-a',
      matchId: singlesConfigA.id,
      timestamp: Date.now(),
      type: 'WALKOVER',
      concedingSide: 'A',
    });
    expect(state.status).toBe('COMPLETED');
    expect(state.winnerSide).toBe('B');
  });

  it('handles serve fault by B awarding point to A', () => {
    let state = createMatch(singlesConfigA);
    state = applyEvent(state, {
      id: 'fault-b',
      matchId: singlesConfigA.id,
      timestamp: Date.now(),
      type: 'SERVE_FAULT',
      faultySide: 'B',
    });
    expect(state.currentScoreA).toBe(1);
    expect(state.currentScoreB).toBe(0);
    expect(state.serveState.serverSide).toBe('A');
  });

  it('handles unhandled non-scoring event types cleanly in applyEvent', () => {
    let state = createMatch(singlesConfigA);
    const customEvt: MatchEvent = {
      id: 'game-end-evt',
      matchId: singlesConfigA.id,
      timestamp: Date.now(),
      type: 'GAME_END',
      gameNumber: 1,
      winnerSide: 'A',
      scoreA: 21,
      scoreB: 15,
    };
    state = applyEvent(state, customEvt);
    expect(state.history).toContain(customEvt);
  });
});

describe('Match Stats Derivation Comprehensive', () => {
  it('accurately computes serve/receive win rates, streaks, and game duration', () => {
    const t0 = 1000;
    const events: MatchEvent[] = [
      makePoint('A', singlesConfigA.id, 'SMASH', t0),
      makePoint('B', singlesConfigA.id, 'DROP', t0 + 100),
      makePoint('B', singlesConfigA.id, 'SMASH', t0 + 200),
      makePoint('A', singlesConfigA.id, 'UNFORCED_ERROR', t0 + 300),
      {
        id: 'ge-1',
        matchId: singlesConfigA.id,
        timestamp: t0 + 500,
        type: 'GAME_END',
        gameNumber: 1,
        winnerSide: 'B',
        scoreA: 1,
        scoreB: 2,
      },
    ];

    const stats = getStats(events, singlesConfigA);
    expect(stats.pointsWonOnServeVsReceive.sideB.serve).toBe(1);
    expect(stats.pointsWonOnServeVsReceive.sideB.receive).toBe(1);
    expect(stats.pointsWonOnServeVsReceive.sideA.receive).toBe(1);
    expect(stats.gameDurations.length).toBe(1);
    expect(stats.gameDurations[0]?.durationMs).toBe(500);
    expect(stats.comebackDeficits.sideB).toBeGreaterThanOrEqual(0);
  });

  it('accurately tracks pressure points at score 18+', () => {
    const events: MatchEvent[] = [];
    for (let i = 0; i < 18; i++) {
      events.push(makePoint('A', singlesConfigA.id));
      events.push(makePoint('B', singlesConfigA.id));
    }
    events.push(makePoint('A', singlesConfigA.id));
    events.push(makePoint('B', singlesConfigA.id));

    const stats = getStats(events, singlesConfigA);
    expect(stats.pressurePoints.sideA.won).toBeGreaterThanOrEqual(1);
    expect(stats.pressurePoints.sideB.won).toBeGreaterThanOrEqual(1);
  });
});

describe('Property-Based Testing (fast-check)', () => {
  it('proves replay(events) always equals incremental applyEvent state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            side: fc.constantFrom<'A', 'B'>('A', 'B'),
            isUndo: fc.boolean(),
            shot: fc.constantFrom<RallyEndType>(
              'SMASH',
              'DROP',
              'NET',
              'OUT',
              'UNFORCED_ERROR',
              'WINNER'
            ),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          let incrementalState = createMatch(singlesConfigA);
          const history: MatchEvent[] = [];

          for (let i = 0; i < actions.length; i++) {
            const action = actions[i]!;
            if (incrementalState.status === 'COMPLETED') break;

            if (action.isUndo && history.length > 0) {
              const undoEvt: MatchEvent = {
                id: `undo-${i}`,
                matchId: singlesConfigA.id,
                timestamp: Date.now() + i,
                type: 'UNDO',
              };
              incrementalState = applyEvent(incrementalState, undoEvt);
              for (let j = history.length - 1; j >= 0; j--) {
                const prev = history[j];
                if (
                  prev &&
                  (prev.type === 'POINT' || prev.type === 'SERVE_FAULT')
                ) {
                  history.splice(j, 1);
                  break;
                }
              }
            } else {
              const ptEvt: PointEvent = {
                id: `pt-${i}`,
                matchId: singlesConfigA.id,
                timestamp: Date.now() + i,
                type: 'POINT',
                side: action.side,
                rallyEndType: action.shot,
              };
              incrementalState = applyEvent(incrementalState, ptEvt);
              history.push(ptEvt);
            }
          }

          const replayedState = replay(history, singlesConfigA);

          expect(replayedState.currentScoreA).toBe(
            incrementalState.currentScoreA
          );
          expect(replayedState.currentScoreB).toBe(
            incrementalState.currentScoreB
          );
          expect(replayedState.gamesWonA).toBe(incrementalState.gamesWonA);
          expect(replayedState.gamesWonB).toBe(incrementalState.gamesWonB);
          expect(replayedState.currentGameNumber).toBe(
            incrementalState.currentGameNumber
          );
          expect(replayedState.status).toBe(incrementalState.status);
          expect(replayedState.endsSwapped).toBe(incrementalState.endsSwapped);
          expect(replayedState.serveState.serverSide).toBe(
            incrementalState.serveState.serverSide
          );
          expect(replayedState.serveState.serviceCourt).toBe(
            incrementalState.serveState.serviceCourt
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
