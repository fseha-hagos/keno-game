import { PaytableEntry } from '@keno/shared-types';
import { calculateSpotRtp, SpotRtpAnalysis } from './rtp';
import { getMultiplier } from './paytable';

export interface SimulationResult {
  spots: number;
  totalRounds: number;
  totalWagered: number;
  totalPayout: number;
  observedRtp: number;
  theoreticalRtp: number;
  errorPercentage: number;
  hitCounts: Record<number, number>;
  observedHitFrequencies: Record<number, number>;
  theoreticalHitFrequencies: Record<number, number>;
  maxPayoutMultiplier: number;
  confidenceInterval95: [number, number];
}

/**
 * CSPRNG-compatible or standard Fisher-Yates simulation draw.
 * Draws 20 unique numbers from 1..80.
 */
export function simulateRandomDraw(rngFn: () => number = Math.random): number[] {
  const pool = Array.from({ length: 80 }, (_, i) => i + 1);
  const drawn: number[] = [];

  for (let i = 0; i < 20; i++) {
    const remaining = pool.length;
    const randomIndex = Math.floor(rngFn() * remaining);
    const selected = pool[randomIndex]!;
    drawn.push(selected);
    // Swap with last element and pop for O(1) removal
    pool[randomIndex] = pool[remaining - 1]!;
    pool.pop();
  }

  return drawn;
}

/**
 * Runs a Monte Carlo empirical simulation of N game rounds for a specific spot selection
 * and compares observed RTP and hit distributions against theoretical mathematics.
 */
export function runMonteCarloSimulation(
  spots: number,
  totalRounds: number,
  paytable: PaytableEntry[],
  rngFn: () => number = Math.random
): SimulationResult {
  const analysis: SpotRtpAnalysis = calculateSpotRtp(spots, paytable);
  const playerSelection = Array.from({ length: spots }, (_, i) => i + 1); // Fixed pick 1..spots
  const hitCounts: Record<number, number> = {};
  for (let i = 0; i <= spots; i++) {
    hitCounts[i] = 0;
  }

  let totalPayout = 0;
  let maxPayoutMultiplier = 0;

  for (let r = 0; r < totalRounds; r++) {
    const draw = simulateRandomDraw(rngFn);
    const drawSet = new Set(draw);

    let hits = 0;
    for (const num of playerSelection) {
      if (drawSet.has(num)) {
        hits++;
      }
    }

    hitCounts[hits] = (hitCounts[hits] || 0) + 1;
    const multiplier = getMultiplier(paytable, spots, hits);
    totalPayout += multiplier;

    if (multiplier > maxPayoutMultiplier) {
      maxPayoutMultiplier = multiplier;
    }
  }

  const totalWagered = totalRounds * 1.0;
  const observedRtp = totalPayout / totalWagered;
  const errorPercentage = Math.abs(observedRtp - analysis.theoreticalRtp) / analysis.theoreticalRtp * 100;

  const observedHitFrequencies: Record<number, number> = {};
  const theoreticalHitFrequencies: Record<number, number> = {};

  for (let i = 0; i <= spots; i++) {
    observedHitFrequencies[i] = (hitCounts[i] || 0) / totalRounds;
    const dist = analysis.distribution.find((d) => d.hits === i);
    theoreticalHitFrequencies[i] = dist ? dist.probability : 0;
  }

  // 95% Confidence Interval: observedRtp +/- 1.96 * (stdDev / sqrt(N))
  const standardError = analysis.standardDeviation / Math.sqrt(totalRounds);
  const margin = 1.96 * standardError;
  const confidenceInterval95: [number, number] = [
    Math.max(0, observedRtp - margin),
    observedRtp + margin,
  ];

  return {
    spots,
    totalRounds,
    totalWagered,
    totalPayout,
    observedRtp,
    theoreticalRtp: analysis.theoreticalRtp,
    errorPercentage,
    hitCounts,
    observedHitFrequencies,
    theoreticalHitFrequencies,
    maxPayoutMultiplier,
    confidenceInterval95,
  };
}
