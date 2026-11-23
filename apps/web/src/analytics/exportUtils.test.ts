import { describe, expect, it, vi } from 'vitest';
import { exportMatchCSV, exportMatchJSON } from './exportUtils.js';
import { createMatch } from '@rallypoint/engine';

describe('Export Utilities', () => {
  it('generates valid match CSV and clicks download link', () => {
    const match = createMatch({
      id: 'm-exp',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['v'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['l'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'v',
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportMatchCSV(match, [
      {
        id: 'pt-1',
        matchId: 'm-exp',
        timestamp: 1000,
        type: 'POINT',
        side: 'A',
      },
    ]);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('generates valid match JSON export', () => {
    const match = createMatch({
      id: 'm-exp-json',
      mode: 'singles',
      bestOf: 3,
      pointsToWinGame: 21,
      tiebreakCap: 30,
      sideA: { id: 'sa', name: 'Viktor', playerIds: ['v'] },
      sideB: { id: 'sb', name: 'Lee', playerIds: ['l'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'v',
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test');
    window.URL.revokeObjectURL = vi.fn();

    exportMatchJSON(match, []);
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
