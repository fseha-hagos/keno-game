import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { Play, RotateCcw, Check, BarChart2, Crown } from 'lucide-react';
import { KENO_COLORS } from '../theme/kenoTheme';
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

export const GameFeedPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('GAME');
  const [filterType, setFilterType] = useState<'all' | 'tickets' | 'bets'>('all');
  const { isAuthenticated } = useAuthStore();
  const { confirmedTickets, drawnNumbers, isDrawing } = useGameStore();

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
      {/* 1. Shamo.bet Top Tabs Row: GAME, HISTORY, RESULTS, STATISTICS, LEADERBOARD */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          borderBottom: '1px solid #1A283B',
          marginBottom: 10,
          width: '100%',
        }}
      >
        {[
          { key: 'GAME', label: 'GAME', icon: <Play size={13} fill={activeTab === 'GAME' ? '#22C55E' : 'none'} /> },
          { key: 'HISTORY', label: 'HISTORY', icon: <RotateCcw size={13} /> },
          { key: 'RESULTS', label: 'RESULTS', icon: <Check size={14} /> },
          { key: 'STATISTICS', label: 'STATISTICS', icon: <BarChart2 size={13} /> },
          { key: 'LEADERBOARD', label: 'LEADERBOARD', icon: <Crown size={13} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as FeedTab)}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                color: isActive ? KENO_COLORS.tabActiveGreen : '#8C9DAC',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                borderBottom: isActive ? '2px solid #22C55E' : '2px solid transparent',
                transition: 'all 0.12s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-filters row: All 4718, My Tickets 0, My Bets 0 */}
      {activeTab === 'GAME' && (
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 10,
            padding: '0 4px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            whiteSpace: 'nowrap',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              color: filterType === 'all' ? '#FFFFFF' : '#8C9DAC',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              whiteSpace: 'nowrap',
            }}
          >
            All <span style={{ color: '#22C55E' }}>{simTotalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('tickets')}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              color: filterType === 'tickets' ? '#FFFFFF' : '#8C9DAC',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              whiteSpace: 'nowrap',
            }}
          >
            My Tickets <span style={{ color: '#22C55E' }}>{userTicketItems.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('bets')}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              color: filterType === 'bets' ? '#FFFFFF' : '#8C9DAC',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              whiteSpace: 'nowrap',
            }}
          >
            My Bets <span style={{ color: '#22C55E' }}>{userTicketItems.length}</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              background: '#0F1823',
              border: '1px solid #1A283B',
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#EF4444', marginBottom: 6 }}>
              🔥 Hot Numbers
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1, 14, 28, 35, 48, 58, 66, 75].map((n) => (
                <div
                  key={n}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #EF4444',
                    color: '#EF4444',
                    fontSize: 11,
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

          <div
            style={{
              background: '#0F1823',
              border: '1px solid #1A283B',
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#38BDF8', marginBottom: 6 }}>
              ❄️ Cold Numbers
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[5, 16, 27, 39, 44, 50, 62, 78].map((n) => (
                <div
                  key={n}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38BDF8',
                    color: '#38BDF8',
                    fontSize: 11,
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* LEADERBOARD TAB (Top Players & Huge Multipliers)            */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'LEADERBOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { rank: 1, user: 's***7', win: 18450, hits: '10/10', multiplier: '10,000x', badge: '👑' },
            { rank: 2, user: 'b***2', win: 11200, hits: '9/10', multiplier: '2,000x', badge: '🥈' },
            { rank: 3, user: 'k***9', win: 6850, hits: '8/10', multiplier: '500x', badge: '🥉' },
            { rank: 4, user: 'm***b', win: 4200, hits: '7/8', multiplier: '250x', badge: '#4' },
            { rank: 5, user: 'd***4', win: 2950, hits: '6/6', multiplier: '180x', badge: '#5' },
            { rank: 6, user: 'y***0', win: 1600, hits: '5/5', multiplier: '80x', badge: '#6' },
          ].map((entry) => (
            <div
              key={entry.rank}
              style={{
                background: '#0F1823',
                border: entry.rank === 1 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #1A283B',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: entry.rank <= 3 ? 15 : 12,
                    fontWeight: 900,
                    width: 20,
                    textAlign: 'center',
                    color: entry.rank === 1 ? '#F59E0B' : '#94A3B8',
                  }}
                >
                  {entry.badge}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#22C55E' }}>
                    {entry.user}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>
                    Match: {entry.hits} ({entry.multiplier})
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#FFFFFF' }}>
                  +{entry.win.toLocaleString()}.00 ETB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
