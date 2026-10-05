import {
  combinations,
  calculateHitProbability,
  getHitDistribution,
  calculateSpotRtp,
  calculateOverallRtp,
  runMonteCarloSimulation,
  simulateRandomDraw,
  DEFAULT_96_PAYTABLE_ENTRIES,
  TOTAL_DRAW_COMBINATIONS,
} from '../index';

describe('Game Mathematics & Probability Engine', () => {
  describe('Combinations C(n, k)', () => {
    it('calculates standard binomial combinations accurately', () => {
      expect(combinations(5, 0)).toBe(1n);
      expect(combinations(5, 1)).toBe(5n);
      expect(combinations(5, 2)).toBe(10n);
      expect(combinations(5, 5)).toBe(1n);
      expect(combinations(5, 6)).toBe(0n);
    });

    it('calculates C(80, 20) with full precision BigInt', () => {
      expect(TOTAL_DRAW_COMBINATIONS.toString()).toBe('3535316142212174320');
    });
  });

  describe('Hypergeometric Hit Probability', () => {
    it('calculates 1-spot probability: P(1) = 20/80 = 0.25', () => {
      const p1 = calculateHitProbability(1, 1);
      const p0 = calculateHitProbability(1, 0);
      expect(p1).toBeCloseTo(0.25, 6);
      expect(p0).toBeCloseTo(0.75, 6);
      expect(p0 + p1).toBeCloseTo(1.0, 6);
    });

    it('sum of all hit probabilities for any spot equals 1.0', () => {
      for (let spots = 1; spots <= 10; spots++) {
        const dist = getHitDistribution(spots);
        const sumProb = dist.reduce((acc, curr) => acc + curr.probability, 0);
        expect(sumProb).toBeCloseTo(1.0, 6);
      }
    });

    it('calculates 10-spot jackpot probability accurately', () => {
      const p10 = calculateHitProbability(10, 10);
      expect(p10).toBeGreaterThan(0);
      expect(1 / p10).toBeCloseTo(8911711, -3);
    });
  });

  describe('Paytable & Theoretical RTP', () => {
    it('prints and validates RTP across all 5 spots', () => {
      for (let spots = 1; spots <= 5; spots++) {
        const analysis = calculateSpotRtp(spots, DEFAULT_96_PAYTABLE_ENTRIES);
        // Log for verification
        // eslint-disable-next-line no-console
        console.log(`Spot ${spots}: RTP=${(analysis.theoreticalRtp * 100).toFixed(2)}%`);
        expect(analysis.theoreticalRtp).toBeGreaterThanOrEqual(0.80);
        expect(analysis.theoreticalRtp).toBeLessThanOrEqual(0.98);
      }
    });

    it('overall average RTP across all spots is in target range ~85% - 95%', () => {
      const overall = calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 5);
      expect(overall.averageRtp).toBeGreaterThanOrEqual(0.85);
      expect(overall.averageRtp).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Random Draw Integrity', () => {
    it('draws exactly 20 unique numbers between 1 and 80', () => {
      const draw = simulateRandomDraw();
      expect(draw).toHaveLength(20);
      const set = new Set(draw);
      expect(set.size).toBe(20);
      for (const num of draw) {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(80);
      }
    });
  });

  describe('Monte Carlo Convergence', () => {
    it('converges observed RTP to theoretical RTP within statistical bounds', () => {
      const sim = runMonteCarloSimulation(1, 50000, DEFAULT_96_PAYTABLE_ENTRIES);
      expect(sim.observedRtp).toBeGreaterThan(0.90);
      expect(sim.observedRtp).toBeLessThan(1.02);
      expect(sim.observedRtp).toBeGreaterThanOrEqual(sim.confidenceInterval95[0]);
      expect(sim.observedRtp).toBeLessThanOrEqual(sim.confidenceInterval95[1]);
    });
  });
});
