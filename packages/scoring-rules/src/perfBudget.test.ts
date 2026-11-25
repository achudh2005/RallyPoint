import { describe, expect, it } from 'vitest';
import {
  createMatch,
  recordPlayerAction,
  computeStreaks,
  type MatchConfig,
} from './index.js';

describe('QA Phase 4: Scoring & Streaks Performance Budget + 20-Match Soak', () => {
  const cfg: MatchConfig = {
    id: 'perf-m1',
    matchType: 'DOUBLES',
    scoringFormat: 'RALLY_21',
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

  it('computes streaks over a 200-rally match in well under 10ms', () => {
    let state = createMatch(cfg);
    const players = ['a1', 'a2', 'b1', 'b2'];

    for (let i = 0; i < 200; i++) {
      if (state.status === 'COMPLETED') {
        state = createMatch({ ...cfg, id: `perf-m-${i}` });
      }
      state = recordPlayerAction(state, {
        playerId: players[i % 4]!,
        action: i % 5 === 0 ? 'DROP' : 'POINT',
      }).state;
    }

    const t0 = performance.now();
    const res = computeStreaks(state.events);
    const elapsed = performance.now() - t0;

    expect(res).toBeDefined();
    expect(elapsed).toBeLessThan(10);
  });

  it('soak test: simulates 20 full matches back-to-back with zero errors', () => {
    const t0 = performance.now();
    for (let m = 0; m < 20; m++) {
      let state = createMatch({ ...cfg, id: `soak-${m}` });
      let safety = 0;
      while (state.status === 'IN_PROGRESS' && safety < 200) {
        const pid = safety % 2 === 0 ? 'a1' : 'b1';
        state = recordPlayerAction(state, { playerId: pid, action: 'POINT' }).state;
        safety++;
      }
      expect(state.status).toBe('COMPLETED');
      const streaks = computeStreaks(state.events);
      expect(streaks.bestTeamRuns.A).toBeGreaterThanOrEqual(0);
    }
    const totalMs = performance.now() - t0;
    expect(totalMs).toBeLessThan(1000);
  });
});
