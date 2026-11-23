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

    expect(screen.getByText('Viktor')).toBeInTheDocument();
    expect(screen.getByText('Match Winner')).toBeInTheDocument();
    expect(screen.getByText('Games: 2 - 0')).toBeInTheDocument();
    expect(screen.getByText('New Match')).toBeInTheDocument();
  });
});
