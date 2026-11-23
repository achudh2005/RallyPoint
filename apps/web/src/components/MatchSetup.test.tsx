import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MatchSetup } from './MatchSetup.js';
import { useMatchStore } from '../store/matchStore.js';
import { db } from '../db/index.js';

describe('MatchSetup Component', () => {
  beforeEach(async () => {
    await db.matches.clear();
    useMatchStore.getState().resetMatch();
  });

  it('renders form inputs and initiates match on submit', async () => {
    render(<MatchSetup />);

    expect(screen.getByText(/RallyPoint/i)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Player 1 Name').length).toBe(2);

    const submitBtn = screen.getByRole('button', { name: /start match/i });
    fireEvent.click(submitBtn);

    expect(useMatchStore.getState().match).not.toBeNull();
    expect(useMatchStore.getState().match?.config.sideA.name).toBe('Viktor Axelsen');
  });

  it('switches between singles and doubles mode', () => {
    render(<MatchSetup />);

    const doublesBtn = screen.getByRole('button', { name: /^doubles$/i });
    fireEvent.click(doublesBtn);

    expect(screen.getAllByPlaceholderText('Player 2 Name').length).toBe(2);
  });
});
