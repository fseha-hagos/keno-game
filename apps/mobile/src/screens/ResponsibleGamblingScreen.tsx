import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { toastSuccess, toastError, alertSuccess } from '../services/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { LimitType, LimitDuration } from '@keno/shared-types';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ResponsibleGamblingScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const [wagerLimit, setWagerLimit] = useState('100');
  const [depositLimit, setDepositLimit] = useState('200');

  const { data: limits, isLoading } = useQuery({
    queryKey: ['rgLimits'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/limits');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const setLimitMutation = useMutation({
    mutationFn: async ({ type, duration, amount }: { type: LimitType; duration: LimitDuration; amount: string }) => {
      const amountMinor = (parseFloat(amount) * 100).toString();
      const res = await apiClient.put('/api/v1/limits', {
        limitType: type,
        duration,
        amountMinor,
      });
      return res.data;
    },
    onSuccess: () => {
      toastSuccess('Limit Updated', 'Responsible gambling limit saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['rgLimits'] });
    },
    onError: (err: any) => {
      toastError('Update Failed', err.response?.data?.message || 'Error updating limit');
    },
  });

  const selfExcludeMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiClient.post('/api/v1/limits/self-exclude', {
        durationDays: days,
        reason: 'Player voluntary request',
      });
      return res.data;
    },
    onSuccess: () => {
      alertSuccess(
        'Self-Exclusion Active',
        'Your account has been temporarily self-excluded. You will not be able to place bets.',
      );
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.guestCenter}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🛡️</Text>
          <Text style={styles.guestTitle}>Responsible Gaming</Text>
          <Text style={styles.guestSubtitle}>
            Log in with your phone number to set personal wager limits, deposit limits, or manage cooling-off and self-exclusion settings.
          </Text>
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.guestButtonText}>LOG IN WITH PHONE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>RESPONSIBLE GAMBLING CONTROLS</Text>
        <Text style={styles.description}>
          Gambling should always be entertaining. Set deposit and wager limits to stay in control of your play.
        </Text>

        {/* Wager Limit Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DAILY WAGER LIMIT</Text>
          <View style={styles.inputRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              value={wagerLimit}
              onChangeText={setWagerLimit}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={() =>
                setLimitMutation.mutate({
                  type: LimitType.WAGER,
                  duration: LimitDuration.DAILY,
                  amount: wagerLimit,
                })
              }
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Deposit Limit Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DAILY DEPOSIT LIMIT</Text>
          <View style={styles.inputRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              value={depositLimit}
              onChangeText={setDepositLimit}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={() =>
                setLimitMutation.mutate({
                  type: LimitType.DEPOSIT,
                  duration: LimitDuration.DAILY,
                  amount: depositLimit,
                })
              }
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Self-Exclusion Section */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>SELF-EXCLUSION / COOLING OFF</Text>
          <Text style={styles.dangerText}>
            Take a break from betting. Account will be blocked from placing wagers for the selected duration.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={() => selfExcludeMutation.mutate(7)}
              style={styles.excludeBtn}
            >
              <Text style={styles.excludeBtnText}>7 DAYS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => selfExcludeMutation.mutate(30)}
              style={styles.excludeBtn}
            >
              <Text style={styles.excludeBtnText}>30 DAYS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => selfExcludeMutation.mutate(180)}
              style={styles.excludeBtn}
            >
              <Text style={styles.excludeBtnText}>6 MONTHS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  scroll: { padding: 16, gap: 16 },
  title: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  description: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  cardTitle: { color: '#F1F5F9', fontSize: 12, fontWeight: '800' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dollar: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
  dangerCard: { borderColor: '#7F1D1D' },
  dangerTitle: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
  dangerText: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  excludeBtn: {
    flex: 1,
    backgroundColor: '#7F1D1D',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  excludeBtnText: { color: '#FEE2E2', fontSize: 12, fontWeight: '800' },
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
