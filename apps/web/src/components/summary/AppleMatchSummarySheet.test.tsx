import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppleMatchSummarySheet } from './AppleMatchSummarySheet.js';
import type { MatchState } from '@rallypoint/engine';

describe('AppleMatchSummarySheet Component (QA Phase 3)', () => {
  const sampleState: MatchState = {
    config: {
      id: 'm-sum-1',
      mode: 'doubles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: {
        id: 'sa',
        name: 'Anu & Vikram',
        playerIds: ['p-anu', 'p-vikram'],
        playerNames: ['Anu', 'Vikram'],
      },
      sideB: {
        id: 'sb',
        name: 'Rahul & Deepa',
        playerIds: ['p-rahul', 'p-deepa'],
        playerNames: ['Rahul', 'Deepa'],
      },
      initialServerSide: 'A',
      initialServerPlayerId: 'p-anu',
    },
    status: 'COMPLETED',
    winnerSide: 'A',
    currentGameNumber: 2,
    currentScoreA: 21,
    currentScoreB: 15,
    gamesWonA: 2,
    gamesWonB: 0,
    endsSwapped: false,
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 18, winnerSide: 'A', isFinished: true, intervalTaken: false, decidingGameSideSwitched: false, startTime: 1000 },
      { gameNumber: 2, scoreA: 21, scoreB: 15, winnerSide: 'A', isFinished: true, intervalTaken: false, decidingGameSideSwitched: false, startTime: 2000 },
    ],
    serveState: {
      serverSide: 'A',
      serverPlayerId: 'p-anu',
      receiverPlayerId: 'p-rahul',
      serverCourt: 'RIGHT',
      receiverCourt: 'RIGHT',
      isSecondServer: false,
    } as any,
    history: [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `pa-${i}`,
        type: 'PLAYER_ACTION',
        playerId: 'p-anu',
        side: 'A',
        action: 'POINT',
        timestamp: 1000 + i * 100,
      })),
      {
        id: 'pt-1',
        type: 'POINT',
        side: 'A',
        timestamp: 2000,
      },
    ] as any,
  };

  it('renders winner card, game scores, MVP reveal card, and weekly accolades', () => {
    render(<AppleMatchSummarySheet state={sampleState} isOpen={true} onDone={vi.fn()} />);

    expect(screen.getAllByText('Anu & Vikram').length).toBeGreaterThan(0);
    expect(screen.getByText('Game 1')).toBeInTheDocument();
    expect(screen.getByText('Game 2')).toBeInTheDocument();
    expect(screen.getByTestId('mvp-reveal-card')).toBeInTheDocument();
    expect(screen.getByText('MVP of the Week')).toBeInTheDocument();
    expect(screen.getByText('Streak Master')).toBeInTheDocument();
  });

  it('opens point-by-point log sheet on button click', () => {
    render(<AppleMatchSummarySheet state={sampleState} isOpen={true} onDone={vi.fn()} />);

    const detailsBtn = screen.getByRole('button', { name: /Point by Point/i });
    fireEvent.click(detailsBtn);
    expect(screen.getAllByText(/Point/i).length).toBeGreaterThan(0);
  });
});
