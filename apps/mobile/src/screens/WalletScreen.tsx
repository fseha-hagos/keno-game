import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAYMENT_METHODS = [
  { id: 'telebirr', name: 'Telebirr', icon: '📱' },
  { id: 'cbe_birr', name: 'CBE Birr', icon: '🏦' },
  { id: 'mobile_money', name: 'Mobile Money', icon: '💸' },
  { id: 'card', name: 'Bank Card', icon: '💳' },
];

const PRESET_AMOUNTS = ['10', '50', '100', '500', '1000'];

export const WalletScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();

  const [depositAmount, setDepositAmount] = useState('50');
  const [withdrawAmount, setWithdrawAmount] = useState('20');
  const [selectedMethod, setSelectedMethod] = useState('telebirr');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/transactions');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(depositAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid deposit amount');
      }
      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await apiClient.post('/api/v1/wallet/deposit', {
        amountMinor,
        currency: 'USD',
        paymentMethodId: selectedMethod,
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      const methodObj = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
      Alert.alert(
        '✅ Deposit Successful',
        `$${depositAmount} deposited via ${methodObj?.name || 'Selected Method'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (err: any) => {
      Alert.alert(
        'Deposit Failed',
        err.response?.data?.message || err.message || 'Error processing deposit',
      );
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(withdrawAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid withdrawal amount');
      }
      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await apiClient.post('/api/v1/wallet/withdraw', {
        amountMinor,
        currency: 'USD',
        destinationAccount: selectedMethod,
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      const methodObj = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
      Alert.alert(
        '✅ Withdrawal Successful',
        `$${withdrawAmount} sent to your ${methodObj?.name || 'Account'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (err: any) => {
      Alert.alert(
        'Withdrawal Failed',
        err.response?.data?.message || err.message || 'Error executing withdrawal',
      );
    },
  });

  const formattedBalance = wallet?.balanceMinor
    ? `$${(Number(wallet.balanceMinor) / 100).toFixed(2)}`
    : '$0.00';

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header />
        <View style={styles.guestCenter}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>💳</Text>
          <Text style={styles.guestTitle}>Player Wallet</Text>
          <Text style={styles.guestSubtitle}>
            Sign in or create a player account to deposit funds, place live bets, and withdraw winnings instantly!
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
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.cardLabel}>AVAILABLE WALLET BALANCE</Text>
          <Text style={styles.cardAmount}>{formattedBalance}</Text>
          <Text style={styles.currencyTag}>⚡ INSTANT SETTLEMENT • REAL CASH</Text>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>SELECT PAYMENT METHOD</Text>
          <View style={styles.methodsRow}>
            {PAYMENT_METHODS.map((method) => {
              const active = selectedMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id)}
                  style={[styles.methodChip, active && styles.methodChipActive]}
                >
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <Text style={[styles.methodText, active && styles.methodTextActive]}>
                    {method.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Fast Deposit Section */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>FAST DEPOSIT</Text>
          <View style={styles.presetsRow}>
            {PRESET_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => setDepositAmount(amt)}
                style={[styles.presetChip, depositAmount === amt && styles.presetChipActive]}
              >
                <Text style={[styles.presetText, depositAmount === amt && styles.presetTextActive]}>
                  ${amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              onPress={() => depositMutation.mutate()}
              disabled={depositMutation.isPending}
              style={styles.depositBtn}
            >
              {depositMutation.isPending ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.depositBtnText}>DEPOSIT NOW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Instant Withdrawal Section */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>INSTANT WITHDRAWAL</Text>
          <View style={styles.presetsRow}>
            {['10', '25', '50', '100'].map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => setWithdrawAmount(amt)}
                style={[styles.presetChip, withdrawAmount === amt && styles.presetChipActive]}
              >
                <Text style={[styles.presetText, withdrawAmount === amt && styles.presetTextActive]}>
                  ${amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              onPress={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
              style={styles.withdrawBtn}
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.withdrawBtnText}>WITHDRAW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Ledger Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeader}>LEDGER TRANSACTION HISTORY</Text>
          {txLoading ? (
            <ActivityIndicator color="#10B981" />
          ) : Array.isArray(transactions) && transactions.length > 0 ? (
            transactions.map((tx: any) => {
              const numAmount = Number(tx?.amountMinor || 0);
              const isDebit = String(tx?.amountMinor || '').startsWith('-') || numAmount < 0;
              const displayAmount = (Math.abs(numAmount) / 100).toFixed(2);
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View>
                    <Text style={styles.txType}>{tx.transactionType}</Text>
                    <Text style={styles.txDate}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : '—'}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, isDebit ? styles.txDebit : styles.txCredit]}>
                    {isDebit ? `-$${displayAmount}` : `+$${displayAmount}`}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic', paddingVertical: 8 }}>
              No transactions recorded yet. Make a deposit above!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  scroll: { padding: 16, gap: 16 },
  balanceCard: {
    backgroundColor: '#0F172A',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
  },
  cardLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardAmount: { color: '#10B981', fontSize: 36, fontWeight: '900', marginVertical: 6 },
  currencyTag: { color: '#34D399', fontSize: 10, fontWeight: '800' },
  actionCard: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  actionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  methodChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  methodIcon: { fontSize: 14 },
  methodText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  methodTextActive: { color: '#10B981' },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  presetText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },
  presetTextActive: { color: '#0F172A' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dollarSign: { color: '#F8FAFC', fontSize: 20, fontWeight: '800' },
  amountInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  depositBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  depositBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
  withdrawBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  withdrawBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  historySection: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionHeader: { color: '#94A3B8', fontSize: 12, fontWeight: '800', marginBottom: 12 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  txType: { color: '#F1F5F9', fontSize: 13, fontWeight: '700' },
  txDate: { color: '#64748B', fontSize: 10, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txCredit: { color: '#10B981' },
  txDebit: { color: '#EF4444' },
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
    backgroundColor: '#10B981',
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
