/**
 * Markov model for calculating game and match win probability in Badminton.
 * Accounts for BWF rules: first to 21 with 2-point lead, capped at 30.
 */

// Cache for transition state probabilities
const memoCache = new Map<string, number>();

export function computeGameWinProbability(
  scoreA: number,
  scoreB: number,
  pointWinRateA = 0.5,
  pointsToWin = 21,
  tiebreakCap = 30
): number {
  const pA = Math.max(0.01, Math.min(0.99, pointWinRateA));
  const pB = 1 - pA;

  // Terminal conditions
  if (scoreA >= pointsToWin && scoreA - scoreB >= 2) return 1.0;
  if (scoreB >= pointsToWin && scoreB - scoreA >= 2) return 0.0;
  if (scoreA >= tiebreakCap) return 1.0;
  if (scoreB >= tiebreakCap) return 0.0;

  // At 29-29 golden point: next point wins directly
  if (scoreA === 29 && scoreB === 29) return pA;

  const key = `${scoreA}-${scoreB}-${pA.toFixed(3)}`;
  if (memoCache.has(key)) return memoCache.get(key)!;

  // At deuce (both >= 20, < 29):
  // Let P be prob of winning from deuce (D = scoreA - scoreB).
  // At tie (D = 0): P(tie) = pA^2 / (pA^2 + pB^2)
  if (scoreA >= 20 && scoreB >= 20) {
    const diff = scoreA - scoreB;
    const pTie = (pA * pA) / (pA * pA + pB * pB);
    let prob = 0.5;

    if (diff === 0) {
      prob = pTie;
    } else if (diff === 1) {
      prob = pA + pB * pTie;
    } else if (diff === -1) {
      prob = pA * pTie;
    } else if (diff >= 2) {
      prob = 1.0;
    } else if (diff <= -2) {
      prob = 0.0;
    }

    memoCache.set(key, prob);
    return prob;
  }

  // Recursive transition
  const winNext = pA * computeGameWinProbability(scoreA + 1, scoreB, pA, pointsToWin, tiebreakCap);
  const loseNext = pB * computeGameWinProbability(scoreA, scoreB + 1, pA, pointsToWin, tiebreakCap);
  const prob = winNext + loseNext;

  memoCache.set(key, prob);
  return prob;
}

export function computeMatchWinProbability(
  gamesWonA: number,
  gamesWonB: number,
  currentGameProbA: number,
  bestOf = 3,
  gameWinProbA = 0.5
): number {
  const needed = Math.floor(bestOf / 2) + 1;
  if (gamesWonA >= needed) return 1.0;
  if (gamesWonB >= needed) return 0.0;

  // Probability A wins current game
  const probWinCurrent = currentGameProbA;
  const probLoseCurrent = 1 - currentGameProbA;

  // If A wins current game
  const ifWinCurrent = computeRemainingMatchProb(gamesWonA + 1, gamesWonB, needed, gameWinProbA);
  // If A loses current game
  const ifLoseCurrent = computeRemainingMatchProb(gamesWonA, gamesWonB + 1, needed, gameWinProbA);

  return probWinCurrent * ifWinCurrent + probLoseCurrent * ifLoseCurrent;
}

function computeRemainingMatchProb(
  gamesA: number,
  gamesB: number,
  needed: number,
  pGameA: number
): number {
  if (gamesA >= needed) return 1.0;
  if (gamesB >= needed) return 0.0;

  const pGameB = 1 - pGameA;
  return (
    pGameA * computeRemainingMatchProb(gamesA + 1, gamesB, needed, pGameA) +
    pGameB * computeRemainingMatchProb(gamesA, gamesB + 1, needed, pGameA)
  );
}
