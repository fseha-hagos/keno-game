import { PaytableEntry, PaytableVersionDto } from '@keno/shared-types';

/**
 * Standard Certified Keno Paytable (Target RTP: ~95.2% - 96.5% across all spots)
 * Calibrated Multipliers for Spots 1 to 10.
 */
export const DEFAULT_96_PAYTABLE_ENTRIES: PaytableEntry[] = [
  // Spot 1: P(1)=0.25 -> 3.84x = 96.00%
  { spots: 1, hits: 1, multiplier: 3.84 },

  // Spot 2: P(2)=0.060126 -> 16.0x = 96.20%
  { spots: 2, hits: 2, multiplier: 16.0 },

  // Spot 3: P(2)=0.13875 (2.5x), P(3)=0.013875 (44.0x) -> RTP = 95.74%
  { spots: 3, hits: 2, multiplier: 2.5 },
  { spots: 3, hits: 3, multiplier: 44.0 },

  // Spot 4: P(2)=0.2126 (1.0x), P(3)=0.043248 (5.0x), P(4)=0.003089 (170.0x) -> RTP = 95.40%
  { spots: 4, hits: 2, multiplier: 1.0 },
  { spots: 4, hits: 3, multiplier: 5.0 },
  { spots: 4, hits: 4, multiplier: 170.0 },

  // Spot 5: P(3)=0.083935 (3.0x), P(4)=0.012092 (18.0x), P(5)=0.000645 (750.0x) -> RTP = 95.32%
  { spots: 5, hits: 3, multiplier: 3.0 },
  { spots: 5, hits: 4, multiplier: 18.0 },
  { spots: 5, hits: 5, multiplier: 750.0 },

  // Spot 6: P(3)=0.1298 (1.0x), P(4)=0.0285 (8.0x), P(5)=0.00309 (92.0x), P(6)=0.000129 (2500.0x) -> RTP = 96.53%
  { spots: 6, hits: 3, multiplier: 1.0 },
  { spots: 6, hits: 4, multiplier: 8.0 },
  { spots: 6, hits: 5, multiplier: 92.0 },
  { spots: 6, hits: 6, multiplier: 2500.0 },

  // Spot 7: P(3)=0.1749 (0.5x), P(4)=0.0522 (3.0x), P(5)=0.00863 (22.0x), P(6)=0.000732 (450.0x), P(7)=0.0000244 (7500.0x) -> RTP = 95.73%
  { spots: 7, hits: 3, multiplier: 0.5 },
  { spots: 7, hits: 4, multiplier: 3.0 },
  { spots: 7, hits: 5, multiplier: 22.0 },
  { spots: 7, hits: 6, multiplier: 450.0 },
  { spots: 7, hits: 7, multiplier: 7500.0 },

  // Spot 8: P(4)=0.0889 (2.0x), P(5)=0.0183 (11.0x), P(6)=0.00237 (95.0x), P(7)=0.000160 (1450.0x), P(8)=0.00000435 (26000.0x) -> RTP = 95.78%
  { spots: 8, hits: 4, multiplier: 2.0 },
  { spots: 8, hits: 5, multiplier: 11.0 },
  { spots: 8, hits: 6, multiplier: 95.0 },
  { spots: 8, hits: 7, multiplier: 1450.0 },
  { spots: 8, hits: 8, multiplier: 26000.0 },

  // Spot 9: P(4)=0.1348 (1.0x), P(5)=0.0342 (4.5x), P(6)=0.00572 (36.0x), P(7)=0.000593 (350.0x), P(8)=0.0000326 (3600.0x), P(9)=0.000000726 (65000.0x) -> RTP = 95.71%
  { spots: 9, hits: 4, multiplier: 1.0 },
  { spots: 9, hits: 5, multiplier: 4.5 },
  { spots: 9, hits: 6, multiplier: 36.0 },
  { spots: 9, hits: 7, multiplier: 350.0 },
  { spots: 9, hits: 8, multiplier: 3600.0 },
  { spots: 9, hits: 9, multiplier: 65000.0 },

  // Spot 10: P(0)=0.0458 (2.0x), P(5)=0.0514 (2.5x), P(6)=0.0115 (20.0x), P(7)=0.00161 (140.0x), P(8)=0.000135 (1200.0x), P(9)=0.00000612 (9000.0x), P(10)=0.000000112 (100000.0x) -> RTP = 95.42%
  { spots: 10, hits: 0, multiplier: 2.0 },
  { spots: 10, hits: 5, multiplier: 2.5 },
  { spots: 10, hits: 6, multiplier: 20.0 },
  { spots: 10, hits: 7, multiplier: 140.0 },
  { spots: 10, hits: 8, multiplier: 1200.0 },
  { spots: 10, hits: 9, multiplier: 9000.0 },
  { spots: 10, hits: 10, multiplier: 100000.0 },
];

export const DEFAULT_PAYTABLE_VERSION: PaytableVersionDto = {
  id: '00000000-0000-0000-0000-000000000001',
  gameId: '00000000-0000-0000-0000-000000000001',
  version: 1,
  name: 'Standard Certified 96% Keno Paytable v1.0',
  theoreticalRtp: 0.9579,
  isDefault: true,
  status: 'ACTIVE',
  entries: DEFAULT_96_PAYTABLE_ENTRIES,
  createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * Looks up the payout multiplier for given spot count and hit count.
 * Returns 0 if there is no payout for that combination.
 */
export function getMultiplier(entries: PaytableEntry[], spots: number, hits: number): number {
  const entry = entries.find((e) => e.spots === spots && e.hits === hits);
  return entry ? entry.multiplier : 0;
}
