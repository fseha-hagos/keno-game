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
  Clipboard,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAYMENT_METHODS = [
  { id: 'telebirr', name: 'Telebirr', icon: '📱', accountNumber: '0978614151', accountName: 'Amdom desta' },
  { id: 'cbe_birr', name: 'CBE Birr', icon: '🏦', accountNumber: '1000234567891', accountName: 'Amdom desta' },
  { id: 'mobile_money', name: 'Mobile Money', icon: '💸', accountNumber: '0911000123', accountName: 'Amdom desta' },
  { id: 'card', name: 'Bank Card', icon: '💳', accountNumber: '1000234567890000', accountName: 'Amdom desta' },
];

const PRESET_AMOUNTS = ['50', '100', '200', '500', '1000'];
const WITHDRAW_PRESETS = ['20', '50', '100', '250', '500'];

export const WalletScreen = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();

  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [selectedMethod, setSelectedMethod] = useState('telebirr');
  const [txRef, setTxRef] = useState('');
  // 'main' | 'deposit_instruction' | 'withdraw'
  const [view, setView] = useState<'main' | 'deposit_instruction'>('main');
  const [pendingDepositData, setPendingDepositData] = useState<any>(null);

  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/transactions');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: paymentRequests, isLoading: reqLoading } = useQuery({
    queryKey: ['paymentRequests'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/payment-requests');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Step 1: Initiate deposit — creates PENDING request and shows instruction page
  const initDepositMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(depositAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount');
      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

      const res = await apiClient.post('/api/v1/wallet/deposit', {
        amountMinor,
        currency: 'ETB',
        paymentMethod: selectedMethod,
        accountNumber: method.accountNumber,
        accountName: method.accountName,
        idempotencyKey,
      });
      return { ...res.data, methodInfo: method, displayAmount: amountNum };
    },
    onSuccess: (data) => {
      setPendingDepositData(data);
      setView('deposit_instruction');
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not create deposit request');
    },
  });

  // Step 2: Submit proof/reference for an existing pending deposit
  const submitProofMutation = useMutation({
    mutationFn: async () => {
      if (!txRef.trim()) throw new Error('Please enter your transaction reference number');
      const res = await apiClient.patch(`/api/v1/wallet/admin/deposit/${pendingDepositData?.id}/proof`, {
        transactionReference: txRef.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert(
        '✅ Proof Submitted!',
        'Your payment reference has been submitted. Our team will verify and approve your deposit shortly.',
        [{ text: 'OK', onPress: () => { setView('main'); setTxRef(''); setPendingDepositData(null); } }],
      );
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Could not submit proof');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(withdrawAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount');
      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await apiClient.post('/api/v1/wallet/withdraw', {
        amountMinor,
        currency: 'ETB',
        paymentMethod: selectedMethod,
        destinationAccount: PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.accountNumber,
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert(
        '⏳ Withdrawal Requested',
        'Your withdrawal request has been submitted and funds are locked pending admin approval.',
      );
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
    },
    onError: (err: any) => {
      Alert.alert('Withdrawal Failed', err.response?.data?.message || err.message || 'Error processing withdrawal');
    },
  });

  const formattedBalance = wallet?.balanceMinor
    ? `${(Number(wallet.balanceMinor) / 100).toFixed(2)} ETB`
    : '0.00 ETB';

  const lockedBalance = wallet?.lockedMinor
    ? (Number(wallet.lockedMinor) / 100).toFixed(2)
    : '0.00';

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header />
        <View style={styles.guestCenter}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>💳</Text>
          <Text style={styles.guestTitle}>Player Wallet</Text>
          <Text style={styles.guestSubtitle}>
            Sign in or create a player account to deposit funds and withdraw winnings.
          </Text>
          <TouchableOpacity style={styles.guestButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.guestButtonText}>LOG IN WITH PHONE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // DEPOSIT INSTRUCTION VIEW (like the screenshot)
  if (view === 'deposit_instruction') {
    const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod) || PAYMENT_METHODS[0]!;
    const displayAmount = parseFloat(depositAmount);
    const expiresAt = pendingDepositData?.expiresAt
      ? new Date(pendingDepositData.expiresAt)
      : new Date(Date.now() + 15 * 60 * 1000);
    const minsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000));
    const secsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000) % 60);

    return (
      <View style={styles.container}>
        <Header />
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={() => setView('main')} style={styles.backRow}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Timer card */}
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>Request expires in</Text>
            <Text style={styles.timerValue}>
              {String(minsLeft).padStart(2, '0')}:{String(secsLeft).padStart(2, '0')}
            </Text>
          </View>

          {/* Send Money instruction */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>SEND MONEY TO THIS ACCOUNT</Text>

            <View style={styles.instructionRow}>
              <Text style={styles.instructionLabel}>Payment Method</Text>
              <Text style={[styles.instructionValue, { color: '#10B981' }]}>{method.name}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.instructionRow}>
              <Text style={styles.instructionLabel}>Account Number</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.instructionValue, { fontWeight: '900', fontSize: 16 }]}>
                  {method.accountNumber}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(method.accountNumber);
                    Alert.alert('Copied!', 'Account number copied to clipboard.');
                  }}
                  style={styles.copyBtn}
                >
                  <Text style={styles.copyIcon}>📋</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.instructionRow}>
              <Text style={styles.instructionLabel}>Account Name</Text>
              <Text style={[styles.instructionValue, { fontWeight: '800' }]}>{method.accountName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.instructionRow}>
              <Text style={styles.instructionLabel}>Amount</Text>
              <Text style={[styles.instructionValue, { fontWeight: '900', fontSize: 18, color: '#FBBF24' }]}>
                {displayAmount.toLocaleString()} ETB
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚡ Send the exact amount above, then upload verification below
            </Text>
          </View>

          {/* Transaction Reference Input */}
          <View style={styles.proofCard}>
            <Text style={styles.proofTitle}>OR TRANSACTION REFERENCE</Text>
            <TextInput
              style={styles.refInput}
              placeholder="e.g. TXN123456789"
              placeholderTextColor="#64748B"
              value={txRef}
              onChangeText={setTxRef}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={styles.submitProofBtn}
            onPress={() => submitProofMutation.mutate()}
            disabled={submitProofMutation.isPending}
          >
            {submitProofMutation.isPending ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.submitProofBtnText}>SUBMIT TRANSACTION REFERENCE</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // MAIN WALLET VIEW
  const pendingRequests = Array.isArray(paymentRequests) ? paymentRequests.filter((r: any) => r.status === 'PENDING') : [];
  const settledRequests = Array.isArray(paymentRequests) ? paymentRequests.filter((r: any) => r.status !== 'PENDING') : [];

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.cardLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.cardAmount}>{formattedBalance}</Text>
          {Number(lockedBalance) > 0 && (
            <Text style={styles.lockedBalance}>⏳ {lockedBalance} ETB locked (pending withdrawal)</Text>
          )}
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

        {/* Deposit */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>DEPOSIT FUNDS</Text>
          <View style={styles.presetsRow}>
            {PRESET_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => setDepositAmount(amt)}
                style={[styles.presetChip, depositAmount === amt && styles.presetChipActive]}
              >
                <Text style={[styles.presetText, depositAmount === amt && styles.presetTextActive]}>
                  {amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              placeholder="Amount (ETB)"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              onPress={() => initDepositMutation.mutate()}
              disabled={initDepositMutation.isPending}
              style={styles.depositBtn}
            >
              {initDepositMutation.isPending ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.depositBtnText}>DEPOSIT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Withdraw */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>WITHDRAWAL REQUEST</Text>
          <View style={styles.presetsRow}>
            {WITHDRAW_PRESETS.map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => setWithdrawAmount(amt)}
                style={[styles.presetChip, withdrawAmount === amt && styles.presetChipActive]}
              >
                <Text style={[styles.presetText, withdrawAmount === amt && styles.presetTextActive]}>
                  {amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              placeholder="Amount (ETB)"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              onPress={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
              style={styles.withdrawBtn}
            >
              {withdrawMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.withdrawBtnText}>WITHDRAW</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.withdrawNote}>⚠️ Withdrawals require admin approval (usually 1-2 hrs)</Text>
        </View>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionHeader}>⏳ PENDING APPROVAL</Text>
            {pendingRequests.map((r: any) => (
              <View key={r.id} style={styles.reqRow}>
                <View>
                  <Text style={styles.reqType}>{r.requestType} • {r.paymentMethod?.toUpperCase()}</Text>
                  <Text style={styles.reqDate}>{new Date(r.createdAt).toLocaleString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.reqAmount}>
                    {(Number(r.amountMinor) / 100).toFixed(2)} ETB
                  </Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Settled Requests */}
        {settledRequests.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionHeader}>PAYMENT HISTORY</Text>
            {settledRequests.slice(0, 10).map((r: any) => {
              const approved = r.status === 'APPROVED';
              return (
                <View key={r.id} style={styles.reqRow}>
                  <View>
                    <Text style={styles.reqType}>{r.requestType} • {r.paymentMethod?.toUpperCase()}</Text>
                    <Text style={styles.reqDate}>{new Date(r.createdAt).toLocaleString()}</Text>
                    {r.adminNote && <Text style={styles.adminNote}>Note: {r.adminNote}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.reqAmount}>
                      {(Number(r.amountMinor) / 100).toFixed(2)} ETB
                    </Text>
                    <View style={[styles.pendingBadge, approved ? styles.approvedBadge : styles.rejectedBadge]}>
                      <Text style={styles.pendingBadgeText}>{r.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Ledger Transactions */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeader}>LEDGER TRANSACTIONS</Text>
          {txLoading ? (
            <ActivityIndicator color="#10B981" />
          ) : Array.isArray(transactions) && transactions.length > 0 ? (
            transactions.map((tx: any) => {
              const numAmount = Number(tx?.amountMinor || 0);
              const isDebit = numAmount < 0;
              const displayAmount = (Math.abs(numAmount) / 100).toFixed(2);
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View>
                    <Text style={styles.txType}>{tx.transactionType}</Text>
                    <Text style={styles.txDate}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, isDebit ? styles.txDebit : styles.txCredit]}>
                    {isDebit ? `-${displayAmount}` : `+${displayAmount}`} ETB
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyNote}>No ledger transactions yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  scroll: { padding: 16, gap: 16 },
  backRow: { paddingVertical: 8 },
  backText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  // Balance
  balanceCard: {
    backgroundColor: '#0F172A', padding: 20, borderRadius: 16,
    borderWidth: 1, borderColor: '#10B981', alignItems: 'center',
  },
  cardLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardAmount: { color: '#10B981', fontSize: 34, fontWeight: '900', marginVertical: 4 },
  lockedBalance: { color: '#FBBF24', fontSize: 11, fontWeight: '600' },
  // Action cards
  actionCard: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  actionTitle: { color: '#F8FAFC', fontSize: 12, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 },
  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  methodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  methodChipActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10B981' },
  methodIcon: { fontSize: 14 },
  methodText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  methodTextActive: { color: '#10B981' },
  presetsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  presetChip: { flex: 1, backgroundColor: '#1E293B', paddingVertical: 8, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  presetChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  presetText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  presetTextActive: { color: '#0F172A' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: { flex: 1, backgroundColor: '#1E293B', borderRadius: 8, padding: 10, color: '#fff', fontSize: 15, fontWeight: '700' },
  depositBtn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 8 },
  depositBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
  withdrawBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 8 },
  withdrawBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  withdrawNote: { color: '#FBBF24', fontSize: 10, fontWeight: '600', marginTop: 8 },
  // Pending/history
  historySection: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  sectionHeader: { color: '#94A3B8', fontSize: 11, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 },
  reqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  reqType: { color: '#F1F5F9', fontSize: 13, fontWeight: '700' },
  reqDate: { color: '#64748B', fontSize: 10, marginTop: 2 },
  reqAmount: { color: '#FBBF24', fontSize: 14, fontWeight: '900' },
  adminNote: { color: '#EF4444', fontSize: 10, marginTop: 2 },
  pendingBadge: { backgroundColor: '#713F12', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
  approvedBadge: { backgroundColor: '#064E3B' },
  rejectedBadge: { backgroundColor: '#7F1D1D' },
  pendingBadgeText: { color: '#FBBF24', fontSize: 9, fontWeight: '900' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  txType: { color: '#F1F5F9', fontSize: 13, fontWeight: '700' },
  txDate: { color: '#64748B', fontSize: 10, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txCredit: { color: '#10B981' },
  txDebit: { color: '#EF4444' },
  emptyNote: { color: '#64748B', fontSize: 12, fontStyle: 'italic', paddingVertical: 8 },
  // Deposit instruction view
  timerCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center', marginBottom: 4 },
  timerLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  timerValue: { color: '#10B981', fontSize: 40, fontWeight: '900', fontFamily: 'monospace' },
  instructionCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  instructionTitle: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 16 },
  instructionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  instructionLabel: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  instructionValue: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#1E293B' },
  copyBtn: { backgroundColor: '#1E293B', padding: 6, borderRadius: 6 },
  copyIcon: { fontSize: 14 },
  warningCard: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: '#EF4444', borderRadius: 10, padding: 12 },
  warningText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  proofCard: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  proofTitle: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12 },
  refInput: { backgroundColor: '#1E293B', borderRadius: 8, padding: 14, color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  submitProofBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitProofBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  guestCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  guestTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  guestSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  guestButton: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  guestButtonText: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
});
