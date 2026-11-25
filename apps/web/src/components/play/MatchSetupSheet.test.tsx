import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MatchSetupSheet } from './MatchSetupSheet.js';
import { useMatchStore } from '../../store/matchStore.js';
import { useRankingStore } from '../../store/rankingStore.js';

describe('MatchSetupSheet Component (QA Phase 3)', () => {
  beforeEach(() => {
    useMatchStore.getState().resetMatch();
    useRankingStore.getState().resetAllData();
  });

  it('completes 3-step setup flow with custom scoring format and starts match', async () => {
    const onMatchStarted = vi.fn();
    render(
      <MatchSetupSheet isOpen={true} onClose={vi.fn()} onMatchStarted={onMatchStarted} />
    );

    // Step 1: Who's playing? Add 2 players inline
    expect(screen.getByText(/Who's playing/i)).toBeInTheDocument();
    const quickAddInput = screen.getByPlaceholderText(/Quick add player/i);
    fireEvent.change(quickAddInput, { target: { value: 'Anu' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    fireEvent.change(quickAddInput, { target: { value: 'Rahul' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Scoring/i }));

    // Step 2: How do you want to score? Open Advanced Scoring Options and set custom target
    expect(screen.getByText(/How do you want to score/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Advanced Scoring Options'));

    const targetInput = screen.getByLabelText('Custom Target Points');
    fireEvent.change(targetInput, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Server Selection/i }));

    // Step 3: Who serves first?
    expect(screen.getByText(/Who serves first/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Match/i }));
    });

    expect(onMatchStarted).toHaveBeenCalled();
    expect(useMatchStore.getState().scoringFormat).toBe('CUSTOM');
  });
});
