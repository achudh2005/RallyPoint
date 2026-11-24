import { PrismaClient, DominantHand, TeamType } from '@prisma/client';
import {
  rebuildRankings,
  type RankingMatch,
  type RankingMatchEvent,
  type RankingParticipant,
} from '@rallypoint/ranking';

const prisma = new PrismaClient();

export interface CommunitySeedResult {
  playersCount: number;
  teamsCount: number;
  seasonsCount: number;
  matchesCount: number;
  eventsCount: number;
  snapshotsCount: number;
}

export async function seedCommunityRankings(): Promise<CommunitySeedResult> {
  console.log('🏸 Seeding Realistic Community Rankings & Team League Data (Phase 5)...');

  // 1. Seasons
  await prisma.season.upsert({
    where: { id: 'season-winter-2025' },
    update: {},
    create: {
      id: 'season-winter-2025',
      name: 'Winter 2025 Warmup Cup',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-01-15'),
      isActive: false,
    },
  });

  const activeSeason = await prisma.season.upsert({
    where: { id: 'season-spring-2026' },
    update: {},
    create: {
      id: 'season-spring-2026',
      name: 'Spring 2026 Community Championship',
      startDate: new Date('2026-02-01'),
      isActive: true,
    },
  });

  // 2. 12 Community Players
  const playersData = [
    { id: 'player-viktor', name: 'Viktor Axelsen', first: 'Viktor', last: 'Axelsen', hand: DominantHand.RIGHT, nat: 'DEN', bio: 'High-smash baseline powerhouse' },
    { id: 'player-lee', name: 'Lee Zii Jia', first: 'Lee', last: 'Zii Jia', hand: DominantHand.RIGHT, nat: 'MAS', bio: 'Backhand smash specialist' },
    { id: 'player-momota', name: 'Kento Momota', first: 'Kento', last: 'Momota', hand: DominantHand.LEFT, nat: 'JPN', bio: 'Tumble net and endurance tactician' },
    { id: 'player-shi', name: 'Shi Yuqi', first: 'Yuqi', last: 'Shi', hand: DominantHand.RIGHT, nat: 'CHN', bio: 'Fast cross-court steep attacking' },
    { id: 'player-ginting', name: 'Anthony Ginting', first: 'Anthony', last: 'Ginting', hand: DominantHand.RIGHT, nat: 'INA', bio: 'Explosive footwork and deception' },
    { id: 'player-jonatan', name: 'Jonatan Christie', first: 'Jonatan', last: 'Christie', hand: DominantHand.RIGHT, nat: 'INA', bio: 'Steady defense and heavy smash' },
    { id: 'player-antonsen', name: 'Anders Antonsen', first: 'Anders', last: 'Antonsen', hand: DominantHand.RIGHT, nat: 'DEN', bio: 'Tactical patience and net control' },
    { id: 'player-loh', name: 'Loh Kean Yew', first: 'Kean Yew', last: 'Loh', hand: DominantHand.RIGHT, nat: 'SGP', bio: 'Blistering racket-head speed' },
    { id: 'player-sen', name: 'Lakshya Sen', first: 'Lakshya', last: 'Sen', hand: DominantHand.RIGHT, nat: 'IND', bio: 'Acrobatic diving returns' },
    { id: 'player-prannoy', name: 'H.S. Prannoy', first: 'Prannoy', last: 'H.S.', hand: DominantHand.RIGHT, nat: 'IND', bio: 'The giant killer with deep clears' },
    { id: 'player-chou', name: 'Chou Tien Chen', first: 'Tien Chen', last: 'Chou', hand: DominantHand.RIGHT, nat: 'TPE', bio: 'Veteran stamina and rally resilience' },
    { id: 'player-kunlavut', name: 'Kunlavut Vitidsarn', first: 'Kunlavut', last: 'Vitidsarn', hand: DominantHand.RIGHT, nat: 'THA', bio: 'World champion defense-to-attack' },
  ];

  for (const p of playersData) {
    await prisma.player.upsert({
      where: { id: p.id },
      update: { displayName: p.name, bio: p.bio },
      create: {
        id: p.id,
        firstName: p.first,
        lastName: p.last,
        displayName: p.name,
        dominantHand: p.hand,
        nationality: p.nat,
        bio: p.bio,
        status: 'ACTIVE',
      },
    });
  }

  // 3. 4 Doubles Teams & Club Teams
  const teamsData = [
    { id: 'team-smash-squad', name: 'Smash Squad', type: TeamType.DOUBLES_PAIR, p1: 'player-viktor', p2: 'player-antonsen' },
    { id: 'team-net-masters', name: 'Net Masters', type: TeamType.DOUBLES_PAIR, p1: 'player-momota', p2: 'player-shi' },
    { id: 'team-baseline-bombers', name: 'Baseline Bombers', type: TeamType.CLUB_TEAM, p1: 'player-lee', p2: 'player-ginting' },
    { id: 'team-speed-demons', name: 'Speed Demons', type: TeamType.CLUB_TEAM, p1: 'player-loh', p2: 'player-sen' },
  ];

  for (const t of teamsData) {
    await prisma.team.upsert({
      where: { id: t.id },
      update: { name: t.name, type: t.type },
      create: { id: t.id, name: t.name, type: t.type },
    });

    await prisma.teamMember.upsert({
      where: { teamId_playerId_leftAt: { teamId: t.id, playerId: t.p1, leftAt: null as unknown as Date } },
      update: {},
      create: { teamId: t.id, playerId: t.p1, role: 'CAPTAIN' },
    }).catch(() => {});

    await prisma.teamMember.upsert({
      where: { teamId_playerId_leftAt: { teamId: t.id, playerId: t.p2, leftAt: null as unknown as Date } },
      update: {},
      create: { teamId: t.id, playerId: t.p2, role: 'MEMBER' },
    }).catch(() => {});
  }

  // 4. Matches Across 3 Weeks with Rich Rally Events
  const memoryRankingMatches: RankingMatch[] = [];

  const rawMatchConfigs = [
    // Week 1 Matches
    {
      id: 'comm-match-w1-1',
      date: new Date('2026-02-04T18:00:00Z'),
      seasonId: activeSeason.id,
      type: 'SINGLES' as const,
      pA1: 'player-viktor', pA1Name: 'Viktor Axelsen',
      pB1: 'player-lee', pB1Name: 'Lee Zii Jia',
      winner: 'A' as const,
      games: [{ g: 1, a: 21, b: 17, w: 'A' as const }, { g: 2, a: 21, b: 19, w: 'A' as const }],
      smashCountA: 9, dropCountA: 5, errCountB: 6,
    },
    {
      id: 'comm-match-w1-2',
      date: new Date('2026-02-05T18:30:00Z'),
      seasonId: activeSeason.id,
      type: 'SINGLES' as const,
      pA1: 'player-momota', pA1Name: 'Kento Momota',
      pB1: 'player-shi', pB1Name: 'Shi Yuqi',
      winner: 'A' as const,
      games: [{ g: 1, a: 21, b: 14, w: 'A' as const }, { g: 2, a: 21, b: 16, w: 'A' as const }],
      smashCountA: 4, dropCountA: 10, errCountB: 8,
    },
    {
      id: 'comm-match-w1-3',
      date: new Date('2026-02-06T19:00:00Z'),
      seasonId: activeSeason.id,
      type: 'DOUBLES' as const,
      pA1: 'player-viktor', pA1Name: 'Viktor Axelsen',
      pA2: 'player-antonsen', pA2Name: 'Anders Antonsen',
      pB1: 'player-momota', pB1Name: 'Kento Momota',
      pB2: 'player-shi', pB2Name: 'Shi Yuqi',
      teamAId: 'team-smash-squad',
      teamBId: 'team-net-masters',
      winner: 'A' as const,
      games: [{ g: 1, a: 21, b: 18, w: 'A' as const }, { g: 2, a: 19, b: 21, w: 'B' as const }, { g: 3, a: 21, b: 16, w: 'A' as const }],
      smashCountA: 14, dropCountA: 6, errCountB: 7,
    },

    // Week 2 Matches
    {
      id: 'comm-match-w2-1',
      date: new Date('2026-02-11T18:00:00Z'),
      seasonId: activeSeason.id,
      type: 'SINGLES' as const,
      pA1: 'player-ginting', pA1Name: 'Anthony Ginting',
      pB1: 'player-jonatan', pB1Name: 'Jonatan Christie',
      winner: 'A' as const,
      games: [{ g: 1, a: 21, b: 19, w: 'A' as const }, { g: 2, a: 22, b: 20, w: 'A' as const }],
      smashCountA: 8, dropCountA: 6, errCountB: 5,
    },
    {
      id: 'comm-match-w2-2',
      date: new Date('2026-02-12T18:30:00Z'),
      seasonId: activeSeason.id,
      type: 'SINGLES' as const,
      pA1: 'player-loh', pA1Name: 'Loh Kean Yew',
      pB1: 'player-sen', pB1Name: 'Lakshya Sen',
      winner: 'B' as const,
      games: [{ g: 1, a: 21, b: 15, w: 'A' as const }, { g: 2, a: 18, b: 21, w: 'B' as const }, { g: 3, a: 19, b: 21, w: 'B' as const }],
      smashCountA: 11, dropCountA: 3, errCountB: 4,
    },
    {
      id: 'comm-match-w2-3',
      date: new Date('2026-02-13T19:00:00Z'),
      seasonId: activeSeason.id,
      type: 'DOUBLES' as const,
      pA1: 'player-lee', pA1Name: 'Lee Zii Jia',
      pA2: 'player-ginting', pA2Name: 'Anthony Ginting',
      pB1: 'player-loh', pB1Name: 'Loh Kean Yew',
      pB2: 'player-sen', pB2Name: 'Lakshya Sen',
      teamAId: 'team-baseline-bombers',
      teamBId: 'team-speed-demons',
      winner: 'A' as const,
      games: [{ g: 1, a: 21, b: 16, w: 'A' as const }, { g: 2, a: 21, b: 19, w: 'A' as const }],
      smashCountA: 12, dropCountA: 4, errCountB: 6,
    },

    // Week 3 Matches
    {
      id: 'comm-match-w3-1',
      date: new Date('2026-02-18T18:00:00Z'),
      seasonId: activeSeason.id,
      type: 'SINGLES' as const,
      pA1: 'player-viktor', pA1Name: 'Viktor Axelsen',
      pB1: 'player-momota', pB1Name: 'Kento Momota',
      winner: 'A' as const,
      games: [{ g: 1, a: 21, b: 18, w: 'A' as const }, { g: 2, a: 21, b: 17, w: 'A' as const }],
      smashCountA: 10, dropCountA: 5, errCountB: 4,
    },
    {
      id: 'comm-match-w3-2',
      date: new Date('2026-02-19T18:30:00Z'),
      seasonId: activeSeason.id,
      type: 'SINGLES' as const,
      pA1: 'player-chou', pA1Name: 'Chou Tien Chen',
      pB1: 'player-kunlavut', pB1Name: 'Kunlavut Vitidsarn',
      winner: 'B' as const,
      games: [{ g: 1, a: 19, b: 21, w: 'B' as const }, { g: 2, a: 16, b: 21, w: 'B' as const }],
      smashCountA: 5, dropCountA: 4, errCountB: 3,
    },
    {
      id: 'comm-match-w3-3',
      date: new Date('2026-02-20T19:00:00Z'),
      seasonId: activeSeason.id,
      type: 'DOUBLES' as const,
      pA1: 'player-viktor', pA1Name: 'Viktor Axelsen',
      pA2: 'player-antonsen', pA2Name: 'Anders Antonsen',
      pB1: 'player-lee', pB1Name: 'Lee Zii Jia',
      pB2: 'player-ginting', pB2Name: 'Anthony Ginting',
      teamAId: 'team-smash-squad',
      teamBId: 'team-baseline-bombers',
      winner: 'A' as const,
      games: [{ g: 1, a: 23, b: 21, w: 'A' as const }, { g: 2, a: 21, b: 17, w: 'A' as const }],
      smashCountA: 15, dropCountA: 7, errCountB: 8,
    },
  ];

  let totalEventsCount = 0;

  for (const cfg of rawMatchConfigs) {
    // Generate synthetic rally events
    const events: RankingMatchEvent[] = [];
    let seq = 1;

    // Smashes
    for (let i = 0; i < cfg.smashCountA; i++) {
      events.push({
        id: `ev-${cfg.id}-${seq}`,
        sequenceNumber: seq++,
        eventType: 'POINT',
        side: 'A',
        shotType: 'SMASH',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: cfg.pA1,
      });
    }

    // Drops
    for (let i = 0; i < cfg.dropCountA; i++) {
      events.push({
        id: `ev-${cfg.id}-${seq}`,
        sequenceNumber: seq++,
        eventType: 'POINT',
        side: 'A',
        shotType: 'DROP',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: cfg.pA1,
      });
    }

    // Errors
    for (let i = 0; i < cfg.errCountB; i++) {
      events.push({
        id: `ev-${cfg.id}-${seq}`,
        sequenceNumber: seq++,
        eventType: 'POINT',
        side: 'A',
        shotType: 'CLEAR',
        rallyEndResult: 'UNFORCED_ERROR',
        errorPlayerId: cfg.pB1,
        pointWinnerPlayerId: cfg.pA1,
      });
    }

    totalEventsCount += events.length;

    const participants: RankingParticipant[] = [
      { playerId: cfg.pA1, displayName: cfg.pA1Name, side: 'A', position: 1 },
      ...(cfg.pA2 && cfg.pA2Name ? [{ playerId: cfg.pA2, displayName: cfg.pA2Name, side: 'A' as const, position: 2 as const }] : []),
      { playerId: cfg.pB1, displayName: cfg.pB1Name, side: 'B', position: 1 },
      ...(cfg.pB2 && cfg.pB2Name ? [{ playerId: cfg.pB2, displayName: cfg.pB2Name, side: 'B' as const, position: 2 as const }] : []),
    ];

    const matchObj: RankingMatch = {
      id: cfg.id,
      seasonId: cfg.seasonId,
      matchType: cfg.type,
      status: 'COMPLETED',
      winnerSide: cfg.winner,
      participants,
      games: cfg.games.map((g) => ({
        gameNumber: g.g,
        scoreA: g.a,
        scoreB: g.b,
        winnerSide: g.w,
      })),
      events,
    };

    memoryRankingMatches.push(matchObj);
  }

  // 5. Rebuild Rankings & Generate Snapshots
  const rebuild = rebuildRankings(memoryRankingMatches);
  let totalSnapshots = 0;

  // Persist snapshots for overall and category leaderboards
  for (const [category, entries] of Object.entries(rebuild.playerLeaderboards) as [string, Array<{
    id: string;
    rank: number;
    rankMovement: string;
    movementDelta: number;
    matchesPlayed: number;
    headlineValue: number;
    stats: any;
  }>][]) {
    for (const entry of entries) {
      const prevRank =
        entry.rankMovement === 'UP'
          ? entry.rank + entry.movementDelta
          : entry.rankMovement === 'DOWN'
          ? entry.rank - entry.movementDelta
          : entry.rank;

      await prisma.playerRankingSnapshot.create({
        data: {
          playerId: entry.id,
          seasonId: activeSeason.id,
          category,
          period: 'ALL_TIME',
          rank: entry.rank,
          previousRank: prevRank,
          matchesPlayed: entry.matchesPlayed,
          headlineValue: entry.headlineValue,
          stats: entry.stats as any,
          snapshotDate: new Date(),
        },
      }).catch(() => {});
      totalSnapshots++;
    }
  }

  console.log(`✅ Seeded ${playersData.length} players, ${teamsData.length} teams, ${rawMatchConfigs.length} matches, and ${totalEventsCount} events.`);

  return {
    playersCount: playersData.length,
    teamsCount: teamsData.length,
    seasonsCount: 2,
    matchesCount: rawMatchConfigs.length,
    eventsCount: totalEventsCount,
    snapshotsCount: totalSnapshots,
  };
}

if (process.argv[1]?.endsWith('seedCommunityRankings.ts')) {
  seedCommunityRankings()
    .then((res) => {
      console.log('Seed summary:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
