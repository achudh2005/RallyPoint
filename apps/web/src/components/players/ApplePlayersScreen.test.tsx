import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ApplePlayersScreen } from './ApplePlayersScreen.js';
import { useRankingStore } from '../../store/rankingStore.js';

describe('ApplePlayersScreen Component (Phase 3)', () => {
  beforeEach(() => {
    useRankingStore.getState().resetAllData();
  });

  it('renders empty state when no players exist, then renders list and search input', () => {
    render(<ApplePlayersScreen />);

    expect(screen.getByRole('heading', { name: 'Players' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search players/i)).toBeInTheDocument();
    expect(screen.getByText('No Players Yet')).toBeInTheDocument();
  });

  it('filters players when searching', () => {
    useRankingStore.getState().addCommunityPlayer('Anu');
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

  it('removes a player after confirmation', () => {
    render(<ApplePlayersScreen />);

    fireEvent.click(screen.getByLabelText('Add Player'));
    const input = screen.getByPlaceholderText(/e\.g\., Lin Dan/i);
    fireEvent.change(input, { target: { value: 'Temp Player' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Player' }));

    expect(screen.getByLabelText('Remove Temp Player')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove Temp Player'));
    expect(screen.getByText('Remove Player')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByLabelText('Remove Temp Player')).not.toBeInTheDocument();
  });
});
