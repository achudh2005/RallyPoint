import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { AppleScoringScreen } from './AppleScoringScreen.js';
import { useMatchStore } from '../../store/matchStore.js';
import { db } from '../../db/index.js';

describe('AppleScoringScreen Component (Phase 2)', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
    await useMatchStore.getState().startMatch({
      id: 'm-apple-1',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor Axelsen', playerIds: ['p-viktor'] },
      sideB: { id: 'sb', name: 'Lee Zii Jia', playerIds: ['p-lee'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p-viktor',
    });
  });

  it('renders top bar, scoreboard, and player cards with POINT and DROP buttons', () => {
    render(<AppleScoringScreen />);

    expect(screen.getAllByText('Viktor Axelsen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lee Zii Jia').length).toBeGreaterThan(0);
    expect(screen.getByText('Game 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Rally 21')).toBeInTheDocument();

    // Player action buttons
    const pointBtnA = screen.getByTestId('point-btn-p-viktor');
    const dropBtnA = screen.getByTestId('drop-btn-p-viktor');
    const pointBtnB = screen.getByTestId('point-btn-p-lee');
    const dropBtnB = screen.getByTestId('drop-btn-p-lee');

    expect(pointBtnA).toBeInTheDocument();
    expect(dropBtnA).toBeInTheDocument();
    expect(pointBtnB).toBeInTheDocument();
    expect(dropBtnB).toBeInTheDocument();
  });

  it('scoring with Player Action POINT awards point and updates player stats', async () => {
    render(<AppleScoringScreen />);

    const pointBtnA = screen.getByTestId('point-btn-p-viktor');
    await act(async () => {
      fireEvent.click(pointBtnA);
    });

    const state = useMatchStore.getState();
    expect(state.match?.currentScoreA).toBe(1);
    expect(state.match?.currentScoreB).toBe(0);
    expect(state.scoringRulesState?.playerStats['p-viktor']?.pointsWon).toBe(1);
    expect(state.scoringRulesState?.playerStats['p-viktor']?.netContribution).toBe(1);
  });

  it('scoring with Player Action DROP awards point to opposing side and increments drops', async () => {
    render(<AppleScoringScreen />);

    // Lee Zii Jia (Side B) commits a DROP
    const dropBtnB = screen.getByTestId('drop-btn-p-lee');
    await act(async () => {
      fireEvent.click(dropBtnB);
    });

    const state = useMatchStore.getState();
    expect(state.match?.currentScoreA).toBe(1);
    expect(state.match?.currentScoreB).toBe(0);
    expect(state.scoringRulesState?.playerStats['p-lee']?.drops).toBe(1);
    expect(state.scoringRulesState?.playerStats['p-lee']?.netContribution).toBe(-1);
  });

  it('tapping big team score registers an unattributed point with Unassigned badge', async () => {
    render(<AppleScoringScreen />);

    const sideAScoreBtn = screen.getByTestId('team-score-btn-A');
    expect(sideAScoreBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(sideAScoreBtn);
    });

    const state = useMatchStore.getState();
    expect(state.match?.currentScoreA).toBe(1);
    expect(state.scoringRulesState?.unassignedPoints.sideA).toBe(1);
  });

  it('undo reverts score and displays floating pill toast', async () => {
    render(<AppleScoringScreen />);

    const pointBtnA = screen.getByTestId('point-btn-p-viktor');
    await act(async () => {
      fireEvent.click(pointBtnA);
    });

    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);

    const undoBtn = screen.getByRole('button', { name: /undo/i });
    await act(async () => {
      fireEvent.click(undoBtn);
    });

    expect(useMatchStore.getState().match?.currentScoreA).toBe(0);
    // Floating toast shows description
    const toast = await screen.findByText(/POINT undone/i);
    expect(toast).toBeInTheDocument();
  });

  it('prevents accidental rapid double-taps within 300ms debounce window', async () => {
    render(<AppleScoringScreen />);

    const pointBtnA = screen.getByTestId('point-btn-p-viktor');
    await act(async () => {
      fireEvent.click(pointBtnA);
      fireEvent.click(pointBtnA); // Immediate second tap
    });

    // Score should only increment once due to 300ms debounce
    expect(useMatchStore.getState().match?.currentScoreA).toBe(1);
  });

  it('opens Quick Edit sheet and re-attributes action', async () => {
    render(<AppleScoringScreen />);

    const pointBtnA = screen.getByTestId('point-btn-p-viktor');
    await act(async () => {
      fireEvent.click(pointBtnA);
    });

    // Open Quick Edit Sheet
    const editBtn = screen.getByLabelText('Edit recent actions');
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Recent Actions')).toBeInTheDocument();
    expect(screen.getByText(/Change/i)).toBeInTheDocument();

    // Click Change to open options
    fireEvent.click(screen.getByText('Change'));

    // Re-attribute to Lee Zii Jia using specific testid
    const targetPlayerBtn = screen.getByTestId('reattribute-btn-p-lee');
    await act(async () => {
      fireEvent.click(targetPlayerBtn);
    });

    const state = useMatchStore.getState();
    expect(state.scoringRulesState?.playerStats['p-viktor']?.pointsWon).toBe(0);
    expect(state.scoringRulesState?.playerStats['p-lee']?.pointsWon).toBe(1);
  });

  describe('Device Viewport Touch Targets (iQOO Neo 10 & Small Phone)', () => {
    it('verifies touch targets >= 64dp on 393x873 (iQOO Neo 10 tall display)', () => {
      window.innerWidth = 393;
      window.innerHeight = 873;

      render(<AppleScoringScreen />);

      const pointBtn = screen.getByTestId('point-btn-p-viktor');
      const dropBtn = screen.getByTestId('drop-btn-p-viktor');

      expect(pointBtn.className).toContain('min-h-[64px]');
      expect(dropBtn.className).toContain('min-h-[64px]');
      // Gap >= 12dp (gap-3 = 12px)
      expect(pointBtn.parentElement?.className).toContain('gap-3');
    });

    it('verifies touch targets >= 64dp and spaced >= 12dp on 360x800 (small phone)', () => {
      window.innerWidth = 360;
      window.innerHeight = 800;

      render(<AppleScoringScreen />);

      const pointBtn = screen.getByTestId('point-btn-p-viktor');
      const dropBtn = screen.getByTestId('drop-btn-p-viktor');

      expect(pointBtn.className).toContain('min-h-[64px]');
      expect(dropBtn.className).toContain('min-h-[64px]');
      expect(pointBtn.parentElement?.className).toContain('gap-3');
    });

    it('triggers streak alert banner when player reaches 3 consecutive points', async () => {
      render(<AppleScoringScreen />);

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await useMatchStore.getState().recordPlayerAction('p-viktor', 'POINT');
        });
      }

      expect(screen.getByTestId('streak-banner')).toBeInTheDocument();
      expect(screen.getByText(/Viktor Axelsen is on fire: 3 points in a row/i)).toBeInTheDocument();
    });

    it('renders mid-match MVP peek chip after 5 attributed player actions', async () => {
      render(<AppleScoringScreen />);

      // Record 5 attributed actions for Viktor Axelsen
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await useMatchStore.getState().recordPlayerAction('p-viktor', 'POINT');
        });
      }

      const peekChip = screen.getByTestId('mid-match-mvp-peek-chip');
      expect(peekChip).toBeInTheDocument();
      expect(peekChip.textContent).toContain('Viktor Axelsen');
    });

    it('opens auto dropper attribution popup on doubles POINT and attributes drop or Both Fault', async () => {
      useMatchStore.getState().resetMatch();
      await useMatchStore.getState().startMatch({
        id: 'm-doubles-popup',
        mode: 'doubles',
        bestOf: 3,
        pointsToWinGame: 21,
        tiebreakCap: 30,
        sideA: {
          id: 'sa',
          name: 'Viktor & Anders',
          playerIds: ['p-viktor', 'p-antonsen'],
          playerNames: ['Viktor Axelsen', 'Anders Antonsen'],
        },
        sideB: {
          id: 'sb',
          name: 'Momota & Shi',
          playerIds: ['p-momota', 'p-shi'],
          playerNames: ['Kento Momota', 'Shi Yuqi'],
        },
        initialServerSide: 'A',
        initialServerPlayerId: 'p-viktor',
      });

      render(<AppleScoringScreen />);

      const pointBtn = screen.getByTestId('point-btn-p-viktor');
      await act(async () => {
        fireEvent.click(pointBtn);
      });

      const sheet = await screen.findByTestId('auto-dropper-sheet');
      expect(sheet).toBeInTheDocument();
      expect(screen.getByTestId('dropper-btn-p-momota')).toBeInTheDocument();
      expect(screen.getByTestId('dropper-btn-p-shi')).toBeInTheDocument();
      expect(screen.getByTestId('dropper-btn-both-fault')).toBeInTheDocument();

      // Click Momota dropped
      await act(async () => {
        fireEvent.click(screen.getByTestId('dropper-btn-p-momota'));
      });

      const stats = useMatchStore.getState().scoringRulesState?.playerStats;
      expect(stats?.['p-viktor']?.pointsWon).toBe(1);
      expect(stats?.['p-momota']?.drops).toBe(1);

      // Advance time past 300ms debounce and test Both Fault
      await new Promise((r) => setTimeout(r, 320));
      await act(async () => {
        fireEvent.click(screen.getByTestId('point-btn-p-viktor'));
      });
      await screen.findByTestId('auto-dropper-sheet');
      await act(async () => {
        fireEvent.click(screen.getByTestId('dropper-btn-both-fault'));
      });

      const statsAfter = useMatchStore.getState().scoringRulesState?.playerStats;
      expect(statsAfter?.['p-viktor']?.pointsWon).toBe(2);
      expect(statsAfter?.['p-momota']?.drops).toBe(1.5);
      expect(statsAfter?.['p-shi']?.drops).toBe(0.5);
    });
  });
});
