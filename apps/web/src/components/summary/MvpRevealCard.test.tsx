import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MvpRevealCard } from './MvpRevealCard.js';
import type { MatchAwardsResult } from '@rallypoint/ranking';

describe('MvpRevealCard Component (Phase 2)', () => {
  const anuContrib = {
    playerId: 'p-anu',
    name: 'Anu',
    teamSide: 'A' as const,
    mvpScore: 48.5,
    pointsWon: 12,
    drops: 2,
    clutchDrops: 0,
    serveRegained: 4,
    clutchPoints: 3,
    comebackPoints: 2,
    streakBonusPoints: 3,
    bestPointStreak: 5,
    totalAttributedActions: 14,
    isQualified: true,
    isWinner: true,
    reasonChips: ['12 points', '4 serve regains', '3 clutch points', 'Streak 5'],
    summaryLine: 'Clutched the victory with 12 points and 4 crucial serve returns',
  };

  const rahulContrib = {
    playerId: 'p-rahul',
    name: 'Rahul',
    teamSide: 'B' as const,
    mvpScore: 32.0,
    pointsWon: 9,
    drops: 3,
    clutchDrops: 0,
    serveRegained: 2,
    clutchPoints: 2,
    comebackPoints: 1,
    streakBonusPoints: 1,
    bestPointStreak: 3,
    totalAttributedActions: 12,
    isQualified: true,
    isWinner: false,
    reasonChips: ['9 points', 'Fighter of the Match'],
    summaryLine: 'High-resilience performance on the losing side',
  };

  const sampleAwards: MatchAwardsResult = {
    isQualified: true,
    formulaVersion: 'v1.0.0',
    mvp: anuContrib,
    fighter: rahulContrib,
    coMvps: [anuContrib],
    allContributions: [anuContrib, rahulContrib],
  };

  it('renders MVP reveal card with name, score, reason chips, and summary', () => {
    render(<MvpRevealCard awards={sampleAwards} matchTitle="Finals Match" />);

    expect(screen.getByTestId('mvp-reveal-card')).toBeInTheDocument();
    expect(screen.getByText('Anu')).toBeInTheDocument();
    expect(screen.getByText('48.5')).toBeInTheDocument();
    expect(screen.getByText('12 points')).toBeInTheDocument();
    expect(screen.getByText('4 serve regains')).toBeInTheDocument();
    expect(screen.getByText('3 clutch points')).toBeInTheDocument();
    expect(
      screen.getByText('"Clutched the victory with 12 points and 4 crucial serve returns"')
    ).toBeInTheDocument();
  });

  it('displays the Fighter Award honoring top performer on losing side', () => {
    render(<MvpRevealCard awards={sampleAwards} />);

    expect(screen.getByTestId('fighter-award-badge')).toBeInTheDocument();
    expect(screen.getByText('Rahul')).toBeInTheDocument();
    expect(screen.getByText('32.0')).toBeInTheDocument();
    expect(screen.getByText(/Losing side MVP/)).toBeInTheDocument();
  });

  it('toggles full match rankings on "See all" click', () => {
    render(<MvpRevealCard awards={sampleAwards} />);

    expect(screen.queryByTestId('all-players-mvp-table')).not.toBeInTheDocument();

    const seeAllBtn = screen.getByRole('button', { name: /See all/i });
    fireEvent.click(seeAllBtn);

    expect(screen.getByTestId('all-players-mvp-table')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('renders friendly fallback when match does not qualify for MVP (< 5 actions)', () => {
    const unqualifiedAwards: MatchAwardsResult = {
      isQualified: false,
      disqualificationReason: 'MVP not available (needs at least 5 attributed player actions)',
      formulaVersion: 'v1.0.0',
      mvp: null,
      fighter: null,
      coMvps: [],
      allContributions: [],
    };

    render(<MvpRevealCard awards={unqualifiedAwards} />);

    expect(screen.getByTestId('mvp-unqualified-card')).toBeInTheDocument();
    expect(
      screen.getByText('MVP not available (needs at least 5 attributed player actions)')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mvp-reveal-card')).not.toBeInTheDocument();
  });
});
