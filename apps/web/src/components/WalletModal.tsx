import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toastSuccess, toastError } from '../services/toast';
import { X, Copy, Check, ArrowDownLeft, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { id: 'telebirr', name: 'Telebirr', icon: '📱', accountNumber: '0978614151', accountName: 'Amdom desta' },
  { id: 'cbe_birr', name: 'CBE Birr', icon: '🏦', accountNumber: '1000234567891', accountName: 'Amdom desta' },
  { id: 'mobile_money', name: 'Mobile Money', icon: '💸', accountNumber: '0911000123', accountName: 'Amdom desta' },
  { id: 'card', name: 'Bank Card', icon: '💳', accountNumber: '1000234567890000', accountName: 'Amdom desta' },
];

const DEPOSIT_PRESETS = ['50', '100', '200', '500', '1000'];
const WITHDRAW_PRESETS = ['20', '50', '100', '250', '500'];

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [selectedMethod, setSelectedMethod] = useState('telebirr');
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [pendingDeposit, setPendingDeposit] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState({ mins: 15, secs: 0 });

  // 15-minute countdown timer for pending deposit
  useEffect(() => {
    if (!pendingDeposit) return;
    const expiresAt = pendingDeposit.expiresAt
      ? new Date(pendingDeposit.expiresAt).getTime()
      : Date.now() + 15 * 60 * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      const totalSecs = Math.floor(remaining / 1000);
      setCountdown({ mins: Math.floor(totalSecs / 60), secs: totalSecs % 60 });
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingDeposit]);

  // Balance query
  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance?currency=ETB');
      return res.data;
    },
    enabled: isOpen,
    refetchInterval: 4000,
  });

  // Transactions query
  const { data: transactions } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/transactions?currency=ETB');
      return res.data;
    },
    enabled: isOpen && activeTab === 'history',
  });

  // Step 1: Initiate deposit mutation
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
      setPendingDeposit(data);
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
    },
    onError: (err: any) => {
      toastError('Deposit Error', err.response?.data?.message || err.message || 'Could not initiate deposit');
    },
  });

  // Step 2: Submit proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async () => {
      if (!txRef.trim()) throw new Error('Please enter the transaction reference code');
      const res = await apiClient.patch(`/api/v1/wallet/deposit/${pendingDeposit?.id}/proof`, {
        transactionReference: txRef.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      toastSuccess('Proof Submitted!', 'Reference received. Funds will reflect immediately upon verification.');
      setPendingDeposit(null);
      setTxRef('');
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    },
    onError: (err: any) => {
      toastError('Submission Error', err.response?.data?.message || err.message || 'Could not submit proof');
    },
  });

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(withdrawAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount');
      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;

      const res = await apiClient.post('/api/v1/wallet/withdraw', {
        amountMinor,
        currency: 'ETB',
        paymentMethod: selectedMethod,
        destinationAccount: withdrawAccount.trim() || method.accountNumber,
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      toastSuccess('Withdrawal Submitted', 'Your withdrawal request has been received.');
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      setActiveTab('history');
    },
    onError: (err: any) => {
      toastError('Withdrawal Failed', err.response?.data?.message || err.message || 'Error processing withdrawal');
    },
  });

  if (!isOpen) return null;

  const currentMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;
  const balance = wallet?.balanceMinor ? (Number(wallet.balanceMinor) / 100).toFixed(2) : '0.00';

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: 20,
          width: '100%',
          maxWidth: 460,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Current Balance
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981' }}>
              {balance} <span style={{ fontSize: 14, color: '#F8FAFC' }}>ETB</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#0B1320',
            margin: '12px 16px',
            borderRadius: 10,
            padding: 4,
            border: '1px solid #1E293B',
          }}
        >
          {(['deposit', 'withdraw', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setPendingDeposit(null);
              }}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: 8,
                background: activeTab === tab ? '#1E293B' : 'transparent',
                color: activeTab === tab ? '#F8FAFC' : '#64748B',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '0 16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* ─────────────────────────────────────────────────────────── */}
          {/* 1. DEPOSIT TAB                                              */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'deposit' && (
            pendingDeposit ? (
              /* Step 2: Deposit Payment Instructions & Proof Reference */
              <div>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>
                      Deposit Request Initiated
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {String(countdown.mins).padStart(2, '0')}:{String(countdown.secs).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    Send exactly <strong>{depositAmount} ETB</strong> using {currentMethod.name}:
                  </div>
                </div>

                {/* Account Details Box */}
                <div
                  style={{
                    background: '#0B1320',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Account Name:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC' }}>
                      {currentMethod.accountName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Account Number:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981', letterSpacing: '0.05em' }}>
                        {currentMethod.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentMethod.accountNumber)}
                        style={{
                          background: '#1E293B',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: '#F8FAFC',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference Code Input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                    Transaction Reference Code / SMS ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CI94719082 or TR12345"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#0B1320',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPendingDeposit(null)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: 10,
                      background: '#1E293B',
                      border: '1px solid #334155',
                      color: '#94A3B8',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitProofMutation.isPending}
                    onClick={() => submitProofMutation.mutate()}
                    style={{
                      flex: 2,
                      padding: '12px 0',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {submitProofMutation.isPending ? 'Verifying...' : 'Submit Reference'}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 1: Deposit Method & Amount Selection */
              <div>
                {/* Payment Methods */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        style={{
                          background: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#0B1320',
                          border: isSelected ? '1.5px solid #10B981' : '1px solid #1E293B',
                          borderRadius: 12,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{method.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#F8FAFC' }}>
                            {method.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748B' }}>Instant</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Amount Input */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                    Deposit Amount (ETB)
                  </label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#0B1320',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: 16,
                      fontWeight: 800,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Presets */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {DEPOSIT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 8,
                        background: depositAmount === amt ? '#1E293B' : '#0B1320',
                        border: depositAmount === amt ? '1px solid #10B981' : '1px solid #1E293B',
                        color: depositAmount === amt ? '#10B981' : '#94A3B8',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  disabled={initDepositMutation.isPending}
                  onClick={() => initDepositMutation.mutate()}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {initDepositMutation.isPending ? 'Initiating...' : 'Next: Payment Details'}
                </button>
              </div>
            )
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 2. WITHDRAW TAB                                             */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'withdraw' && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Withdraw Amount (ETB)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#0B1320',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: 16,
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {WITHDRAW_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWithdrawAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 8,
                      background: withdrawAmount === amt ? '#1E293B' : '#0B1320',
                      border: withdrawAmount === amt ? '1px solid #10B981' : '1px solid #1E293B',
                      color: withdrawAmount === amt ? '#10B981' : '#94A3B8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              {/* Destination Account */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Payout Account / Phone (Telebirr / CBE)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0911223344"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#0B1320',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="button"
                disabled={withdrawMutation.isPending}
                onClick={() => withdrawMutation.mutate()}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {withdrawMutation.isPending ? 'Submitting...' : 'Request Payout'}
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 3. TRANSACTION HISTORY TAB                                  */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.isArray(transactions) && transactions.length > 0 ? (
                transactions.map((tx: any) => {
                  const isCredit = tx.type === 'DEPOSIT' || tx.type === 'BET_PAYOUT';
                  const amount = (Number(tx.amountMinor) / 100).toFixed(2);
                  return (
                    <div
                      key={tx.id}
                      style={{
                        background: '#0B1320',
                        border: '1px solid #1E293B',
                        borderRadius: 10,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCredit ? '#10B981' : '#EF4444',
                          }}
                        >
                          {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#F8FAFC' }}>
                            {tx.type}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748B' }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: isCredit ? '#10B981' : '#F8FAFC',
                        }}
                      >
                        {isCredit ? `+${amount}` : `-${amount}`} ETB
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: '#64748B', fontSize: 13, padding: '20px 0' }}>
                  No transaction records yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
