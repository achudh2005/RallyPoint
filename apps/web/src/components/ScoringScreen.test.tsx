import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScoringScreen } from './ScoringScreen.js';
import { useMatchStore } from '../store/matchStore.js';
import { db } from '../db/index.js';

describe('ScoringScreen Component', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
    await useMatchStore.getState().startMatch({
      id: 'm-screen-1',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['Viktor'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['Lee'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'Viktor',
    });
  });

  it('renders giant scoring tap buttons and increments score on click', async () => {
    render(<ScoringScreen />);

    expect(screen.getByText('GAME 1')).toBeInTheDocument();

    const leftButton = screen.getByTestId('tap-left-side');
    const rightButton = screen.getByTestId('tap-right-side');

    expect(leftButton).toBeInTheDocument();
    expect(rightButton).toBeInTheDocument();

    fireEvent.click(leftButton);
    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);

    fireEvent.click(rightButton);
    expect(useMatchStore.getState().match?.currentScoreB).toBe(1);
  });

  it('triggers undo and updates score', async () => {
    render(<ScoringScreen />);

    const leftButton = screen.getByTestId('tap-left-side');
    fireEvent.click(leftButton);
    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);

    const undoButton = screen.getByText(/undo/i);
    fireEvent.click(undoButton);
    expect(useMatchStore.getState().match?.currentScoreA).toBe(0);
  });
});
