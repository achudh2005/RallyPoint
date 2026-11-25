import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApplePlayerProfileSheet, type PlayerProfileData } from './ApplePlayerProfileSheet.js';

describe('ApplePlayerProfileSheet Component (QA Phase 3)', () => {
  const samplePlayer: PlayerProfileData = {
    id: 'cp-viktor',
    name: 'Viktor Axelsen',
    rank: 1,
    rating: 120,
    wins: 18,
    losses: 2,
    totalMatches: 20,
    totalPointsWon: 380,
    totalPointsConceded: 210,
    dropsWon: 42,
    longestStreak: 9,
    currentForm: ['W', 'W', 'L', 'W', 'W'],
    pointsWon: 250,
    drops: 30,
    netContribution: 220,
    mvpCount: 8,
    fighterCount: 1,
    mvpRate: 0.4,
    bestMatchStreak: 9,
    clutchPointsTotal: 15,
    serveRegainedTotal: 22,
  };

  it('renders player name, rank, headline stats, Trophy Shelf, and Strengths badges', () => {
    render(
      <ApplePlayerProfileSheet player={samplePlayer} isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText('Viktor Axelsen')).toBeInTheDocument();
    expect(screen.getByText('Rank #1')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();

    // Trophy Shelf & Strengths
    const shelf = screen.getByTestId('player-trophy-shelf');
    expect(shelf).toBeInTheDocument();
    expect(screen.getByText('40% MVP Rate')).toBeInTheDocument();
    expect(screen.getByText('Clutch Finisher (15)')).toBeInTheDocument();
    expect(screen.getByText('Serve Breaker (22)')).toBeInTheDocument();
    expect(screen.getByText('Streak Machine')).toBeInTheDocument();
  });

  it('toggles detailed stats breakdown when More is clicked', () => {
    render(
      <ApplePlayerProfileSheet player={samplePlayer} isOpen={true} onClose={vi.fn()} />
    );

    const toggleBtn = screen.getByRole('button', { name: /Detailed Statistics|More/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Points Won/i)).toBeInTheDocument();
  });
});
