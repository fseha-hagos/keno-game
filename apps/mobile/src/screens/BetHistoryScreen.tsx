import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';

export const BetHistoryScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const navigation = useNavigation<any>();

  const { data: bets, isLoading } = useQuery({
    queryKey: ['betHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/bets/history');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.guestCenter}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📜</Text>
          <Text style={styles.guestTitle}>Bet History</Text>
          <Text style={styles.guestSubtitle}>
            Sign in with your mobile phone number to track your bets, verify cryptographic round results, and view win settlements.
          </Text>
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.guestButtonText}>LOG IN WITH PHONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>BET & SETTLEMENT HISTORY</Text>

        {isLoading ? (
          <ActivityIndicator color="#F59E0B" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={bets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const stake = (Number(item.stakeMinor) / 100).toFixed(2);
              const payout = item.payoutMinor
                ? (Number(item.payoutMinor) / 100).toFixed(2)
                : '0.00';
              const isWin = Number(item.payoutMinor || 0) > 0;

              return (
                <View style={styles.betCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.roundText}>Round #{item.round?.roundNumber || '—'}</Text>
                    <View style={[styles.statusBadge, isWin ? styles.winBadge : styles.lossBadge]}>
                      <Text style={[styles.statusText, isWin ? styles.winText : styles.lossText]}>
                        {item.status === 'SETTLED'
                          ? isWin
                            ? `WON $${payout}`
                            : 'NO WIN'
                          : item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.picksRow}>
                    <Text style={styles.picksLabel}>Picks: </Text>
                    <Text style={styles.picksValues}>{item.selectedNumbers?.join(', ')}</Text>
                  </View>

                  {item.hitCount !== undefined && (
                    <Text style={styles.hitsText}>
                      Matched {item.hitCount} of {item.selectedNumbers?.length} numbers
                    </Text>
                  )}

                  <View style={styles.cardFooter}>
                    <Text style={styles.stakeText}>Stake: ${stake}</Text>
                    <Text style={styles.dateText}>
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  content: { flex: 1, padding: 16 },
  title: { color: '#F8FAFC', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  betCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundText: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  winBadge: { backgroundColor: '#064E3B' },
  lossBadge: { backgroundColor: '#1E293B' },
  statusText: { fontSize: 11, fontWeight: '800' },
  winText: { color: '#34D399' },
  lossText: { color: '#94A3B8' },
  picksRow: { flexDirection: 'row', marginVertical: 6 },
  picksLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  picksValues: { color: '#FBBF24', fontSize: 11, fontWeight: '800' },
  hitsText: { color: '#60A5FA', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stakeText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  dateText: { color: '#64748B', fontSize: 10 },
  guestCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guestTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  guestSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  guestButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  guestButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
});
