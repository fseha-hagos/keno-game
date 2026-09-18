import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';
import { KenoGrid } from '../components/KenoGrid';
import { PaytablePreview } from '../components/PaytablePreview';
import { BetBar } from '../components/BetBar';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { socketService } from '../services/socket';

export const KenoGameScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const { selectedNumbers, stakeMinor, currency, drawnNumbers, isDrawing } =
    useGameStore();

  const [timeLeft, setTimeLeft] = useState<number>(40);

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  // Fetch active game round
  const { data: round } = useQuery({
    queryKey: ['currentRound'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/rounds/current');
      return res.data;
    },
    refetchInterval: 2000,
  });

  // Calculate live countdown timer until round betting closes
  useEffect(() => {
    if (!round?.closedAt || round.status !== 'OPEN') {
      setTimeLeft(0);
      return;
    }

    const computeTime = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(round.closedAt).getTime() - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };

    computeTime();
    const timer = setInterval(computeTime, 1000);
    return () => clearInterval(timer);
  }, [round?.closedAt, round?.status]);

  // Place bet mutation
  const betMutation = useMutation({
    mutationFn: async () => {
      if (!round) throw new Error('No active round');
      const idempotencyKey = `bet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await apiClient.post('/api/v1/keno/bets', {
        roundId: round.id,
        stakeMinor,
        currency,
        selectedNumbers,
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: (data) => {
      Alert.alert(
        'Bet Accepted',
        `Your bet of $${(Number(stakeMinor) / 100).toFixed(2)} on ${selectedNumbers.length} spots for Round #${round?.roundNumber} is confirmed!`,
      );
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['betHistory'] });
    },
    onError: (err: any) => {
      Alert.alert(
        'Bet Failed',
        err.response?.data?.message || 'Could not place bet. Check your balance and limits.',
      );
    },
  });

  const handlePlaceBet = () => {
    // Guest check: must be logged in to wager real money
    if (!isAuthenticated) {
      Alert.alert(
        'Player Login Required',
        'You are currently in Guest Spectator mode. Please sign in or register with your mobile phone number to place real bets and win!',
        [
          { text: 'Keep Watching', style: 'cancel' },
          {
            text: 'Sign In / Register',
            style: 'default',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
      return;
    }

    if (selectedNumbers.length === 0) {
      Alert.alert('Selection Required', 'Please pick 1 to 10 numbers on the grid.');
      return;
    }

    if (round?.status !== 'OPEN' || timeLeft <= 0) {
      Alert.alert('Betting Closed', 'Betting for this round is closed. Next round will open in seconds.');
      return;
    }

    betMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <Header />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Round Info Bar with 40s Countdown */}
        <View style={styles.roundBar}>
          <View>
            <Text style={styles.roundLabel}>ROUND</Text>
            <Text style={styles.roundNumber}>#{round?.roundNumber || '...'}</Text>
          </View>

          {/* 40s Betting Delay Countdown */}
          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>NEXT DRAW IN</Text>
            <Text
              style={[
                styles.countdownValue,
                timeLeft <= 10 && styles.countdownUrgent,
              ]}
            >
              {round?.status === 'OPEN' && timeLeft > 0 ? `${timeLeft}s` : 'DRAWING'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              round?.status !== 'OPEN' || timeLeft === 0
                ? styles.statusBadgeClosed
                : styles.statusBadgeOpen,
            ]}
          >
            <Text style={styles.statusText}>
              {round?.status === 'OPEN' && timeLeft > 0
                ? 'BETTING OPEN'
                : isDrawing
                  ? 'DRAWING...'
                  : 'CLOSED'}
            </Text>
          </View>
        </View>

        {/* Live Draw Bar if Drawing or Result */}
        {drawnNumbers.length > 0 && (
          <View style={styles.liveDrawContainer}>
            <Text style={styles.liveDrawTitle}>
              {isDrawing ? '🔴 DRAWING 20 BALLS LIVE...' : 'DRAW RESULT (20 BALLS)'}
            </Text>
            <View style={styles.ballsRow}>
              {drawnNumbers.map((ball, idx) => (
                <View key={idx} style={styles.drawnBallCircle}>
                  <Text style={styles.drawnBallText}>{ball}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 80-Ball Interactive Keno Grid */}
        <KenoGrid />

        {/* Dynamic Paytable for current spot count */}
        <PaytablePreview />
      </ScrollView>

      {/* Stake picker and Place Bet Bar */}
      <BetBar
        onPlaceBet={handlePlaceBet}
        isLoading={betMutation.isPending}
        disabled={round?.status !== 'OPEN' || timeLeft <= 0}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    gap: 8,
    paddingBottom: 24,
  },
  roundBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  roundLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roundNumber: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },
  countdownBox: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countdownLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownValue: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '900',
  },
  countdownUrgent: {
    color: '#EF4444',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeOpen: {
    backgroundColor: '#065F46',
  },
  statusBadgeClosed: {
    backgroundColor: '#991B1B',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  liveDrawContainer: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  liveDrawTitle: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  ballsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  drawnBallCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  drawnBallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
