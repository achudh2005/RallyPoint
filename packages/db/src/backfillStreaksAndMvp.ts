import { PrismaClient } from '@prisma/client';
import { computeMatchAwards, type RankingMatchEvent } from '@rallypoint/ranking';
import { computeStreaks, type ScoringEvent } from '@rallypoint/scoring-rules';

const prisma = new PrismaClient();

/**
 * Idempotent backfill script:
 * Computes MatchAward (MVP, CO_MVP, FIGHTER) and PlayerMatchStreak records
 * for all completed matches that contain PLAYER_ACTION events.
 */
export async function backfillStreaksAndMvp() {
  const matches = await prisma.match.findMany({
    where: { status: 'COMPLETED' },
    include: {
      participants: { include: { player: true } },
      events: {
        orderBy: { sequenceNumber: 'asc' },
      },
    },
  });

  let processedMatches = 0;
  let awardsCreated = 0;
  let streaksUpserted = 0;

  for (const match of matches) {
    const hasPlayerActions = match.events.some((e) => String(e.eventType) === 'PLAYER_ACTION');
    if (!hasPlayerActions) continue;

    processedMatches++;

    const rankingEvents: RankingMatchEvent[] = match.events.map((e) => {
      const p = (e.payload as Record<string, unknown> | null) || {};
      const action = (p.action as 'POINT' | 'DROP' | null) || null;
      const playerId =
        (p.playerId as string | undefined) ||
        e.pointWinnerPlayerId ||
        e.errorPlayerId ||
        null;

      return {
        id: e.id,
        sequenceNumber: e.sequenceNumber,
        eventType: String(e.eventType) as RankingMatchEvent['eventType'],
        side: e.side as 'A' | 'B' | null,
        action,
        playerId,
        serverPlayerId: e.serverPlayerId,
        isPoint: typeof p.isPoint === 'boolean' ? p.isPoint : true,
        isSideOut: typeof p.isSideOut === 'boolean' ? p.isSideOut : false,
        payload: p,
      };
    });

    const participants = match.participants.map((p) => ({
      playerId: p.playerId,
      displayName: p.player.displayName,
      side: p.side as 'A' | 'B',
    }));

    const awardsResult = computeMatchAwards(rankingEvents, undefined, {
      matchType: match.matchType === 'DOUBLES' ? 'DOUBLES' : match.matchType === 'MIXED' ? 'MIXED' : 'SINGLES',
      scoringFormat: match.scoringFormat,
      targetPoints: match.targetPoints,
      winnerSide: (match.winnerSide as 'A' | 'B' | null) || undefined,
      bestOf: match.bestOf,
      participants,
    });

    const scoringEvents: ScoringEvent[] = match.events.map((e) => {
      const p = (e.payload as Record<string, unknown> | null) || {};
      const action = (p.action as 'POINT' | 'DROP') || 'POINT';
      const playerId =
        (p.playerId as string | undefined) ||
        e.pointWinnerPlayerId ||
        e.errorPlayerId ||
        '';
      const side = (e.side as 'A' | 'B') || 'A';

      return {
        id: e.id,
        clientUuid: (p.clientUuid as string) || e.id,
        sequenceNumber: e.sequenceNumber,
        timestamp: e.occurredAt.getTime(),
        matchId: match.id,
        gameNumber: typeof p.gameNumber === 'number' ? p.gameNumber : 1,
        type: String(e.eventType) as 'PLAYER_ACTION',
        playerId,
        side,
        action,
        resultingWinnerSide:
          action === 'POINT' ? side : side === 'A' ? 'B' : 'A',
        serverAtRally: e.serverPlayerId || '',
        servingSideAtRally: (p.servingSideAtRally as 'A' | 'B') || 'A',
        isPoint: typeof p.isPoint === 'boolean' ? p.isPoint : true,
        isSideOut: typeof p.isSideOut === 'boolean' ? p.isSideOut : false,
        scoringFormat: match.scoringFormat as any,
        occurredAt: e.occurredAt.toISOString(),
      };
    });

    const streaksResult = computeStreaks(scoringEvents);

    await prisma.$transaction(async (tx) => {
      // Idempotently replace awards for this match
      await tx.matchAward.deleteMany({ where: { matchId: match.id } });

      if (awardsResult.isQualified) {
        const toInsert: Array<{
          matchId: string;
          playerId: string;
          awardType: 'MVP' | 'CO_MVP' | 'FIGHTER';
          score: number;
          reasons: string[];
          formulaVersion: string;
        }> = [];

        if (awardsResult.coMvps.length > 1) {
          for (const co of awardsResult.coMvps) {
            toInsert.push({
              matchId: match.id,
              playerId: co.playerId,
              awardType: 'CO_MVP',
              score: co.mvpScore,
              reasons: co.reasonChips,
              formulaVersion: awardsResult.formulaVersion,
            });
          }
        } else if (awardsResult.mvp) {
          toInsert.push({
            matchId: match.id,
            playerId: awardsResult.mvp.playerId,
            awardType: 'MVP',
            score: awardsResult.mvp.mvpScore,
            reasons: awardsResult.mvp.reasonChips,
            formulaVersion: awardsResult.formulaVersion,
          });
        }

        if (awardsResult.fighter) {
          toInsert.push({
            matchId: match.id,
            playerId: awardsResult.fighter.playerId,
            awardType: 'FIGHTER',
            score: awardsResult.fighter.mvpScore,
            reasons: awardsResult.fighter.reasonChips,
            formulaVersion: awardsResult.formulaVersion,
          });
        }

        if (toInsert.length > 0) {
          await tx.matchAward.createMany({ data: toInsert });
          awardsCreated += toInsert.length;
        }
      }

      // Idempotently upsert per-player streak records
      for (const p of match.participants) {
        const rec = streaksResult.playerStreaks[p.playerId];
        const teamRun = p.side === 'A' ? streaksResult.bestTeamRuns.A : streaksResult.bestTeamRuns.B;
        await tx.playerMatchStreak.upsert({
          where: {
            matchId_playerId: {
              matchId: match.id,
              playerId: p.playerId,
            },
          },
          update: {
            bestPointStreak: rec?.bestPointStreak ?? 0,
            longestDropStreak: rec?.longestDropStreak ?? 0,
            teamRun,
          },
          create: {
            matchId: match.id,
            playerId: p.playerId,
            bestPointStreak: rec?.bestPointStreak ?? 0,
            longestDropStreak: rec?.longestDropStreak ?? 0,
            teamRun,
          },
        });
        streaksUpserted++;
      }
    });
  }

  console.log(
    `Backfill complete: ${processedMatches} matches processed, ${awardsCreated} awards written, ${streaksUpserted} streak records upserted.`
  );
  return { processedMatches, awardsCreated, streaksUpserted };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  backfillStreaksAndMvp()
    .catch((err) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
