import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppleRankingsScreen } from './AppleRankingsScreen.js';

describe('AppleRankingsScreen Component (Phase 3)', () => {
  it('renders large title, segmented control, and category chips', () => {
    render(<AppleRankingsScreen />);

    expect(screen.getByRole('heading', { name: 'Rankings' })).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Teams & Pairs')).toBeInTheDocument();
    expect(screen.getByText('Top Players')).toBeInTheDocument();
    expect(screen.getByText('Most Wins')).toBeInTheDocument();
    expect(screen.getByText('Most Drops')).toBeInTheDocument();
  });

  it('switches between Players and Teams views', () => {
    render(<AppleRankingsScreen />);

    const teamsTab = screen.getByText('Teams & Pairs');
    fireEvent.click(teamsTab);

    expect(screen.getByText(/Club & Doubles Pairs/i)).toBeInTheDocument();
  });

  it('opens filter bottom sheet when filter is tapped', () => {
    render(<AppleRankingsScreen />);

    const filterBtn = screen.getByLabelText('Filter Rankings');
    fireEvent.click(filterBtn);

    expect(screen.getByText('Rankings Filter')).toBeInTheDocument();
    expect(screen.getByText('All Scoring Formats')).toBeInTheDocument();
  });
});
