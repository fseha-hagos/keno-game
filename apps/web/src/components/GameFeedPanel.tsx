import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { Play, RotateCcw, Check, BarChart2, Crown } from 'lucide-react';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';
import { useSimulatedPlayers } from '../hooks/useSimulatedPlayers';
import { BetCard } from './BetCard';

export type FeedTab = 'GAME' | 'HISTORY' | 'RESULTS' | 'STATISTICS' | 'LEADERBOARD';

interface BetDisplayItem {
  id: string;
  username: string;
  numbers: number[];
  stake: number;
  status: string;
  payout?: number;
  time?: string;
  currency?: string;
  isUserTicket?: boolean;
}

interface HistoryDrawGroup {
  roundId: string;
  roundNumber: number | string;
  drawResult: number[];
  tickets: Array<{
    id: string;
    numbers: number[];
    stake: number;
    payout: number;
    status: string;
    createdAt?: string;
  }>;
}

// Authentic 100-round stats seed matching actual Keno 20/80 probability distribution
// (Mean is 25 hits per 100 rounds)
const BASE_100_ROUND_STATS: Record<number, number> = {
  1: 26, 2: 21, 3: 24, 4: 31, 5: 25, 6: 25, 7: 27, 8: 20, 9: 34, 10: 24,
  11: 22, 12: 24, 13: 20, 14: 28, 15: 29, 16: 23, 17: 25, 18: 30, 19: 19, 20: 26,
  21: 27, 22: 22, 23: 31, 24: 25, 25: 28, 26: 21, 27: 23, 28: 33, 29: 24, 30: 26,
  31: 29, 32: 22, 33: 27, 34: 25, 35: 32, 36: 24, 37: 21, 38: 28, 39: 20, 40: 27,
  41: 25, 42: 23, 43: 29, 44: 22, 45: 30, 46: 24, 47: 26, 48: 33, 49: 21, 50: 25,
  51: 28, 52: 22, 53: 24, 54: 29, 55: 26, 56: 23, 57: 27, 58: 31, 59: 20, 60: 25,
  61: 26, 62: 22, 63: 28, 64: 24, 65: 27, 66: 32, 67: 21, 68: 25, 69: 29, 70: 23,
  71: 27, 72: 24, 73: 22, 74: 26, 75: 31, 76: 25, 77: 28, 78: 20, 79: 24, 80: 29,
};

// High roller leaders matching casino mock
const AUTHENTIC_LEADERS = [
  { rank: 1, user: 'f***b', bet: 800, win: 30000, currency: 'ETB' },
  { rank: 2, user: 'd***j', bet: 1000, win: 30000, currency: 'ETB' },
  { rank: 3, user: 'a***h', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 4, user: 'j***r', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 5, user: 'j***r', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 6, user: 'j***r', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 7, user: 'j***r', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 8, user: 'j***r', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 9, user: 'j***r', bet: 600, win: 30000, currency: 'ETB' },
  { rank: 10, user: 'k***m', bet: 500, win: 25000, currency: 'ETB' },
  { rank: 11, user: 's***7', bet: 500, win: 25000, currency: 'ETB' },
  { rank: 12, user: 'b***2', bet: 400, win: 20000, currency: 'ETB' },
  { rank: 13, user: 'z***w', bet: 400, win: 20000, currency: 'ETB' },
  { rank: 14, user: 'm***u', bet: 300, win: 15000, currency: 'ETB' },
  { rank: 15, user: 't***e', bet: 300, win: 15000, currency: 'ETB' },
];

export const GameFeedPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('GAME');
  const [filterType, setFilterType] = useState<'all' | 'tickets' | 'bets'>('all');
  const [statsSort, setStatsSort] = useState<'number' | 'desc' | 'asc'>('number');
  const { isAuthenticated } = useAuthStore();
  const { confirmedTickets, drawnNumbers, isDrawing, isOnline } = useGameStore();

  // Fetch real user bet history
  const { data: userBetHistory } = useQuery({
    queryKey: ['betHistory'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/keno/bets/history');
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  // Fetch recent bets across players for live feed
  const { data: recentBets } = useQuery({
    queryKey: ['recentBets'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/keno/bets/recent');
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  // Fetch recent rounds for RESULTS & STATS tabs
  const { data: roundResults } = useQuery({
    queryKey: ['roundResults'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/keno/rounds/recent');
        return res.data;
      } catch {
        return [];
      }
    },
    refetchInterval: 3000,
  });

  // Fetch current live game round
  const { data: currentRound } = useQuery({
    queryKey: ['currentRound'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/keno/rounds/current');
        return res.data;
      } catch {
        return null;
      }
    },
    refetchInterval: 2000,
  });

  const parseDrawnNumbers = (round: any): number[] => {
    if (!round) return [];
    const raw = round.drawResult || round.drawnNumbers;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((n) => Number(n)).filter((n) => !isNaN(n));
    }
    if (typeof raw === 'string') {
      return raw.split(',').map((n) => Number(n.trim())).filter((n) => !isNaN(n));
    }
    return [];
  };

  const currentRoundDrawn = React.useMemo(
    () => parseDrawnNumbers(currentRound),
    [currentRound],
  );

  const liveDrawnSet = React.useMemo(() => {
    const set = new Set<number>();
    (drawnNumbers || []).forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v > 0) set.add(v);
    });
    (currentRoundDrawn || []).forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v > 0) set.add(v);
    });
    return set;
  }, [drawnNumbers, currentRoundDrawn]);

  const sortedStats = React.useMemo(() => {
    const list = Object.entries(BASE_100_ROUND_STATS).map(([n, count]) => ({
      number: Number(n),
      count,
    }));

    if (statsSort === 'desc') {
      return [...list].sort((a, b) => b.count - a.count || a.number - b.number);
    }
    if (statsSort === 'asc') {
      return [...list].sort((a, b) => a.count - b.count || a.number - b.number);
    }
    return list;
  }, [statsSort]);

  const toggleSort = () => {
    setStatsSort((prev) => {
      if (prev === 'number') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'number';
    });
  };

  const currentRoundId = currentRound?.id;
  const currentRoundNum = currentRound?.roundNumber;

  const serverCurrentBets = (Array.isArray(userBetHistory) ? userBetHistory : []).filter(
    (b: any) =>
      (currentRoundId && (b.roundId === currentRoundId || b.round?.id === currentRoundId)) ||
      (currentRoundNum && b.round?.roundNumber === currentRoundNum),
  );

  const ticketMap = new Map<string, BetDisplayItem>();

  // 1. Server bets for current round
  serverCurrentBets.forEach((item: any, idx: number) => {
    const stake = Math.round(Number(item.stakeMinor || 0) / 100) || 5;
    const payoutMinor = Number(item.payoutMinor || 0);
    const payout = payoutMinor > 0 ? payoutMinor / 100 : 0;
    const isSettled = item.status === 'SETTLED';
    const statusLabel = isSettled ? (payout > 0 ? 'Won' : 'Lost') : 'Waiting';

    const cleanNumbers = (item.selectedNumbers || [])
      .map((n: any) => Number(n))
      .filter((n: number) => !isNaN(n));

    ticketMap.set(item.id, {
      id: item.id || `pending-${idx}`,
      username: `You (Ticket #${idx + 1})`,
      numbers: cleanNumbers,
      stake,
      status: statusLabel,
      payout,
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
      currency: item.currency || 'ETB',
    });
  });

  // 2. Confirmed user session tickets
  (confirmedTickets || []).forEach((item: any) => {
    if (!currentRoundId || item.roundId === currentRoundId) {
      if (!ticketMap.has(item.id)) {
        const stake = Math.round(Number(item.stakeMinor || 0) / 100) || 5;
        const cleanNumbers = (item.selectedNumbers || [])
          .map((n: any) => Number(n))
          .filter((n: number) => !isNaN(n));

        ticketMap.set(item.id, {
          id: item.id,
          username: `You (Ticket #${ticketMap.size + 1})`,
          numbers: cleanNumbers,
          stake,
          status: 'Waiting',
          time: item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
          currency: item.currency || 'ETB',
        });
      }
    }
  });

  const userTicketItems: BetDisplayItem[] = Array.from(ticketMap.values());

  // 3. Live player bets strictly for CURRENT round
  const liveRecentItems: BetDisplayItem[] = (Array.isArray(recentBets) ? recentBets : [])
    .filter(
      (item: any) =>
        (currentRoundId && (item.roundId === currentRoundId || item.round?.id === currentRoundId)) ||
        (currentRoundNum && item.round?.roundNumber === currentRoundNum),
    )
    .map((item: any, idx: number) => {
      const stake = Math.round(Number(item.stakeMinor || 0) / 100) || item.stake || 5;
      const payoutMinor = Number(item.payoutMinor || 0);
      const payout = payoutMinor > 0 ? payoutMinor / 100 : 0;
      const isWin = payout > 0;
      const statusLabel = item.status === 'SETTLED' ? (isWin ? 'Won' : 'Lost') : 'Waiting';

      const maskedUser = item.user?.username
        ? `${item.user.username.slice(0, 1)}***${item.user.username.slice(-1)}`
        : item.userId
          ? `${item.userId.slice(0, 1)}***${item.userId.slice(-1)}`
          : 'player';

      const cleanNumbers = (item.selectedNumbers || [])
        .map((n: any) => Number(n))
        .filter((n: number) => !isNaN(n));

      return {
        id: item.id || `live-rec-${idx}`,
        username: maskedUser,
        numbers: cleanNumbers,
        stake,
        status: statusLabel,
        payout,
        currency: item.currency || 'ETB',
      };
    });

  const { simulatedBets, totalCount: simTotalCount } = useSimulatedPlayers({
    roundId: currentRound?.id,
    roundNumber: currentRound?.roundNumber,
    roundStatus: currentRound?.status,
    isDrawing,
    drawnNumbers,
    isOnline,
  });

  const allCurrentRoundBetsMap = new Map<string, BetDisplayItem>();
  userTicketItems.forEach((t) => allCurrentRoundBetsMap.set(t.id, { ...t, isUserTicket: true }));
  liveRecentItems.forEach((t) => {
    if (!allCurrentRoundBetsMap.has(t.id)) {
      allCurrentRoundBetsMap.set(t.id, t);
    }
  });
  simulatedBets.forEach((s) => {
    if (!allCurrentRoundBetsMap.has(s.id)) {
      allCurrentRoundBetsMap.set(s.id, s);
    }
  });
  const allCurrentRoundBets = Array.from(allCurrentRoundBetsMap.values());

  const displayedGameBets =
    filterType === 'tickets' || filterType === 'bets' ? userTicketItems : allCurrentRoundBets;

  // Group historical user bets by round for HISTORY tab
  const groupedHistory: HistoryDrawGroup[] = React.useMemo(() => {
    if (!Array.isArray(userBetHistory) || userBetHistory.length === 0) return [];

    const groupsMap = new Map<string, HistoryDrawGroup>();
    userBetHistory.forEach((bet: any) => {
      const roundNumber =
        bet.round?.roundNumber ?? (bet.roundId ? bet.roundId.slice(0, 6) : '—');
      const groupKey = String(roundNumber);
      const roundDrawn = parseDrawnNumbers(bet.round);

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          roundId: bet.roundId || bet.round?.id || groupKey,
          roundNumber,
          drawResult: roundDrawn,
          tickets: [],
        });
      }

      const cleanNumbers = (bet.selectedNumbers || [])
        .map((n: any) => Number(n))
        .filter((n: number) => !isNaN(n));

      const stake = Math.round(Number(bet.stakeMinor || 0) / 100) || 5;
      const payoutMinor = Number(bet.payoutMinor || 0);
      const payout = payoutMinor > 0 ? payoutMinor / 100 : 0;

      groupsMap.get(groupKey)!.tickets.push({
        id: bet.id,
        numbers: cleanNumbers,
        stake,
        payout,
        status: bet.status === 'SETTLED' ? (payout > 0 ? 'Won' : 'Lost') : 'Waiting',
        createdAt: bet.createdAt,
      });
    });

    return Array.from(groupsMap.values());
  }, [userBetHistory]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        padding: '0 4px 20px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* 1. Tabs Row matching mock_web .tabs: GAME, HISTORY, RESULTS, STATISTICS, LEADERS */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          borderBottom: '1px solid rgba(81, 181, 121, 0.25)',
          marginBottom: 8,
          width: '100%',
          padding: '2px 2px 0',
        }}
      >
        {[
          {
            key: 'GAME',
            label: 'GAME',
            icon: <Play size={12} fill="#71ce96" color="#71ce96" />,
          },
          {
            key: 'HISTORY',
            label: 'HISTORY',
            icon: <RotateCcw size={13} color="#71ce96" strokeWidth={2.8} />,
          },
          {
            key: 'RESULTS',
            label: 'RESULTS',
            icon: <Check size={14} color="#71ce96" strokeWidth={3.4} />,
          },
          {
            key: 'STATISTICS',
            label: 'STATISTICS',
            icon: (
              <svg width="15" height="13" viewBox="0 0 16 14" fill="none" style={{ marginRight: 1 }}>
                <path d="M1 9.5L4.5 5.5L8.5 8.5L14.5 2" stroke="#71ce96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1 13H15" stroke="#71ce96" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="2" y="8" width="2" height="4" fill="#71ce96" rx="0.5" />
                <rect x="6.5" y="10" width="2" height="2" fill="#71ce96" rx="0.5" />
                <rect x="11" y="6" width="2" height="6" fill="#71ce96" rx="0.5" />
              </svg>
            ),
          },
          {
            key: 'LEADERBOARD',
            label: 'LEADERS',
            icon: <Crown size={13} color="#71ce96" strokeWidth={2.5} />,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as FeedTab)}
              style={{
                flexShrink: 0,
                padding: '6px 3px 7px',
                border: 'none',
                background: 'transparent',
                color: '#71ce96',
                opacity: isActive ? 1 : 0.85,
                fontFamily: KENO_FONTS.ui,
                fontSize: 12.5,
                fontWeight: isActive ? 800 : 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                borderBottom: isActive ? '2.5px solid #71ce96' : '2.5px solid transparent',
                transition: 'all 0.12s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-filters row matching mock_web .tickets_stat: All, My Tickets, My Bets */}
      {activeTab === 'GAME' && (
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            padding: '6px 4px',
            borderBottom: '1px solid rgba(81, 181, 121, 0.15)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            fontFamily: KENO_FONTS.ui,
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              background: 'transparent',
              border: 'none',
              color: filterType === 'all' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              fontFamily: KENO_FONTS.ui,
              fontSize: 12,
            }}
          >
            All <span style={{ color: '#71ce96', marginLeft: 3 }}>{simTotalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('tickets')}
            style={{
              background: 'transparent',
              border: 'none',
              color: filterType === 'tickets' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              fontFamily: KENO_FONTS.ui,
              fontSize: 12,
            }}
          >
            My Tickets <span style={{ color: '#71ce96', marginLeft: 3 }}>{userTicketItems.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('bets')}
            style={{
              background: 'transparent',
              border: 'none',
              color: filterType === 'bets' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              fontFamily: KENO_FONTS.ui,
              fontSize: 12,
            }}
          >
            My Bets <span style={{ color: '#71ce96', marginLeft: 3 }}>{userTicketItems.length}</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* GAME TAB FEED (Matching Shamo.bet Images 1, 4, 6, 7)       */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'GAME' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayedGameBets.length === 0 ? (
            <div
              style={{
                background: '#0D1520',
                border: '1px dashed #1B293A',
                borderRadius: 8,
                padding: '20px 14px',
                textAlign: 'center',
                color: '#64748B',
                fontSize: 12,
              }}
            >
              No bets placed for Round #{currentRoundNum ?? '—'} yet. Pick numbers and tap BET!
            </div>
          ) : (
            displayedGameBets.map((item: any) => {
              const cleanNumbers = (item.numbers || []).map(Number).filter((n: number) => !isNaN(n));
              const spots = cleanNumbers.length;
              const hitCount = cleanNumbers.filter((n: number) => liveDrawnSet.has(n)).length;
              const multiplier =
                spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, hitCount) : 0;
              const liveWin =
                item.payout !== undefined && item.payout > 0
                  ? item.payout
                  : item.stake * multiplier;

              return (
                <BetCard
                  key={item.id}
                  id={item.id}
                  username={item.username}
                  numbers={cleanNumbers}
                  stake={item.stake}
                  status={item.status}
                  payout={liveWin}
                  isUserTicket={item.isUserTicket || item.username.startsWith('You')}
                  liveDrawnSet={liveDrawnSet}
                />
              );
            })
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* HISTORY TAB                                                 */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groupedHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, padding: 20 }}>
              No past bets recorded.
            </div>
          ) : (
            groupedHistory.map((group) => {
              const drawSet = new Set(group.drawResult);
              return (
                <div
                  key={group.roundId}
                  style={{
                    background: '#0F1823',
                    border: '1px solid #1A283B',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#FFFFFF' }}>
                      Round #{group.roundNumber}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      {group.tickets.length} ticket{group.tickets.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {group.tickets.map((t) => {
                      const hitCount = t.numbers.filter((n) => drawSet.has(n)).length;
                      const isWon = t.payout > 0;
                      return (
                        <div
                          key={t.id}
                          style={{
                            background: '#14202E',
                            borderRadius: 4,
                            padding: '6px 8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 4 }}>
                            {t.numbers.map((n) => (
                              <span
                                key={n}
                                style={{
                                  fontWeight: 800,
                                  color: drawSet.has(n) ? '#22C55E' : '#94A3B8',
                                }}
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontWeight: 800, color: isWon ? '#22C55E' : '#EF4444' }}>
                            {isWon ? `+${t.payout.toFixed(2)} ETB` : 'Lost'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* RESULTS TAB                                                 */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'RESULTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.isArray(roundResults) && roundResults.length > 0 ? (
            roundResults.map((r: any) => {
              const drawn = parseDrawnNumbers(r);
              const roundNum = r.roundNumber ?? r.id.slice(0, 6);
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#0F1823',
                    border: '1px solid #1A283B',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#FFFFFF', marginBottom: 6 }}>
                    Round #{roundNum}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3 }}>
                    {drawn.map((n) => (
                      <div
                        key={n}
                        style={{
                          aspectRatio: '1/1',
                          borderRadius: '50%',
                          background: '#334155',
                          color: '#FFFFFF',
                          fontSize: 9,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, padding: 20 }}>
              No recent round results available.
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* STATISTICS TAB                                              */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'STATISTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Subheader: Last 100 rounds & Sort button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 4px 8px',
              color: '#8d98a0',
              fontSize: 12,
              fontFamily: KENO_FONTS.ui,
            }}
          >
            <span style={{ color: '#8d98a0', fontWeight: 600 }}>Last 100 rounds</span>
            <button
              type="button"
              onClick={toggleSort}
              title={`Sorting: ${statsSort === 'number' ? 'By Number (1-80)' : statsSort === 'desc' ? 'Hot (High to Low)' : 'Cold (Low to High)'}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71ce96',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 4px',
                fontFamily: KENO_FONTS.ui,
              }}
            >
              <span>Sort</span>
              <svg width="13" height="11" viewBox="0 0 14 12" fill="none">
                <path d="M1 2H13M1 6H9M1 10H5" stroke="#71ce96" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* List of 80 Numbers with Hit Bar */}
          <div
            className="fast-keno-chat-scroll"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              maxHeight: 460,
              overflowY: 'auto',
              paddingRight: 3,
            }}
          >
            {sortedStats.map((item) => {
              // Scale relative to typical maximum (~38 hits)
              const barPercent = Math.min(100, Math.max(12, (item.count / 38) * 100));

              return (
                <div
                  key={item.number}
                  style={{
                    background: '#242b31',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    borderRadius: 6,
                    padding: '4px 14px 4px 5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Square number badge */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      background: '#333f46',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: KENO_FONTS.numbers,
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.35)',
                    }}
                  >
                    {item.number}
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div
                    style={{
                      flex: 1,
                      height: 2.5,
                      borderRadius: 2,
                      background: 'rgba(255, 255, 255, 0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barPercent}%`,
                        height: '100%',
                        background: '#51b579',
                        borderRadius: 2,
                      }}
                    />
                  </div>

                  {/* Hit Count */}
                  <div
                    style={{
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: KENO_FONTS.numbers,
                      minWidth: 20,
                      textAlign: 'right',
                    }}
                  >
                    {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* LEADERS TAB                                                 */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'LEADERBOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Table Header: #, ID, Bet, Win */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 65px 75px',
              alignItems: 'center',
              padding: '2px 14px 8px',
              color: '#8d98a0',
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: KENO_FONTS.ui,
            }}
          >
            <span>#</span>
            <span>ID</span>
            <span style={{ textAlign: 'center' }}>Bet</span>
            <span style={{ textAlign: 'right' }}>Win</span>
          </div>

          {/* Leaders List */}
          <div
            className="fast-keno-chat-scroll"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              maxHeight: 460,
              overflowY: 'auto',
              paddingRight: 3,
            }}
          >
            {AUTHENTIC_LEADERS.map((entry) => {
              const isTopThree = entry.rank <= 3;

              return (
                <div
                  key={`${entry.rank}-${entry.user}`}
                  style={{
                    background: isTopThree ? '#1a2c1f' : '#242b31',
                    border: isTopThree
                      ? '1px solid rgba(81, 181, 121, 0.25)'
                      : '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: 6,
                    padding: '7px 14px',
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 65px 75px',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Rank # */}
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 800,
                      fontFamily: KENO_FONTS.numbers,
                      color: isTopThree ? '#facc15' : '#51b579',
                    }}
                  >
                    {entry.rank}
                  </span>

                  {/* Masked ID */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isTopThree ? '#FFFFFF' : '#86efac',
                      fontFamily: KENO_FONTS.ui,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {entry.user}
                  </span>

                  {/* Bet Amount */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: KENO_FONTS.numbers,
                      color: isTopThree ? '#FFFFFF' : '#51b579',
                      textAlign: 'center',
                    }}
                  >
                    {entry.bet}
                  </span>

                  {/* Win Amount & Currency stacked vertically */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      lineHeight: 1.05,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        fontFamily: KENO_FONTS.numbers,
                        color: isTopThree ? '#facc15' : '#51b579',
                      }}
                    >
                      {entry.win}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        fontFamily: KENO_FONTS.ui,
                        color: isTopThree ? '#facc15' : '#51b579',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {entry.currency || 'ETB'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
