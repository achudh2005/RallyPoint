import { PrismaClient, DominantHand, TeamType, TournamentFormat, TournamentCategory } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // 1. Create Clubs
  const allEnglandClub = await prisma.club.upsert({
    where: { id: 'club-all-england' },
    update: {},
    create: {
      id: 'club-all-england',
      name: 'All England Badminton Club',
      city: 'Birmingham',
      logoUrl: 'https://rallypoint.app/assets/clubs/all-england.png',
    },
  });

  const copenhagenClub = await prisma.club.upsert({
    where: { id: 'club-copenhagen' },
    update: {},
    create: {
      id: 'club-copenhagen',
      name: 'Copenhagen Elite Badminton Academy',
      city: 'Copenhagen',
      logoUrl: 'https://rallypoint.app/assets/clubs/copenhagen.png',
    },
  });

  // 2. Create Users & Players
  const viktorUser = await prisma.user.upsert({
    where: { email: 'viktor@rallypoint.app' },
    update: {},
    create: {
      email: 'viktor@rallypoint.app',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'PLAYER',
    },
  });

  const viktor = await prisma.player.upsert({
    where: { id: 'player-viktor-axelsen' },
    update: {},
    create: {
      id: 'player-viktor-axelsen',
      userId: viktorUser.id,
      firstName: 'Viktor',
      lastName: 'Axelsen',
      displayName: 'Viktor Axelsen',
      dateOfBirth: new Date('1994-01-04'),
      gender: 'M',
      nationality: 'DEN',
      dominantHand: DominantHand.RIGHT,
      heightCm: 194,
      weightKg: 88,
      status: 'ACTIVE',
      clubId: copenhagenClub.id,
      externalIds: { bwfId: '25831' },
      bio: 'Olympic Gold Medalist and World Champion.',
    },
  });

  const leeUser = await prisma.user.upsert({
    where: { email: 'lee.ziijia@rallypoint.app' },
    update: {},
    create: {
      email: 'lee.ziijia@rallypoint.app',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'PLAYER',
    },
  });

  const lee = await prisma.player.upsert({
    where: { id: 'player-lee-zii-jia' },
    update: {},
    create: {
      id: 'player-lee-zii-jia',
      userId: leeUser.id,
      firstName: 'Zii Jia',
      lastName: 'Lee',
      displayName: 'Lee Zii Jia',
      dateOfBirth: new Date('1998-03-29'),
      gender: 'M',
      nationality: 'MAS',
      dominantHand: DominantHand.RIGHT,
      heightCm: 186,
      weightKg: 78,
      status: 'ACTIVE',
      clubId: allEnglandClub.id,
      externalIds: { bwfId: '82410' },
      bio: 'All England Champion and Olympic Bronze Medalist.',
    },
  });

  // 3. Create Teams
  const teamViktor = await prisma.team.upsert({
    where: { id: 'team-viktor' },
    update: {},
    create: {
      id: 'team-viktor',
      name: 'Viktor Axelsen (DEN)',
      type: TeamType.SINGLES_ENTRY,
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_playerId_leftAt: {
        teamId: teamViktor.id,
        playerId: viktor.id,
        leftAt: new Date(0), // Sentinel for active
      },
    },
    update: {},
    create: {
      teamId: teamViktor.id,
      playerId: viktor.id,
      leftAt: new Date(0),
      role: 'SINGLES_PLAYER',
    },
  }).catch(() => {});

  const teamLee = await prisma.team.upsert({
    where: { id: 'team-lee' },
    update: {},
    create: {
      id: 'team-lee',
      name: 'Lee Zii Jia (MAS)',
      type: TeamType.SINGLES_ENTRY,
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_playerId_leftAt: {
        teamId: teamLee.id,
        playerId: lee.id,
        leftAt: new Date(0),
      },
    },
    update: {},
    create: {
      teamId: teamLee.id,
      playerId: lee.id,
      leftAt: new Date(0),
      role: 'SINGLES_PLAYER',
    },
  }).catch(() => {});

  // 4. Create Venue & Courts
  const venue = await prisma.venue.upsert({
    where: { id: 'venue-arena-birmingham' },
    update: {},
    create: {
      id: 'venue-arena-birmingham',
      name: 'Utilita Arena Birmingham',
      address: 'King Edwards Rd, Birmingham B1 2AA, UK',
      latitude: 52.4795,
      longitude: -1.9149,
      courtCount: 4,
    },
  });

  await prisma.court.upsert({
    where: {
      venueId_courtNumber: {
        venueId: venue.id,
        courtNumber: 1,
      },
    },
    update: {},
    create: {
      venueId: venue.id,
      courtNumber: 1,
      surfaceType: 'Yonex Badminton Mat (BWF Grade 1)',
    },
  });

  // 5. Create Tournament
  const tournament = await prisma.tournament.upsert({
    where: { id: 'tourney-all-england-open' },
    update: {},
    create: {
      id: 'tourney-all-england-open',
      name: 'YONEX All England Open Badminton Championships',
      format: TournamentFormat.KNOCKOUT,
      category: TournamentCategory.MS,
      venueId: venue.id,
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-03-15'),
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Seeded: ${allEnglandClub.name}, ${venue.name}, ${tournament.name}`);
  return { allEnglandClub, copenhagenClub, viktor, lee, venue, tournament };
}

if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
