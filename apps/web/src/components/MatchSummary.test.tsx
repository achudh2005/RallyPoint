import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMatch } from '@rallypoint/engine';
import { MatchSummary } from './MatchSummary.js';

describe('MatchSummary Component', () => {
  it('renders winner and game summary', () => {
    const match = createMatch({
      id: 'm1',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['Viktor'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['Lee'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'Viktor',
    });

    const finishedMatch = {
      ...match,
      status: 'COMPLETED' as const,
      winnerSide: 'A' as const,
      winReason: 'NORMAL' as const,
      gamesWonA: 2,
      gamesWonB: 0,
      games: [
        {
          gameNumber: 1,
          scoreA: 21,
          scoreB: 15,
          isFinished: true,
          intervalTaken: true,
          decidingGameSideSwitched: false,
          startTime: 1000,
          endTime: 2000,
        },
      ],
    };

    render(<MatchSummary state={finishedMatch} />);

    expect(screen.getAllByText('Viktor').length).toBeGreaterThan(0);
    expect(screen.getByText('Match Winner')).toBeInTheDocument();
    expect(screen.getByText('Games: 2 - 0')).toBeInTheDocument();
    expect(screen.getByText('New Match')).toBeInTheDocument();
    expect(screen.getByText(/Weekly Accolades/i)).toBeInTheDocument();
    expect(screen.getByText(/Share Match Summary/i)).toBeInTheDocument();
  });

  it('renders MVP highlight card when action events are present', () => {
    const match = createMatch({
      id: 'm-actions',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['p-viktor'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['p-lee'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p-viktor',
    });

    const finishedMatch = {
      ...match,
      status: 'COMPLETED' as const,
      winnerSide: 'A' as const,
      winReason: 'NORMAL' as const,
      gamesWonA: 2,
      gamesWonB: 0,
      games: [],
    };

    render(<MatchSummary state={finishedMatch} />);
    expect(screen.getByTestId('mvp-highlight-card')).toBeInTheDocument();
    expect(screen.getByText(/MVP of the Match/i)).toBeInTheDocument();
  });
});
