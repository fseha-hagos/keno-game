import { PaytableEntry } from '@keno/shared-types';
import { calculateHitProbability } from './probability';
import { getMultiplier } from './paytable';

export interface SpotRtpAnalysis {
  spots: number;
  theoreticalRtp: number;
  houseEdge: number;
  hitFrequency: number; // Probability of winning any non-zero multiplier
  expectedValue: number;
  variance: number;
  standardDeviation: number;
  maxMultiplier: number;
  distribution: Array<{
    hits: number;
    probability: number;
    multiplier: number;
    expectedContribution: number;
  }>;
}

/**
 * Calculates theoretical RTP, house edge, variance, and distribution for a specific spot selection.
 */
export function calculateSpotRtp(spots: number, paytable: PaytableEntry[]): SpotRtpAnalysis {
  let theoreticalRtp = 0;
  let hitFrequency = 0;
  let maxMultiplier = 0;
  let secondMoment = 0;

  const distribution = [];

  for (let hits = 0; hits <= spots; hits++) {
    const probability = calculateHitProbability(spots, hits);
    const multiplier = getMultiplier(paytable, spots, hits);
    const expectedContribution = probability * multiplier;

    theoreticalRtp += expectedContribution;
    secondMoment += probability * Math.pow(multiplier, 2);

    if (multiplier > 0) {
      hitFrequency += probability;
      if (multiplier > maxMultiplier) {
        maxMultiplier = multiplier;
      }
    }

    distribution.push({
      hits,
      probability,
      multiplier,
      expectedContribution,
    });
  }

  const houseEdge = 1 - theoreticalRtp;
  const variance = secondMoment - Math.pow(theoreticalRtp, 2);
  const standardDeviation = Math.sqrt(Math.max(0, variance));

  return {
    spots,
    theoreticalRtp,
    houseEdge,
    hitFrequency,
    expectedValue: theoreticalRtp,
    variance,
    standardDeviation,
    maxMultiplier,
    distribution,
  };
}

/**
 * Calculates overall game RTP across all configurable spot options (e.g. 1 to 10).
 */
export function calculateOverallRtp(
  paytable: PaytableEntry[],
  minSpots = 1,
  maxSpots = 10
): {
  averageRtp: number;
  spotAnalyses: SpotRtpAnalysis[];
} {
  const spotAnalyses: SpotRtpAnalysis[] = [];
  let sumRtp = 0;

  for (let s = minSpots; s <= maxSpots; s++) {
    const analysis = calculateSpotRtp(s, paytable);
    spotAnalyses.push(analysis);
    sumRtp += analysis.theoreticalRtp;
  }

  return {
    averageRtp: sumRtp / (maxSpots - minSpots + 1),
    spotAnalyses,
  };
}
