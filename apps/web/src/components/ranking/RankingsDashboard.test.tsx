import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RankingsDashboard } from './RankingsDashboard.js';
import { useRankingStore } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';
import { db } from '../../db/index.js';

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockPngData'),
}));

describe('RankingsDashboard Component (Phase 3)', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();

    const store = useRankingStore.getState();
    store.setSelectedCategory('OVERALL');
    store.recalculateLiveRankings();
  });

  it('renders dashboard with active season, awards ribbon, and leaderboard table', () => {
    render(<RankingsDashboard currentUserId="cp-viktor" />);

    // Title & Season
    expect(screen.getByText(/Community Rankings & League/i)).toBeInTheDocument();
    expect(screen.getByText(/Spring 2026 Community League/i)).toBeInTheDocument();

    // Awards Ribbon
    expect(screen.getByText('Drop-Shot King')).toBeInTheDocument();
    expect(screen.getByText('Iron Wall')).toBeInTheDocument();
    expect(screen.getByText('Smash Master')).toBeInTheDocument();
    expect(screen.getByText('Comeback Kid')).toBeInTheDocument();
    expect(screen.getByText('Marathoner')).toBeInTheDocument();

    // Prominent Matches: N on rows
    const matchBadges = screen.getAllByText(/Matches: \d+/i);
    expect(matchBadges.length).toBeGreaterThan(0);

    // Current user highlight
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('switches time filter pills (Season, Month, Week, All-time)', () => {
    render(<RankingsDashboard />);

    const monthBtn = screen.getByRole('button', { name: /This Month/i });
    fireEvent.click(monthBtn);
    expect(monthBtn).toHaveClass('bg-emerald-500');

    const weekBtn = screen.getByRole('button', { name: /This Week/i });
    fireEvent.click(weekBtn);
    expect(weekBtn).toHaveClass('bg-emerald-500');

    const allTimeBtn = screen.getByRole('button', { name: /All-Time/i });
    fireEvent.click(allTimeBtn);
    expect(allTimeBtn).toHaveClass('bg-emerald-500');
  });

  it('switches categories and handles drops sub-toggle (played vs conceded)', () => {
    render(<RankingsDashboard />);

    // Most Wins tab
    const winsTab = screen.getByRole('button', { name: /Most Wins/i });
    fireEvent.click(winsTab);
    expect(useRankingStore.getState().selectedCategory).toBe('MOST_WINS');

    // Most Drops tab
    const dropsTab = screen.getByRole('button', { name: /Most Drops/i });
    fireEvent.click(dropsTab);

    // Drops sub-toggle should appear
    expect(screen.getByText(/Drop Mode:/i)).toBeInTheDocument();
    const concededBtn = screen.getByRole('button', { name: /Points Dropped \(Conceded\)/i });
    expect(concededBtn).toBeInTheDocument();
    fireEvent.click(concededBtn);

    const playedBtn = screen.getByRole('button', { name: /Drop Shots Played/i });
    fireEvent.click(playedBtn);
  });

  it('filters leaderboard rows using search input', () => {
    render(<RankingsDashboard />);

    const searchInput = screen.getByPlaceholderText(/Search community player\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Axelsen' } });

    expect(screen.getByRole('row', { name: /Viktor Axelsen/i })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Kento Momota/i })).not.toBeInTheDocument();
  });

  it('opens PlayerProfileModal when a player row is clicked', () => {
    render(<RankingsDashboard />);

    const viktorRow = screen.getByRole('row', { name: /Viktor Axelsen/i });
    fireEvent.click(viktorRow);

    // Modal opens
    expect(screen.getByTestId('player-profile-modal')).toBeInTheDocument();
    expect(screen.getByText(/Rank History/i)).toBeInTheDocument();
    expect(screen.getByText(/Shot Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Head-to-Head Lookup/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('player-profile-modal')).not.toBeInTheDocument();
  });

  it('navigates to Team League tab and switches between Doubles Pairs and Club Teams', () => {
    render(<RankingsDashboard />);

    const teamsTab = screen.getByRole('button', { name: /Team League/i });
    fireEvent.click(teamsTab);

    // Team league component rendered
    expect(screen.getByRole('button', { name: /Doubles Pairs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Club Teams League/i })).toBeInTheDocument();

    // Switch to Club Teams
    const clubTeamsBtn = screen.getByRole('button', { name: /Club Teams League/i });
    fireEvent.click(clubTeamsBtn);

    expect(screen.getByText('Thunder Shuttlers')).toBeInTheDocument();
    expect(screen.getByText('Apex Smashers')).toBeInTheDocument();
    expect(screen.getByText(/Promotion/i)).toBeInTheDocument();
    expect(screen.getByText(/Relegation/i)).toBeInTheDocument();
  });

  it('triggers CSV export when Export CSV button is clicked', () => {
    render(<RankingsDashboard />);

    const csvBtn = screen.getByRole('button', { name: /Export CSV/i });
    expect(csvBtn).toBeInTheDocument();
    fireEvent.click(csvBtn);
  });

  it('triggers Story Card PNG export when button is clicked', async () => {
    render(<RankingsDashboard />);

    const storyBtn = screen.getByText(/Story Card/i);
    expect(storyBtn).toBeInTheDocument();
    fireEvent.click(storyBtn);
  });
});
