import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppleScoringScreen } from './AppleScoringScreen.js';
import { useMatchStore } from '../../store/matchStore.js';
import { db } from '../../db/index.js';

describe('AppleScoringScreen Component', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
    await useMatchStore.getState().startMatch({
      id: 'm-apple-1',
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

  it('renders calm Apple split screen with player names and initial scores', () => {
    render(<AppleScoringScreen />);

    expect(screen.getByText('Viktor')).toBeInTheDocument();
    expect(screen.getByText('Lee')).toBeInTheDocument();
    expect(screen.getByText('Game 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Rally 21')).toBeInTheDocument();
  });

  it('increments score when player half is tapped', () => {
    render(<AppleScoringScreen />);

    const sideAButton = screen.getByLabelText(/Score point for Viktor/i);
    fireEvent.click(sideAButton);

    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);
  });

  it('reverts score when undo is tapped', () => {
    render(<AppleScoringScreen />);

    const sideAButton = screen.getByLabelText(/Score point for Viktor/i);
    fireEvent.click(sideAButton);
    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);

    const undoBtn = screen.getByRole('button', { name: /undo/i });
    fireEvent.click(undoBtn);
    expect(useMatchStore.getState().match?.currentScoreA).toBe(0);
  });

  it('opens and closes the options bottom sheet', () => {
    render(<AppleScoringScreen />);

    const menuBtn = screen.getByLabelText('Match Menu');
    fireEvent.click(menuBtn);

    expect(screen.getByText('Match Options')).toBeInTheDocument();
    expect(screen.getByText('Rules & Format Explanation')).toBeInTheDocument();
  });
});
