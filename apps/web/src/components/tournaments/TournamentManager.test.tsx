import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TournamentManager } from './TournamentManager.js';

describe('TournamentManager Component', () => {
  it('renders tournament manager and switches formats', () => {
    const onClose = vi.fn();
    render(<TournamentManager onClose={onClose} />);

    expect(screen.getByText('🏆 Tournament Manager')).toBeInTheDocument();
    expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
    expect(screen.getByText('Standings & Tiebreakers')).toBeInTheDocument();

    const select = screen.getByDisplayValue('Single Elimination Knockout');
    fireEvent.change(select, { target: { value: 'ROUND_ROBIN' } });
    expect(screen.getByText('Round Robin Schedule')).toBeInTheDocument();

    const exitBtn = screen.getByRole('button', { name: /exit tournament/i });
    fireEvent.click(exitBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
