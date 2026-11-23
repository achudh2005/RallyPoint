import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MiniLeaderboardStrip } from './MiniLeaderboardStrip.js';
import { QuickMarkLayer } from './QuickMarkLayer.js';
import { PointEditModal } from './PointEditModal.js';
import { CommunityMatchSetup } from './CommunityMatchSetup.js';
import { useRankingStore } from '../../store/rankingStore.js';
import { useMatchStore } from '../../store/matchStore.js';
import { db } from '../../db/index.js';

describe('Ranking UI Components (Phase 2)', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();

    // Reset ranking store state with populated data
    const store = useRankingStore.getState();
    store.recalculateLiveRankings();
  });

  describe('MiniLeaderboardStrip', () => {
    it('renders top players with gold/silver/bronze badges and matches count', () => {
      render(<MiniLeaderboardStrip />);

      // Should display top ranked players and matches played
      const matchesLabels = screen.getAllByText(/Matches:/i);
      expect(matchesLabels.length).toBeGreaterThan(0);
      expect(screen.getByText('Viktor Axelsen')).toBeInTheDocument();
      expect(screen.getByText('Kento Momota')).toBeInTheDocument();
    });

    it('switches ranking categories when category buttons are clicked', () => {
      render(<MiniLeaderboardStrip />);

      const winsBtn = screen.getByRole('button', { name: /Wins/i });
      fireEvent.click(winsBtn);
      expect(useRankingStore.getState().selectedCategory).toBe('MOST_WINS');

      const pointsBtn = screen.getByRole('button', { name: /Points/i });
      fireEvent.click(pointsBtn);
      expect(useRankingStore.getState().selectedCategory).toBe('MOST_POINTS');

      const dropsBtn = screen.getByRole('button', { name: /Drops/i });
      fireEvent.click(dropsBtn);
      expect(useRankingStore.getState().selectedCategory).toBe('MOST_DROPS_PLAYED');

      const winRateBtn = screen.getByRole('button', { name: /Win %/i });
      fireEvent.click(winRateBtn);
      expect(useRankingStore.getState().selectedCategory).toBe('BEST_WIN_RATE');
    });
  });

  describe('QuickMarkLayer', () => {
    const playersA = [{ id: 'p1', name: 'Viktor' }];
    const playersB = [{ id: 'p2', name: 'Lee' }];

    it('renders shot types and result chips and allows tagging in QUICK mode', () => {
      const applyTag = vi.fn();
      const dismiss = vi.fn();

      render(
        <QuickMarkLayer
          pointSide="A"
          playersA={playersA}
          playersB={playersB}
          onApplyTag={applyTag}
          onDismiss={dismiss}
        />
      );

      // Verify shot chips
      expect(screen.getByText('Smash')).toBeInTheDocument();
      expect(screen.getByText('Drop')).toBeInTheDocument();
      expect(screen.getByText('Net')).toBeInTheDocument();

      // Tap Smash (in QUICK mode, tapping shot directly submits the tag)
      fireEvent.click(screen.getByText('Smash'));

      expect(applyTag).toHaveBeenCalledTimes(1);
      expect(applyTag).toHaveBeenCalledWith(
        expect.objectContaining({
          shotType: 'SMASH',
          rallyEndResult: 'WINNER',
          pointWinnerPlayerId: 'p1',
        })
      );
    });

    it('calls onDismiss when Skip is clicked', () => {
      const applyTag = vi.fn();
      const dismiss = vi.fn();

      render(
        <QuickMarkLayer
          pointSide="B"
          playersA={playersA}
          playersB={playersB}
          onApplyTag={applyTag}
          onDismiss={dismiss}
        />
      );

      const skipBtn = screen.getByRole('button', { name: /Skip/i });
      fireEvent.click(skipBtn);
      expect(dismiss).toHaveBeenCalled();
    });
  });

  describe('PointEditModal', () => {
    it('displays point history and allows editing past point attributes', () => {
      const store = useRankingStore.getState();
      const matchId = 'm-test-edit';

      store.attachMatch({
        id: matchId,
        seasonId: 'season-1',
        matchType: 'SINGLES',
        status: 'LIVE',
        participants: [
          { playerId: 'Viktor', displayName: 'Viktor', side: 'A', position: 1 },
          { playerId: 'Lee', displayName: 'Lee', side: 'B', position: 1 },
        ],
        games: [{ gameNumber: 1, scoreA: 1, scoreB: 0 }],
        events: [
          {
            id: 'e1',
            sequenceNumber: 1,
            eventType: 'POINT',
            side: 'A',
            shotType: 'SMASH',
            rallyEndResult: 'WINNER',
            pointWinnerPlayerId: 'Viktor',
          },
        ],
      });

      const onClose = vi.fn();
      render(
        <PointEditModal
          matchId={matchId}
          playersA={[{ id: 'Viktor', name: 'Viktor' }]}
          playersB={[{ id: 'Lee', name: 'Lee' }]}
          onClose={onClose}
        />
      );

      // Verify point log item #1 is rendered
      const pointItem = screen.getByText('#1');
      expect(pointItem).toBeInTheDocument();

      // Click to edit
      fireEvent.click(pointItem);

      // Change shot to DROP
      fireEvent.click(screen.getByRole('button', { name: /^DROP$/i }));

      // Click Save Correction
      fireEvent.click(screen.getByRole('button', { name: /Save Correction/i }));

      // Confirm dialog appears
      expect(screen.getByText(/Confirm correction\? Rankings will recompute\./i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Yes, Apply/i }));

      // Check that event was updated
      const updatedMatch = useRankingStore.getState().matches.find((m) => m.id === matchId);
      expect(updatedMatch?.events[0]?.shotType).toBe('DROP');
    });
  });

  describe('CommunityMatchSetup & Balanced Doubles Suggestion', () => {
    it('filters roster by search query and allows adding new player', () => {
      const onStart = vi.fn();
      render(<CommunityMatchSetup onStart={onStart} />);

      // Search
      const searchInput = screen.getByPlaceholderText(/Search roster\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Axelsen' } });
      expect(screen.getAllByText('Viktor Axelsen').length).toBeGreaterThan(0);

      // Clear search to see all roster
      fireEvent.change(searchInput, { target: { value: '' } });

      // Add player
      const newPlayerInput = screen.getByPlaceholderText(/Add new player name\.\.\./i);
      fireEvent.change(newPlayerInput, { target: { value: 'Carolina Marin' } });
      fireEvent.click(screen.getByRole('button', { name: /\+ Add/i }));

      expect(screen.getAllByText('Carolina Marin').length).toBeGreaterThan(0);
    });

    it('computes balanced doubles pairs minimizing rank differential', () => {
      const store = useRankingStore.getState();
      const suggestion = store.autoSuggestDoublesPairs([
        'cp-viktor',
        'cp-lee',
        'cp-momota',
        'cp-shi',
      ]);

      expect(suggestion).not.toBeNull();
      if (suggestion) {
        expect(suggestion.pairA).toHaveLength(2);
        expect(suggestion.pairB).toHaveLength(2);
        expect(suggestion.balanceDelta).toBeGreaterThanOrEqual(0);
        const allAssigned = [...suggestion.pairA, ...suggestion.pairB].map((p) => p.id);
        expect(allAssigned).toHaveLength(4);
        expect(new Set(allAssigned).size).toBe(4);
      }
    });

    it('starts community match and invokes onStart callback', async () => {
      const onStart = vi.fn();
      render(<CommunityMatchSetup onStart={onStart} />);

      const startButton = screen.getByRole('button', { name: /Start Match/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(onStart).toHaveBeenCalled();
      });
      expect(useMatchStore.getState().match).not.toBeNull();
    });

    it('allows choosing scoring systems and stores selection in localStorage', async () => {
      const onStart = vi.fn();
      render(<CommunityMatchSetup onStart={onStart} />);

      // Verify all scoring systems are visible
      expect(screen.getByText('Rally 21 (BWF)')).toBeInTheDocument();
      expect(screen.getByText('Rally 15')).toBeInTheDocument();
      expect(screen.getByText('Rally 11')).toBeInTheDocument();
      expect(screen.getByText('Service 15')).toBeInTheDocument();
      expect(screen.getByText('Service 11')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();

      // Click Service 15
      fireEvent.click(screen.getByText('Service 15'));

      // Check localStorage if available in environment
      if (typeof window !== 'undefined' && window.localStorage) {
        expect(window.localStorage.getItem('rallypoint_last_scoring_format')).toBe('SERVICE_POINT_15');
      }

      // Click coin toss
      const tossBtn = screen.getByRole('button', { name: /Toss/i });
      fireEvent.click(tossBtn);

      // Start match in Service 15
      const startButton = screen.getByRole('button', { name: /Start Match/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(onStart).toHaveBeenCalled();
      });
      expect(useMatchStore.getState().scoringFormat).toBe('SERVICE_POINT_15');
    });
  });
});
