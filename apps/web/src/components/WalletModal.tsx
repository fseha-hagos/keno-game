import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toastSuccess, toastError, toastInfo } from '../services/toast';
import {
  X,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  HelpCircle,
  RotateCcw,
  Loader2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Phone,
  Send,
  FileCheck,
  CreditCard,
  ArrowDownCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const formatTxDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
};

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'deposit' | 'withdraw' | 'history';
}

const PAYMENT_METHODS = [
  {
    id: 'cbe_bank',
    name: 'Commercial Bank of Ethiopia (CBE)',
    icon: '🏛️',
    image: '/cbe.jpg',
    badge: 'FT Code',
    isInstant: false,
    accountNumber: '1000282131138',
    accountName: 'Abel Alemseged',
    hint: 'e.g. FT262920XXXX',
    instructions: [
      'Transfer via CBE Mobile Banking or branch to Account: 1000282131138',
      'Recipient Account Name: Abel Alemseged',
      'Enter the FT transaction reference code for verification',
    ],
  },
  {
    id: 'telebirr',
    name: 'telebirr',
    icon: '📱',
    image: '/telebirr.jpg',
    badge: 'Auto Match',
    isInstant: true,
    accountNumber: '0930547684',
    accountName: 'Abel Alemseged',
    hint: 'e.g. CI94719082',
    instructions: [
      'Open your Telebirr app or dial *127#',
      'Select "Send Money" to 0930547684 (Abel Alemseged)',
      'Enter the EXACT deposit amount',
      'Confirm the transaction with your PIN',
      'Our automated instant verification system automatically detects your payment!',
    ],
  },
  {
    id: 'cbe_birr',
    name: 'CBEbirr',
    icon: '🏦',
    image: '/cbe.jpg',
    badge: 'Auto Match',
    isInstant: false,
    accountNumber: '0930547684',
    accountName: 'Abel Alemseged',
    hint: 'e.g. CB987654321',
    instructions: [
      'Open CBE Birr app or dial *847#',
      'Transfer to CBE Birr mobile: 0930547684 (Abel Alemseged)',
      'Enter the EXACT amount and confirm',
      'Incoming SMS notification is detected and matched automatically',
    ],
  },
  {
    id: 'mpesa',
    name: 'M-Pesa (Safaricom)',
    icon: '📲',
    image: '/mpesa.jpg',
    badge: 'Coming Soon',
    isInstant: false,
    accountNumber: 'Safaricom M-Pesa',
    accountName: 'Abel Alemseged',
    hint: 'Coming soon',
    instructions: [
      'Safaricom M-Pesa integration is currently in progress.',
      'We will integrate this service soon! Please use Telebirr or CBE in the meantime.',
    ],
  },
  {
    id: 'other_bank',
    name: 'Bank of Abyssinia / Other Banks',
    icon: '💳',
    image: null,
    badge: 'Awash/Dashen/BOA',
    isInstant: false,
    accountNumber: '1000282131138',
    accountName: 'Abel Alemseged',
    hint: 'e.g. Bank Ref / Slip No',
    instructions: [
      'Transfer from Bank of Abyssinia, Awash, Dashen, Nib, etc.',
      'Send to CBE Account: 1000282131138 (Abel Alemseged)',
      'Enter your transaction reference for admin review',
    ],
  },
];

const DEPOSIT_PRESETS = ['50', '100', '200', '500', '1000'];
const WITHDRAW_PRESETS = ['100', '200', '500', '1000', '2000'];

const extractRefPreview = (text: string): string => {
  if (!text) return '';
  const t = text.trim();
  const match =
    t.match(/(?:Your\s+)?(?:transaction\s*(?:number|no|id|code)|txn\s*(?:id|no|code|number)?|trans\s*id|reference|ref|የግብይት\s*ቁጥር)(?:\s+is|\s*[:=-]|\s+)\s*([A-Za-z0-9]{6,25})/i) ||
    t.match(/(?:receipt\/|receipt\?id=)([A-Za-z0-9]{6,25})/i) ||
    t.match(/\b(DK[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(DJ[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(CI[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(DA[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(TB[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(CW[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(NW[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(NL[0-9A-Za-z]{6,16})\b/i) ||
    t.match(/\b(FT[0-9A-Za-z]{6,16})\b/i);
  return match && match[1] ? match[1].toUpperCase() : '';
};

const PENDING_DEPOSIT_STORAGE_KEY = 'keno_active_pending_deposit';

const getStoredPendingDeposit = (userId?: string) => {
  try {
    const userKey = userId ? `${PENDING_DEPOSIT_STORAGE_KEY}_${userId}` : null;
    let raw = userKey ? localStorage.getItem(userKey) : null;
    if (!raw) {
      raw = localStorage.getItem(PENDING_DEPOSIT_STORAGE_KEY);
    }
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data) return null;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
    if (expiresAt && expiresAt <= Date.now()) {
      if (userKey) localStorage.removeItem(userKey);
      localStorage.removeItem(PENDING_DEPOSIT_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const storePendingDeposit = (userId?: string, data?: any) => {
  try {
    const userKey = userId ? `${PENDING_DEPOSIT_STORAGE_KEY}_${userId}` : null;
    if (!data) {
      if (userKey) localStorage.removeItem(userKey);
      localStorage.removeItem(PENDING_DEPOSIT_STORAGE_KEY);
    } else {
      const serialized = JSON.stringify(data);
      if (userKey) localStorage.setItem(userKey, serialized);
      localStorage.setItem(PENDING_DEPOSIT_STORAGE_KEY, serialized);
    }
  } catch {}
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
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [isManualAccount, setIsManualAccount] = useState(false);
  const [isManualName, setIsManualName] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [pendingDeposit, setPendingDepositState] = useState<any>(() => getStoredPendingDeposit(user?.id));
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState({ mins: 15, secs: 0 });
  const [confirmCancelRequest, setConfirmCancelRequest] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const setPendingDeposit = (data: any) => {
    setPendingDepositState(data);
    storePendingDeposit(user?.id, data);
  };

  // Restore stored pending deposit on user change
  useEffect(() => {
    if (!user?.id) return;
    const stored = getStoredPendingDeposit(user.id);
    if (stored) {
      if (new Date(stored.expiresAt).getTime() > Date.now()) {
        setPendingDepositState(stored);
        if (stored.paymentMethod) setSelectedMethod(stored.paymentMethod);
        if (stored.transactionReference) setTxRef(stored.transactionReference);
      } else {
        storePendingDeposit(user.id, null);
      }
    }
  }, [user?.id]);

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

  // Countdown timer for pending deposit
  useEffect(() => {
    if (!pendingDeposit) return;
    const expiresAt = pendingDeposit.expiresAt
      ? new Date(pendingDeposit.expiresAt).getTime()
      : Date.now() + 15 * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      const totalSecs = Math.floor(remaining / 1000);
      setCountdown({ mins: Math.floor(totalSecs / 60), secs: totalSecs % 60 });
      if (remaining <= 0) {
        setPendingDeposit(null);
        toastInfo('Deposit Expired', 'The deposit time window has expired. You can initiate a new deposit.');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pendingDeposit?.expiresAt, pendingDeposit?.id]);

  // Live Authoritative Pending Deposit Query: restores active deposit even after refresh/re-entry, and monitors approval
  useQuery({
    queryKey: ['activePendingDepositServer', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const res = await apiClient.get('/api/v1/wallet/payment-requests');
        if (!Array.isArray(res.data)) return null;

        const now = Date.now();
        // Check for active pending deposit within expiry window
        const active = res.data.find(
          (r: any) =>
            r.requestType === 'DEPOSIT' &&
            r.status === 'PENDING' &&
            (!r.expiresAt || new Date(r.expiresAt).getTime() > now),
        );

        if (active) {
          const methodInfo =
            PAYMENT_METHODS.find((m) => m.id === active.paymentMethod) || PAYMENT_METHODS[0];
          const restored = {
            ...active,
            methodInfo,
            displayAmount: (Number(active.amountMinor) / 100).toString(),
            proofSubmitted: Boolean(
              active.transactionReference && active.transactionReference.trim(),
            ),
          };
          setPendingDeposit(restored);
          if (active.paymentMethod) setSelectedMethod(active.paymentMethod);
          if (active.transactionReference) setTxRef(active.transactionReference);
          return restored;
        } else if (pendingDeposit?.id) {
          const matching = res.data.find((r: any) => r.id === pendingDeposit.id);
          if (matching) {
            if (matching.status === 'APPROVED') {
              toastSuccess('Deposit Approved!', 'Your payment was approved and your balance has been credited!');
              setPendingDeposit(null);
              queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
              queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
            } else if (matching.status === 'REJECTED') {
              toastError('Deposit Rejected', matching.adminNote || 'Deposit was rejected');
              setPendingDeposit(null);
            } else if (matching.status === 'CANCELLED' || matching.status === 'EXPIRED') {
              setPendingDeposit(null);
            }
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: isOpen && !!user?.id,
    refetchInterval: pendingDeposit?.id ? 3500 : false,
  });

  // Balance query
  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance?currency=ETB');
      return res.data;
    },
    enabled: isOpen,
    staleTime: 10000,
  });

  // Fetch active cashier agents for dynamic retail float routing
  const { data: activeAgents = [] } = useQuery<any[]>({
    queryKey: ['activeCashierAgents'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/wallet/active-agents');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const selectedAgent = useMemo(() => {
    if (activeAgents.length === 0) return null;
    if (selectedAgentId) {
      const found = activeAgents.find((a) => (a.agentId || a.id) === selectedAgentId);
      if (found) return found;
    }
    return activeAgents[0];
  }, [activeAgents, selectedAgentId]);

  const dynamicPaymentMethods: Array<(typeof PAYMENT_METHODS)[number]> = useMemo(() => {
    if (!selectedAgent) return PAYMENT_METHODS;
    return PAYMENT_METHODS.map((m) => {
      if (m.id === 'telebirr' && selectedAgent.telebirrNumber) {
        return {
          ...m,
          accountNumber: selectedAgent.telebirrNumber,
          accountName: selectedAgent.telebirrName || selectedAgent.username,
          instructions: [
            'Open your Telebirr app or dial *127#',
            `Select "Send Money" to ${selectedAgent.telebirrNumber} (${selectedAgent.telebirrName || selectedAgent.username})`,
            'Enter the EXACT deposit amount',
          ],
        };
      }
      if (m.id === 'cbe_bank' && selectedAgent.cbeNumber) {
        return {
          ...m,
          accountNumber: selectedAgent.cbeNumber,
          accountName: selectedAgent.cbeName || selectedAgent.username,
          instructions: [
            `Transfer via CBE Mobile Banking to Account: ${selectedAgent.cbeNumber}`,
            `Recipient Account Name: ${selectedAgent.cbeName || selectedAgent.username}`,
            'Enter the FT transaction reference code for verification',
          ],
        };
      }
      return m;
    });
  }, [selectedAgent]);

  // Payment requests query (Deposits & Withdrawals) — No periodic polling, refreshes on demand
  const {
    data: paymentRequests,
    isLoading: isPaymentRequestsLoading,
    isFetching: isPaymentRequestsFetching,
    isError: isPaymentRequestsError,
    refetch: refetchPaymentRequests,
  } = useQuery({
    queryKey: ['paymentRequests'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/payment-requests');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: isOpen && activeTab === 'history',
    staleTime: 30000,
  });

  // Step 1: Initiate deposit mutation
  const initDepositMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(depositAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount');
      if (amountNum < 50) throw new Error('Minimum deposit amount is 50 ETB');
      if (amountNum > 10000) throw new Error('Maximum deposit amount is 10,000 ETB');
      const amountMinor = Math.round(amountNum * 100).toString();
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const method = (dynamicPaymentMethods.find((m) => m.id === selectedMethod) || PAYMENT_METHODS[0])!;

      const res = await apiClient.post('/api/v1/wallet/deposit', {
        amountMinor,
        currency: 'ETB',
        paymentMethod: selectedMethod,
        accountNumber: method.accountNumber,
        accountName: method.accountName,
        idempotencyKey,
        agentId: selectedAgent?.id,
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
      const raw = txRef.trim();
      if (!raw) throw new Error('Please enter the transaction reference code or paste SMS text');
      const detected = extractRefPreview(raw);
      const cleanRef = detected || raw;
      const res = await apiClient.patch(`/api/v1/wallet/deposit/${pendingDeposit?.id}/proof`, {
        transactionReference: cleanRef,
        rawSmsText: raw,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      const raw = txRef.trim();
      const detected = extractRefPreview(raw);
      const cleanRef = detected || raw;
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
          transactionReference: updated.transactionReference || cleanRef,
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
      if (amountNum < 100) throw new Error('Minimum withdrawal amount is 100 ETB');

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

  // Step 3: Cancel pending request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiClient.post(`/api/v1/wallet/payment-requests/${requestId}/cancel`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toastSuccess(
        'Request Cancelled',
        data.requestType === 'WITHDRAWAL'
          ? 'Withdrawal cancelled and locked funds refunded to your balance.'
          : 'Deposit request has been cancelled.',
      );
      setPendingDeposit(null);
      setTxRef('');
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (err: any) => {
      toastError('Cancellation Error', err.response?.data?.message || err.message || 'Could not cancel request');
    },
  });

  if (!isOpen) return null;

  const currentMethod = (dynamicPaymentMethods.find((m) => m.id === (pendingDeposit?.paymentMethod || selectedMethod)) || PAYMENT_METHODS[0])!;
  const displayAccountName = pendingDeposit?.accountName || currentMethod.accountName;
  const displayAccountNumber = pendingDeposit?.accountNumber || currentMethod.accountNumber;
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
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
          background: '#121A26',
          border: '1px solid #2A3B52',
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

        {/* Tab Switcher - Vibrant Active Highlight matching image 3 */}
        <div
          style={{
            display: 'flex',
            background: '#0D1522',
            margin: '12px 16px',
            borderRadius: 12,
            padding: 4,
            border: '1px solid #1E2D42',
          }}
        >
          {(['deposit', 'withdraw', 'history'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let activeBg = 'transparent';
            let activeShadow = 'none';
            if (isActive) {
              if (tab === 'deposit') {
                activeBg = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
                activeShadow = '0 3px 14px rgba(16, 185, 129, 0.45)';
              } else if (tab === 'withdraw') {
                activeBg = 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)';
                activeShadow = '0 3px 14px rgba(14, 165, 233, 0.45)';
              } else {
                activeBg = 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)';
                activeShadow = '0 3px 14px rgba(139, 92, 246, 0.45)';
              }
            }

            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  border: 'none',
                  borderRadius: 9,
                  background: activeBg,
                  boxShadow: activeShadow,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  fontSize: 12.5,
                  fontWeight: 800,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      display: 'inline-block',
                      boxShadow: '0 0 6px #FFFFFF',
                    }}
                  />
                )}
                {tab}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '0 16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* ─────────────────────────────────────────────────────────── */}
          {/* 1. DEPOSIT TAB                                              */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'deposit' && (
            pendingDeposit ? (
              pendingDeposit.proofSubmitted ? (
                /* Step 3: Transaction Details & Live Progress Stepper (matching shamo.bet true 1 & true 2) */
                <div>
                  {/* Top Transaction Summary Card */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #162436 0%, #101A27 100%)',
                      border: '1px solid #23354C',
                      borderRadius: 14,
                      padding: '16px',
                      marginBottom: 14,
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          TRANSACTION
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>
                          #{String(pendingDeposit.id || '26897388').slice(-8).toUpperCase()}
                        </span>
                      </div>

                      {/* Live Status Pill */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          background:
                            pendingDeposit.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : pendingDeposit.status === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                          color:
                            pendingDeposit.status === 'APPROVED'
                              ? '#10B981'
                              : pendingDeposit.status === 'REJECTED'
                                ? '#EF4444'
                                : '#F59E0B',
                          border: `1px solid ${pendingDeposit.status === 'APPROVED'
                            ? 'rgba(16, 185, 129, 0.35)'
                            : pendingDeposit.status === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.35)'
                              : 'rgba(245, 158, 11, 0.35)'
                            }`,
                        }}
                      >
                        {pendingDeposit.status === 'APPROVED' ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>APPROVED</span>
                          </>
                        ) : pendingDeposit.status === 'REJECTED' ? (
                          <>
                            <X size={12} />
                            <span>REJECTED</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} />
                            <span>VERIFICATION SENT</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                      DEPOSIT
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: '#10B981' }}>
                        +{depositAmount || pendingDeposit.displayAmount || '100'}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#E2E8F0' }}>ETB</span>
                    </div>

                    <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                      {currentMethod.name} • {formatTxDate(pendingDeposit.createdAt || new Date())}
                    </div>
                  </div>

                  {/* Vertical Progress Stepper */}
                  <div
                    style={{
                      background: '#152132',
                      border: '1px solid #1E2D42',
                      borderRadius: 14,
                      padding: '16px 14px',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                      PROGRESS
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {/* Step 1: Request Created */}
                      <div style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 22 }}>
                        <div style={{ position: 'absolute', left: 13, top: 26, bottom: 0, width: 2, background: '#10B981' }} />
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#10B981',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 2,
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.45)',
                          }}
                        >
                          <CreditCard size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>Request Created</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            Deposit request submitted • {formatTxDate(pendingDeposit.createdAt || new Date())}
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Processing */}
                      <div style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 22 }}>
                        <div style={{ position: 'absolute', left: 13, top: 26, bottom: 0, width: 2, background: '#10B981' }} />
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#10B981',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 2,
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.45)',
                          }}
                        >
                          <RefreshCw size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>Processing</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            Your request is being handled
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Payment Verification */}
                      <div style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 22 }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 13,
                            top: 26,
                            bottom: 0,
                            width: 2,
                            background:
                              pendingDeposit.status === 'APPROVED'
                                ? '#10B981'
                                : 'linear-gradient(180deg, #10B981 0%, #F59E0B 100%)',
                          }}
                        />
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#10B981',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 2,
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.45)',
                          }}
                        >
                          <FileCheck size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>Payment Verification</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            Verification sent • Ref: <span style={{ color: '#10B981', fontWeight: 800 }}>{pendingDeposit.transactionReference}</span>
                          </div>
                        </div>
                      </div>

                      {/* Step 4: Awaiting Confirmation */}
                      <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background:
                              pendingDeposit.status === 'APPROVED'
                                ? '#10B981'
                                : pendingDeposit.status === 'REJECTED'
                                  ? '#EF4444'
                                  : 'rgba(245, 158, 11, 0.2)',
                            border: `2px solid ${pendingDeposit.status === 'APPROVED'
                              ? '#10B981'
                              : pendingDeposit.status === 'REJECTED'
                                ? '#EF4444'
                                : '#F59E0B'
                              }`,
                            color:
                              pendingDeposit.status === 'APPROVED' || pendingDeposit.status === 'REJECTED'
                                ? '#FFFFFF'
                                : '#F59E0B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 2,
                            boxShadow:
                              pendingDeposit.status === 'APPROVED'
                                ? '0 0 12px rgba(16, 185, 129, 0.5)'
                                : '0 0 12px rgba(245, 158, 11, 0.4)',
                          }}
                        >
                          {pendingDeposit.status === 'APPROVED' ? (
                            <Check size={14} strokeWidth={3} />
                          ) : pendingDeposit.status === 'REJECTED' ? (
                            <X size={14} strokeWidth={3} />
                          ) : (
                            <Clock size={14} strokeWidth={2.5} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color:
                                pendingDeposit.status === 'APPROVED'
                                  ? '#10B981'
                                  : pendingDeposit.status === 'REJECTED'
                                    ? '#EF4444'
                                    : '#F59E0B',
                            }}
                          >
                            {pendingDeposit.status === 'APPROVED'
                              ? 'Confirmed & Credited'
                              : pendingDeposit.status === 'REJECTED'
                                ? 'Deposit Rejected'
                                : 'Awaiting Confirmation'}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 1.4 }}>
                            {pendingDeposit.status === 'APPROVED'
                              ? 'Your balance has been updated with the deposit amount.'
                              : pendingDeposit.status === 'REJECTED'
                                ? pendingDeposit.adminNote || 'The transaction could not be verified. Please contact support.'
                                : 'Waiting for confirmation from payment provider or agent. Live-monitoring every 3s...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pay To Details Summary Card */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid #1E293B',
                      borderRadius: 12,
                      padding: '12px 14px',
                      marginBottom: 14,
                      fontSize: 11.5,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                      PAY TO DETAILS
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#94A3B8' }}>Method</span>
                      <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{currentMethod.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#94A3B8' }}>Account Name</span>
                      <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{displayAccountName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Account Number</span>
                      <span style={{ color: '#10B981', fontWeight: 800 }}>{displayAccountNumber}</span>
                    </div>
                  </div>

                  {/* Having an issue? Contact Agent Box */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.45)',
                      border: '1px solid #23354C',
                      borderRadius: 12,
                      padding: '12px 14px',
                      marginBottom: 16,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: '#94A3B8', marginBottom: 10 }}>
                      Having an issue? Contact our 24/7 payment agent:
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => window.open('https://t.me/Fastkenosupportteam', '_blank', 'noopener,noreferrer')}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          background: 'rgba(36, 161, 222, 0.15)',
                          border: '1px solid rgba(36, 161, 222, 0.4)',
                          color: '#38BDF8',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <Send size={13} />
                        <span>Telegram</span>
                      </button>
                      {/* <button
                        type="button"
                        onClick={() => window.open('tel:+251930547684')}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34D399',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <Phone size={13} />
                        <span>Call Agent</span>
                      </button> */}
                    </div>
                  </div>

                  {/* Action Buttons: New Deposit & View History */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDeposit(null);
                        setTxRef('');
                      }}
                      style={{
                        flex: 1,
                        padding: '11px 0',
                        borderRadius: 10,
                        background: 'transparent',
                        border: '1.5px solid #334155',
                        color: '#E2E8F0',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      New Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('history');
                      }}
                      style={{
                        flex: 1,
                        padding: '11px 0',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 3px 12px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      View History
                    </button>
                  </div>
                </div>
              ) : (
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
                            {pendingDeposit?.displayAmount || (pendingDeposit?.amountMinor ? (Number(pendingDeposit.amountMinor) / 100).toString() : depositAmount)} ETB <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>via {currentMethod.name}</span>
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
                      background: '#152132',
                      border: '1px solid #1E293B',
                      borderRadius: 12,
                      padding: '12px 14px',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>Account Name:</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC' }}>
                        {displayAccountName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>Account Number:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: '#10B981', letterSpacing: '0.04em' }}>
                          {displayAccountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(displayAccountNumber)}
                          style={{
                            background: '#28374E',
                            border: '1.5px solid #2D425E',
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
                          background: '#28374E',
                          border: '1.5px solid #2D425E',
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
                      placeholder={currentMethod.hint ? `${currentMethod.hint} or paste full SMS` : 'e.g. CI94719082 or paste full SMS'}
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#152132',
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
                      onClick={() => {
                        if (pendingDeposit?.id) {
                          setConfirmCancelRequest(pendingDeposit);
                        } else {
                          setPendingDeposit(null);
                          setTxRef('');
                        }
                      }}
                      disabled={cancelRequestMutation.isPending}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1.5px solid rgba(239, 68, 68, 0.3)',
                        color: '#F87171',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {cancelRequestMutation.isPending ? 'Cancelling...' : 'Cancel Deposit'}
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
              )
            ) : (
              /* Step 1: Deposit Method & Amount Selection */
              <div>
                {/* Payment Methods - Vertical List layout matching reference */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {dynamicPaymentMethods.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          if (method.id === 'mpesa') {
                            toastInfo('M-Pesa (Safaricom)', 'We will integrate Safaricom M-Pesa soon! Please use Telebirr or CBE for now.');
                            return;
                          }
                          setSelectedMethod(method.id);
                        }}
                        style={{
                          width: '100%',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : '#162030',
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
                              backgroundColor: '#28374E',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                      Deposit Amount (ETB)
                    </label>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>
                      Min: 50 ETB
                    </span>
                  </div>
                  <input
                    type="number"
                    min="50"
                    placeholder="Min 50 ETB"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#152132',
                      border: Boolean(depositAmount && parseFloat(depositAmount) < 50) ? '1.5px solid #EF4444' : '1.5px solid #2D425E',
                      color: '#F8FAFC',
                      fontSize: 16,
                      fontWeight: 800,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {Boolean(depositAmount && parseFloat(depositAmount) < 50) && (
                    <div style={{ fontSize: 11.5, color: '#EF4444', marginTop: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>⚠️ Minimum deposit amount is 50 ETB</span>
                    </div>
                  )}
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
                        background: depositAmount === amt ? '#28374E' : '#162030',
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
                  disabled={initDepositMutation.isPending || !depositAmount || parseFloat(depositAmount) < 50 || parseFloat(depositAmount) > 10000}
                  onClick={() => initDepositMutation.mutate()}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 10,
                    background:
                      initDepositMutation.isPending || !depositAmount || parseFloat(depositAmount) < 50
                        ? '#28374E'
                        : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    color:
                      initDepositMutation.isPending || !depositAmount || parseFloat(depositAmount) < 50
                        ? '#64748B'
                        : '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor:
                      initDepositMutation.isPending || !depositAmount || parseFloat(depositAmount) < 50
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {initDepositMutation.isPending
                    ? 'Initiating...'
                    : depositAmount && parseFloat(depositAmount) < 50
                      ? 'Minimum Deposit is 50 ETB'
                      : 'Next: Payment Details'}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {dynamicPaymentMethods.filter((m) => m.id !== 'other_bank').map((method) => {
                    const isSelected = withdrawMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          if (method.id === 'mpesa') {
                            toastInfo('M-Pesa (Safaricom)', 'We will integrate Safaricom M-Pesa soon! Please use Telebirr or CBE for now.');
                            return;
                          }
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
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : '#162030',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                    Withdraw Amount (ETB)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>
                    Min: 100 ETB
                  </span>
                </div>
                <input
                  type="number"
                  min="100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Min 100 ETB"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#152132',
                    border: Boolean(withdrawAmount && parseFloat(withdrawAmount) < 100) ? '1.5px solid #EF4444' : '1.5px solid #2D425E',
                    color: '#F8FAFC',
                    fontSize: 16,
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {Boolean(withdrawAmount && parseFloat(withdrawAmount) < 100) && (
                  <div style={{ fontSize: 11.5, color: '#EF4444', marginTop: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>⚠️ Minimum withdrawal amount is 100 ETB</span>
                  </div>
                )}
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
                        background: isSelected ? '#28374E' : '#162030',
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
                    background: '#152132',
                    border: '1.5px solid #2D425E',
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
                    background: '#152132',
                    border: '1.5px solid #2D425E',
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
                disabled={withdrawMutation.isPending || parseFloat(withdrawAmount) < 100 || parseFloat(withdrawAmount) > 10000 || parseFloat(withdrawAmount) > parseFloat(balance)}
                onClick={() => withdrawMutation.mutate()}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 10,
                  background:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) < 100 || parseFloat(withdrawAmount) > 10000 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? '#28374E'
                      : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) < 100 || parseFloat(withdrawAmount) > 10000 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? '#64748B'
                      : '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) < 100 || parseFloat(withdrawAmount) > 10000 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    withdrawMutation.isPending || parseFloat(withdrawAmount) < 100 || parseFloat(withdrawAmount) > 10000 || parseFloat(withdrawAmount) > parseFloat(balance)
                      ? 'none'
                      : '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                {withdrawMutation.isPending
                  ? 'Submitting Request...'
                  : parseFloat(withdrawAmount) < 100
                    ? 'Minimum Payout is 100 ETB'
                    : `Request Payout (${withdrawAmount || '0'} ETB)`}
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 3. TRANSACTION HISTORY TAB                                   */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div>
              {/* Header: Title & Manual Refresh */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  padding: '0 2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC' }}>
                    Transaction History
                  </span>
                  {Array.isArray(paymentRequests) && paymentRequests.length > 0 && (
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.18)',
                        color: '#10B981',
                        fontSize: 10.5,
                        padding: '1px 7px',
                        borderRadius: 10,
                        fontWeight: 800,
                      }}
                    >
                      {paymentRequests.length}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => refetchPaymentRequests()}
                  disabled={isPaymentRequestsFetching}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    padding: '4px 6px',
                    fontWeight: 700,
                  }}
                  title="Refresh Transactions"
                >
                  <RefreshCw
                    size={12}
                    className={isPaymentRequestsFetching ? 'spin-animation' : ''}
                  />
                  <span>{isPaymentRequestsFetching ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Transactions List / Loading / Error */}
              {isPaymentRequestsLoading && !paymentRequests ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 0',
                    gap: 12,
                  }}
                >
                  <Loader2 size={26} color="#10B981" className="spin-animation" />
                  <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>
                    Loading transactions...
                  </div>
                </div>
              ) : isPaymentRequestsError ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#EF4444',
                    padding: '28px 16px',
                    background: '#152132',
                    borderRadius: 12,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <AlertTriangle size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                    Failed to Load Transactions
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>
                    Please check your connection and try again.
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchPaymentRequests()}
                    style={{
                      background: '#28374E',
                      border: '1px solid #3B4E68',
                      borderRadius: 8,
                      padding: '6px 14px',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : Array.isArray(paymentRequests) && paymentRequests.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paymentRequests.map((req: any) => {
                    const isDeposit = req.requestType === 'DEPOSIT';
                    const amount = (Number(req.amountMinor) / 100).toFixed(2);
                    const status = (req.status || 'PENDING').toUpperCase();

                    return (
                      <div
                        key={req.id}
                        style={{
                          background: '#152132',
                          border: '1px solid #1E293B',
                          borderRadius: 10,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        {/* Left icon & details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: isDeposit
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isDeposit ? '#10B981' : '#F59E0B',
                              flexShrink: 0,
                            }}
                          >
                            {isDeposit ? (
                              <ArrowDownLeft size={18} strokeWidth={2.8} />
                            ) : (
                              <ArrowUpRight size={18} strokeWidth={2.8} />
                            )}
                          </div>

                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: '#F8FAFC',
                                }}
                              >
                                {isDeposit ? 'Deposit' : 'Withdrawal'}
                              </span>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: '#94A3B8',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  textTransform: 'capitalize',
                                  fontWeight: 600,
                                }}
                              >
                                {req.paymentMethod || 'Telebirr'}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: '#64748B',
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                              }}
                            >
                              <span>{formatTxDate(req.createdAt)}</span>
                              {req.accountNumber && (
                                <span>• Acc: {req.accountNumber}</span>
                              )}
                            </div>

                            {req.transactionReference && (
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: '#10B981',
                                  marginTop: 2,
                                  fontWeight: 700,
                                }}
                              >
                                Ref: {req.transactionReference}
                              </div>
                            )}

                            {req.adminNote &&
                              (status === 'REJECTED' ||
                                status === 'CANCELLED' ||
                                status === 'EXPIRED') && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color:
                                      status === 'REJECTED' ? '#EF4444' : '#94A3B8',
                                    marginTop: 3,
                                  }}
                                >
                                  Note: {req.adminNote}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Right: Amount & Status Badge */}
                        <div
                          style={{
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: isDeposit ? '#10B981' : '#F8FAFC',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {isDeposit ? `+${amount}` : `-${amount}`}{' '}
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#94A3B8',
                              }}
                            >
                              ETB
                            </span>
                          </div>

                          {/* Status Badge: PENDING or APPROVED or REJECTED */}
                          {status === 'PENDING' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  color: '#F59E0B',
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                <Clock size={10} strokeWidth={2.8} /> Pending
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelRequest(req)}
                                disabled={cancelRequestMutation.isPending}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  color: '#F87171',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {status === 'CANCELLED' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                background: 'rgba(148, 163, 184, 0.15)',
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                color: '#94A3B8',
                                padding: '2px 7px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <X size={10} strokeWidth={3} /> Cancelled
                            </span>
                          )}

                          {status === 'EXPIRED' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                background: 'rgba(244, 63, 94, 0.15)',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                color: '#FB7185',
                                padding: '2px 7px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <Clock size={10} strokeWidth={2.8} /> Expired
                            </span>
                          )}

                          {status === 'APPROVED' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#10B981',
                                padding: '2px 7px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <Check size={10} strokeWidth={3} /> Approved
                            </span>
                          )}

                          {status === 'REJECTED' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#EF4444',
                                padding: '2px 7px',
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <X size={10} strokeWidth={3} /> Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: 13,
                    padding: '30px 16px',
                    background: '#152132',
                    borderRadius: 12,
                    border: '1px solid #1E293B',
                  }}
                >
                  <div style={{ marginBottom: 8, fontSize: 24 }}>💳</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#94A3B8',
                      marginBottom: 4,
                    }}
                  >
                    No Transactions Yet
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#64748B',
                      marginBottom: 16,
                      maxWidth: 240,
                      margin: '0 auto 16px',
                    }}
                  >
                    You have not made any deposits or withdrawals yet.
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deposit')}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Make a Deposit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Professional Custom In-App Confirmation Dialog (replaces browser confirm) */}
        {confirmCancelRequest && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(5, 10, 18, 0.88)',
              backdropFilter: 'blur(8px)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              style={{
                background: '#131D2D',
                border: '1.5px solid #28374E',
                borderRadius: 16,
                padding: '24px 20px',
                width: '100%',
                maxWidth: 360,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <AlertTriangle size={24} />
              </div>

              <div style={{ fontSize: 16, fontWeight: 900, color: '#F8FAFC', marginBottom: 8 }}>
                Cancel {confirmCancelRequest.requestType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}?
              </div>

              <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5, marginBottom: 18 }}>
                {confirmCancelRequest.requestType === 'WITHDRAWAL' ? (
                  <>
                    Are you sure you want to cancel this withdrawal of{' '}
                    <strong style={{ color: '#F8FAFC' }}>
                      {(Number(confirmCancelRequest.amountMinor) / 100).toFixed(2)} ETB
                    </strong>
                    ? Locked funds will be refunded to your available balance immediately.
                  </>
                ) : (
                  <>
                    Are you sure you want to cancel this pending deposit of{' '}
                    <strong style={{ color: '#F8FAFC' }}>
                      {(Number(confirmCancelRequest.amountMinor) / 100).toFixed(2)} ETB
                    </strong>
                    ?
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConfirmCancelRequest(null)}
                  disabled={cancelRequestMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    borderRadius: 10,
                    background: '#1E293B',
                    border: '1px solid #334155',
                    color: '#94A3B8',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await cancelRequestMutation.mutateAsync(confirmCancelRequest.id);
                    setConfirmCancelRequest(null);
                  }}
                  disabled={cancelRequestMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: cancelRequestMutation.isPending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
                  }}
                >
                  {cancelRequestMutation.isPending ? (
                    <Loader2 size={16} className="spin-animation" />
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
