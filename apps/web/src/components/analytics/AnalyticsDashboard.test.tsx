import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnalyticsDashboard } from './AnalyticsDashboard.js';
import { createMatch } from '@rallypoint/engine';

describe('AnalyticsDashboard Component', () => {
  it('renders tabs and navigates between views', () => {
    const match = createMatch({
      id: 'm-dash',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['v'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['l'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'v',
    });

    const onBack = vi.fn();
    render(<AnalyticsDashboard state={match} events={[]} onBack={onBack} />);

    expect(screen.getByText('Match Analytics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /charts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /shots/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /h2h/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /story card/i })).toBeInTheDocument();

    // Navigate to Shots tab
    const shotsTab = screen.getByRole('button', { name: /shots/i });
    fireEvent.click(shotsTab);
    expect(screen.getByText('Shot-Type Breakdown & Errors')).toBeInTheDocument();

    // Navigate to H2H tab
    const h2hTab = screen.getByRole('button', { name: /h2h/i });
    fireEvent.click(h2hTab);
    expect(screen.getByText('Head-to-Head & Player Profiles')).toBeInTheDocument();

    // Navigate to Story Card tab
    const cardTab = screen.getByRole('button', { name: /story card/i });
    fireEvent.click(cardTab);
    expect(screen.getByText(/Export Story Card/i)).toBeInTheDocument();

    // Back button
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});
