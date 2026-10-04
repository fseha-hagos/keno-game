import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';
import { KenoPlayStage } from '../components/KenoPlayStage';
import { BetBar } from '../components/BetBar';
import { GameFeedPanel } from '../components/GameFeedPanel';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { socketService } from '../services/socket';

export const KenoGameScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const { betSlips, currency, isDrawing, drawnNumbers } = useGameStore();
  const inDraw = isDrawing || drawnNumbers.length > 0;

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

  // Synchronize live drawn numbers when user connects or reconnects mid-draw
  useEffect(() => {
    if (!round) return;

    if (round.status === 'OPEN') {
      const currentDrawn = useGameStore.getState().drawnNumbers;
      if (currentDrawn.length > 0) {
        // Allow draw animation to finish all 20 balls and show results
        const timer = setTimeout(() => {
          useGameStore.getState().resetRoundDraw();
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        useGameStore.getState().resetRoundDraw();
      }
    } else if (
      (round.status === 'DRAWING' || round.status === 'DRAWN' || round.status === 'SETTLED') &&
      Array.isArray(round.drawResult)
    ) {
      const parsed = round.drawResult.map(Number).filter((n: number) => !isNaN(n));
      const currentDrawn = useGameStore.getState().drawnNumbers;
      if (parsed.length > currentDrawn.length) {
        useGameStore.getState().setDrawnNumbers(parsed);
        useGameStore.getState().setIsDrawing(round.status !== 'SETTLED');
      }
    }
  }, [round?.id, round?.status, JSON.stringify(round?.drawResult)]);

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

  // Place bet mutation — submits all ready slips in parallel
  const betMutation = useMutation({
    mutationFn: async () => {
      if (!round) throw new Error('No active round');
      const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
      if (readySlips.length === 0) throw new Error('No slips with numbers selected');

      const requests = readySlips.map((slip) => {
        const idempotencyKey = `bet_${slip.id}_${Date.now()}`;
        return apiClient.post('/api/v1/keno/bets', {
          roundId: round.id,
          stakeMinor: slip.stakeMinor,
          currency,
          selectedNumbers: slip.selectedNumbers,
          idempotencyKey,
        });
      });

      const results = await Promise.all(requests);
      return results.map((r) => r.data);
    },
    onSuccess: (results) => {
      const count = results.length;
      const totalStake = betSlips
        .filter((s) => s.selectedNumbers.length > 0)
        .reduce((sum, s) => sum + Number(s.stakeMinor) / 100, 0);
      Alert.alert(
        count > 1 ? `${count} Bets Accepted` : 'Bet Accepted',
        `${totalStake.toFixed(2)} ETB placed on ${count} slip${count > 1 ? 's' : ''} for Round #${round?.roundNumber}.`,
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
    if (!isAuthenticated) {
      Alert.alert(
        'Player Login Required',
        'Please sign in or register to place real bets and win!',
        [
          { text: 'Keep Watching', style: 'cancel' },
          { text: 'Sign In / Register', onPress: () => navigation.navigate('Login') },
        ],
      );
      return;
    }

    const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
    if (readySlips.length === 0) {
      Alert.alert('No Numbers Selected', 'Pick at least 1 number on any slip.');
      return;
    }

    if (round?.status !== 'OPEN' || timeLeft <= 0) {
      Alert.alert('Betting Closed', 'This round is closed. Next round will open shortly.');
      return;
    }

    betMutation.mutate();
  };

  const bettingOpen = round?.status === 'OPEN' && timeLeft > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" />
      <Header roundNumber={round?.roundNumber} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Game stage: timer/draw info + grid */}
        <KenoPlayStage
          roundNumber={round?.roundNumber}
          timeLeft={timeLeft}
          bettingOpen={bettingOpen}
        />

        {/* Stake controls + BET button (visible during betting phase) */}
        {!inDraw && (
          <BetBar
            onPlaceBet={handlePlaceBet}
            isLoading={betMutation.isPending}
            disabled={!bettingOpen}
          />
        )}

        {/* Drag handle indicator */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Tabs: GAME / HISTORY / RESULTS / STATS + bet feed */}
        <GameFeedPanel />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1923',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#0F1923',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3A4A',
  },
});
