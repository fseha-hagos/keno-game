import { combinations } from './combinations';

export const TOTAL_KENO_BALLS = 80;
export const TOTAL_DRAWN_BALLS = 20;

// Total possible 20-number draws from 80 numbers: C(80, 20) = 3,535,316,142,212,174,320
export const TOTAL_DRAW_COMBINATIONS = combinations(TOTAL_KENO_BALLS, TOTAL_DRAWN_BALLS);

/**
 * Calculates exact hypergeometric probability of matching exactly `hits` numbers
 * when choosing `spots` numbers out of 80 with 20 drawn.
 *
 * P(hits) = [C(spots, hits) * C(80 - spots, 20 - hits)] / C(80, 20)
 */
export function calculateHitProbability(spots: number, hits: number): number {
  if (spots < 1 || spots > 20) {
    throw new Error(`Spots must be between 1 and 20, received: ${spots}`);
  }
  if (hits < 0 || hits > spots || hits > TOTAL_DRAWN_BALLS) {
    return 0;
  }
  if (TOTAL_DRAWN_BALLS - hits > TOTAL_KENO_BALLS - spots) {
    return 0;
  }

  const waysToPickWinning = combinations(spots, hits);
  const waysToPickLosing = combinations(TOTAL_KENO_BALLS - spots, TOTAL_DRAWN_BALLS - hits);
  const favorableCombinations = waysToPickWinning * waysToPickLosing;

  // Compute with high precision floating point
  return Number(favorableCombinations) / Number(TOTAL_DRAW_COMBINATIONS);
}

/**
 * Returns probability distribution for all possible hit outcomes for a given spot selection.
 */
export function getHitDistribution(spots: number): Array<{ hits: number; probability: number }> {
  const distribution: Array<{ hits: number; probability: number }> = [];
  for (let hits = 0; hits <= spots; hits++) {
    distribution.push({
      hits,
      probability: calculateHitProbability(spots, hits),
    });
  }
  return distribution;
}
