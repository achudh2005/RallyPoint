import { PrismaClient, DominantHand, PlayerStatus, MatchStatus, MatchType, ScoringFormat, MatchSideEnum, MatchEventType, RallyEndTypeEnum } from '@prisma/client';

const prisma = new PrismaClient();

interface LoadTestOptions {
  playerCount?: number;
  matchCount?: number;
  eventsPerMatch?: number;
  batchSize?: number;
  dryRun?: boolean;
}

/**
 * High-performance streaming load generator for database benchmarks.
 * Capable of populating 100,000 players and 5,000,000 append-only events.
 */
export async function runLoadTestSeed(options: LoadTestOptions = {}) {
  const {
    playerCount = 1000, // Configurable: Set to 100_000 for full 5M benchmark
    matchCount = 100,
    eventsPerMatch = 50,
    batchSize = 500,
    dryRun = false,
  } = options;

  console.log(`\n======================================================`);
  console.log(`🚀 RallyPoint Database Synthetic Load Test Generator`);
  console.log(`Target: ${playerCount.toLocaleString()} Players | ${matchCount.toLocaleString()} Matches | ~${(matchCount * eventsPerMatch).toLocaleString()} Events`);
  console.log(`Batch Size: ${batchSize} | Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`======================================================\n`);

  const startTime = Date.now();

  if (dryRun) {
    console.log(`[DryRun] Simulated generation completed in ${(Date.now() - startTime).toFixed(1)}ms`);
    return {
      playersCreated: playerCount,
      matchesCreated: matchCount,
      eventsCreated: matchCount * eventsPerMatch,
      elapsedMs: Date.now() - startTime,
    };
  }

  // 1. Generate Players in Batches
  console.log(`Generating ${playerCount.toLocaleString()} synthetic players...`);
  const firstNames = ['Viktor', 'Kento', 'Lee', 'Shi', 'Anthony', 'Chou', 'Jonatan', 'Anders', 'Loh', 'Lakshya'];
  const lastNames = ['Axelsen', 'Momota', 'Chong Wei', 'Yuqi', 'Ginting', 'Tien Chen', 'Christie', 'Antonsen', 'Kean Yew', 'Sen'];
  const countries = ['DEN', 'JPN', 'MAS', 'CHN', 'INA', 'TPE', 'INA', 'DEN', 'SGP', 'IND'];

  const playerIds: string[] = [];
  let playersInserted = 0;

  for (let i = 0; i < playerCount; i += batchSize) {
    const chunk = Math.min(batchSize, playerCount - i);
    const playerBatch = [];

    for (let j = 0; j < chunk; j++) {
      const idx = i + j;
      const fn = firstNames[idx % firstNames.length] ?? 'Player';
      const ln = lastNames[idx % lastNames.length] ?? 'Athlete';
      const id = `load-player-${idx + 1}`;
      playerIds.push(id);

      playerBatch.push({
        id,
        firstName: fn,
        lastName: `${ln} ${idx + 1}`,
        displayName: `${fn} ${ln} ${idx + 1}`,
        gender: idx % 2 === 0 ? 'M' : 'F',
        nationality: countries[idx % countries.length] ?? 'DEN',
        dominantHand: idx % 10 === 0 ? DominantHand.LEFT : DominantHand.RIGHT,
        heightCm: 175 + (idx % 25),
        weightKg: 68 + (idx % 20),
        status: PlayerStatus.ACTIVE,
      });
    }

    try {
      await prisma.player.createMany({
        data: playerBatch,
        skipDuplicates: true,
      });
      playersInserted += chunk;
      if (playersInserted % 2500 === 0 || playersInserted === playerCount) {
        console.log(`  -> Inserted ${playersInserted.toLocaleString()} / ${playerCount.toLocaleString()} players`);
      }
    } catch (err: any) {
      console.warn(`  [Warning] Player batch write: ${err.message}`);
    }
  }

  // 2. Generate Matches & Append-Only Events
  console.log(`\nGenerating ${matchCount.toLocaleString()} matches and ${(matchCount * eventsPerMatch).toLocaleString()} events...`);
  let matchesInserted = 0;
  let eventsInserted = 0;

  for (let m = 0; m < matchCount; m++) {
    const matchId = `load-match-${m + 1}`;
    const p1 = playerIds[m % playerIds.length] || 'player-viktor-axelsen';
    const p2 = playerIds[(m + 1) % playerIds.length] || 'player-lee-zii-jia';

    try {
      await prisma.match.create({
        data: {
          id: matchId,
          matchType: MatchType.SINGLES,
          scoringFormat: ScoringFormat.RALLY_21,
          status: MatchStatus.COMPLETED,
          clientUuid: `load-client-uuid-${m + 1}`,
          winnerSide: MatchSideEnum.A,
          startedAt: new Date(Date.now() - 3600000),
          endedAt: new Date(),
          sides: {
            create: [
              { side: MatchSideEnum.A },
              { side: MatchSideEnum.B },
            ],
          },
          participants: {
            create: [
              { side: MatchSideEnum.A, playerId: p1, position: 1 },
              { side: MatchSideEnum.B, playerId: p2, position: 1 },
            ],
          },
          games: {
            create: [
              { gameNumber: 1, scoreA: 21, scoreB: 18, winnerSide: MatchSideEnum.A },
              { gameNumber: 2, scoreA: 21, scoreB: 15, winnerSide: MatchSideEnum.A },
            ],
          },
        },
      });
      matchesInserted++;

      // Generate append-only events
      const eventBatch = [];
      for (let s = 1; s <= eventsPerMatch; s++) {
        const side = s % 2 === 1 ? MatchSideEnum.A : MatchSideEnum.B;
        eventBatch.push({
          id: `load-evt-${m + 1}-${s}`,
          matchId,
          sequenceNumber: s,
          eventType: MatchEventType.POINT,
          side,
          rallyEndType: s % 3 === 0 ? RallyEndTypeEnum.SMASH : RallyEndTypeEnum.WINNER,
          serverPlayerId: side === MatchSideEnum.A ? p1 : p2,
          occurredAt: new Date(Date.now() - (eventsPerMatch - s) * 20000),
        });
      }

      await prisma.matchEvent.createMany({
        data: eventBatch,
        skipDuplicates: true,
      });
      eventsInserted += eventsPerMatch;

      if ((m + 1) % 50 === 0 || m + 1 === matchCount) {
        console.log(`  -> Processed ${m + 1} matches (${eventsInserted.toLocaleString()} events)`);
      }
    } catch (err: any) {
      // Ignored for idempotency in load tests
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n======================================================`);
  console.log(`✅ Synthetic Load Generation Complete in ${durationSec}s`);
  console.log(`- Players: ${playersInserted.toLocaleString()}`);
  console.log(`- Matches: ${matchesInserted.toLocaleString()}`);
  console.log(`- Events:  ${eventsInserted.toLocaleString()}`);
  console.log(`======================================================\n`);

  return {
    playersCreated: playersInserted,
    matchesCreated: matchesInserted,
    eventsCreated: eventsInserted,
    durationSeconds: parseFloat(durationSec),
  };
}

if (process.argv[1]?.endsWith('loadTestSeed.ts') || process.argv[1]?.endsWith('loadTestSeed.js')) {
  runLoadTestSeed({ playerCount: 500, matchCount: 50, eventsPerMatch: 30 })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
