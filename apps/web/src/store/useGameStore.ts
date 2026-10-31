import { create } from 'zustand';

export interface BetSlip {
  id: string;
  selectedNumbers: number[];
  stakeMinor: string; // in cents, e.g. "500" = 5.00 ETB
}

// Steps in cents:
// 2 - 10: adds 1 ETB at a time (2, 3, 4, 5, 6, 7, 8, 9, 10)
// 15 - 50: adds 5 ETB at a time (15, 20, 25, 30, 35, 40, 45, 50)
// 55 - 100: adds 5 ETB at a time (55, 60, ... 100)
// 125 - 500: adds 25 / 50 ETB at a time (125, 150, 175, 200, 250, 300, 350, 400, 450, 500)
// 600 - 1000: adds 100 ETB at a time (600, 700, 800, 900, 1000)
// 1500 - 4000: adds 500 ETB at a time (1500, 2000, 2500, 3000, 3500, 4000)
const STAKE_STEPS = [
  200, 300, 400, 500, 600, 700, 800, 900, 1000,
  1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
  5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
  12500, 15000, 17500, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
  60000, 70000, 80000, 90000, 100000,
  150000, 200000, 250000, 300000, 350000, 400000,
];
const MAX_SLIPS = 5;

function makeSlip(id: string, stakeMinor = '200'): BetSlip {
  return { id, selectedNumbers: [], stakeMinor };
}

function nextStake(current: string, direction: 1 | -1): string {
  const minor = Math.min(400000, Math.max(200, Number(current) || 200));
  if (direction === 1) {
    const next = STAKE_STEPS.find((s) => s > minor);
    if (next !== undefined && next <= 400000) return String(next);
    return '400000';
  } else {
    const prev = [...STAKE_STEPS].reverse().find((s) => s < minor);
    if (prev !== undefined) return String(prev);
    return String(STAKE_STEPS[0]);
  }
}

function pruneEmptySlips(
  slips: BetSlip[],
  activeSlipId: string,
  preservedStake = '200'
): { betSlips: BetSlip[]; activeSlipId: string } {
  const kept = slips.filter(
    (s) => s.selectedNumbers.length > 0 || s.id === activeSlipId
  );

  if (kept.length === 0) {
    const id = `slip-${Date.now()}`;
    return { betSlips: [makeSlip(id, preservedStake)], activeSlipId: id };
  }

  let nextActive = activeSlipId;
  if (!kept.some((s) => s.id === activeSlipId)) {
    nextActive = kept[kept.length - 1]!.id;
  }

  return { betSlips: kept, activeSlipId: nextActive };
}

export interface ConfirmedTicket {
  id: string;
  roundId: string;
  selectedNumbers: number[];
  stakeMinor: string;
  currency: string;
  status: string;
  payoutMinor?: string;
  createdAt?: string;
}

interface GameState {
  betSlips: BetSlip[];
  activeSlipId: string;
  drawnNumbers: number[];
  isDrawing: boolean;
  currency: string;

  addSlip: () => void;
  removeSlip: (id: string) => void;
  setActiveSlip: (id: string) => void;

  toggleNumber: (num: number) => void;
  quickPick: (count: number) => void;
  clearSelection: () => void;
  setSelectedNumbers: (numbers: number[]) => void;

  incrementStakeForSlip: (slipId: string) => void;
  decrementStakeForSlip: (slipId: string) => void;
  setStakeForSlip: (slipId: string, stake: string) => void;
  incrementAllStakes: () => void;
  decrementAllStakes: () => void;
  setStakeMinor: (stake: string) => void;

  confirmedTickets: ConfirmedTicket[];
  addConfirmedTickets: (tickets: ConfirmedTicket[]) => void;
  clearConfirmedTickets: () => void;
  resetSlips: () => void;

  setDrawnNumbers: (nums: (number | string)[]) => void;
  addDrawnNumber: (num: number | string) => void;
  setIsDrawing: (drawing: boolean) => void;
  resetRoundDraw: () => void;

  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  getActiveSlip: () => BetSlip;
}

const INITIAL_SLIP_ID = 'slip-1';

export const useGameStore = create<GameState>((set, get) => ({
  isOnline: false,
  setIsOnline: (isOnline: boolean) => set({ isOnline }),
  betSlips: [makeSlip(INITIAL_SLIP_ID)],
  activeSlipId: INITIAL_SLIP_ID,
  drawnNumbers: [],
  isDrawing: false,
  currency: 'ETB',

  getActiveSlip: () => {
    const { betSlips, activeSlipId } = get();
    return betSlips.find((s) => s.id === activeSlipId) ?? betSlips[0]!;
  },

  addSlip: () =>
    set((state) => {
      const filledCount = state.betSlips.filter((s) => s.selectedNumbers.length > 0).length;
      if (filledCount >= MAX_SLIPS) return state;
      const active = state.betSlips.find((s) => s.id === state.activeSlipId);
      const id = `slip-${Date.now()}`;
      const newSlip = makeSlip(id);
      if (active) {
        newSlip.stakeMinor = active.stakeMinor;
      }
      return pruneEmptySlips([...state.betSlips, newSlip], id);
    }),

  removeSlip: (id: string) =>
    set((state) => {
      const slips = state.betSlips.filter((s) => s.id !== id);
      const activeSlipId =
        state.activeSlipId === id ? (slips[slips.length - 1]?.id ?? id) : state.activeSlipId;
      return pruneEmptySlips(slips.length ? slips : state.betSlips, activeSlipId);
    }),

  setActiveSlip: (id: string) =>
    set((state) => pruneEmptySlips(state.betSlips, id)),

  toggleNumber: (num: number) =>
    set((state) => {
      const slips = state.betSlips.map((slip) => {
        if (slip.id !== state.activeSlipId) return slip;
        const has = slip.selectedNumbers.includes(num);
        const next = has
          ? slip.selectedNumbers.filter((n) => n !== num)
          : slip.selectedNumbers.length < 10
            ? [...slip.selectedNumbers, num].sort((a, b) => a - b)
            : slip.selectedNumbers;
        return { ...slip, selectedNumbers: next };
      });
      return pruneEmptySlips(slips, state.activeSlipId);
    }),

  quickPick: (count: number) =>
    set((state) => {
      const target = Math.min(10, Math.max(1, count));
      const pool = Array.from({ length: 80 }, (_, i) => i + 1);
      const picks: number[] = [];
      for (let i = 0; i < target; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool[idx]!);
        pool.splice(idx, 1);
      }
      picks.sort((a, b) => a - b);
      const slips = state.betSlips.map((slip) =>
        slip.id === state.activeSlipId ? { ...slip, selectedNumbers: picks } : slip
      );
      return pruneEmptySlips(slips, state.activeSlipId);
    }),

  clearSelection: () =>
    set((state) => {
      const slips = state.betSlips.map((slip) =>
        slip.id === state.activeSlipId ? { ...slip, selectedNumbers: [] } : slip
      );
      return pruneEmptySlips(slips, state.activeSlipId);
    }),

  setSelectedNumbers: (numbers: number[]) =>
    set((state) => {
      const sorted = Array.from(new Set(numbers))
        .filter((n) => n >= 1 && n <= 80)
        .slice(0, 10)
        .sort((a, b) => a - b);
      const slips = state.betSlips.map((slip) =>
        slip.id === state.activeSlipId ? { ...slip, selectedNumbers: sorted } : slip
      );
      return pruneEmptySlips(slips, state.activeSlipId);
    }),

  incrementStakeForSlip: (slipId: string) =>
    set((state) => ({
      betSlips: state.betSlips.map((slip) =>
        slip.id === slipId
          ? { ...slip, stakeMinor: nextStake(slip.stakeMinor, 1) }
          : slip
      ),
    })),

  decrementStakeForSlip: (slipId: string) =>
    set((state) => ({
      betSlips: state.betSlips.map((slip) =>
        slip.id === slipId
          ? { ...slip, stakeMinor: nextStake(slip.stakeMinor, -1) }
          : slip
      ),
    })),

  setStakeForSlip: (slipId: string, stake: string) =>
    set((state) => ({
      betSlips: state.betSlips.map((slip) =>
        slip.id === slipId ? { ...slip, stakeMinor: stake } : slip
      ),
    })),

  incrementAllStakes: () =>
    set((state) => {
      const reference = state.betSlips[0]?.stakeMinor ?? '200';
      const next = nextStake(reference, 1);
      return {
        betSlips: state.betSlips.map((slip) => ({ ...slip, stakeMinor: next })),
      };
    }),

  decrementAllStakes: () =>
    set((state) => {
      const reference = state.betSlips[0]?.stakeMinor ?? '200';
      const next = nextStake(reference, -1);
      return {
        betSlips: state.betSlips.map((slip) => ({ ...slip, stakeMinor: next })),
      };
    }),

  setStakeMinor: (stake: string) =>
    set((state) => {
      const parsed = Math.min(400000, Math.max(200, Number(stake) || 200));
      const safe = String(parsed);
      return {
        betSlips: state.betSlips.map((slip) => ({ ...slip, stakeMinor: safe })),
      };
    }),

  confirmedTickets: [],

  addConfirmedTickets: (tickets: ConfirmedTicket[]) =>
    set((state) => ({
      confirmedTickets: [...tickets, ...state.confirmedTickets],
    })),

  clearConfirmedTickets: () => set({ confirmedTickets: [] }),

  resetSlips: () =>
    set((state) => {
      const active = state.betSlips.find((s) => s.id === state.activeSlipId);
      const currentStake = active?.stakeMinor ?? state.betSlips[0]?.stakeMinor ?? '200';
      return {
        betSlips: [makeSlip(INITIAL_SLIP_ID, currentStake)],
        activeSlipId: INITIAL_SLIP_ID,
      };
    }),

  setDrawnNumbers: (drawnNumbers: (number | string)[]) =>
    set({
      drawnNumbers: (drawnNumbers || [])
        .map((n) => Number(n))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 80),
    }),

  addDrawnNumber: (num: number | string) => {
    const parsed = Number(num);
    if (isNaN(parsed) || parsed < 1 || parsed > 80) return;
    const { drawnNumbers } = get();
    if (!drawnNumbers.map(Number).includes(parsed)) {
      set({ drawnNumbers: [...drawnNumbers, parsed] });
    }
  },

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  resetRoundDraw: () => set({ drawnNumbers: [], isDrawing: false }),
}));
