import { describe, expect, it } from 'vitest';
import {
  computeGameWinProbability,
  computeMatchWinProbability,
} from './markovModel.js';

describe('Markov Badminton Model', () => {
  it('computes 0.5 probability at 0-0 with equal point win rates', () => {
    const prob = computeGameWinProbability(0, 0, 0.5);
    expect(prob).toBeCloseTo(0.5, 2);
  });

  it('computes 1.0 probability when Side A wins game', () => {
    expect(computeGameWinProbability(21, 15, 0.5)).toBe(1.0);
    expect(computeGameWinProbability(30, 29, 0.5)).toBe(1.0);
  });

  it('computes 0.0 probability when Side B wins game', () => {
    expect(computeGameWinProbability(15, 21, 0.5)).toBe(0.0);
    expect(computeGameWinProbability(29, 30, 0.5)).toBe(0.0);
  });

  it('computes golden point at 29-29 to equal point win rate', () => {
    expect(computeGameWinProbability(29, 29, 0.6)).toBeCloseTo(0.6, 2);
    expect(computeGameWinProbability(29, 29, 0.4)).toBeCloseTo(0.4, 2);
  });

  it('reflects higher win probability with large lead', () => {
    const probLead = computeGameWinProbability(18, 10, 0.5);
    const probDeficit = computeGameWinProbability(10, 18, 0.5);
    expect(probLead).toBeGreaterThan(0.9);
    expect(probDeficit).toBeLessThan(0.1);
  });

  it('computes match win probability across games in Best of 3', () => {
    // A already won 2 games -> 1.0
    expect(computeMatchWinProbability(2, 0, 0.5, 3)).toBe(1.0);
    // B already won 2 games -> 0.0
    expect(computeMatchWinProbability(0, 2, 0.5, 3)).toBe(0.0);
    // Tied 1-1, A has 80% chance to win current Game 3 -> 0.8
    expect(computeMatchWinProbability(1, 1, 0.8, 3)).toBeCloseTo(0.8, 2);
  });
});
