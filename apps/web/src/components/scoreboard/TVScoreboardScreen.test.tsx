import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TVScoreboardScreen } from './TVScoreboardScreen.js';
import type { MatchState } from '@rallypoint/engine';

describe('TVScoreboardScreen Component (Phase 4)', () => {
  const mockState: MatchState = {
    config: {
      id: 'm-1',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor Axelsen', playerIds: ['p1'] },
      sideB: { id: 'sb', name: 'Kento Momota', playerIds: ['p2'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p1',
    },
    status: 'IN_PROGRESS',
    currentGameNumber: 1,
    gamesWonA: 0,
    gamesWonB: 0,
    games: [{ gameNumber: 1, scoreA: 18, scoreB: 15, isFinished: false, intervalTaken: true, decidingGameSideSwitched: false, startTime: 0 }],
    currentScoreA: 18,
    currentScoreB: 15,
    serveState: {
      serverSide: 'A',
      serverPlayerId: 'p1',
      receiverSide: 'B',
      receiverPlayerId: 'p2',
      serviceCourt: 'right',
      receiverCourt: 'right',
    },
    endsSwapped: false,
    history: [],
  };

  it('renders large team names and current scores for stadium display', () => {
    const handleExit = vi.fn();
    render(<TVScoreboardScreen state={mockState} onExit={handleExit} />);

    expect(screen.getByText('Viktor Axelsen')).toBeInTheDocument();
    expect(screen.getByText('Kento Momota')).toBeInTheDocument();
    expect(screen.getAllByText('18').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
    expect(screen.getByText(/Return to Match/i)).toBeInTheDocument();
  });
});
