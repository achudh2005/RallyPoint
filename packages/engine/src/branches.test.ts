import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  createMatch,
  getServeState,
  getStats,
  replay,
} from './engine.js';
import {
  isDecidingGame,
  isGameFinished,
  isMatchFinished,
  shouldSwitchDecidingGameEnds,
  shouldTriggerInterval,
} from './rules.js';
import { computeNextServeState, initializeDoublesPositions } from './serve.js';
import { MatchConfig, MatchEvent, PointEvent, Side } from './types.js';

describe('Engine Branches Coverage', () => {
  it('covers rules helper functions directly', () => {
    expect(isDecidingGame(1, 1)).toBe(true);
    expect(isDecidingGame(2, 3)).toBe(false);
    expect(isDecidingGame(3, 3)).toBe(true);

    expect(isGameFinished(15, 10, 21, 30).finished).toBe(false);
    expect(isGameFinished(21, 19, 21, 30).winner).toBe('A');
    expect(isGameFinished(19, 21, 21, 30).winner).toBe('B');
    expect(isGameFinished(30, 29, 21, 30).winner).toBe('A');
    expect(isGameFinished(29, 30, 21, 30).winner).toBe('B');

    expect(isMatchFinished(0, 0, 3).finished).toBe(false);
    expect(isMatchFinished(2, 0, 3).winner).toBe('A');
    expect(isMatchFinished(0, 2, 3).winner).toBe('B');

    expect(shouldTriggerInterval(10, 5, false)).toBe(false);
    expect(shouldTriggerInterval(11, 5, true)).toBe(false);
    expect(shouldTriggerInterval(11, 5, false)).toBe(true);
    expect(shouldTriggerInterval(5, 11, false)).toBe(true);

    expect(shouldSwitchDecidingGameEnds(1, 10, 5, false, 3)).toBe(false);
    expect(shouldSwitchDecidingGameEnds(3, 10, 5, true, 3)).toBe(false);
    expect(shouldSwitchDecidingGameEnds(3, 11, 5, false, 3)).toBe(true);
    expect(shouldSwitchDecidingGameEnds(3, 5, 11, false, 3)).toBe(true);
  });

  it('covers default player IDs and fallback receiver assignments', () => {
    const configNoReceiver: MatchConfig = {
      id: 'cfg-fallback',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'A', playerIds: [] },
      sideB: { id: 'sb', name: 'B', playerIds: [] },
      initialServerSide: 'A',
      initialServerPlayerId: 'pA',
    };

    const stateA = createMatch(configNoReceiver);
    expect(stateA.serveState.receiverPlayerId).toBe('B1');

    const configServerB: MatchConfig = {
      ...configNoReceiver,
      initialServerSide: 'B',
      initialServerPlayerId: 'pB',
    };
    const stateB = createMatch(configServerB);
    expect(stateB.serveState.receiverPlayerId).toBe('A1');
  });

  it('covers initializeDoublesPositions with default player fallbacks', () => {
    const configSparse: MatchConfig = {
      id: 'cfg-sparse-doubles',
      mode: 'doubles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Side A', playerIds: ['A1'] },
      sideB: { id: 'sb', name: 'Side B', playerIds: ['B1'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'A1',
    };
    const posA = initializeDoublesPositions(configSparse, 'A', 'A1');
    expect(posA.sideA.rightPlayerId).toBe('A1');
    expect(posA.sideA.leftPlayerId).toBe('A2');

    const posB = initializeDoublesPositions(configSparse, 'B', 'B1');
    expect(posB.sideB.rightPlayerId).toBe('B1');
    expect(posB.sideB.leftPlayerId).toBe('B2');
  });

  it('covers undoing retire and walkover events and history with intervals', () => {
    const cfg: MatchConfig = {
      id: 'm-undo',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'A', playerIds: ['a'] },
      sideB: { id: 'sb', name: 'B', playerIds: ['b'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a',
    };

    let state = createMatch(cfg);
    state = applyEvent(state, {
      id: 'retire-1',
      matchId: cfg.id,
      timestamp: 1000,
      type: 'RETIRE',
      retiringSide: 'A',
    });
    expect(state.status).toBe('COMPLETED');

    state = applyEvent(state, {
      id: 'undo-retire',
      matchId: cfg.id,
      timestamp: 2000,
      type: 'UNDO',
    });
    expect(state.status).toBe('IN_PROGRESS');

    state = applyEvent(state, {
      id: 'wo-1',
      matchId: cfg.id,
      timestamp: 3000,
      type: 'WALKOVER',
      concedingSide: 'B',
    });
    expect(state.status).toBe('COMPLETED');

    state = applyEvent(state, {
      id: 'undo-wo',
      matchId: cfg.id,
      timestamp: 4000,
      type: 'UNDO',
    });
    expect(state.status).toBe('IN_PROGRESS');
  });

  it('covers doubles side-out even and odd score combinations', () => {
    const doublesCfg: MatchConfig = {
      id: 'd-combo',
      mode: 'doubles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Side A', playerIds: ['a1', 'a2'] },
      sideB: { id: 'sb', name: 'Side B', playerIds: ['b1', 'b2'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a1',
      initialReceiverPlayerId: 'b1',
    };

    let state = createMatch(doublesCfg);
    state = applyEvent(state, {
      id: 'b-pt1',
      matchId: doublesCfg.id,
      timestamp: 1000,
      type: 'POINT',
      side: 'B',
    });
    expect(state.serveState.serverSide).toBe('B');
    expect(state.serveState.serviceCourt).toBe('left');

    state = applyEvent(state, {
      id: 'a-pt1',
      matchId: doublesCfg.id,
      timestamp: 2000,
      type: 'POINT',
      side: 'A',
    });
    expect(state.serveState.serverSide).toBe('A');
    expect(state.serveState.serviceCourt).toBe('left');

    state = applyEvent(state, {
      id: 'b-pt2',
      matchId: doublesCfg.id,
      timestamp: 3000,
      type: 'POINT',
      side: 'B',
    });
    expect(state.serveState.serverSide).toBe('B');
    expect(state.serveState.serviceCourt).toBe('right');

    state = applyEvent(state, {
      id: 'a-pt2',
      matchId: doublesCfg.id,
      timestamp: 4000,
      type: 'POINT',
      side: 'A',
    });
    expect(state.serveState.serverSide).toBe('A');
    expect(state.serveState.serviceCourt).toBe('right');
  });

  it('covers doubles game transitions to Game 2 for both Side A and Side B winning Game 1', () => {
    const doublesCfg: MatchConfig = {
      id: 'd-trans',
      mode: 'doubles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Side A', playerIds: ['a1', 'a2'] },
      sideB: { id: 'sb', name: 'Side B', playerIds: ['b1', 'b2'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a1',
      initialReceiverPlayerId: 'b1',
    };

    let stateA = createMatch(doublesCfg);
    for (let i = 0; i < 21; i++) {
      stateA = applyEvent(stateA, {
        id: `pt-a-${i}`,
        matchId: doublesCfg.id,
        timestamp: 1000 + i,
        type: 'POINT',
        side: 'A',
      });
    }
    expect(stateA.gamesWonA).toBe(1);
    expect(stateA.currentGameNumber).toBe(2);
    expect(stateA.status).toBe('GAME_PAUSE');
    expect(stateA.serveState.serverSide).toBe('A');

    let stateB = createMatch(doublesCfg);
    for (let i = 0; i < 21; i++) {
      stateB = applyEvent(stateB, {
        id: `pt-b-${i}`,
        matchId: doublesCfg.id,
        timestamp: 1000 + i,
        type: 'POINT',
        side: 'B',
      });
    }
    expect(stateB.gamesWonB).toBe(1);
    expect(stateB.currentGameNumber).toBe(2);
    expect(stateB.status).toBe('GAME_PAUSE');
    expect(stateB.serveState.serverSide).toBe('B');
  });

  it('covers deciding game side change when Side B reaches 11 points', () => {
    const cfg: MatchConfig = {
      id: 'm-decide-b',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'A', playerIds: ['a'] },
      sideB: { id: 'sb', name: 'B', playerIds: ['b'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a',
    };

    let state = createMatch(cfg);
    for (let i = 0; i < 21; i++) {
      state = applyEvent(state, {
        id: `g1-${i}`,
        matchId: cfg.id,
        timestamp: 1000 + i,
        type: 'POINT',
        side: 'A',
      });
    }
    for (let i = 0; i < 21; i++) {
      state = applyEvent(state, {
        id: `g2-${i}`,
        matchId: cfg.id,
        timestamp: 2000 + i,
        type: 'POINT',
        side: 'B',
      });
    }
    expect(state.currentGameNumber).toBe(3);
    expect(state.endsSwapped).toBe(false);

    for (let i = 0; i < 11; i++) {
      state = applyEvent(state, {
        id: `g3-${i}`,
        matchId: cfg.id,
        timestamp: 3000 + i,
        type: 'POINT',
        side: 'B',
      });
    }
    expect(state.endsSwapped).toBe(true);
    expect(state.games[2]?.decidingGameSideSwitched).toBe(true);
  });

  it('covers stats with serve faults for both sides and A overcoming deficit', () => {
    const cfg: MatchConfig = {
      id: 'm-faults',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'A', playerIds: ['a'] },
      sideB: { id: 'sb', name: 'B', playerIds: ['b'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a',
    };

    const events: MatchEvent[] = [
      {
        id: 'sf-a',
        matchId: cfg.id,
        timestamp: 1000,
        type: 'SERVE_FAULT',
        faultySide: 'A',
      },
      {
        id: 'sf-b',
        matchId: cfg.id,
        timestamp: 2000,
        type: 'SERVE_FAULT',
        faultySide: 'B',
      },
      {
        id: 'ge-1',
        matchId: cfg.id,
        timestamp: 3000,
        type: 'GAME_END',
        gameNumber: 1,
        winnerSide: 'A',
        scoreA: 21,
        scoreB: 19,
      },
    ];

    const stats = getStats(events, cfg);
    expect(stats.pointsWonOnServeVsReceive.sideB.receive).toBeGreaterThanOrEqual(1);
    expect(stats.pointsWonOnServeVsReceive.sideA.receive).toBeGreaterThanOrEqual(1);
  });
});
