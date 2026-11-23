import { describe, it, expect, vi } from 'vitest';
import { updatePlayerWithAudit, softDeletePlayer } from './index.js';

describe('Database Phase 1: Core Master Data Logic', () => {
  it('updates player and creates history snapshot', async () => {
    const mockCurrentPlayer = {
      id: 'player-test-1',
      displayName: 'Viktor Axelsen',
      status: 'ACTIVE',
      heightCm: 194,
      deletedAt: null,
    };

    const mockTx = {
      player: {
        findUnique: vi.fn().mockResolvedValue(mockCurrentPlayer),
        update: vi.fn().mockResolvedValue({
          ...mockCurrentPlayer,
          heightCm: 195,
        }),
      },
      playerProfileHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
      },
    };

    const res = await updatePlayerWithAudit(
      'player-test-1',
      { heightCm: 195 },
      'admin-user-1',
      mockTx as any
    );

    expect(mockTx.player.findUnique).toHaveBeenCalledWith({ where: { id: 'player-test-1' } });
    expect(mockTx.player.update).toHaveBeenCalledWith({
      where: { id: 'player-test-1' },
      data: { heightCm: 195 },
    });
    expect(mockTx.playerProfileHistory.create).toHaveBeenCalledWith({
      data: {
        playerId: 'player-test-1',
        snapshot: mockCurrentPlayer,
        changedBy: 'admin-user-1',
      },
    });
    expect(res.heightCm).toBe(195);
  });

  it('handles soft-delete properly with audit record', async () => {
    const mockCurrentPlayer = {
      id: 'player-test-2',
      displayName: 'Lee Zii Jia',
      status: 'ACTIVE',
      deletedAt: null,
    };

    const mockTx = {
      player: {
        findUnique: vi.fn().mockResolvedValue(mockCurrentPlayer),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({
          ...mockCurrentPlayer,
          ...data,
        })),
      },
      playerProfileHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-2' }),
      },
    };

    const res = await softDeletePlayer('player-test-2', 'admin-user-2', mockTx as any);
    expect(res.status).toBe('INACTIVE');
    expect(res.deletedAt).toBeDefined();
    expect(mockTx.playerProfileHistory.create).toHaveBeenCalled();
  });

  it('throws error when player is not found during audit update', async () => {
    const mockTx = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      playerProfileHistory: {
        create: vi.fn(),
      },
    };

    await expect(
      updatePlayerWithAudit('non-existent', { heightCm: 180 }, 'admin', mockTx as any)
    ).rejects.toThrow('Player with ID non-existent not found');
  });
});
