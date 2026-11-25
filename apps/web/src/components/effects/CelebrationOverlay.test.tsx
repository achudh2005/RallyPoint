import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CelebrationOverlay, type CelebrationConfig } from './CelebrationOverlay.js';
import { useMatchStore } from '../../store/matchStore.js';

const SAMPLE_CONFIG: CelebrationConfig = {
  id: 'ev-shutout-1',
  kind: 'SHUTOUT_GAME',
  title: 'SHUTOUT',
  scoreText: '7–0',
  subtitle: 'Anu & Vikram win without conceding a point',
  winners: [
    { id: 'a1', name: 'Anu' },
    { id: 'a2', name: 'Vikram' },
  ],
  isMatchWin: false,
};

describe('CelebrationOverlay & Shutout Live Integration (Phase 2B/2C)', () => {
  beforeEach(() => {
    useMatchStore.getState().resetMatch();
  });

  it('steps deterministically through all 6 named beats using testClockMs', () => {
    const beats: [number, string][] = [
      [100, 'impact'],
      [400, 'slam'],
      [1000, 'particles'],
      [1500, 'title'],
      [2000, 'spotlight'],
      [2800, 'settle'],
    ];

    for (const [ms, expectedBeat] of beats) {
      const { unmount } = render(
        <CelebrationOverlay
          config={SAMPLE_CONFIG}
          intensity="full"
          soundEnabled={false}
          hapticsEnabled={false}
          onComplete={vi.fn()}
          testClockMs={ms}
        />
      );
      const overlay = screen.getByTestId('celebration-overlay');
      expect(overlay.getAttribute('data-beat')).toBe(expectedBeat);
      unmount();
    }
  });

  it('allows instant skip on tap and immediate cancel via Undo', () => {
    const onComplete = vi.fn();
    const onUndo = vi.fn();
    render(
      <CelebrationOverlay
        config={SAMPLE_CONFIG}
        intensity="full"
        soundEnabled={false}
        hapticsEnabled={false}
        onComplete={onComplete}
        onUndo={onUndo}
        testClockMs={2500}
      />
    );

    fireEvent.click(screen.getByTestId('celebration-undo-btn'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('celebration-overlay'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('respects intensity="reduced" and intensity="off"', () => {
    const onCompleteOff = vi.fn();
    render(
      <CelebrationOverlay
        config={SAMPLE_CONFIG}
        intensity="off"
        soundEnabled={false}
        hapticsEnabled={false}
        onComplete={onCompleteOff}
      />
    );
    expect(onCompleteOff).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('celebration-overlay')).not.toBeInTheDocument();

    render(
      <CelebrationOverlay
        config={SAMPLE_CONFIG}
        intensity="reduced"
        soundEnabled={false}
        hapticsEnabled={false}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByTestId('celebration-overlay')).toBeInTheDocument();
    expect(screen.getByText('7–0')).toBeInTheDocument();
  });

  it('triggers pendingShutoutCelebration once in matchStore and cancels cleanly on undoAction', async () => {
    const store = useMatchStore.getState();
    await store.startMatch({
      id: 'm-shutout-live',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      scoringFormat: 'RALLY_21',
      sideA: { id: 'sa', name: 'Anu', playerIds: ['a1'] },
      sideB: { id: 'sb', name: 'Rahul', playerIds: ['b1'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'a1',
      shutout: { enabled: true, target: 7, effect: 'GAME', applyInDecider: true },
    });

    for (let i = 0; i < 7; i++) {
      await useMatchStore.getState().recordPlayerAction('a1', 'POINT');
    }

    const afterShutout = useMatchStore.getState();
    expect(afterShutout.pendingShutoutCelebration).not.toBeNull();
    expect(afterShutout.pendingShutoutCelebration?.scoreA).toBe(7);
    expect(afterShutout.pendingShutoutCelebration?.scoreB).toBe(0);
    expect(afterShutout.playedCelebrationIds).toHaveLength(1);

    // Undo cancels celebration and restores 6-0
    await useMatchStore.getState().undoAction();
    const afterUndo = useMatchStore.getState();
    expect(afterUndo.pendingShutoutCelebration).toBeNull();
    expect(afterUndo.match?.currentScoreA).toBe(6);
    expect(afterUndo.match?.currentGameNumber).toBe(1);
  });
});
