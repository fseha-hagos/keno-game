import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
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
}

export const GameFeedPanel = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('GAME');
  const [filterType, setFilterType] = useState<'all' | 'tickets' | 'bets'>('all');
  const { isAuthenticated } = useAuthStore();
  const { betSlips } = useGameStore();

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

  // Build active ticket items from local store (betSlips)
  const userTicketItems: BetDisplayItem[] = betSlips
    .filter((slip) => slip.selectedNumbers.length > 0)
    .map((slip, idx) => ({
      id: slip.id || `slip-${idx}`,
      username: `You (Ticket #${idx + 1})`,
      numbers: slip.selectedNumbers,
      stake: Math.round(Number(slip.stakeMinor || '500') / 100) || 5,
      status: 'Waiting',
    }));

  // Build historical bet items from backend userBetHistory
  const userHistoryItems: BetDisplayItem[] = (Array.isArray(userBetHistory) ? userBetHistory : []).map(
    (item: any, idx: number) => {
      const stake = Math.round(Number(item.stakeMinor || 0) / 100) || item.stake || 100;
      const payout = Math.round(Number(item.payoutMinor || 0) / 100);
      const isWin = payout > 0;
      const statusLabel =
        item.status === 'SETTLED'
          ? isWin
            ? `Won ${payout.toLocaleString()}`
            : 'Lost'
          : 'Waiting';

      return {
        id: item.id || `hist-${idx}`,
        username: `Round #${item.round?.roundNumber || '—'}`,
        numbers: item.selectedNumbers || [],
        stake,
        status: statusLabel,
        payout,
        time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      };
    }
  );

  // Build recent bets feed items across all players from DB
  const dbRecentItems: BetDisplayItem[] = (Array.isArray(recentBets) ? recentBets : []).map(
    (item: any, idx: number) => {
      const stake = Math.round(Number(item.stakeMinor || 0) / 100) || item.stake || 100;
      const payout = Math.round(Number(item.payoutMinor || 0) / 100);
      const isWin = payout > 0;
      const statusLabel =
        item.status === 'SETTLED'
          ? isWin
            ? `Won ${payout.toLocaleString()}`
            : 'Lost'
          : 'Waiting';

      const maskedUser = item.userId ? `Player ${item.userId.slice(0, 4)}...` : `Player #${idx + 1}`;

      return {
        id: item.id || `rec-${idx}`,
        username: maskedUser,
        numbers: item.selectedNumbers || [],
        stake,
        status: statusLabel,
      };
    }
  );

  // Determine displayed bets for GAME tab based on sub-filter
  const getDisplayedGameBets = (): BetDisplayItem[] => {
    if (filterType === 'tickets') {
      return userTicketItems;
    }
    if (filterType === 'bets') {
      return userHistoryItems;
    }
    // 'all' filter: combine user active tickets + DB recent bets + user history
    const combined = [...userTicketItems, ...dbRecentItems];
    if (combined.length === 0) {
      return userHistoryItems;
    }
    return combined;
  };

  const displayedGameBets = getDisplayedGameBets();
  const allCount = (userTicketItems.length + dbRecentItems.length) || userHistoryItems.length;
  const userTicketCount = userTicketItems.length;
  const userBetCount = userHistoryItems.length;

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
      {/* Sub-filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All <Text style={styles.filterCount}>{allCount}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('tickets')}
          style={[styles.filterChip, filterType === 'tickets' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterType === 'tickets' && styles.filterTextActive]}>
            My Tickets <Text style={styles.filterCount}>{userTicketCount}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('bets')}
          style={[styles.filterChip, filterType === 'bets' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterType === 'bets' && styles.filterTextActive]}>
            My Bets <Text style={styles.filterCount}>{userBetCount}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cards list matching the exact layout */}
      {displayedGameBets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {filterType === 'tickets'
              ? 'No active tickets in current slip. Pick numbers on grid to create a ticket!'
              : filterType === 'bets'
              ? 'No bets placed yet.'
              : 'No live bets placed yet. Place your bet above!'}
          </Text>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {displayedGameBets.map((item) => {
            // Render 10 slots for numbers (filled numbers first, empty slots to make up 10)
            const slots: (number | null)[] = [...item.numbers];
            while (slots.length < 10) {
              slots.push(null);
            }

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardUsername}>{item.username}</Text>
                  {item.time && <Text style={styles.timeText}>{item.time}</Text>}
                </View>

                {/* 10 number slots */}
                <View style={styles.slotsRow}>
                  {slots.map((num, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.slotBox,
                        num !== null ? styles.slotBoxFilled : styles.slotBoxEmpty,
                      ]}
                    >
                      {num !== null && <Text style={styles.slotText}>{num}</Text>}
                    </View>
                  ))}
                </View>

                {/* Bottom line: Bet Amount & Status */}
                <View style={styles.cardFooter}>
                  <View style={styles.betPill}>
                    <Text style={styles.betPillText}>Bet {item.stake.toLocaleString()}</Text>
                  </View>
                  <Text
                    style={[
                      styles.statusText,
                      item.status.startsWith('Won') && { color: '#10B981' },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {!isAuthenticated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Please log in to view your bet history.</Text>
        </View>
      ) : userHistoryItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No bets placed yet.</Text>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {userHistoryItems.map((item) => {
            const slots: (number | null)[] = [...item.numbers];
            while (slots.length < 10) slots.push(null);

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardUsername}>{item.username}</Text>
                  {item.time && <Text style={styles.timeText}>{item.time}</Text>}
                </View>

                <View style={styles.slotsRow}>
                  {slots.map((num, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.slotBox,
                        num !== null ? styles.slotBoxFilled : styles.slotBoxEmpty,
                      ]}
                    >
                      {num !== null && <Text style={styles.slotText}>{num}</Text>}
                    </View>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.betPill}>
                    <Text style={styles.betPillText}>Bet {item.stake.toLocaleString()}</Text>
                  </View>
                  <Text
                    style={[
                      styles.statusText,
                      item.status.startsWith('Won') && { color: '#10B981' },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderResultsTab = () => {
    const rounds = Array.isArray(roundResults) ? roundResults : [];

    return (
      <View style={styles.tabContent}>
        {/* Table Column Headers matching the requested functional layout */}
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

              // Fill up to 10 slots per row so grid stays consistent
              while (top10.length < 10) top10.push(null);
              while (bottom10.length < 10) bottom10.push(null);

              const timeStr = formatDrawTime(r);
              const roundNum = r.roundNumber || '—';

              return (
                <View key={r.id || roundNum} style={styles.resultRowCard}>
                  {/* Left Column: Draw ID & Time */}
                  <View style={styles.drawIdCol}>
                    <View style={styles.roundIdRow}>
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </View>
                      <Text style={styles.roundNumberText}>{roundNum}</Text>
                    </View>
                    <Text style={styles.roundTimeText}>{timeStr}</Text>
                  </View>

                  {/* Right Column: 2x10 Grid Combination */}
                  <View style={styles.combinationCol}>
                    {/* Top 10 Drawn Numbers */}
                    <View style={styles.combRow}>
                      {top10.map((num, idx) => (
                        <View key={`top-${idx}`} style={styles.combTile}>
                          <Text style={styles.combTileText}>{num !== null ? num : ''}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Bottom 10 Drawn Numbers */}
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
      {/* Top Tabs matching exact screenshot icon & text formatting */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'GAME' && styles.tabItemActive]}
          onPress={() => setActiveTab('GAME')}
        >
          <Text style={[styles.tabText, activeTab === 'GAME' && styles.tabTextActive]}>
            ▶ GAME
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
            ↺ HISTORY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'RESULTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('RESULTS')}
        >
          <Text style={[styles.tabText, activeTab === 'RESULTS' && styles.tabTextActive]}>
            ✔ RESULTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'STATS' && styles.tabItemActive]}
          onPress={() => setActiveTab('STATS')}
        >
          <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]}>
            📊 STATS
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
    backgroundColor: '#111822',
    marginTop: 8,
    marginHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2836',
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2836',
    backgroundColor: '#0B111A',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#10B981',
  },
  tabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#10B981',
  },
  tabContent: {
    padding: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  filterChip: {
    paddingVertical: 2,
  },
  filterChipActive: {
    borderBottomWidth: 1,
    borderBottomColor: '#10B981',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#F8FAFC',
  },
  filterCount: {
    color: '#10B981',
    fontWeight: '800',
  },
  cardsList: {
    gap: 6,
  },
  card: {
    backgroundColor: '#1A222E',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#242F40',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardUsername: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  slotBox: {
    flex: 1,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotBoxFilled: {
    backgroundColor: '#2F3C50',
  },
  slotBoxEmpty: {
    backgroundColor: '#141C27',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  slotText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  betPill: {
    backgroundColor: '#141C28',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#232E3E',
  },
  betPillText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  statusText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '800',
  },
  timeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Results Tab Styling (Matching Screenshot Structure) */
  resultsTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
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
    backgroundColor: '#1A222E',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#242F40',
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
  },
  roundNumberText: {
    color: '#10B981',
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
    backgroundColor: '#243042',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  combTileText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
  },

  /* Stats Tab Styling */
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
