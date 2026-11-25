import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppleRankingsScreen } from './AppleRankingsScreen.js';

describe('AppleRankingsScreen Component (Phase 3)', () => {
  it('renders large title, segmented control, and category chips', () => {
    render(<AppleRankingsScreen />);

    expect(screen.getByRole('heading', { name: 'Rankings' })).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Teams & Pairs')).toBeInTheDocument();
    expect(screen.getByText('Top Players')).toBeInTheDocument();
    expect(screen.getByText('Most MVPs')).toBeInTheDocument();
    expect(screen.getByText('Best Clutch')).toBeInTheDocument();
    expect(screen.getByText('Serve Winner')).toBeInTheDocument();
    expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    expect(screen.getByText('Top Point Scorers')).toBeInTheDocument();
    expect(screen.getByText('Most Drops')).toBeInTheDocument();
    expect(screen.getByText('Best Net Contribution')).toBeInTheDocument();
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

  it('shows sub-toggle options when Most Drops category is selected', () => {
    render(<AppleRankingsScreen />);

    const dropsChip = screen.getByText('Most Drops');
    fireEvent.click(dropsChip);

    expect(screen.getByText('All Drops')).toBeInTheDocument();
    expect(screen.getByText('Unforced Only')).toBeInTheDocument();
    expect(screen.getByText('Forced Only')).toBeInTheDocument();
  });

  it('allows filtering by scoring format using quick filter chips', () => {
    render(<AppleRankingsScreen />);

    const servicePill = screen.getByText('Service Point Only');
    fireEvent.click(servicePill);
    expect(servicePill).toHaveClass('bg-emerald-500');

    const rallyPill = screen.getByText('Rally Point Only');
    fireEvent.click(rallyPill);
    expect(rallyPill).toHaveClass('bg-emerald-500');
  });

  it('exports CSV when export button is clicked', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<AppleRankingsScreen />);

    const exportBtn = screen.getByLabelText('Export Rankings CSV');
    fireEvent.click(exportBtn);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});

