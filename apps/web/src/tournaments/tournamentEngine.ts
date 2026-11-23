export type TournamentFormat = 'KNOCKOUT' | 'ROUND_ROBIN' | 'GROUP_KNOCKOUT';

export interface TournamentPlayer {
  id: string;
  name: string;
}

export interface TournamentMatch {
  id: string;
  round: number;
  courtNumber?: number;
  scheduledTime?: string;
  playerA?: TournamentPlayer;
  playerB?: TournamentPlayer;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  isCompleted: boolean;
}

export interface TournamentStanding {
  playerId: string;
  playerName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  gameDiff: number;
  pointDiff: number;
}

export function generateKnockoutBracket(
  players: TournamentPlayer[],
  courtCount = 2
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const numPlayers = players.length;
  // Pad to next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(2, numPlayers))));

  let matchIndex = 1;
  const round1Matches = bracketSize / 2;

  for (let i = 0; i < round1Matches; i++) {
    const playerA = players[i * 2];
    const playerB = players[i * 2 + 1];
    const courtNumber = (i % courtCount) + 1;

    matches.push({
      id: `match-r1-${matchIndex++}`,
      round: 1,
      courtNumber,
      scheduledTime: `Round 1 - Court ${courtNumber}`,
      playerA,
      playerB,
      isCompleted: !playerB, // Bye if no player B
      winnerId: !playerB && playerA ? playerA.id : undefined,
    });
  }

  // Semi-finals or next rounds
  let prevRoundMatches = round1Matches;
  let round = 2;
  while (prevRoundMatches > 1) {
    const currentRoundMatches = prevRoundMatches / 2;
    for (let j = 0; j < currentRoundMatches; j++) {
      matches.push({
        id: `match-r${round}-${matchIndex++}`,
        round,
        scheduledTime: `Round ${round}`,
        isCompleted: false,
      });
    }
    prevRoundMatches = currentRoundMatches;
    round++;
  }

  return matches;
}

export function generateRoundRobinSchedule(
  players: TournamentPlayer[],
  courtCount = 2
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  let matchIndex = 1;
  let courtAssignment = 1;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: `rr-match-${matchIndex++}`,
        round: 1,
        courtNumber: courtAssignment,
        scheduledTime: `Court ${courtAssignment}`,
        playerA: players[i],
        playerB: players[j],
        isCompleted: false,
      });
      courtAssignment = (courtAssignment % courtCount) + 1;
    }
  }

  return matches;
}

export function computeStandings(
  players: TournamentPlayer[],
  matches: TournamentMatch[]
): TournamentStanding[] {
  const table = new Map<string, TournamentStanding>();

  for (const p of players) {
    table.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      gameDiff: 0,
      pointDiff: 0,
    });
  }

  for (const m of matches) {
    if (!m.isCompleted || !m.playerA || !m.playerB) continue;

    const rowA = table.get(m.playerA.id);
    const rowB = table.get(m.playerB.id);

    if (rowA && rowB) {
      rowA.played++;
      rowB.played++;

      const sA = m.scoreA ?? 0;
      const sB = m.scoreB ?? 0;
      rowA.pointDiff += sA - sB;
      rowB.pointDiff += sB - sA;

      if (m.winnerId === m.playerA.id) {
        rowA.won++;
        rowA.points += 2;
        rowB.lost++;
      } else if (m.winnerId === m.playerB.id) {
        rowB.won++;
        rowB.points += 2;
        rowA.lost++;
      }
    }
  }

  // BWF Tiebreaker sorting: Points > Won > Point Diff
  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return b.pointDiff - a.pointDiff;
  });
}
