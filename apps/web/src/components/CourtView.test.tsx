import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMatch } from '@rallypoint/engine';
import { CourtView } from './CourtView.js';

describe('CourtView Component', () => {
  it('renders singles player names and serve indicators correctly', () => {
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

    render(<CourtView state={match} />);

    expect(screen.getAllByText('Viktor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lee').length).toBeGreaterThan(0);
    expect(screen.getByText('SERVE')).toBeInTheDocument();
  });
});
