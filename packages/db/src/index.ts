import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient();

export { PrismaClient, Prisma };

/**
 * Service hook to update a player and record a snapshot in PlayerProfileHistory
 */
export async function updatePlayerWithAudit(
  playerId: string,
  data: Prisma.PlayerUpdateInput,
  changedBy: string,
  tx: PrismaClient | Prisma.TransactionClient = prisma
) {
  const current = await tx.player.findUnique({
    where: { id: playerId },
  });

  if (!current) {
    throw new Error(`Player with ID ${playerId} not found`);
  }

  // Perform update
  const updated = await tx.player.update({
    where: { id: playerId },
    data,
  });

  // Record audit history snapshot
  await tx.playerProfileHistory.create({
    data: {
      playerId,
      snapshot: current as unknown as Prisma.InputJsonValue,
      changedBy,
    },
  });

  return updated;
}

/**
 * Soft delete player
 */
export async function softDeletePlayer(
  playerId: string,
  deletedBy: string,
  tx: PrismaClient | Prisma.TransactionClient = prisma
) {
  return updatePlayerWithAudit(
    playerId,
    { deletedAt: new Date(), status: 'INACTIVE' },
    deletedBy,
    tx
  );
}

export * from './eventIngestion.js';
