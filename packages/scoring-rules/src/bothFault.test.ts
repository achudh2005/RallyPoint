import { describe, expect, it } from 'vitest';
import { createMatch, recordPlayerAction } from './scoringEngine.js';

describe('Both Fault & Dual Rally Attribution', () => {
  it('splits drop/fault 0.5 each between two responsible players on Both Fault', () => {
    let state = createMatch({
      id: 'bf-1',
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
    });

    // Team A scores, Both Fault on Team B (b1 & b2 get 0.5 drop each)
    const r1 = recordPlayerAction(state, {
      playerId: 'a1',
      action: 'POINT',
      attributedDropPlayerIds: ['b1', 'b2'],
      isBothFault: true,
      note: 'Midcourt collision',
    });
    state = r1.state;
    expect(state.games[0]!.scoreA).toBe(1);
    expect(state.playerStats.a1!.pointsWon).toBe(1);
    expect(state.playerStats.b1!.drops).toBe(0.5);
    expect(state.playerStats.b2!.drops).toBe(0.5);

    // Direct Both Fault on Team A (a1 & a2 get 0.5 drop each, Team B gets point)
    const r2 = recordPlayerAction(state, {
      playerId: 'a1',
      action: 'DROP',
      attributedDropPlayerIds: ['a1', 'a2'],
      isBothFault: true,
    });
    state = r2.state;
    expect(state.games[0]!.scoreB).toBe(1);
    expect(state.playerStats.a1!.drops).toBe(0.5);
    expect(state.playerStats.a2!.drops).toBe(0.5);
    expect(state.playerStats.a1!.netContribution).toBe(0.5);
  });
});
