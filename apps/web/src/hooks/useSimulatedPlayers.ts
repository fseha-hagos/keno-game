import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  SimulatedBet,
  createSimulatedBet,
  generateInitialSimulatedBets,
  getPersistentTotalBets,
  savePersistentTotalBets,
  evaluateSimulatedBet,
} from '../services/simulatedPlayers';

interface UseSimulatedPlayersOptions {
  roundId?: string;
  roundNumber?: number | string;
  roundStatus?: string;
  isDrawing?: boolean;
  drawnNumbers?: (number | string)[];
  enabled?: boolean;
}

export function useSimulatedPlayers({
  roundId,
  roundNumber,
  roundStatus = 'OPEN',
  isDrawing = false,
  drawnNumbers = [],
  enabled = true,
}: UseSimulatedPlayersOptions) {
  const currentKey = roundId ? String(roundId) : roundNumber ? String(roundNumber) : 'default-round';
  const prevKeyRef = useRef(currentKey);

  const [simulatedBets, setSimulatedBets] = useState<SimulatedBet[]>(() =>
    generateInitialSimulatedBets(currentKey, 16)
  );

  // Monotonic, persistent total bet counter (never resets or steps backwards)
  const [totalCount, setTotalCount] = useState<number>(() =>
    getPersistentTotalBets(roundNumber)
  );

  const incrementCount = useCallback((amount = 1) => {
    setTotalCount((prev) => {
      const next = prev + Math.max(0, amount);
      savePersistentTotalBets(next);
      return next;
    });
  }, []);

  // Re-initialize bets when round changes, smoothly advancing counter
  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;
      setSimulatedBets(generateInitialSimulatedBets(currentKey, 16));
      // Seamlessly advance counter by 1-3 bets queued for the new round
      incrementCount(Math.floor(Math.random() * 3) + 1);
    }
  }, [currentKey, incrementCount]);

  // Simulate new incoming player bets during betting countdown
  useEffect(() => {
    if (!enabled) return;
    if (roundStatus !== 'OPEN' || isDrawing) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextBet = () => {
      // Natural human interval between 1.5s and 3.2s
      const delay = Math.floor(Math.random() * 1700) + 1500;
      timeoutId = setTimeout(() => {
        const newBet = createSimulatedBet(currentKey);
        setSimulatedBets((prev) => [newBet, ...prev.slice(0, 32)]);
        incrementCount(1);
        scheduleNextBet();
      }, delay);
    };

    scheduleNextBet();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentKey, roundStatus, isDrawing, enabled, incrementCount]);

  // Drawn numbers set
  const drawnSet = useMemo(() => {
    const set = new Set<number>();
    drawnNumbers.forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v > 0) set.add(v);
    });
    return set;
  }, [drawnNumbers]);

  const isRoundComplete = roundStatus === 'COMPLETED';

  // Live evaluated simulated bets
  const evaluatedBets = useMemo(() => {
    return simulatedBets.map((bet) =>
      evaluateSimulatedBet(bet, drawnSet, isRoundComplete)
    );
  }, [simulatedBets, drawnSet, isRoundComplete]);

  return {
    simulatedBets: evaluatedBets,
    totalCount,
    enabled,
  };
}
