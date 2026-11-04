import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../store/useGameStore';

/**
 * Returns a Set of numbers that have been ACTUALLY bet on for the current round in mobile.
 * This ensures drawn balls only highlight green (as hits) if a real bet was submitted,
 * and unplaced draft picks on the grid or in slips are NOT mistakenly highlighted as hits.
 */
export function usePlacedBetNumbers(roundId?: string): Set<number> {
  const confirmedTickets = useGameStore((s) => s.confirmedTickets);
  const queryClient = useQueryClient();
  const userBetHistory = queryClient.getQueryData<any[]>(['betHistory']) || [];

  return React.useMemo(() => {
    const set = new Set<number>();

    // 1. Check locally confirmed tickets for this round
    if (Array.isArray(confirmedTickets)) {
      for (const ticket of confirmedTickets) {
        if (!roundId || !ticket.roundId || ticket.roundId === roundId) {
          if (Array.isArray(ticket.selectedNumbers)) {
            ticket.selectedNumbers.forEach((n: any) => {
              const num = Number(n);
              if (!isNaN(num) && num > 0) set.add(num);
            });
          }
        }
      }
    }

    // 2. Check query cache from server in case user refreshed
    if (Array.isArray(userBetHistory)) {
      for (const bet of userBetHistory) {
        if (!roundId || bet.roundId === roundId || bet.round?.id === roundId) {
          if (Array.isArray(bet.selectedNumbers)) {
            bet.selectedNumbers.forEach((n: any) => {
              const num = Number(n);
              if (!isNaN(num) && num > 0) set.add(num);
            });
          }
        }
      }
    }

    return set;
  }, [confirmedTickets, userBetHistory, roundId]);
}

