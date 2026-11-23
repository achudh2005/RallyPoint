import { Side } from './types.js';

export function isGameFinished(
  scoreA: number,
  scoreB: number,
  pointsToWin = 21,
  tiebreakCap = 30
): { finished: boolean; winner?: Side } {
  if (scoreA >= pointsToWin && scoreA - scoreB >= 2) {
    return { finished: true, winner: 'A' };
  }
  if (scoreB >= pointsToWin && scoreB - scoreA >= 2) {
    return { finished: true, winner: 'B' };
  }
  if (scoreA >= tiebreakCap) {
    return { finished: true, winner: 'A' };
  }
  if (scoreB >= tiebreakCap) {
    return { finished: true, winner: 'B' };
  }
  return { finished: false };
}

export function isDecidingGame(gameNumber: number, bestOf: number): boolean {
  return gameNumber >= bestOf;
}

export function gamesNeededToWin(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

export function isMatchFinished(
  gamesWonA: number,
  gamesWonB: number,
  bestOf: number
): { finished: boolean; winner?: Side } {
  const needed = gamesNeededToWin(bestOf);
  if (gamesWonA >= needed) {
    return { finished: true, winner: 'A' };
  }
  if (gamesWonB >= needed) {
    return { finished: true, winner: 'B' };
  }
  return { finished: false };
}

export function shouldTriggerInterval(
  scoreA: number,
  scoreB: number,
  intervalTaken: boolean
): boolean {
  if (intervalTaken) return false;
  return scoreA === 11 || scoreB === 11;
}

export function shouldSwitchDecidingGameEnds(
  gameNumber: number,
  scoreA: number,
  scoreB: number,
  alreadySwitched: boolean,
  bestOf: number
): boolean {
  if (!isDecidingGame(gameNumber, bestOf)) return false;
  if (alreadySwitched) return false;
  return scoreA >= 11 || scoreB >= 11;
}
