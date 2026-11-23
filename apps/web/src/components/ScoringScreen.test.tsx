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

  it('adapts to SERVICE_POINT_15: shows badge, side-out on receiver win, and setting modal', async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();

    // Start a doubles match in SERVICE_POINT_15
    await useMatchStore.getState().startMatch({
      id: 'm-service-15',
      mode: 'doubles',
      scoringFormat: 'SERVICE_POINT_15',
      bestOf: 3,
      pointsToWinGame: 15,
      tiebreakCap: 18,
      sideA: { id: 'sa', name: 'Viktor & Anders', playerIds: ['Viktor', 'Anders'] },
      sideB: { id: 'sb', name: 'Lee & Aaron', playerIds: ['Lee', 'Aaron'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'Viktor',
    });

    render(<ScoringScreen />);

    // Prominent service point scoring badge
    expect(screen.getByText(/SERVICE POINT SCORING/i)).toBeInTheDocument();
    // One Down badge on first turn of doubles
    expect(screen.getByText(/ONE DOWN/i)).toBeInTheDocument();

    const leftButton = screen.getByTestId('tap-left-side');
    const rightButton = screen.getByTestId('tap-right-side');

    // Left (Side A) is server: button shows +1 POINT
    expect(leftButton).toHaveTextContent(/\+1 POINT/i);
    // Right (Side B) is receiver: button shows SIDE OUT
    expect(rightButton).toHaveTextContent(/SIDE OUT/i);

    // Receiver (Side B) wins rally -> triggers SIDE OUT without score change
    fireEvent.click(rightButton);

    const matchState = useMatchStore.getState().match;
    expect(matchState?.currentScoreA).toBe(0);
    expect(matchState?.currentScoreB).toBe(0);
    // Serve changed to Side B
    expect(matchState?.serveState.serverSide).toBe('B');

    // Now Side B is server -> Left button (Side A) now shows SIDE OUT or SECOND SERVER
    expect(leftButton).toHaveTextContent(/SIDE OUT|SECOND SERVER/i);
  });

  it('renders and handles setting choice modal in service point scoring', async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();

    await useMatchStore.getState().startMatch({
      id: 'm-service-setting',
      mode: 'singles',
      scoringFormat: 'SERVICE_POINT_15',
      bestOf: 1,
      pointsToWinGame: 15,
      tiebreakCap: 18,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['Viktor'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['Lee'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'Viktor',
    });

    // Artificially trigger setting prompt state in store
    useMatchStore.setState({
      pendingSettingChoice: {
        eligibleSide: 'A',
        atScore: 13,
        setToTarget: 18,
        extraPoints: 5,
      },
    });

    render(<ScoringScreen />);

    // Verify modal appears
    expect(screen.getByText(/13-All Reached!/i)).toBeInTheDocument();
    expect(screen.getByText(/Set to 5 more points/i)).toBeInTheDocument();

    const setButton = screen.getByTestId('choose-set-game');
    const noSetButton = screen.getByTestId('choose-no-set');
    expect(setButton).toBeInTheDocument();
    expect(noSetButton).toBeInTheDocument();

    // Click No Set
    fireEvent.click(noSetButton);
    expect(useMatchStore.getState().pendingSettingChoice).toBeNull();
  });
});
