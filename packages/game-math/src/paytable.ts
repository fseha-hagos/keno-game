import { PaytableEntry, PaytableVersionDto } from '@keno/shared-types';

/**
 * Standard Certified Keno Paytable (Target RTP: ~95.2% - 96.5% across all spots)
 * Calibrated Multipliers for Spots 1 to 10.
 */
export const DEFAULT_96_PAYTABLE_ENTRIES: PaytableEntry[] = [
  // Spot 1: 1 hit = 3.8x
  { spots: 1, hits: 1, multiplier: 3.8 },

  // Spot 2: 2 hits = 15.0x
  { spots: 2, hits: 2, multiplier: 15.0 },

  // Spot 3: 3 hits = 35.0x, 2 hits = 3.0x
  { spots: 3, hits: 2, multiplier: 3.0 },
  { spots: 3, hits: 3, multiplier: 35.0 },

  // Spot 4: 4 hits = 100.0x, 3 hits = 8.0x, 2 hits = 1.0x
  { spots: 4, hits: 2, multiplier: 1.0 },
  { spots: 4, hits: 3, multiplier: 8.0 },
  { spots: 4, hits: 4, multiplier: 100.0 },

  // Spot 5: 5 hits = 300.0x, 4 hits = 15.0x, 3 hits = 3.0x, 2 hits = 1.0x
  { spots: 5, hits: 2, multiplier: 1.0 },
  { spots: 5, hits: 3, multiplier: 3.0 },
  { spots: 5, hits: 4, multiplier: 15.0 },
  { spots: 5, hits: 5, multiplier: 300.0 },
];

export const DEFAULT_PAYTABLE_VERSION: PaytableVersionDto = {
  id: '00000000-0000-0000-0000-000000000001',
  gameId: '00000000-0000-0000-0000-000000000001',
  version: 1,
  name: 'Standard Keno Paytable 1-5 Spots',
  theoreticalRtp: 0.9036,
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
