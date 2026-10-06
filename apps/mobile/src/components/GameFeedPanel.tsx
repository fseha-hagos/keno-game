import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';

export type FeedTab = 'GAME' | 'HISTORY' | 'RESULTS' | 'STATS';

interface BetDisplayItem {
  id: string;
  username: string;
  numbers: number[];
  stake: number;
  status: string;
  payout?: number;
  time?: string;
  hitNumbers?: number[];
  isWin?: boolean;
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
    hitNumbers?: number[];
    isWin: boolean;
  }>;
}

export const GameFeedPanel = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('GAME');
  const [filterType, setFilterType] = useState<'all' | 'tickets' | 'bets'>('all');
  const { isAuthenticated } = useAuthStore();
  const { confirmedTickets, drawnNumbers } = useGameStore();

  // Fetch real user bets history
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

  // Fetch recent finished rounds for RESULTS & STATS tabs
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

  // Helper to parse drawn numbers array safely
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

  // Helper to format time into HH:mm:ss
  const formatDrawTime = (round: any): string => {
    const dateVal = round.closedAt || round.completedAt || round.createdAt;
    if (!dateVal) return '--:--:--';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '--:--:--';
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

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

  // Watch for round transitions to clear tickets and start over fresh for the new game
  const prevRoundIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!currentRound?.id) return;
    if (prevRoundIdRef.current && prevRoundIdRef.current !== currentRound.id) {
      useGameStore.getState().clearConfirmedTickets();
      useGameStore.getState().resetSlips();
    }
    prevRoundIdRef.current = currentRound.id;
  }, [currentRound?.id]);

  // Live drawn numbers set for the active round to highlight hits in real-time
  const currentRoundDrawn = React.useMemo(
    () => parseDrawnNumbers(currentRound),
    [currentRound],
  );

  const liveDrawnSet = React.useMemo(() => {
    const set = new Set<number>();
    (drawnNumbers || []).forEach((n) => set.add(n));
    (currentRoundDrawn || []).forEach((n) => set.add(n));
    return set;
  }, [drawnNumbers, currentRoundDrawn]);

  // Build active ticket items: ONLY live tickets for the CURRENT active round
  const currentRoundId = currentRound?.id;
  const currentRoundNum = currentRound?.roundNumber;

  // Filter server bets strictly for current round
  const serverCurrentBets = (Array.isArray(userBetHistory) ? userBetHistory : []).filter(
    (b: any) =>
      (currentRoundId && (b.roundId === currentRoundId || b.round?.id === currentRoundId)) ||
      (currentRoundNum && b.round?.roundNumber === currentRoundNum),
  );

  const ticketMap = new Map<string, BetDisplayItem>();

  // 1. Add server bets for current round
  serverCurrentBets.forEach((item: any, idx: number) => {
    const stake = Math.round(Number(item.stakeMinor || 0) / 100) || 5;
    const payoutMinor = Number(item.payoutMinor || 0);
    const payout = payoutMinor > 0 ? payoutMinor / 100 : 0;
    const isSettled = item.status === 'SETTLED';
    const statusLabel = isSettled
      ? payout > 0
        ? `Won ${payout % 1 === 0 ? payout : payout.toFixed(2)}`
        : 'Lost'
      : 'Placed';

    ticketMap.set(item.id, {
      id: item.id || `pending-${idx}`,
      username: `You (Ticket #${idx + 1})`,
      numbers: item.selectedNumbers || [],
      stake,
      status: statusLabel,
      payout,
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
    });
  });

  // 2. Add locally confirmed tickets for current round session
  (confirmedTickets || []).forEach((item: any) => {
    if (!currentRoundId || item.roundId === currentRoundId) {
      if (!ticketMap.has(item.id)) {
        const stake = Math.round(Number(item.stakeMinor || 0) / 100) || 5;
        ticketMap.set(item.id, {
          id: item.id,
          username: `You (Ticket #${ticketMap.size + 1})`,
          numbers: item.selectedNumbers || [],
          stake,
          status: 'Placed',
          time: item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
        });
      }
    }
  });

  const userTicketItems: BetDisplayItem[] = Array.from(ticketMap.values());

  // Build live bets feed across players strictly for CURRENT active round
  const liveRecentItems: BetDisplayItem[] = (Array.isArray(recentBets) ? recentBets : [])
    .filter(
      (item: any) =>
        (currentRoundId && (item.roundId === currentRoundId || item.round?.id === currentRoundId)) ||
        (currentRoundNum && item.round?.roundNumber === currentRoundNum),
    )
    .map((item: any, idx: number) => {
      const stake = Math.round(Number(item.stakeMinor || 0) / 100) || item.stake || 100;
      const payoutMinor = Number(item.payoutMinor || 0);
      const payout = payoutMinor > 0 ? payoutMinor / 100 : 0;
      const isWin = payout > 0;
      const statusLabel =
        item.status === 'SETTLED'
          ? isWin
            ? `Won ${payout % 1 === 0 ? payout : payout.toFixed(2)}`
            : 'Lost'
          : 'Waiting';

      const maskedUser = item.user?.username
        ? `${item.user.username.slice(0, 1)}***${item.user.username.slice(-1)}`
        : item.userId
          ? `${item.userId.slice(0, 1)}***${item.userId.slice(-1)}`
          : `m***d`;

      return {
        id: item.id || `live-rec-${idx}`,
        username: maskedUser,
        numbers: item.selectedNumbers || [],
        stake,
        status: statusLabel,
        payout,
      };
    });

  // Combine user tickets with any other players' live bets for this round
  const allCurrentRoundBetsMap = new Map<string, BetDisplayItem>();
  userTicketItems.forEach((t) => allCurrentRoundBetsMap.set(t.id, t));
  liveRecentItems.forEach((t) => {
    if (!allCurrentRoundBetsMap.has(t.id)) {
      allCurrentRoundBetsMap.set(t.id, t);
    }
  });
  const allCurrentRoundBets = Array.from(allCurrentRoundBetsMap.values());

  // Determine displayed bets for GAME tab based on sub-filter — strictly CURRENT round only!
  const getDisplayedGameBets = (): BetDisplayItem[] => {
    if (filterType === 'tickets') {
      return userTicketItems;
    }
    if (filterType === 'bets') {
      return userTicketItems;
    }
    return allCurrentRoundBets;
  };

  const displayedGameBets = getDisplayedGameBets();
  const allCount = allCurrentRoundBets.length;
  const userTicketCount = userTicketItems.length;
  const userBetCount = userTicketItems.length;

  // Group historical user bets by round / draw for the HISTORY tab (matching Image 3)
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

      const stake = Math.round(Number(bet.stakeMinor || 0) / 100) || bet.stake || 5;
      const payoutMinor = Number(bet.payoutMinor || 0);
      const payout = payoutMinor > 0 ? payoutMinor / 100 : 0;
      const isWin = payout > 0;

      groupsMap.get(groupKey)!.tickets.push({
        id: bet.id,
        numbers: bet.selectedNumbers || [],
        stake,
        payout,
        status: bet.status,
        createdAt: bet.createdAt,
        hitNumbers: Array.isArray(bet.hitNumbers) ? bet.hitNumbers.map(Number) : undefined,
        isWin,
      });
    });

    const groups = Array.from(groupsMap.values());
    groups.sort((a, b) => {
      const numA = Number(a.roundNumber) || 0;
      const numB = Number(b.roundNumber) || 0;
      return numB - numA;
    });

    return groups;
  }, [userBetHistory]);

  // Calculate dynamic Hot and Cold numbers from true round results
  const computeStats = () => {
    const freq: Record<number, number> = {};
    for (let i = 1; i <= 80; i++) freq[i] = 0;

    const rounds = Array.isArray(roundResults) ? roundResults : [];
    rounds.forEach((r) => {
      const drawn = parseDrawnNumbers(r);
      drawn.forEach((n) => {
        if (n >= 1 && n <= 80) {
          freq[n] = (freq[n] || 0) + 1;
        }
      });
    });

    const sorted = Object.entries(freq)
      .map(([numStr, count]) => ({ num: Number(numStr), count }))
      .sort((a, b) => b.count - a.count);

    const hot = sorted.slice(0, 6).map((x) => x.num);
    const cold = [...sorted].reverse().slice(0, 6).map((x) => x.num);

    return { hot, cold };
  };

  const { hot: hotNumbers, cold: coldNumbers } = computeStats();

  const renderGameTab = () => (
    <View style={styles.tabContent}>
      {/* Sub-filter row (All / My Tickets / My Bets) — matching Image 1 & 4 */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All <Text style={styles.filterCount}>{allCount}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('tickets')}
          style={[styles.filterChip, filterType === 'tickets' && styles.filterChipActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filterType === 'tickets' && styles.filterTextActive]}>
            My Tickets <Text style={styles.filterCount}>{userTicketCount}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('bets')}
          style={[styles.filterChip, filterType === 'bets' && styles.filterChipActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filterType === 'bets' && styles.filterTextActive]}>
            My Bets <Text style={styles.filterCount}>{userBetCount}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cards list — matching Image 1, 2, and 4 */}
      {displayedGameBets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {filterType === 'tickets'
              ? `No active tickets for Round #${currentRoundNum ?? '—'}. Pick 1–5 numbers and tap BET!`
              : filterType === 'bets'
                ? `No bets placed for Round #${currentRoundNum ?? '—'} yet.`
                : `No live bets placed for Round #${currentRoundNum ?? '—'} yet. Place your bet above!`}
          </Text>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {displayedGameBets.map((item) => {
            // Exactly 10 slots per card
            const slots: (number | null)[] = [...item.numbers];
            while (slots.length < 10) {
              slots.push(null);
            }

            return (
              <View key={item.id} style={styles.card}>
                {/* Header row: Username on left, Timestamp on right */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardUsername}>{item.username}</Text>
                  {item.time && <Text style={styles.timeText}>{item.time}</Text>}
                </View>

                {/* 10 number slots with green highlight for drawn/hit numbers */}
                <View style={styles.slotsRow}>
                  {slots.map((num, idx) => {
                    if (num === null) {
                      return <View key={idx} style={[styles.slotBox, styles.slotBoxEmpty]} />;
                    }

                    const isHit = liveDrawnSet.has(num);

                    return (
                      <View
                        key={idx}
                        style={[
                          styles.slotBox,
                          isHit ? styles.slotBoxHit : styles.slotBoxFilled,
                        ]}
                      >
                        <Text style={isHit ? styles.slotHitText : styles.slotText}>
                          {num}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Split footer: Bet <stake> on left, Waiting / Placed on right */}
                <View style={styles.cardFooterSplit}>
                  <View style={styles.footerColLeft}>
                    <Text style={styles.betLabelText}>Bet {item.stake.toLocaleString()}</Text>
                  </View>
                  <View style={styles.footerColRight}>
                    <Text
                      style={[
                        styles.statusLabelText,
                        (item.payout ?? 0) > 0 ? styles.statusWonText : undefined,
                      ]}
                    >
                      {item.payout && item.payout > 0
                        ? item.payout % 1 === 0
                          ? item.payout.toString()
                          : item.payout.toFixed(2)
                        : (item.status || 'Waiting')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // HISTORY Tab: Grouped by Draw round with shield header (matching Image 3)
  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {!isAuthenticated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Please log in to view your bet history.</Text>
        </View>
      ) : groupedHistory.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No bets placed yet. Place a bet to see your history!</Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {groupedHistory.map((group) => (
            <View key={group.roundId} style={styles.historyGroupContainer}>
              {/* Centered Draw Header with Verified Shield (matching Image 3) */}
              <View style={styles.historyDrawHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color="#22C55E"
                  style={styles.historyShieldIcon}
                />
                <Text style={styles.historyDrawLabel}>Draw</Text>
                <Text style={styles.historyDrawId}>ID: {group.roundNumber}</Text>
              </View>

              {/* Tickets list for this draw */}
              <View style={styles.cardsList}>
                {group.tickets.map((ticket) => {
                  const slots: (number | null)[] = [...ticket.numbers];
                  while (slots.length < 10) {
                    slots.push(null);
                  }

                  const isWon = ticket.isWin;

                  return (
                    <View
                      key={ticket.id}
                      style={[
                        styles.historyCard,
                        isWon && styles.historyCardWon,
                      ]}
                    >
                      {/* 10 number slots */}
                      <View style={styles.slotsRow}>
                        {slots.map((num, idx) => {
                          if (num === null) {
                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.slotBox,
                                  isWon ? styles.slotBoxEmptyWon : styles.slotBoxEmpty,
                                ]}
                              />
                            );
                          }

                          const isHit =
                            group.drawResult.includes(num) ||
                            (Array.isArray(ticket.hitNumbers) && ticket.hitNumbers.includes(num));

                          return (
                            <View
                              key={idx}
                              style={[
                                styles.slotBox,
                                isHit ? styles.slotBoxHit : styles.slotBoxFilled,
                              ]}
                            >
                              <Text style={isHit ? styles.slotHitText : styles.slotText}>
                                {num}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Footer split: Bet <stake> on left, Payout on right if won */}
                      <View style={styles.cardFooterSplit}>
                        <View
                          style={[
                            styles.footerColLeft,
                            isWon && styles.footerColLeftWon,
                          ]}
                        >
                          <Text style={styles.betLabelText}>
                            Bet {ticket.stake.toLocaleString()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.footerColRight,
                            isWon && styles.footerColRightWon,
                          ]}
                        >
                          {isWon && (
                            <Text style={styles.historyWonPayoutText}>
                              {ticket.payout % 1 === 0
                                ? ticket.payout.toString()
                                : ticket.payout.toFixed(2)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderResultsTab = () => {
    const rounds = Array.isArray(roundResults) ? roundResults : [];

    return (
      <View style={styles.tabContent}>
        {/* Table Column Headers */}
        <View style={styles.resultsTableHeader}>
          <Text style={styles.tableHeaderLeft}>Draw ID</Text>
          <Text style={styles.tableHeaderRight}>Combination</Text>
        </View>

        {rounds.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Loading past round results...</Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            {rounds.map((r: any) => {
              const drawn = parseDrawnNumbers(r);
              const top10: (number | null)[] = drawn.slice(0, 10);
              const bottom10: (number | null)[] = drawn.slice(10, 20);

              while (top10.length < 10) top10.push(null);
              while (bottom10.length < 10) bottom10.push(null);

              const timeStr = formatDrawTime(r);
              const roundNum = r.roundNumber || '—';

              return (
                <View key={r.id || roundNum} style={styles.resultRowCard}>
                  <View style={styles.drawIdCol}>
                    <View style={styles.roundIdRow}>
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </View>
                      <Text style={styles.roundNumberText}>{roundNum}</Text>
                    </View>
                    <Text style={styles.roundTimeText}>{timeStr}</Text>
                  </View>

                  <View style={styles.combinationCol}>
                    <View style={styles.combRow}>
                      {top10.map((num, idx) => (
                        <View key={`top-${idx}`} style={styles.combTile}>
                          <Text style={styles.combTileText}>{num !== null ? num : ''}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.combRow}>
                      {bottom10.map((num, idx) => (
                        <View key={`bot-${idx}`} style={styles.combTile}>
                          <Text style={styles.combTileText}>{num !== null ? num : ''}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsContainer}>
        <Text style={styles.statsSectionTitle}>🔥 HOT NUMBERS (Most Frequent)</Text>
        <View style={styles.statsRow}>
          {hotNumbers.map((num) => (
            <View key={num} style={[styles.statBall, styles.hotBall]}>
              <Text style={styles.statBallText}>{num}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.statsSectionTitle, { marginTop: 16 }]}>❄️ COLD NUMBERS (Least Frequent)</Text>
        <View style={styles.statsRow}>
          {coldNumbers.map((num) => (
            <View key={num} style={[styles.statBall, styles.coldBall]}>
              <Text style={styles.statBallText}>{num}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Tab Bar: ▶ GAME | ↺ HISTORY | ✔ RESULTS | 📊 STATISTIC (matching Image 4) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'GAME' && styles.tabItemActive]}
          onPress={() => setActiveTab('GAME')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'GAME' && styles.tabTextActive]}>
            ▶ GAME
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            ↺ HISTORY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'RESULTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('RESULTS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'RESULTS' && styles.tabTextActive]}>
            ✔ RESULTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'STATS' && styles.tabItemActive]}
          onPress={() => setActiveTab('STATS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]}>
            📊 STATISTIC
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Tab Body */}
      {activeTab === 'GAME' && renderGameTab()}
      {activeTab === 'HISTORY' && renderHistoryTab()}
      {activeTab === 'RESULTS' && renderResultsTab()}
      {activeTab === 'STATS' && renderStatsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1823',
    marginTop: 0,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#172330',
    backgroundColor: '#0B131B',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#22C55E',
  },
  tabText: {
    color: '#4E7B6C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#22C55E',
  },
  tabContent: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  /* Sub-Filter Row */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  filterChip: {
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterChipActive: {
    borderBottomColor: '#22C55E',
  },
  filterText: {
    color: '#718288',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#F8FAFC',
  },
  filterCount: {
    color: '#22C55E',
    fontWeight: '800',
  },

  /* Cards List & Cards */
  cardsList: {
    gap: 6,
  },
  card: {
    backgroundColor: '#111A24',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#192634',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  cardUsername: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '800',
  },
  timeText: {
    color: '#8B9DAE',
    fontSize: 11,
    fontWeight: '600',
  },

  /* 10-Slot Number Row */
  slotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
  },
  slotBox: {
    flex: 1,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotBoxFilled: {
    backgroundColor: '#243342',
    borderWidth: 1,
    borderColor: '#2F4052',
  },
  slotBoxHit: {
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#4ADE80',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 4,
  },
  slotBoxEmpty: {
    backgroundColor: '#15202B',
    borderWidth: 1,
    borderColor: '#1C2A38',
  },
  slotBoxEmptyWon: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  slotText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  slotHitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  /* Split Footer (Bet <stake> | Status or Payout) */
  cardFooterSplit: {
    flexDirection: 'row',
    gap: 4,
  },
  footerColLeft: {
    flex: 1,
    backgroundColor: '#182430',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  footerColLeftWon: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  footerColRight: {
    flex: 1,
    backgroundColor: '#182430',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  footerColRightWon: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  betLabelText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  statusLabelText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  statusWonText: {
    color: '#22C55E',
  },

  /* History Tab Specific Styles */
  historyList: {
    gap: 16,
  },
  historyGroupContainer: {
    gap: 6,
  },
  historyDrawHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  historyShieldIcon: {
    marginBottom: 2,
  },
  historyDrawLabel: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  historyDrawId: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#141E28',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1D2A38',
  },
  historyCardWon: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  historyWonPayoutText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },

  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Results Tab */
  resultsTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A38',
  },
  tableHeaderLeft: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    width: 95,
  },
  tableHeaderRight: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
    paddingLeft: 4,
  },
  resultsList: {
    gap: 6,
  },
  resultRowCard: {
    backgroundColor: '#1A2332',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1E2A38',
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawIdCol: {
    width: 95,
    justifyContent: 'center',
    paddingRight: 6,
  },
  roundIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: '900',
  },
  roundNumberText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '800',
  },
  roundTimeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '600',
    paddingLeft: 21,
  },
  combinationCol: {
    flex: 1,
    gap: 3,
  },
  combRow: {
    flexDirection: 'row',
    gap: 3,
  },
  combTile: {
    flex: 1,
    height: 22,
    backgroundColor: '#243044',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#2E4058',
    justifyContent: 'center',
    alignItems: 'center',
  },
  combTileText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
  },

  /* Stats Tab */
  statsContainer: {
    padding: 6,
  },
  statsSectionTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotBall: {
    backgroundColor: '#EF4444',
  },
  coldBall: {
    backgroundColor: '#3B82F6',
  },
  statBallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
