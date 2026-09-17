import { create } from 'zustand';

interface GameState {
  selectedNumbers: number[];
  stakeMinor: string;
  currency: string;
  drawnNumbers: number[];
  isDrawing: boolean;
  toggleNumber: (num: number) => void;
  quickPick: (count: number) => void;
  clearSelection: () => void;
  setStakeMinor: (stake: string) => void;
  setDrawnNumbers: (nums: number[]) => void;
  addDrawnNumber: (num: number) => void;
  setIsDrawing: (drawing: boolean) => void;
  resetRoundDraw: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  selectedNumbers: [],
  stakeMinor: '500', // $5.00 default
  currency: 'USD',
  drawnNumbers: [],
  isDrawing: false,

  toggleNumber: (num: number) => {
    const { selectedNumbers } = get();
    if (selectedNumbers.includes(num)) {
      set({ selectedNumbers: selectedNumbers.filter((n) => n !== num) });
    } else {
      if (selectedNumbers.length < 10) {
        set({ selectedNumbers: [...selectedNumbers, num].sort((a, b) => a - b) });
      }
    }
  },

  quickPick: (count: number) => {
    const targetCount = Math.min(10, Math.max(1, count));
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    const picks: number[] = [];

    for (let i = 0; i < targetCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool[idx]!);
      pool.splice(idx, 1);
    }

    set({ selectedNumbers: picks.sort((a, b) => a - b) });
  },

  clearSelection: () => set({ selectedNumbers: [] }),

  setStakeMinor: (stakeMinor: string) => set({ stakeMinor }),

  setDrawnNumbers: (drawnNumbers: number[]) => set({ drawnNumbers }),

  addDrawnNumber: (num: number) => {
    const { drawnNumbers } = get();
    if (!drawnNumbers.includes(num)) {
      set({ drawnNumbers: [...drawnNumbers, num] });
    }
  },

  setIsDrawing: (isDrawing: boolean) => set({ isDrawing }),

  resetRoundDraw: () => set({ drawnNumbers: [], isDrawing: false }),
}));
