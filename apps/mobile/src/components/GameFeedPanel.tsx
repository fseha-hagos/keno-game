import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';

export type FeedTab = 'GAME' | 'HISTORY' | 'RESULTS' | 'STATS';

interface SimulatedBet {
  id: string;
  username: string;
  numbers: number[];
  stake: number;
  status: 'Waiting' | 'Won' | 'Lost';
  payout?: number;
}

const MOCK_USERNAMES = [
  'p***d', 'g***v', 'a***k', 'm***o', 'x***9', 't***7', 'k***2', 's***w',
  'd***1', 'j***8', 'b***x', 'n***0', 'l***v', 'c***r', 'h***e', 'w***p'
];

export const GameFeedPanel = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>('GAME');
  const [filterType, setFilterType] = useState<'all' | 'tickets' | 'bets'>('all');
  const { isAuthenticated } = useAuthStore();
  const { betSlips } = useGameStore();

  // Simulated live bets state
  const [liveBets, setLiveBets] = useState<SimulatedBet[]>(() => [
    { id: '1', username: 'p***d', numbers: [22, 60], stake: 2000, status: 'Waiting' },
    { id: '2', username: 'g***v', numbers: [41, 21, 23], stake: 600, status: 'Waiting' },
    { id: '3', username: 'a***k', numbers: [7, 18, 35, 72], stake: 1000, status: 'Waiting' },
    { id: '4', username: 'm***o', numbers: [12, 49, 58], stake: 500, status: 'Waiting' },
    { id: '5', username: 'x***9', numbers: [3, 15, 29, 64, 78], stake: 1500, status: 'Waiting' },
  ]);

  // Periodically add new simulated live bets to make the feed feel active
  useEffect(() => {
    const interval = setInterval(() => {
      const uname = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)] ?? 'p***d';
      const count = Math.floor(Math.random() * 5) + 1;
      const nums: number[] = [];
      while (nums.length < count) {
        const r = Math.floor(Math.random() * 80) + 1;
        if (!nums.includes(r)) nums.push(r);
      }
      nums.sort((a, b) => a - b);
      const stakeOpts = [200, 500, 600, 1000, 1500, 2000, 5000];
      const stake = stakeOpts[Math.floor(Math.random() * stakeOpts.length)] ?? 500;

      const newBet: SimulatedBet = {
        id: Date.now().toString() + Math.random().toString().slice(2, 5),
        username: uname,
        numbers: nums,
        stake,
        status: 'Waiting',
      };

      setLiveBets((prev) => [newBet, ...prev.slice(0, 29)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch real user bets history for HISTORY tab
  const { data: userBetHistory } = useQuery({
    queryKey: ['betHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/bets/history');
      return res.data;
    },
    enabled: isAuthenticated && activeTab === 'HISTORY',
    refetchInterval: 5000,
  });

  // Fetch recent finished rounds for RESULTS tab
  const { data: roundResults } = useQuery({
    queryKey: ['roundResults'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/rounds/recent');
      return res.data;
    },
    enabled: activeTab === 'RESULTS' || activeTab === 'STATS',
    refetchInterval: 5000,
  });

  const totalCount = 3954 + liveBets.length;
  const userTicketCount = betSlips.filter((s) => s.selectedNumbers.length > 0).length;
  const userBetCount = (userBetHistory && Array.isArray(userBetHistory)) ? userBetHistory.length : 0;

  // Filter live bets based on selected sub-filter
  const displayedBets = filterType === 'all'
    ? liveBets
    : filterType === 'tickets'
    ? liveBets.slice(0, Math.max(1, userTicketCount))
    : liveBets.slice(0, 5);

  const renderGameTab = () => (
    <View style={styles.tabContent}>
      {/* Sub-filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All <Text style={styles.filterCount}>{totalCount}</Text>
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

      {/* Cards list matching the exact screenshot layout */}
      <View style={styles.cardsList}>
        {displayedBets.map((item) => {
          // Render exactly 10 slots for numbers (filled numbers first, empty slots to make up 10)
          const slots: (number | null)[] = [...item.numbers];
          while (slots.length < 10) {
            slots.push(null);
          }

          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardUsername}>{item.username}</Text>

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
                  <Text style={styles.betPillText}>Bet {item.stake}</Text>
                </View>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {!isAuthenticated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Please log in to view your bet history.</Text>
        </View>
      ) : !userBetHistory || userBetHistory.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No bets placed yet.</Text>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {userBetHistory.map((item: any) => {
            const stake = (Number(item.stakeMinor) / 100).toFixed(0);
            const isWin = Number(item.payoutMinor || 0) > 0;
            const payout = (Number(item.payoutMinor || 0) / 100).toFixed(0);
            const statusLabel = item.status === 'SETTLED'
              ? isWin ? `Won ${payout}` : 'Lost'
              : 'Waiting';

            const nums: number[] = item.selectedNumbers || [];
            const slots: (number | null)[] = [...nums];
            while (slots.length < 10) slots.push(null);

            return (
              <View key={item.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.cardUsername}>Round #{item.round?.roundNumber || '—'}</Text>
                  <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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
                    <Text style={styles.betPillText}>Bet {stake}</Text>
                  </View>
                  <Text style={[styles.statusText, isWin && { color: '#10B981' }]}>{statusLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderResultsTab = () => (
    <View style={styles.tabContent}>
      {!roundResults || roundResults.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading past round results...</Text>
        </View>
      ) : (
        <View style={styles.resultsList}>
          {roundResults.map((r: any) => {
            const drawn: number[] = r.drawnNumbers || [];
            return (
              <View key={r.id} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultRound}>Round #{r.roundNumber}</Text>
                  <Text style={styles.resultTime}>
                    {r.closedAt ? new Date(r.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'CLOSED'}
                  </Text>
                </View>
                <View style={styles.drawnGrid}>
                  {drawn.map((n) => (
                    <View key={n} style={styles.drawnBall}>
                      <Text style={styles.drawnBallText}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsContainer}>
        <Text style={styles.statsSectionTitle}>🔥 HOT NUMBERS (Most Frequent)</Text>
        <View style={styles.statsRow}>
          {[7, 18, 23, 41, 60, 72].map((num) => (
            <View key={num} style={[styles.statBall, styles.hotBall]}>
              <Text style={styles.statBallText}>{num}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.statsSectionTitle, { marginTop: 14 }]}>❄️ COLD NUMBERS (Least Frequent)</Text>
        <View style={styles.statsRow}>
          {[3, 14, 29, 38, 55, 79].map((num) => (
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
  cardUsername: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  slotBox: {
    flex: 1,
    height: 28,
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
  },
  emptyText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  resultsList: {
    gap: 8,
  },
  resultCard: {
    backgroundColor: '#1A222E',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#242F40',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultRound: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  resultTime: {
    color: '#64748B',
    fontSize: 10,
  },
  drawnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  drawnBall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawnBallText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
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
    backgroundColor: '#DC2626',
  },
  coldBall: {
    backgroundColor: '#2563EB',
  },
  statBallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
