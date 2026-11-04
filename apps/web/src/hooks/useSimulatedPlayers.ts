import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  SimulatedBet,
  createSimulatedBetsBatch,
  getRoundSavedCount,
  saveRoundCount,
  evaluateSimulatedBet,
} from '../services/simulatedPlayers';

interface UseSimulatedPlayersOptions {
  roundId?: string;
  roundNumber?: number | string;
  roundStatus?: string;
  isDrawing?: boolean;
  drawnNumbers?: (number | string)[];
  enabled?: boolean;
  isOnline?: boolean;
}

export function useSimulatedPlayers({
  roundId,
  roundNumber,
  roundStatus = 'OPEN',
  isDrawing = false,
  drawnNumbers = [],
  enabled = true,
  isOnline: propIsOnline,
}: UseSimulatedPlayersOptions) {
  // Disconnect protection: only simulate if connected to the backend
  const storeIsOnline = useGameStore((state) => state.isOnline);
  const isConnected = propIsOnline !== undefined ? propIsOnline : storeIsOnline;

  const currentKey = roundId ? String(roundId) : roundNumber ? String(roundNumber) : '';
  const prevKeyRef = useRef<string | null>(null);

  // Initial bets list (recent tickets in feed)
  const [simulatedBets, setSimulatedBets] = useState<SimulatedBet[]>([]);

  // Total player count for this round
  const [totalCount, setTotalCount] = useState<number>(() => {
    if (!currentKey) return 0;
    return getRoundSavedCount(currentKey);
  });

  const incrementCount = useCallback(
    (amount: number) => {
      setTotalCount((prev) => {
        const next = prev + Math.max(0, amount);
        if (currentKey) {
          saveRoundCount(currentKey, next);
        }
        return next;
      });
    },
    [currentKey]
  );

  // Handle round transitions & initial page mounts
  useEffect(() => {
    if (!currentKey) return;

    if (prevKeyRef.current !== currentKey) {
      const isFirstMount = prevKeyRef.current === null;
      prevKeyRef.current = currentKey;

      const saved = getRoundSavedCount(currentKey);

      if (isFirstMount) {
        if (saved > 0) {
          setTotalCount(saved);
          const initialCards = Math.min(16, Math.max(6, Math.floor(saved / 400)));
          setSimulatedBets(createSimulatedBetsBatch(currentKey, initialCards));
        } else if (roundStatus !== 'OPEN' || isDrawing) {
          // Joined mid-draw: the round already took bets before user arrived!
          const midDrawCount = 4800 + (Math.abs(Number(roundNumber) || 1200) % 2500);
          setTotalCount(midDrawCount);
          saveRoundCount(currentKey, midDrawCount);
          setSimulatedBets(createSimulatedBetsBatch(currentKey, 14));
        } else {
          // Fresh open round on mount: start at 0
          setTotalCount(0);
          setSimulatedBets([]);
        }
      } else {
        // Round transition: only reset if a new betting round opens
        if (roundStatus === 'OPEN' && !isDrawing) {
          saveRoundCount(currentKey, 0);
          setTotalCount(0);
          setSimulatedBets([]);
        } else if (saved > 0) {
          setTotalCount(saved);
        }
      }
    }
  }, [currentKey, roundStatus, isDrawing, roundNumber]);

  // Simulate human player arrivals during OPEN betting countdown
  // Stops IMMEDIATELY when the game starts (drawing / closed) or when disconnected
  useEffect(() => {
    if (!enabled) return;

    // 1. Connection check: if user is not connected to backend, DO NOT simulate
    if (!isConnected || !currentKey) return;

    // 2. Game status check: ONLY add players while round is OPEN and NOT drawing
    // When the game starts, IMMEDIATELY stop adding!
    if (roundStatus !== 'OPEN' || isDrawing) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const scheduleNextArrival = () => {
      if (isCancelled) return;

      // Cadence: arrives in natural intervals (700ms - 1400ms)
      const delay = Math.floor(Math.random() * 700) + 700;

      timeoutId = setTimeout(() => {
        if (isCancelled) return;

        // Double check live state before mutating
        const currentState = useGameStore.getState();
        if (!currentState.isOnline || currentState.isDrawing) return;

        // Batch addition: 120 - 300 players at a time
        const countIncrement = Math.floor(Math.random() * (300 - 120 + 1)) + 120;
        incrementCount(countIncrement);

        // Populate feed with realistic tickets matching the count:
        // On initial burst, add 6-8 bets so the feed isn't barren with only 1 card!
        // On subsequent ticks, add 2-3 bets per tick up to ~32 bets
        setSimulatedBets((prev) => {
          const cardBatchSize =
            prev.length === 0
              ? Math.floor(Math.random() * 3) + 6
              : Math.random() < 0.6
              ? 2
              : 3;
          const newBets = createSimulatedBetsBatch(currentKey, cardBatchSize);
          return [...newBets, ...prev.slice(0, 32 - cardBatchSize)];
        });

        scheduleNextArrival();
      }, delay);
    };

    scheduleNextArrival();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentKey, roundStatus, isDrawing, enabled, isConnected, incrementCount]);

  // Drawn numbers set
  const drawnSet = useMemo(() => {
    const set = new Set<number>();
    drawnNumbers.forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v > 0) set.add(v);
    });
    return set;
  }, [drawnNumbers]);

  const isRoundComplete = roundStatus === 'COMPLETED' || roundStatus === 'SETTLED';

  // Live evaluated simulated bets — preserved throughout the entire draw phase!
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
