import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ApplePlayersScreen } from './ApplePlayersScreen.js';

describe('ApplePlayersScreen Component (Phase 3)', () => {
  it('renders players list and search input', () => {
    render(<ApplePlayersScreen />);

    expect(screen.getByRole('heading', { name: 'Players' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search players/i)).toBeInTheDocument();
  });

  it('filters players when searching', () => {
    render(<ApplePlayersScreen />);

    const searchInput = screen.getByPlaceholderText(/search players/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-player-xyz' } });

    expect(screen.getByText(/no players found/i)).toBeInTheDocument();
  });

  it('opens add player bottom sheet modal', () => {
    render(<ApplePlayersScreen />);

    const addBtn = screen.getByLabelText('Add Player');
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Player')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\., Lin Dan/i)).toBeInTheDocument();
  });
});
