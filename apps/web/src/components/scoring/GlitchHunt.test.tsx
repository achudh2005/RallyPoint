import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { AppleScoringScreen } from './AppleScoringScreen.js';
import { useMatchStore } from '../../store/matchStore.js';
import { db } from '../../db/index.js';
import { AppleRankingsScreen } from '../rankings/AppleRankingsScreen.js';

describe('QA Phase 4: Glitch Hunt & Seeded Monkey Stress Tests', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
  });

  it('prevents double-counting on rapid double taps within 300ms debounce window', async () => {
    await useMatchStore.getState().startMatch({
      id: 'glitch-debounce',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Anu', playerIds: ['p-anu'] },
      sideB: { id: 'sb', name: 'Rahul', playerIds: ['p-rahul'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p-anu',
    });

    render(<AppleScoringScreen />);
    const pointBtn = screen.getByTestId('point-btn-p-anu');

    // Rapid double tap
    await act(async () => {
      fireEvent.click(pointBtn);
      fireEvent.click(pointBtn);
    });

    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);
  });

  it('handles undo spam past 0-0 and very long player names without crashing', async () => {
    const longName = 'Sri Venkata Subrahmanya Balasubramanyam Championship Player';
    await useMatchStore.getState().startMatch({
      id: 'glitch-long-undo',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: longName, playerIds: ['p-long'] },
      sideB: { id: 'sb', name: 'Rahul', playerIds: ['p-rahul'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p-long',
    });

    render(<AppleScoringScreen />);
    expect(screen.getAllByText(longName).length).toBeGreaterThan(0);

    // Record 2 points then spam undo 5 times
    await act(async () => {
      await useMatchStore.getState().recordPlayerAction('p-long', 'POINT');
      await useMatchStore.getState().recordPlayerAction('p-long', 'POINT');
      for (let i = 0; i < 5; i++) {
        await useMatchStore.getState().undoAction();
      }
    });

    expect(useMatchStore.getState().match?.currentScoreA).toBe(0);
    expect(useMatchStore.getState().match?.currentScoreB).toBe(0);
  });

  it('renders empty state gracefully in Rankings when category has no entries', () => {
    render(<AppleRankingsScreen />);
    expect(screen.getByRole('heading', { name: 'Rankings' })).toBeInTheDocument();
  });

  it('monkey stress test: seeded 200-action sequence of POINT, DROP, UNATTRIBUTED, and UNDO stays consistent', async () => {
    await useMatchStore.getState().startMatch({
      id: 'monkey-stress',
      mode: 'doubles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Anu & Vikram', playerIds: ['a1', 'a2'] },
      sideB: { id: 'sb', name: 'Rahul & Deepa', playerIds: ['b1', 'b2'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a1',
    });

    let seed = 42;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const players = ['a1', 'a2', 'b1', 'b2'];
    for (let step = 0; step < 200; step++) {
      const m = useMatchStore.getState().match;
      if (!m || m.status === 'COMPLETED') break;

      const r = nextRand();
      if (r < 0.55) {
        const pid = players[Math.floor(nextRand() * players.length)]!;
        await useMatchStore.getState().recordPlayerAction(pid, 'POINT');
      } else if (r < 0.75) {
        const pid = players[Math.floor(nextRand() * players.length)]!;
        await useMatchStore.getState().recordPlayerAction(pid, 'DROP');
      } else if (r < 0.85) {
        await useMatchStore.getState().recordUnattributedPoint(nextRand() < 0.5 ? 'A' : 'B');
      } else {
        await useMatchStore.getState().undoAction();
      }
    }

    const finalState = useMatchStore.getState().match;
    expect(finalState).not.toBeNull();
    expect(finalState!.currentScoreA).toBeGreaterThanOrEqual(0);
    expect(finalState!.currentScoreB).toBeGreaterThanOrEqual(0);
  });
});
