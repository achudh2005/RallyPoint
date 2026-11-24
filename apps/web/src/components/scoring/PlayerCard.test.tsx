import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerCard } from './PlayerCard.js';

describe('PlayerCard Component (Phase 2)', () => {
  it('renders player name, avatar, live stats, and action buttons', () => {
    const onPoint = vi.fn();
    const onDrop = vi.fn();

    render(
      <PlayerCard
        playerId="p-viktor"
        name="Viktor Axelsen"
        side="A"
        isServer={true}
        courtPosition="RIGHT"
        pointsWon={8}
        drops={2}
        netContribution={6}
        onPoint={onPoint}
        onDrop={onDrop}
      />
    );

    expect(screen.getByText('Viktor Axelsen')).toBeInTheDocument();
    expect(screen.getByText('VA')).toBeInTheDocument(); // Initials
    expect(screen.getByText('SERVING')).toBeInTheDocument();
    expect(screen.getByText('8 pts')).toBeInTheDocument();
    expect(screen.getByText('2 drops')).toBeInTheDocument();
    expect(screen.getByText('(+6)')).toBeInTheDocument();

    const pointBtn = screen.getByTestId('point-btn-p-viktor');
    const dropBtn = screen.getByTestId('drop-btn-p-viktor');

    expect(pointBtn).toBeInTheDocument();
    expect(dropBtn).toBeInTheDocument();

    // Check minimum 64dp styling
    expect(pointBtn.className).toContain('min-h-[64px]');
    expect(dropBtn.className).toContain('min-h-[64px]');

    // Test clicks
    fireEvent.click(pointBtn);
    expect(onPoint).toHaveBeenCalledWith('p-viktor');

    fireEvent.click(dropBtn);
    expect(onDrop).toHaveBeenCalledWith('p-viktor');
  });

  it('supports button label variations and compact layout', () => {
    const onPoint = vi.fn();
    const onDrop = vi.fn();

    render(
      <PlayerCard
        playerId="p-lee"
        name="Lee Zii Jia"
        side="B"
        isServer={false}
        pointsWon={3}
        drops={1}
        netContribution={2}
        buttonLabels="WINNER_ERROR"
        layout="compact"
        onPoint={onPoint}
        onDrop={onDrop}
      />
    );

    expect(screen.getByText('WINNER')).toBeInTheDocument();
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.queryByText('SERVING')).not.toBeInTheDocument();

    const pointBtn = screen.getByTestId('point-btn-p-lee');
    expect(pointBtn.className).toContain('min-h-[52px]');
  });

  it('triggers onLongPress callback on context menu or long tap', () => {
    const onLongPress = vi.fn();

    render(
      <PlayerCard
        playerId="p-viktor"
        name="Viktor Axelsen"
        side="A"
        isServer={false}
        pointsWon={0}
        drops={0}
        netContribution={0}
        onPoint={() => {}}
        onDrop={() => {}}
        onLongPress={onLongPress}
      />
    );

    const card = screen.getByTestId('player-card-p-viktor');
    fireEvent.contextMenu(card);
    expect(onLongPress).toHaveBeenCalledWith('p-viktor');
  });
});
