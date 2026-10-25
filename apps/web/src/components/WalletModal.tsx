import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toastSuccess, toastError } from '../services/toast';
import { X, Copy, Check, ArrowDownLeft, ArrowUpRight, Clock, ShieldCheck, HelpCircle, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'deposit' | 'withdraw' | 'history';
}

const PAYMENT_METHODS = [
  {
    id: 'telebirr',
    name: 'telebirr',
    icon: '📱',
    image: '/telebirr.jpg',
    badge: 'Auto Match',
    isInstant: true,
    accountNumber: '0948491265',
    accountName: 'Fseha Hagos',
    hint: 'e.g. CI94719082',
    instructions: [
      'Open your Telebirr app or dial *127#',
      'Select "Send Money" to 0948491265 (Fseha Hagos)',
      'Enter the EXACT deposit amount',
      'Confirm the transaction with your PIN',
      'Our automated instant verification system automatically detects your payment!',
    ],
  },
  {
    id: 'cbe_bank',
    name: 'Commercial Bank of Ethiopia',
    icon: '🏛️',
    image: '/cbe.jpg',
    badge: 'FT Code',
    isInstant: false,
    accountNumber: '1000287635657',
    accountName: 'Fseha Hagos',
    hint: 'e.g. FT262920XXXX',
    instructions: [
      'Transfer via CBE Mobile Banking or branch to Account: 1000234567891',
      'Recipient: Fseha Hagos',
      'Enter the FT transaction reference code for verification',
    ],
  },
  {
    id: 'cbe_birr',
    name: 'CBEbirr',
    icon: '🏦',
    image: '/cbe.jpg',
    badge: 'Auto Match',
    isInstant: false,
    accountNumber: '0948491265',
    accountName: 'Fseha Hagos',
    hint: 'e.g. CB987654321',
    instructions: [
      'Open CBE Birr app or dial *847#',
      'Transfer to CBE Birr mobile: 0948491265 (Fseha Hagos)',
      'Enter the EXACT amount and confirm',
      'Incoming SMS notification is detected and matched automatically',
    ],
  },
  {
    id: 'mpesa',
    name: 'M-Pesa (Safaricom)',
    icon: '📲',
    image: '/mpesa.jpg',
    badge: 'Auto Match',
    isInstant: false,
    accountNumber: '0700000000',
    accountName: 'Fseha Hagos',
    hint: 'e.g. NL47JK890',
    instructions: [
      'Open your M-Pesa app or dial *777#',
      'Select "Send Money" to 0700000000 (Fseha Hagos)',
      'Enter the EXACT deposit amount and confirm',
      'M-Pesa confirmation SMS will be captured and matched automatically',
    ],
  },
  {
    id: 'other_bank',
    name: 'Bank of Abyssinia / Other Banks',
    icon: '💳',
    image: null,
    badge: 'Awash/Dashen/BOA',
    isInstant: false,
    accountNumber: '1000-------',
    accountName: 'Fseha Hagos',
    hint: 'e.g. Bank Ref / Slip No',
    instructions: [
      'Transfer from Bank of Abyssinia, Awash, Dashen, Nib, etc.',
      'Send to CBE Account: 1000------- (Fseha Hagos)',
      'Enter your transaction reference for admin review',
    ],
  },
];

const DEPOSIT_PRESETS = ['50', '100', '200', '500', '1000'];
const WITHDRAW_PRESETS = ['20', '50', '100', '250', '500'];

const extractRefPreview = (text: string): string => {
  if (!text) return '';
  const t = text.trim();
  const match =
    t.match(/(?:Your\s+)?(?:transaction\s*(?:number|no|id|code)|txn\s*(?:id|no|code|number)?|trans\s*id|reference|ref|የግብይት\s*ቁጥር)(?:\s+is|\s*[:=-]|\s+)\s*([A-Za-z0-9]{6,25})/i) ||
    t.match(/(?:receipt\/|receipt\?id=)([A-Za-z0-9]{6,25})/i) ||
    t.match(/\b(DJ[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(CI[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(DA[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(TB[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(NL[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(FT[0-9A-Za-z]{6,16})\b/i);
  return match && match[1] ? match[1].toUpperCase() : '';
};

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'deposit',
}) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>(initialTab);
  const [selectedMethod, setSelectedMethod] = useState('telebirr');
  const [withdrawMethod, setWithdrawMethod] = useState('telebirr');
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [isManualAccount, setIsManualAccount] = useState(false);
  const [isManualName, setIsManualName] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [pendingDeposit, setPendingDeposit] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState({ mins: 15, secs: 0 });
  const [showHelp, setShowHelp] = useState(false);

  // Sync tab & registered phone/name when modal opens or user profile loads
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (!isManualAccount) {
        setWithdrawAccount(user?.phone || '');
      }
      if (!isManualName) {
        setWithdrawName(user?.username || '');
      }
    }
  }, [isOpen, initialTab, user?.phone, user?.username]);

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

  // Live polling for pending deposit status (detects SMS matching & admin approval in real-time)
  useQuery({
    queryKey: ['activePendingDeposit', pendingDeposit?.id],
    queryFn: async () => {
      if (!pendingDeposit?.id) return null;
      try {
        const res = await apiClient.get('/api/v1/wallet/payment-requests');
        const found = res.data?.find((r: any) => r.id === pendingDeposit.id);
        if (found) {
          if (found.status === 'APPROVED') {
            toastSuccess('Deposit Approved!', 'Your payment was approved and your balance has been credited!');
            setPendingDeposit(null);
            queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
            queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
          } else if (found.status === 'REJECTED') {
            toastError('Deposit Rejected', found.adminNote || 'Deposit was rejected');
            setPendingDeposit(null);
          } else if (found.matchedEvidenceId && !pendingDeposit.matchedEvidenceId) {
            setPendingDeposit(found);
          }
        }
        return found;
      } catch {
        return null;
      }
    },
    enabled: !!pendingDeposit?.id,
    refetchInterval: 3000,
  });

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
      if (!txRef.trim()) throw new Error('Please enter the transaction reference code or paste SMS text');
      const res = await apiClient.patch(`/api/v1/wallet/deposit/${pendingDeposit?.id}/proof`, {
        transactionReference: txRef.trim(),
      });
      return res.data;
    },
    onSuccess: (updated) => {
      if (updated.status === 'APPROVED') {
        toastSuccess('Deposit Auto-Approved! 🎉', 'Your payment was instantly verified and credited to your wallet!');
        setPendingDeposit(null);
        queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
        queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      } else {
        toastSuccess('Reference Recorded!', 'Transaction received. Awaiting admin review.');
        setPendingDeposit((prev: any) => ({
          ...prev,
          ...updated,
          proofSubmitted: true,
          transactionReference: updated.transactionReference || txRef.trim(),
        }));
      }
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

      const avail = wallet?.balanceMinor ? Number(wallet.balanceMinor) / 100 : 0;
      if (amountNum > avail) {
        throw new Error(`Insufficient funds. Your available balance is ${avail.toFixed(2)} ETB`);
      }

      // Default to registered phone if Telebirr and not manually altered, or use entered value
      const cleanAccount = (withdrawAccount.trim() || (withdrawMethod === 'telebirr' ? user?.phone : '') || '').trim();
      if (!cleanAccount) {
        throw new Error(
          withdrawMethod === 'telebirr'
            ? 'Please enter your Telebirr phone number'
            : 'Please enter your payout account/phone number'
        );
      }

      const cleanName = (withdrawName.trim() || (withdrawMethod === 'telebirr' ? user?.username : '') || '').trim();

      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await apiClient.post('/api/v1/wallet/withdraw', {
        amountMinor,
        currency: 'ETB',
        paymentMethod: withdrawMethod,
        destinationAccount: cleanAccount,
        accountName: cleanName || undefined,
        idempotencyKey,
      });
      return res.data;
    },
    onSuccess: () => {
      toastSuccess('Withdrawal Submitted', 'Your withdrawal request has been received.');
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
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
                {/* Header Card: Target Amount & Provider + Timer & Help Button */}
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {currentMethod.image ? (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            padding: 2,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          <img
                            src={currentMethod.image}
                            alt={currentMethod.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      ) : null}
                      <div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Amount to Send</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#F8FAFC' }}>
                          {depositAmount} ETB <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>via {currentMethod.name}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Countdown */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(239, 68, 68, 0.1)',
                          padding: '3px 7px',
                          borderRadius: 6,
                        }}
                      >
                        <Clock size={12} />
                        {String(countdown.mins).padStart(2, '0')}:{String(countdown.secs).padStart(2, '0')}
                      </span>

                      {/* Help '?' Button */}
                      <button
                        type="button"
                        onClick={() => setShowHelp(true)}
                        style={{
                          background: 'rgba(251, 191, 36, 0.12)',
                          border: '1px solid rgba(251, 191, 36, 0.4)',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FBBF24',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="How to pay? View instructions"
                      >
                        <HelpCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Details Box */}
                <div
                  style={{
                    background: '#0B1320',
                    border: '1px solid #1E293B',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Account Name:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC' }}>
                      {currentMethod.accountName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Account Number:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#10B981', letterSpacing: '0.04em' }}>
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
                          fontWeight: 700,
                        }}
                      >
                        {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Help Drawer Modal when user clicks '?' */}
                {showHelp && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10, 16, 26, 0.96)',
                      backdropFilter: 'blur(6px)',
                      zIndex: 30,
                      padding: '20px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 20,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FBBF24', fontSize: 13, fontWeight: 800 }}>
                        <HelpCircle size={16} />
                        <span>HOW TO PAY ({currentMethod.name.toUpperCase()})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowHelp(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <ol
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          fontSize: 12,
                          color: '#CBD5E1',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {currentMethod.instructions.map((step: string, idx: number) => (
                          <li key={idx}>
                            <span style={{ color: '#F8FAFC' }}>{step}</span>
                          </li>
                        ))}
                      </ol>

                      <div
                        style={{
                          marginTop: 16,
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          fontSize: 11,
                          color: '#86EFAC',
                          lineHeight: 1.4,
                        }}
                      >
                        💡 <strong>Tip:</strong> You can paste the entire confirmation SMS from {currentMethod.name}. Our system will automatically detect the reference number!
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowHelp(false)}
                      style={{
                        width: '100%',
                        padding: '11px 0',
                        borderRadius: 10,
                        background: '#1E293B',
                        border: '1px solid #334155',
                        color: '#F8FAFC',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: 14,
                      }}
                    >
                      Got it, Back to Payment
                    </button>
                  </div>
                )}

                {/* Reference Code Input or Awaiting Approval Status */}
                {pendingDeposit?.proofSubmitted ? (
                  <div style={{ background: '#0B1320', border: '1px solid #10B981', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: 10, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', marginBottom: 10 }}>
                      <Check size={24} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                      Reference Submitted & Awaiting Admin Approval
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
                      Ref: <strong style={{ color: '#10B981' }}>{pendingDeposit.transactionReference}</strong> • Amount: <strong>{depositAmount} ETB</strong>
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 8, padding: 10, fontSize: 11, color: '#93C5FD', textAlign: 'left', lineHeight: 1.5 }}>
                      ⏳ Real-money deposits require administrator confirmation in the <strong>Admin Console</strong> before balances are credited. This window is live-monitoring every 3s and will update your balance automatically once approved.
                    </div>

                    <button
                      type="button"
                      onClick={() => { setPendingDeposit(null); onClose(); }}
                      style={{
                        marginTop: 14,
                        width: '100%',
                        padding: '10px 0',
                        borderRadius: 8,
                        background: '#1E293B',
                        border: '1px solid #334155',
                        color: '#94A3B8',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Close Window (Will credit automatically upon admin approval)
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                          Transaction Reference Code
                        </label>
                        {extractRefPreview(txRef) && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            ✨ Detected Ref: {extractRefPreview(txRef)}
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        placeholder={`e.g. ${currentMethod.hint || 'DJJ82SWP4M'} or paste full SMS`}
                        value={txRef}
                        onChange={(e) => setTxRef(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: '#0B1320',
                          border: extractRefPreview(txRef) ? '1px solid #10B981' : '1px solid #334155',
                          color: '#F8FAFC',
                          fontSize: 13,
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'none',
                          fontFamily: 'inherit',
                          lineHeight: 1.4,
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
                  </>
                )}
              </div>
            ) : (
              /* Step 1: Deposit Method & Amount Selection */
              <div>
                {/* Payment Methods - Vertical List layout matching reference */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        style={{
                          width: '100%',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : '#0B1320',
                          border: isSelected ? '1.5px solid #10B981' : '1px solid #1E293B',
                          borderRadius: 14,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Circular Logo Badge */}
                        {method.image ? (
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              backgroundColor: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              padding: 3,
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                              border: isSelected ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
                            }}
                          >
                            <img
                              src={method.image}
                              alt={method.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              backgroundColor: '#1E293B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              flexShrink: 0,
                            }}
                          >
                            {method.icon}
                          </div>
                        )}

                        {/* Title */}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: isSelected ? '#10B981' : '#F8FAFC',
                            flex: 1,
                          }}
                        >
                          {method.name}
                        </div>

                        {/* Instant Badge (only on Telebirr) */}
                        {method.isInstant && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#10B981',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: 12,
                              padding: '3px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                backgroundColor: '#10B981',
                                boxShadow: '0 0 5px rgba(16, 185, 129, 0.8)',
                              }}
                            />
                            Instant
                          </span>
                        )}
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
              {/* Available Balance Banner */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Available to Withdraw</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981' }}>
                    {balance} <span style={{ fontSize: 13, color: '#FFFFFF' }}>ETB</span>
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#10B981',
                  }}
                >
                  ⚡ Fast Payout
                </div>
              </div>

              {/* Method Selector for Withdrawal */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Payout Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {PAYMENT_METHODS.filter((m) => m.id !== 'other_bank').map((method) => {
                    const isSelected = withdrawMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setWithdrawMethod(method.id);
                          if (method.id === 'telebirr') {
                            if (!isManualAccount) setWithdrawAccount(user?.phone || '');
                            if (!isManualName) setWithdrawName(user?.username || '');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : '#0B1320',
                          border: isSelected ? '1.5px solid #10B981' : '1px solid #1E293B',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                        }}
                      >
                        {method.image ? (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                              padding: 2,
                            }}
                          >
                            <img src={method.image} alt={method.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 18 }}>{method.icon}</span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: isSelected ? '#10B981' : '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {method.name}
                          </div>
                          {method.id === 'telebirr' && (
                            <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>Default / Instant</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Telebirr Default Info Alert */}
              {withdrawMethod === 'telebirr' && (
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid rgba(81, 181, 121, 0.25)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    marginBottom: 14,
                    fontSize: 11.5,
                    color: '#94A3B8',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: '#10B981', fontWeight: 700 }}>Telebirr Payout:</span> Defaults to your registered phone number & account name. If you prefer to withdraw to another number, edit it manually below.
                </div>
              )}

              {/* Withdraw Amount Input */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Withdraw Amount (ETB)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Min 20 ETB"
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

              {/* Presets + MAX */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {[...WITHDRAW_PRESETS, 'MAX'].map((amt) => {
                  const isMax = amt === 'MAX';
                  const isSelected = !isMax && withdrawAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        if (isMax) {
                          setWithdrawAmount(Math.max(0, Math.floor(Number(balance))).toString());
                        } else {
                          setWithdrawAmount(amt);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 8,
                        background: isSelected ? '#1E293B' : '#0B1320',
                        border: isSelected ? '1px solid #10B981' : isMax ? '1px solid #F59E0B' : '1px solid #1E293B',
                        color: isSelected ? '#10B981' : isMax ? '#F59E0B' : '#94A3B8',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {amt}
                    </button>
                  );
                })}
              </div>

              {/* Destination Account / Phone */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                    {withdrawMethod === 'telebirr'
                      ? 'Telebirr Phone Number'
                      : withdrawMethod === 'cbe_bank'
                        ? 'CBE Bank Account Number'
                        : 'Payout Account / Phone'}
                  </label>
                  {withdrawMethod === 'telebirr' && (
                    withdrawAccount === (user?.phone || '') && user?.phone ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={12} strokeWidth={3} /> Default Registered Phone
                      </span>
                    ) : user?.phone ? (
                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawAccount(user.phone || '');
                          setIsManualAccount(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#10B981',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          textDecoration: 'underline',
                        }}
                      >
                        <RotateCcw size={11} /> Reset to Registered ({user.phone})
                      </button>
                    ) : null
                  )}
                </div>
                <input
                  type="text"
                  placeholder={withdrawMethod === 'telebirr' ? 'e.g. 0912345678' : 'Account or Phone Number'}
                  value={withdrawAccount}
                  onChange={(e) => {
                    setWithdrawAccount(e.target.value);
                    setIsManualAccount(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#0B1320',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: 14,
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.02em',
                  }}
                />
                {withdrawMethod === 'telebirr' && isManualAccount && withdrawAccount !== (user?.phone || '') && (
                  <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, fontWeight: 600 }}>
                    ✍️ Manual phone number entered. Winnings will be sent to this number.
                  </div>
                )}
              </div>

              {/* Account Holder Name */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                    Account Holder Name
                  </label>
                  {withdrawName === (user?.username || '') && user?.username ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} strokeWidth={3} /> Default Registered Name
                    </span>
                  ) : user?.username ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWithdrawName(user.username || '');
                        setIsManualName(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#10B981',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        textDecoration: 'underline',
                      }}
                    >
                      <RotateCcw size={11} /> Reset to Registered ({user.username})
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Full Name"
                  value={withdrawName}
                  onChange={(e) => {
                    setWithdrawName(e.target.value);
                    setIsManualName(true);
                  }}
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
                disabled={withdrawMutation.isPending || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(balance)}
                onClick={() => withdrawMutation.mutate()}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 10,
                  background:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? '#1E293B'
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? '#64748B'
                      : '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? 'none'
                      : '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                {withdrawMutation.isPending
                  ? 'Submitting Request...'
                  : `Request Payout (${withdrawAmount || '0'} ETB)`}
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
