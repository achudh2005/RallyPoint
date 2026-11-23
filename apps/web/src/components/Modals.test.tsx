import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PointLog } from './PointLog.js';
import { RallyTagModal } from './RallyTagModal.js';
import { createMatch } from '@rallypoint/engine';

describe('PointLog Component', () => {
  it('renders point entries and handles close', () => {
    const match = createMatch({
      id: 'm1',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['v'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['l'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'v',
    });

    const onClose = vi.fn();
    render(
      <PointLog
        events={[
          {
            id: 'pt-1',
            matchId: 'm1',
            timestamp: 1000,
            type: 'POINT',
            side: 'A',
            rallyEndType: 'SMASH',
          },
        ]}
        state={match}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Point-by-Point Log')).toBeInTheDocument();
    expect(screen.getByText('SMASH')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('RallyTagModal Component', () => {
  it('renders options and triggers selection callback', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    render(
      <RallyTagModal
        side="A"
        sideName="Viktor"
        onSelectTag={onSelect}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Tag Rally Ending')).toBeInTheDocument();

    const smashBtn = screen.getByRole('button', { name: /smash/i });
    fireEvent.click(smashBtn);
    expect(onSelect).toHaveBeenCalledWith('SMASH');

    const skipBtn = screen.getByRole('button', { name: /skip tagging/i });
    fireEvent.click(skipBtn);
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});
