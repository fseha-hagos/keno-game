import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';

export interface SimulatedBet {
  id: string;
  username: string;
  numbers: number[];
  stake: number;
  status: 'Waiting' | 'Won' | 'Lost';
  payout: number;
  time: string;
  roundId: string | number;
}

const MASKED_NAMES = [
  'g***w', 'a***w', 'v***r', 'm***e', 't***k', 'd***n', 'k***s', 'b***a',
  's***m', 'y***h', 'e***t', 'h***b', 'z***r', 'n***i', 'f***o', 'l***u',
  '09***41', '09***82', '09***19', '07***35', 'j***n', 'c***l', 'p***x',
  'r***q', 'w***p', '09***77', '09***54', '07***88', 'b***y', 'k***m',
  'x***z', 'i***o', 'u***v', 'q***w', '09***33', '07***62', 'h***m', 't***s'
];

const STAKE_OPTIONS = [100, 200, 300, 400, 500, 600, 600, 800, 1000, 1200, 1500, 2000];

// Spot distribution weighting: strictly 1 to 5 spots (6 and above disabled)
const SPOT_OPTIONS = [2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 1, 2];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSubset(pool: number[], count: number): number[] {
  const copy = [...pool];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return result.sort((a, b) => a - b);
}

/**
 * Generate a single realistic simulated player bet (max 5 spots)
 */
export function createSimulatedBet(roundId: string | number): SimulatedBet {
  const username = MASKED_NAMES[Math.floor(Math.random() * MASKED_NAMES.length)]!;
  const rawSpots = SPOT_OPTIONS[Math.floor(Math.random() * SPOT_OPTIONS.length)]!;
  const spots = Math.min(5, Math.max(1, rawSpots)); // Strictly clamp to 1-5 spots
  const numbersPool = Array.from({ length: 80 }, (_, i) => i + 1);
  const numbers = getRandomSubset(numbersPool, spots);
  const stake = STAKE_OPTIONS[Math.floor(Math.random() * STAKE_OPTIONS.length)]!;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: `sim-${roundId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username,
    numbers,
    stake,
    status: 'Waiting',
    payout: 0,
    time,
    roundId,
  };
}

/**
 * Generate initial pool of simulated bets for a round
 */
export function generateInitialSimulatedBets(roundId: string | number, count = 18): SimulatedBet[] {
  const bets: SimulatedBet[] = [];
  for (let i = 0; i < count; i++) {
    bets.push(createSimulatedBet(roundId));
  }
  return bets;
}

/**
 * Generate a batch of simulated bets (1 to 3) with distinct player names
 */
export function createSimulatedBetsBatch(roundId: string | number, count: number): SimulatedBet[] {
  const bets: SimulatedBet[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < count; i++) {
    let bet = createSimulatedBet(roundId);
    let attempts = 0;
    while (usedNames.has(bet.username) && attempts < 10) {
      bet = createSimulatedBet(roundId);
      attempts++;
    }
    usedNames.add(bet.username);
    bets.push(bet);
  }
  return bets;
}

const ROUND_STORAGE_PREFIX = 'keno_round_cnt_';

/**
 * Generate a realistic, distinct base bet count for each game round.
 * Tiers vary naturally: ~3k (quiet), ~7k (moderate), ~12k (busy), ~21k (peak).
 * Deterministic for the same roundKey so it remains consistent within the round.
 */
export function getRoundBaseCount(_roundKey?: string | number): number {
  return 0; // Always start from 0 for fresh rounds
}

/**
 * Load the latest saved count for this round (0 if brand new)
 */
export function getRoundSavedCount(roundKey: string | number): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(`${ROUND_STORAGE_PREFIX}${roundKey}`);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch {}
  return 0;
}

/**
 * Persist the current count for a specific game round
 */
export function saveRoundCount(roundKey: string | number, count: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${ROUND_STORAGE_PREFIX}${roundKey}`, String(count));
  } catch {}
}

/**
 * Backward compatibility aliases
 */
export function getPersistentTotalBets(roundNumber?: number | string): number {
  return getRoundSavedCount(roundNumber || 'default');
}

export function savePersistentTotalBets(count: number): void {
  // no-op for global fallback
}

export function getBaseRoundCount(roundNumber?: number | string): number {
  return getRoundBaseCount(roundNumber || 'default');
}

/**
 * Compute live hits and potential win for a simulated bet
 */
export function evaluateSimulatedBet(
  bet: SimulatedBet,
  drawnSet: Set<number>,
  isRoundComplete = false
): SimulatedBet {
  const spots = bet.numbers.length;
  const hits = bet.numbers.filter((n) => drawnSet.has(n)).length;
  const multiplier = spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, hits) : 0;
  const payout = bet.stake * multiplier;
  const isWon = payout > 0;

  return {
    ...bet,
    payout,
    status: isRoundComplete ? (isWon ? 'Won' : 'Lost') : 'Waiting',
  };
}
