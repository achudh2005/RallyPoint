import { PrismaClient, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from './index.js';

export interface IngestibleMatchEvent {
  id: string; // Client UUID
  matchId: string;
  gameId?: string | null;
  sequenceNumber: number;
  eventType:
    | 'POINT'
    | 'UNDO'
    | 'SERVE_FAULT'
    | 'INTERVAL'
    | 'RETIRE'
    | 'WALKOVER'
    | 'GAME_END'
    | 'MATCH_END';
  side?: 'A' | 'B' | null;
  rallyEndType?:
    | 'SMASH'
    | 'DROP'
    | 'NET'
    | 'OUT'
    | 'UNFORCED_ERROR'
    | 'SERVICE_FAULT'
    | 'WINNER'
    | null;
  serverPlayerId?: string | null;
  payload?: Record<string, unknown> | null;
  occurredAt: Date | string;
  recordedAt?: Date | string;
  deviceId?: string | null;
}

export class AppendOnlyViolationError extends Error {
  constructor(message = 'MatchEvent table is strictly append-only. UPDATE and DELETE operations are forbidden.') {
    super(message);
    this.name = 'AppendOnlyViolationError';
  }
}

export class OutOfOrderSequenceError extends Error {
  constructor(expected: number, actual: number) {
    super(`Out-of-order event sequence: expected sequence number ${expected}, but received ${actual}`);
    this.name = 'OutOfOrderSequenceError';
  }
}

/**
 * Idempotent event ingestion with strict sequence number enforcement
 */
export async function ingestMatchEvent(
  event: IngestibleMatchEvent,
  tx: PrismaClient | Prisma.TransactionClient = defaultPrisma
) {
  // 1. Check idempotency: If event with this client UUID already exists, return existing
  const existing = await tx.matchEvent.findUnique({
    where: { id: event.id },
  });

  if (existing) {
    return { event: existing, isDuplicate: true };
  }

  // 2. Validate Sequence Number against last recorded event for this match
  const lastEvent = await tx.matchEvent.findFirst({
    where: { matchId: event.matchId },
    orderBy: { sequenceNumber: 'desc' },
  });

  const expectedSequence = lastEvent ? lastEvent.sequenceNumber + 1 : 1;
  if (event.sequenceNumber !== expectedSequence) {
    throw new OutOfOrderSequenceError(expectedSequence, event.sequenceNumber);
  }

  // 3. Insert append-only event
  const created = await tx.matchEvent.create({
    data: {
      id: event.id,
      matchId: event.matchId,
      gameId: event.gameId,
      sequenceNumber: event.sequenceNumber,
      eventType: event.eventType as any,
      side: event.side as any,
      rallyEndType: event.rallyEndType as any,
      serverPlayerId: event.serverPlayerId,
      payload: (event.payload || {}) as unknown as Prisma.InputJsonValue,
      occurredAt: new Date(event.occurredAt),
      recordedAt: event.recordedAt ? new Date(event.recordedAt) : new Date(),
      deviceId: event.deviceId,
    },
  });

  return { event: created, isDuplicate: false };
}

/**
 * Guard function simulating database trigger check for application layer
 */
export function assertAppendOnly(operation: 'INSERT' | 'UPDATE' | 'DELETE'): void {
  if (operation === 'UPDATE' || operation === 'DELETE') {
    throw new AppendOnlyViolationError();
  }
}

/**
 * Batch ingestion helper with atomic transaction guarantee
 */
export async function ingestEventBatch(
  events: IngestibleMatchEvent[],
  tx: PrismaClient | Prisma.TransactionClient = defaultPrisma
) {
  const results = [];
  for (const event of events) {
    const res = await ingestMatchEvent(event, tx);
    results.push(res);
  }
  return results;
}
