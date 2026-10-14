import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  SimulatedBet,
  generateInitialSimulatedBets,
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

  // Per-round count: varies realistically per game (3k, 7k, 12k, 21k, etc.)
  // and climbs monotonically during this round
  const [totalCount, setTotalCount] = useState<number>(() =>
    getRoundSavedCount(currentKey)
  );

  const incrementCount = useCallback(
    (amount = 1) => {
      setTotalCount((prev) => {
        const next = prev + Math.max(0, amount);
        saveRoundCount(currentKey, next);
        return next;
      });
    },
    [currentKey]
  );

  // Switch to new round: load that round's distinct count and generate fresh bets
  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;
      setSimulatedBets(generateInitialSimulatedBets(currentKey, 16));
      setTotalCount(getRoundSavedCount(currentKey));
    }
  }, [currentKey]);

  // Simulate human player arrivals during betting countdown
  // Stochastic intervals (quick bursts, normal pace, natural lulls) + multi-player joins (1, 2, or 3 at once)
  useEffect(() => {
    if (!enabled) return;
    if (roundStatus !== 'OPEN' || isDrawing) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextArrival = () => {
      // Stochastic human cadence (not a ticking clock):
      // ~20% quick flurry: 450ms - 1000ms
      // ~55% regular cadence: 1400ms - 2900ms
      // ~25% natural pause: 3500ms - 5500ms
      const roll = Math.random();
      let delay: number;
      if (roll < 0.2) {
        delay = Math.floor(Math.random() * 550) + 450;
      } else if (roll < 0.75) {
        delay = Math.floor(Math.random() * 1500) + 1400;
      } else {
        delay = Math.floor(Math.random() * 2000) + 3500;
      }

      timeoutId = setTimeout(() => {
        // Multi-player arrivals:
        // ~55% single player (1)
        // ~30% two players join together (2)
        // ~15% three players burst in (3)
        const batchRoll = Math.random();
        const batchSize = batchRoll < 0.55 ? 1 : batchRoll < 0.85 ? 2 : 3;

        const newBets = createSimulatedBetsBatch(currentKey, batchSize);
        setSimulatedBets((prev) => [...newBets, ...prev.slice(0, 36 - batchSize)]);

        // Increment round counter by batch size + occasional concurrent table bet
        const countDelta = batchSize + (Math.random() < 0.35 ? 1 : 0);
        incrementCount(countDelta);

        scheduleNextArrival();
      }, delay);
    };

    scheduleNextArrival();

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
