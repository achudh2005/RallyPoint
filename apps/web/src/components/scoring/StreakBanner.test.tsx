import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StreakBanner } from './StreakBanner.js';
import type { StreakMilestoneAlert } from '@rallypoint/scoring-rules';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => true,
}));

describe('StreakBanner Component (Phase 2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sampleAlert: StreakMilestoneAlert = {
    id: 'm1-5-point-p1-5',
    type: 'PLAYER_POINT',
    playerId: 'p1',
    playerName: 'Anu',
    count: 5,
    message: 'Anu is on fire! 5 points in a row',
    priority: 5,
    timestamp: Date.now(),
  };

  it('renders milestone alert banner with message and icon', () => {
    render(<StreakBanner currentAlert={sampleAlert} />);

    expect(screen.getByTestId('streak-banner')).toBeInTheDocument();
    expect(screen.getByText('Anu is on fire! 5 points in a row')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('auto-dismisses banner after 2.5 seconds', () => {
    render(<StreakBanner currentAlert={sampleAlert} />);

    expect(screen.getByTestId('streak-banner')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId('streak-banner')).not.toBeInTheDocument();
  });

  it('does not render when suppressed by modal sheets', () => {
    render(<StreakBanner currentAlert={sampleAlert} suppressed={true} />);

    expect(screen.queryByTestId('streak-banner')).not.toBeInTheDocument();
  });

  it('replaces active banner immediately when a higher priority milestone occurs', () => {
    const { rerender } = render(<StreakBanner currentAlert={sampleAlert} />);
    expect(screen.getByText('Anu is on fire! 5 points in a row')).toBeInTheDocument();

    const higherAlert: StreakMilestoneAlert = {
      id: 'm1-7-point-p1-7',
      type: 'PLAYER_POINT',
      playerId: 'p1',
      playerName: 'Anu',
      count: 7,
      message: 'Unstoppable Anu! 7 consecutive points',
      priority: 7,
      timestamp: Date.now() + 1000,
    };

    rerender(<StreakBanner currentAlert={higherAlert} />);
    expect(screen.getByText('Unstoppable Anu! 7 consecutive points')).toBeInTheDocument();
    expect(screen.getByText('🌟')).toBeInTheDocument();
  });

  it('renders gentle drop streak banner with calming icon', () => {
    const dropAlert: StreakMilestoneAlert = {
      id: 'm1-3-drop-p2-3',
      type: 'PLAYER_DROP',
      playerId: 'p2',
      playerName: 'Rahul',
      count: 3,
      message: 'Rahul: 3 drops in a row, take a breath',
      priority: 3,
      timestamp: Date.now(),
    };

    render(<StreakBanner currentAlert={dropAlert} />);
    expect(screen.getByText('Rahul: 3 drops in a row, take a breath')).toBeInTheDocument();
    expect(screen.getByText('🧘')).toBeInTheDocument();
  });
});
