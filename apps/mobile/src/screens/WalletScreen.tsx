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

export const WalletScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const [depositAmount, setDepositAmount] = useState('50');
  const [withdrawAmount, setWithdrawAmount] = useState('20');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/transactions');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const amountMinor = (parseFloat(depositAmount) * 100).toString();
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await apiClient.post('/api/v1/wallet/deposit', {
        amountMinor,
        currency: 'USD',
        paymentMethodId: 'card_mock_123',
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Deposit Successful', `$${depositAmount} deposited into your wallet.`);
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (err: any) => {
      Alert.alert('Deposit Failed', err.response?.data?.message || 'Error executing deposit');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amountMinor = (parseFloat(withdrawAmount) * 100).toString();
      const idempotencyKey = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await apiClient.post('/api/v1/wallet/withdraw', {
        amountMinor,
        currency: 'USD',
        destinationAccount: 'bank_mock_456',
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Withdrawal Successful', `$${withdrawAmount} sent to your destination account.`);
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (err: any) => {
      Alert.alert('Withdrawal Failed', err.response?.data?.message || 'Error executing withdrawal');
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
            Please sign in or register with your mobile phone number to access your wallet, deposit demo funds, and withdraw winnings.
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
          <Text style={styles.cardLabel}>TOTAL AVAILABLE BALANCE</Text>
          <Text style={styles.cardAmount}>{formattedBalance}</Text>
          <Text style={styles.currencyTag}>USD • INSTANT SETTLEMENT</Text>
        </View>

        {/* Deposit Section */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>FAST DEPOSIT</Text>
          <View style={styles.inputRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={() => depositMutation.mutate()}
              disabled={depositMutation.isPending}
              style={styles.depositBtn}
            >
              {depositMutation.isPending ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.depositBtnText}>DEPOSIT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Withdrawal Section */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>WITHDRAWAL</Text>
          <View style={styles.inputRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
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
            <ActivityIndicator color="#F59E0B" />
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
              No ledger transactions yet.
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
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  cardLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardAmount: { color: '#FBBF24', fontSize: 36, fontWeight: '900', marginVertical: 6 },
  currencyTag: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  actionCard: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  actionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800', marginBottom: 10 },
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  depositBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 13 },
  withdrawBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  withdrawBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
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
