import { describe, it, expect, vi } from 'vitest';
import {
  ingestMatchEvent,
  ingestEventBatch,
  assertAppendOnly,
  AppendOnlyViolationError,
  OutOfOrderSequenceError,
  IngestibleMatchEvent,
} from './eventIngestion.js';

describe('Database Phase 2: Append-Only MatchEvent Layer', () => {
  const sampleEvent: IngestibleMatchEvent = {
    id: 'evt-client-uuid-1',
    matchId: 'match-100',
    sequenceNumber: 1,
    eventType: 'POINT',
    side: 'A',
    rallyEndType: 'SMASH',
    occurredAt: new Date(),
    payload: { scoreA: 1, scoreB: 0 },
  };

  it('appends a new event when sequence matches', async () => {
    const mockTx = {
      matchEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null), // No previous events
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };

    const res = await ingestMatchEvent(sampleEvent, mockTx as any);
    expect(res.isDuplicate).toBe(false);
    expect(res.event.id).toBe('evt-client-uuid-1');
    expect(res.event.sequenceNumber).toBe(1);
    expect(mockTx.matchEvent.create).toHaveBeenCalled();
  });

  it('idempotently handles duplicate client UUID without duplicating', async () => {
    const existingEvent = { ...sampleEvent, id: 'evt-client-uuid-1' };
    const mockTx = {
      matchEvent: {
        findUnique: vi.fn().mockResolvedValue(existingEvent),
        create: vi.fn(),
      },
    };

    const res = await ingestMatchEvent(sampleEvent, mockTx as any);
    expect(res.isDuplicate).toBe(true);
    expect(res.event.id).toBe('evt-client-uuid-1');
    expect(mockTx.matchEvent.create).not.toHaveBeenCalled();
  });

  it('rejects out-of-order event sequence', async () => {
    const mockTx = {
      matchEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({ sequenceNumber: 1 }), // Last is seq 1
      },
    };

    const outOfOrderEvent: IngestibleMatchEvent = {
      ...sampleEvent,
      id: 'evt-client-uuid-3',
      sequenceNumber: 3, // Expected 2!
    };

    await expect(ingestMatchEvent(outOfOrderEvent, mockTx as any)).rejects.toThrow(
      OutOfOrderSequenceError
    );
  });

  it('enforces append-only rule and forbids UPDATE and DELETE operations', () => {
    expect(() => assertAppendOnly('INSERT')).not.toThrow();
    expect(() => assertAppendOnly('UPDATE')).toThrow(AppendOnlyViolationError);
    expect(() => assertAppendOnly('DELETE')).toThrow(AppendOnlyViolationError);
  });

  it('ingests batch of sequential events successfully', async () => {
    let currentSeq = 0;
    const store: Record<string, any> = {};

    const mockTx = {
      matchEvent: {
        findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(store[where.id] || null)),
        findFirst: vi.fn().mockImplementation(() =>
          Promise.resolve(currentSeq > 0 ? { sequenceNumber: currentSeq } : null)
        ),
        create: vi.fn().mockImplementation(({ data }) => {
          store[data.id] = data;
          currentSeq = data.sequenceNumber;
          return Promise.resolve(data);
        }),
      },
    };

    const batch: IngestibleMatchEvent[] = [
      { ...sampleEvent, id: 'evt-1', sequenceNumber: 1 },
      { ...sampleEvent, id: 'evt-2', sequenceNumber: 2, side: 'B' },
      { ...sampleEvent, id: 'evt-3', sequenceNumber: 3, side: 'A' },
    ];

    const results = await ingestEventBatch(batch, mockTx as any);
    expect(results.length).toBe(3);
    expect(results.every((r) => !r.isDuplicate)).toBe(true);
    expect(results[2]?.event.sequenceNumber).toBe(3);
  });
});
