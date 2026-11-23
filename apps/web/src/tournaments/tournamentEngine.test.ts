import { describe, expect, it } from 'vitest';
import {
  computeStandings,
  generateKnockoutBracket,
  generateRoundRobinSchedule,
  type TournamentPlayer,
} from './tournamentEngine.js';

const players: TournamentPlayer[] = [
  { id: 'p1', name: 'Axelsen' },
  { id: 'p2', name: 'Lee' },
  { id: 'p3', name: 'Momota' },
  { id: 'p4', name: 'Ginting' },
];

describe('Tournament Engine', () => {
  it('generates knockout bracket with correct rounds and match counts', () => {
    const matches = generateKnockoutBracket(players, 2);
    expect(matches.length).toBe(3); // 2 semi-finals + 1 final for 4 players

    const round1 = matches.filter((m) => m.round === 1);
    expect(round1.length).toBe(2);

    const round2 = matches.filter((m) => m.round === 2);
    expect(round2.length).toBe(1);
  });

  it('generates round-robin schedule for all pairings', () => {
    const matches = generateRoundRobinSchedule(players, 2);
    // 4 players: (4 * 3) / 2 = 6 matches
    expect(matches.length).toBe(6);
  });

  it('computes standings with BWF tiebreaker rules', () => {
    const matches = generateRoundRobinSchedule(players, 2);
    // Simulate Axelsen winning against Lee (21-10)
    matches[0]!.isCompleted = true;
    matches[0]!.scoreA = 21;
    matches[0]!.scoreB = 10;
    matches[0]!.winnerId = 'p1';

    const standings = computeStandings(players, matches);
    expect(standings[0]?.playerId).toBe('p1');
    expect(standings[0]?.points).toBe(2);
    expect(standings[0]?.pointDiff).toBe(11);
  });
});
