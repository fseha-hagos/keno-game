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
  const prevStatusRef = useRef<string>(roundStatus);

  // Initial bets list (recent tickets in feed) - starts empty for a new round
  const [simulatedBets, setSimulatedBets] = useState<SimulatedBet[]>([]);

  // Total player count for this round - starts at 0 for a new game
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

  // Switch to new round: start strictly at 0 players when a new game starts
  useEffect(() => {
    if (!currentKey) return;

    const isNewRound = prevKeyRef.current !== null && prevKeyRef.current !== currentKey;
    const isStatusTransitionToOpen = prevStatusRef.current !== 'OPEN' && roundStatus === 'OPEN';

    if (prevKeyRef.current === null) {
      // First mount: if this round already had progress saved in this session, resume it; otherwise 0
      const saved = getRoundSavedCount(currentKey);
      if (saved > 0) {
        setTotalCount(saved);
        // Generate a few visual cards to match the saved count
        const initialCards = Math.min(8, Math.max(1, Math.floor(saved / 500)));
        setSimulatedBets(createSimulatedBetsBatch(currentKey, initialCards));
      } else {
        setTotalCount(0);
        setSimulatedBets([]);
      }
    } else if (isNewRound || isStatusTransitionToOpen) {
      // New round or new game starts: reset strictly to 0
      saveRoundCount(currentKey, 0);
      setTotalCount(0);
      setSimulatedBets([]);
    }

    prevKeyRef.current = currentKey;
    prevStatusRef.current = roundStatus;
  }, [currentKey, roundStatus]);

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

        // Batch addition: 120 - 300 players at a time as requested
        const countIncrement = Math.floor(Math.random() * (300 - 120 + 1)) + 120; // 120 - 300
        incrementCount(countIncrement);

        // Add 1 to 2 visual ticket cards into the feed so the recent bets feed scrolls authentically
        const cardBatchSize = Math.random() < 0.65 ? 1 : 2;
        const newBets = createSimulatedBetsBatch(currentKey, cardBatchSize);
        setSimulatedBets((prev) => [...newBets, ...prev.slice(0, 32 - cardBatchSize)]);

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
