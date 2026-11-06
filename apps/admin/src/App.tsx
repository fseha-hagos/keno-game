import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  BarChart3,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Lock,
  User,
  Smartphone,
  Radio,
  FileText,
  RefreshCw,
  Sparkles,
  Link2,
  Unlink2,
  Eye,
  EyeOff,
  History,
  Copy,
  Check,
  Send,
  AlertCircle,
  HelpCircle,
  Users,
  UserCheck,
  UserX,
  Power,
  KeyRound,
  Calendar,
  Shield,
  Award,
  Search,
  Filter,
  Menu,
  X,
} from 'lucide-react';
import { calculateOverallRtp, DEFAULT_96_PAYTABLE_ENTRIES, getPaytableForRtp } from '@keno/game-math';

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:3000`
    : 'http://192.168.43.149:3000');

function formatAmount(minor: string | number) {
  return (Number(minor) / 100).toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ETB';
}

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function extractUrl(text?: string): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[.,;)]+$/, '') : null;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#713F12', text: '#FDE68A' },
    APPROVED: { bg: '#064E3B', text: '#34D399' },
    REJECTED: { bg: '#7F1D1D', text: '#FCA5A5' },
    CANCELLED: { bg: '#334155', text: '#94A3B8' },
    EXPIRED: { bg: '#881337', text: '#FDA4AF' },
    ACTIVE: { bg: '#064E3B', text: '#34D399' },
    FROZEN: { bg: '#1E3A5F', text: '#93C5FD' },
    SUSPENDED: { bg: '#7F1D1D', text: '#FCA5A5' },
    SETTLED: { bg: '#064E3B', text: '#34D399' },
    OPEN: { bg: '#1E3A5F', text: '#93C5FD' },
    DRAWN: { bg: '#4C1D95', text: '#C4B5FD' },
  };
  const c = colors[status] || { bg: '#1E293B', text: '#94A3B8' };
  return (
    <span style={{
      backgroundColor: c.bg, color: c.text,
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 700,
    }}>
      {status}
    </span>
  );
}

/* ─────────────────────── ADMIN LOGIN ─────────────────────── */

function AdminLogin({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpSessionId, setOtpSessionId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(45);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (resendCountdown > 0 && step === 'otp') {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/login`, {
        phone: phone.trim(),
        password,
      });

      // Strict Two-Step Verification for all administrators via Telegram
      if (res.data?.requireOtp) {
        setOtpSessionId(res.data.otpSessionId);
        setOtpMessage(res.data.message || 'OTP sent to Telegram.');
        setStep('otp');
        setOtp('');
        setError('');
        setResendCountdown(45);
        setLoading(false);
        return;
      }

      const { tokens, user } = res.data;

      // Verify user has any authorized admin role
      const adminRoles = [
        'CREATOR',
        'BUSINESS_OWNER',
        'OPERATOR',
        'SUPER_ADMIN',
        'FINANCE',
        'GAME_OPERATOR',
      ];
      const hasAdminRole = user.roles?.some((r: string) => adminRoles.includes(r));
      if (!hasAdminRole) {
        setError('Access denied: This account has PLAYER role only. Use an admin account to access the Admin Console.');
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem('admin_token', tokens.accessToken);
      localStorage.setItem('admin_refresh_token', tokens.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(user));
      onLogin(tokens.accessToken, user);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/admin/verify-otp`, {
        otpSessionId,
        otp: otp.trim(),
      });
      const { tokens, user } = res.data;
      localStorage.setItem('admin_token', tokens.accessToken);
      localStorage.setItem('admin_refresh_token', tokens.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(user));
      onLogin(tokens.accessToken, user);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'OTP verification failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/admin/resend-otp`, {
        otpSessionId,
      });
      setOtpMessage(res.data?.message || 'New OTP sent to Telegram.');
      setResendCountdown(45);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setPhone(u);
    setPassword(p);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#0A0F1D', padding: '20px',
    }}>
      {step === 'credentials' ? (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#0F172A', padding: '44px 38px', borderRadius: '20px',
          border: '1px solid #1E293B', width: '440px', maxWidth: '95vw',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <ShieldCheck size={32} color="#fff" />
            </div>
            <h1 style={{ color: '#10B981', fontSize: '22px', fontWeight: 900, letterSpacing: '1px' }}>
              KENO ADMIN CONSOLE
            </h1>
            <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
              Multi-Tier Role Authorization
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid #EF4444',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
              color: '#FCA5A5', fontSize: '13px', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {/* Phone/Username */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              PHONE NUMBER OR USERNAME
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number or username"
                required
                style={{
                  width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155',
                  borderRadius: '10px', padding: '14px 14px 14px 40px', color: '#F8FAFC',
                  fontSize: '14px', fontWeight: 600, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10B981')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155',
                  borderRadius: '10px', padding: '14px 14px 14px 40px', color: '#F8FAFC',
                  fontSize: '14px', fontWeight: 600, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10B981')}
                onBlur={(e) => (e.target.style.borderColor = '#334155')}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#334155' : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: 900,
              letterSpacing: '0.5px', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN TO CONSOLE'}
          </button>
        </form>
      ) : (
        /* OTP Step: Strict Telegram 2-Factor Authentication */
        <form onSubmit={handleVerifyOtp} style={{
          backgroundColor: '#0F172A', padding: '44px 38px', borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.4)', width: '440px', maxWidth: '95vw',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 35px rgba(16, 185, 129, 0.15)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #24A1DE 0%, #10B981 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px rgba(36, 161, 222, 0.35)',
            }}>
              <KeyRound size={32} color="#fff" />
            </div>
            <h1 style={{ color: '#10B981', fontSize: '20px', fontWeight: 900, letterSpacing: '0.5px' }}>
              TELEGRAM 2-FACTOR AUTH
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '12.5px', marginTop: '6px', lineHeight: 1.4 }}>
              {otpMessage || `Enter the 6-digit security OTP sent to Telegram for admin ${phone}`}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid #EF4444',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
              color: '#FCA5A5', fontSize: '13px', fontWeight: 600, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {/* 6-Digit OTP Input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: '8px', textAlign: 'center' }}>
              ENTER 6-DIGIT SECURITY CODE
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              autoFocus
              required
              style={{
                width: '100%', backgroundColor: '#1E293B', border: '1px solid rgba(16, 185, 129, 0.5)',
                borderRadius: '12px', padding: '16px', color: '#34D399',
                fontSize: '28px', fontWeight: 900, textAlign: 'center', letterSpacing: '12px',
                outline: 'none', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                fontFamily: 'monospace', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#34D399')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(16, 185, 129, 0.5)')}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            style={{
              width: '100%', padding: '14px',
              background: loading || otp.length < 6 ? '#334155' : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: 900,
              letterSpacing: '0.5px', cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: otp.length === 6 ? '0 4px 18px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            {loading ? 'VERIFYING SECURITY CODE...' : 'VERIFY & ENTER CONSOLE'}
          </button>

          {/* Resend & Back controls */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={resendCountdown > 0 || resendLoading}
              onClick={handleResendOtp}
              style={{
                background: 'transparent', border: 'none',
                color: resendCountdown > 0 ? '#64748B' : '#38BDF8',
                fontSize: '12px', fontWeight: 700, cursor: resendCountdown > 0 ? 'default' : 'pointer',
                textDecoration: resendCountdown > 0 ? 'none' : 'underline',
              }}
            >
              {resendLoading ? 'Sending new code...' : resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code via Telegram'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setError('');
              }}
              style={{
                background: 'transparent', border: 'none',
                color: '#94A3B8', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', padding: '4px',
              }}
            >
              ← Back to login
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─────────────────────── MAIN APP ─────────────────────── */

export default function App() {
  type TabType = 'overview' | 'payments' | 'audits' | 'staff' | 'players' | 'rtp' | 'system' | 'rounds' | 'paytable';
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth state
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_user') || 'null');
    } catch {
      return null;
    }
  });

  // Role booleans
  const isCreator = Boolean(adminUser?.roles?.some((r: string) => ['CREATOR', 'SUPER_ADMIN'].includes(r)));
  const isOwner = Boolean(adminUser?.roles?.some((r: string) => r === 'BUSINESS_OWNER'));
  const isOperator = Boolean(
    !isCreator && !isOwner && adminUser?.roles?.some((r: string) => ['OPERATOR', 'GAME_OPERATOR', 'FINANCE'].includes(r))
  );

  // Data states
  const [rounds, setRounds] = useState<any[]>([]);
  const [mathAnalysis, setMathAnalysis] = useState<any>(null);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'>('PENDING');
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
  const [filterVerification, setFilterVerification] = useState<'ALL' | 'AUTO' | 'MANUAL'>('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [expandedAudit, setExpandedAudit] = useState<Record<string, boolean>>({});
  const toggleAudit = (id: string) => setExpandedAudit((prev) => ({ ...prev, [id]: !prev[id] }));
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Payments sub-navigation
  const [paymentsSubTab, setPaymentsSubTab] = useState<'queue' | 'evidence' | 'simulator' | 'guide' | 'audit'>('queue');
  const [showRawEvidence, setShowRawEvidence] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [linkingDepositId, setLinkingDepositId] = useState<string | null>(null);

  // Simulation form state
  const [simProvider, setSimProvider] = useState<'telebirr' | 'mpesa' | 'cbe_birr' | 'cbe_bank' | 'other_bank'>('telebirr');
  const [simAmount, setSimAmount] = useState('100');
  const [simPhone, setSimPhone] = useState('0912345678');
  const [simName, setSimName] = useState('Abebe Kebede');
  const [simRef, setSimRef] = useState('CI94719082');
  const [simCustomText, setSimCustomText] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // WITHDRAWAL REVIEW MODAL & FULL USER TRANSACTION HISTORY
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState<any | null>(null);
  const [userFinancialHistory, setUserFinancialHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [reviewNote, setReviewNote] = useState<string>('');

  // SYSTEM EMERGENCY SWITCH STATE
  const [systemStatus, setSystemStatus] = useState<{ isSystemActive: boolean; maintenanceMessage: string; lastToggledBy?: string; lastToggledAt?: string }>({
    isSystemActive: true,
    maintenanceMessage: '',
  });
  const [systemToggling, setSystemToggling] = useState(false);

  // PROFIT AUDITS STATE
  const [auditPeriod, setAuditPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [profitAuditData, setProfitAuditData] = useState<any | null>(null);
  const [profitAuditLoading, setProfitAuditLoading] = useState(false);

  // STAFF MANAGEMENT STATE
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffViewMode, setStaffViewMode] = useState<'agents' | 'management'>('agents');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'OPERATOR' | 'BUSINESS_OWNER' | 'CREATOR'>('OPERATOR');
  const [staffActionError, setStaffActionError] = useState<string | null>(null);

  // PLAYERS MANAGEMENT STATE
  const [playerList, setPlayerList] = useState<any[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerStatusFilter, setPlayerStatusFilter] = useState('ALL');
  const [playersLoading, setPlayersLoading] = useState(false);

  // CHANGE PASSWORD MODAL
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // RTP CONFIG STATE
  const [currentPlatformRtp, setCurrentPlatformRtp] = useState<number>(96.0);
  const [targetRtpInput, setTargetRtpInput] = useState<number>(96.0);
  const [rtpSaving, setRtpSaving] = useState(false);

  // AGENT CASHIER & OPERATOR FLOAT STATE
  const [agentFloatData, setAgentFloatData] = useState<{
    floatBalanceETB: number;
    floatBalanceMinor: string;
    telebirrNumber: string;
    telebirrName: string;
    cbeNumber: string;
    cbeName: string;
    totalDepositsApprovedETB?: number;
    totalWithdrawalsApprovedETB?: number;
  } | null>(null);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [staffSubTab, setStaffSubTab] = useState<'agents' | 'staff'>('agents');
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState<any | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('20000');
  const [topUpNote, setTopUpNote] = useState('');
  const [topUpSaving, setTopUpSaving] = useState(false);

  // New Agent Form
  const [agentForm, setAgentForm] = useState({
    phone: '',
    username: '',
    password: '',
    initialFloatETB: '20000',
    telebirrNumber: '',
    telebirrName: '',
    cbeNumber: '',
    cbeName: '',
  });
  const [agentSaving, setAgentSaving] = useState(false);

  const handleLogin = (token: string, user: any) => {
    setAdminToken(token);
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setPaymentRequests([]);
  };

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  const fetchAgentFloat = () => {
    if (!adminToken || !isOperator) return;
    axios.get(`${API_URL}/api/v1/admin/agents/me/float`, { headers: authHeaders })
      .then((res) => {
        if (res.data) setAgentFloatData(res.data);
      })
      .catch(() => {});
  };

  const fetchAgentsList = () => {
    if (!adminToken || (!isCreator && !isOwner)) return;
    setAgentsLoading(true);
    axios.get(`${API_URL}/api/v1/admin/agents`, { headers: authHeaders })
      .then((res) => {
        if (Array.isArray(res.data)) setAgentsList(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setAgentsLoading(false));
  };

  const fetchData = () => {
    if (!adminToken) return;
    if (isOperator) {
      fetchAgentFloat();
      // Operators strictly load their own assigned payment requests only
      axios.get(`${API_URL}/api/v1/wallet/admin/payment-requests`, { headers: authHeaders })
        .then((res) => {
          setPaymentRequests(res.data);
          setFetchError(null);
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            handleLogout();
          } else if (err.response?.status === 403) {
            setFetchError('Access denied.');
          } else {
            setFetchError(`Failed to load requests: ${err.message}`);
          }
        });
      return; // Stop here: do NOT fetch system audits, rounds, MacroDroid evidence, or server status
    }
    // Authoritative platform RTP configuration (Creator authority)
    if (isCreator) {
      axios.get(`${API_URL}/api/v1/admin/system/rtp`, { headers: authHeaders })
        .then((res) => {
          if (res.data) {
            const serverRtp = Number(res.data.targetRtp) || 96.0;
            setCurrentPlatformRtp(serverRtp);
            if (activeTab !== 'rtp' && !rtpSaving) {
              setTargetRtpInput(serverRtp);
              setMathAnalysis(res.data);
            }
          }
        })
        .catch(() => {
          if (!mathAnalysis) {
            setMathAnalysis(calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10));
          }
        });
    } else if (!mathAnalysis) {
      setMathAnalysis(calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10));
    }

    axios.get(`${API_URL}/api/v1/keno/rounds/recent`)
      .then((res) => setRounds(res.data))
      .catch(() => { });

    // Payment requests
    axios.get(`${API_URL}/api/v1/wallet/admin/payment-requests`, { headers: authHeaders })
      .then((res) => {
        setPaymentRequests(res.data);
        setFetchError(null);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          handleLogout();
        } else if (err.response?.status === 403) {
          setFetchError('Access denied. Your account does not have admin privileges.');
        } else {
          setFetchError(`Failed to load payment requests: ${err.message}`);
        }
      });

    // MacroDroid evidence
    axios.get(`${API_URL}/api/v1/payments/admin/evidence?limit=100`, { headers: authHeaders })
      .then((res) => setEvidenceList(res.data))
      .catch(() => { });

    // Audit logs
    axios.get(`${API_URL}/api/v1/audit/recent?limit=50`, { headers: authHeaders })
      .then((res) => setAuditLogs(res.data))
      .catch(() => { });

    // System status
    axios.get(`${API_URL}/api/v1/admin/system/status`, { headers: authHeaders })
      .then((res) => setSystemStatus(res.data))
      .catch(() => { });
  };

  useEffect(() => {
    if (!adminToken) return;
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [adminToken]);

  // Operator restriction: ONLY allowed to view payments tab
  useEffect(() => {
    if (isOperator && activeTab !== 'payments') {
      setActiveTab('payments');
    }
    if (isOperator && adminToken) {
      fetchAgentFloat();
    }
  }, [isOperator, activeTab, adminToken]);

  // Load agents when activeTab === 'staff'
  useEffect(() => {
    if (activeTab === 'staff' && (isCreator || isOwner) && adminToken) {
      fetchAgentsList();
    }
  }, [activeTab, adminToken]);

  // Sync platform RTP when switching to 'rtp' tab
  useEffect(() => {
    if (activeTab === 'rtp' && adminToken && isCreator) {
      axios.get(`${API_URL}/api/v1/admin/system/rtp`, { headers: authHeaders })
        .then((res) => {
          if (res.data) {
            const serverRtp = Number(res.data.targetRtp) || 96.0;
            setCurrentPlatformRtp(serverRtp);
            setTargetRtpInput(serverRtp);
            setMathAnalysis(res.data);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // Load audit data when activeTab === 'audits' or auditPeriod changes
  useEffect(() => {
    if (!adminToken) return;
    if (activeTab === 'audits') {
      setProfitAuditLoading(true);
      axios.get(`${API_URL}/api/v1/admin/audits/profit?period=${auditPeriod}`, { headers: authHeaders })
        .then((res) => setProfitAuditData(res.data))
        .catch((err) => {
          console.error(err);
        })
        .finally(() => setProfitAuditLoading(false));
    }
  }, [adminToken, activeTab, auditPeriod]);

  // Load staff when activeTab === 'staff'
  useEffect(() => {
    if (!adminToken) return;
    if (activeTab === 'staff') {
      setStaffLoading(true);
      axios.get(`${API_URL}/api/v1/admin/staff`, { headers: authHeaders })
        .then((res) => setStaffList(res.data))
        .catch((err) => console.error(err))
        .finally(() => setStaffLoading(false));
    }
  }, [adminToken, activeTab]);

  // Load players when activeTab === 'players' or filter changes
  useEffect(() => {
    if (!adminToken) return;
    if (activeTab === 'players') {
      setPlayersLoading(true);
      const params = new URLSearchParams();
      if (playerSearch) params.set('search', playerSearch);
      if (playerStatusFilter !== 'ALL') params.set('status', playerStatusFilter);
      axios.get(`${API_URL}/api/v1/admin/players?${params.toString()}`, { headers: authHeaders })
        .then((res) => setPlayerList(res.data))
        .catch((err) => console.error(err))
        .finally(() => setPlayersLoading(false));
    }
  }, [adminToken, activeTab, playerSearch, playerStatusFilter]);

  /* ────────────────── AGENT CASHIER HANDLERS ────────────────── */

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.username || !agentForm.phone || !agentForm.password) {
      alert('Please provide username, phone number, and password');
      return;
    }
    setAgentSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/v1/admin/agents`,
        {
          username: agentForm.username.trim(),
          phone: agentForm.phone.trim(),
          password: agentForm.password,
          initialFloatETB: Number(agentForm.initialFloatETB) || 0,
          telebirrNumber: agentForm.telebirrNumber.trim() || agentForm.phone.trim(),
          telebirrName: agentForm.telebirrName.trim() || agentForm.username.trim(),
          cbeNumber: agentForm.cbeNumber.trim() || undefined,
          cbeName: agentForm.cbeName.trim() || undefined,
        },
        { headers: authHeaders }
      );
      alert(`Agent ${agentForm.username} successfully registered with initial float of ${agentForm.initialFloatETB} ETB!`);
      setShowAddAgentModal(false);
      setAgentForm({
        phone: '',
        username: '',
        password: '',
        initialFloatETB: '20000',
        telebirrNumber: '',
        telebirrName: '',
        cbeNumber: '',
        cbeName: '',
      });
      fetchAgentsList();
    } catch (err: any) {
      alert(`Failed to register agent: ${err.response?.data?.message || err.message}`);
    } finally {
      setAgentSaving(false);
    }
  };

  const handleTopUpFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTopUpModal) return;
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive ETB amount');
      return;
    }
    setTopUpSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/v1/admin/agents/${showTopUpModal.userId}/topup`,
        { amountETB: amountNum, note: topUpNote.trim() || undefined },
        { headers: authHeaders }
      );
      alert(`Successfully topped up ${amountNum.toLocaleString()} ETB float for ${showTopUpModal.username}!`);
      setShowTopUpModal(null);
      setTopUpAmount('20000');
      setTopUpNote('');
      fetchAgentsList();
    } catch (err: any) {
      alert(`Top up failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setTopUpSaving(false);
    }
  };

  /* ────────────────── ACTIONS & HANDLERS ────────────────── */

  const handleAction = async (
    id: string,
    type: 'deposit' | 'withdrawal',
    action: 'approve' | 'reject',
    customNote?: string
  ) => {
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      const url = `${API_URL}/api/v1/wallet/admin/${type}/${id}/${action}`;
      await axios.patch(url, { adminNote: customNote || actionNote[id] || undefined }, { headers: authHeaders });
      if (selectedWithdrawalRequest?.id === id) {
        setSelectedWithdrawalRequest(null);
        setUserFinancialHistory(null);
      }
      fetchData();
    } catch (err: any) {
      alert(`Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  // Inspect withdrawal & load user full transaction history
  const handleInspectWithdrawal = async (request: any) => {
    setSelectedWithdrawalRequest(request);
    setReviewNote(actionNote[request.id] || '');
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/v1/admin/users/${request.userId}/financial-history`, {
        headers: authHeaders,
      });
      setUserFinancialHistory(res.data);
    } catch (err: any) {
      alert(`Failed to load player history: ${err.response?.data?.message || err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Toggle Player Self-Exclusion (Stop or Apply)
  const handleToggleSelfExclusion = async (userId: string, isExcluded: boolean) => {
    const action = isExcluded ? 'STOP' : 'EXCLUDE';
    const confirmMsg = isExcluded
      ? 'STOP self-exclusion for this player? Their account will become ACTIVE immediately.'
      : 'EXCLUDE this player for 7 days? They will be unable to place bets.';

    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.post(
        `${API_URL}/api/v1/admin/players/${userId}/toggle-exclusion`,
        { action, durationDays: 7, reason: isExcluded ? 'Self-exclusion lifted by admin' : 'Exclusion initiated by admin' },
        { headers: authHeaders }
      );
      // Refresh current player list
      if (activeTab === 'players') {
        const res = await axios.get(`${API_URL}/api/v1/admin/players`, { headers: authHeaders });
        setPlayerList(res.data);
      }
      alert(isExcluded ? 'Self-exclusion stopped! Account is now ACTIVE.' : 'Self-exclusion applied for 7 days.');
    } catch (err: any) {
      alert(`Failed to update exclusion: ${err.response?.data?.message || err.message}`);
    }
  };

  // Toggle Player Freeze / Unfreeze
  const handleToggleFreeze = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    const reason = prompt(
      `Enter reason for ${nextStatus === 'FROZEN' ? 'freezing' : 'unfreezing'} this account:`,
      nextStatus === 'FROZEN' ? 'Suspicious withdrawal pattern review' : 'Account verified by admin'
    );
    if (reason === null) return;

    try {
      await axios.post(
        `${API_URL}/api/v1/admin/players/${userId}/status`,
        { status: nextStatus, reason },
        { headers: authHeaders }
      );
      // Refresh current player list
      if (activeTab === 'players') {
        const res = await axios.get(`${API_URL}/api/v1/admin/players`, { headers: authHeaders });
        setPlayerList(res.data);
      }
      if (selectedWithdrawalRequest && userFinancialHistory?.user?.id === userId) {
        handleInspectWithdrawal(selectedWithdrawalRequest);
      }
      alert(`User status successfully changed to ${nextStatus}.`);
    } catch (err: any) {
      alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

  // Toggle Whole System Status (Creator only)
  const handleToggleSystem = async () => {
    if (!isCreator) return;
    const nextState = !systemStatus.isSystemActive;
    const confirmMsg = nextState
      ? 'ACTIVATE the entire game system? Players will immediately be able to place bets.'
      : 'DEACTIVATE the system? All wagering and rounds will be paused for maintenance.';
    if (!window.confirm(confirmMsg)) return;

    setSystemToggling(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/admin/system/toggle`,
        {
          active: nextState,
          message: nextState ? undefined : 'Scheduled platform maintenance. Betting temporarily paused.',
        },
        { headers: authHeaders }
      );
      setSystemStatus(res.data);
    } catch (err: any) {
      alert(`System toggle failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSystemToggling(false);
    }
  };

  // Set RTP (Creator only)
  const handleSaveRtp = async () => {
    if (!isCreator) return;
    setRtpSaving(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/admin/system/rtp`,
        { targetRtp: Number(targetRtpInput) },
        { headers: authHeaders }
      );
      if (res.data) {
        const savedRtp = Number(res.data.targetRtp) || Number(targetRtpInput);
        setCurrentPlatformRtp(savedRtp);
        setTargetRtpInput(savedRtp);
        setMathAnalysis(res.data);
      }
      alert(`Platform RTP target successfully updated to ${targetRtpInput}%!`);
    } catch (err: any) {
      alert(`Failed to update RTP: ${err.response?.data?.message || err.message}`);
    } finally {
      setRtpSaving(false);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffActionError(null);
    try {
      await axios.post(
        `${API_URL}/api/v1/admin/staff`,
        {
          phone: newStaffPhone,
          username: newStaffUsername,
          password: newStaffPassword,
          role: isOwner ? 'OPERATOR' : newStaffRole,
        },
        { headers: authHeaders }
      );
      setShowAddStaffModal(false);
      setNewStaffPhone('');
      setNewStaffUsername('');
      setNewStaffPassword('');
      // Refresh staff list
      const res = await axios.get(`${API_URL}/api/v1/admin/staff`, { headers: authHeaders });
      setStaffList(res.data);
      alert('Staff member created successfully!');
    } catch (err: any) {
      setStaffActionError(err.response?.data?.message || err.message || 'Creation failed');
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (staffId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete staff account "${username}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/v1/admin/staff/${staffId}`, { headers: authHeaders });
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      alert(`Staff account "${username}" deleted.`);
    } catch (err: any) {
      alert(`Failed to delete staff: ${err.response?.data?.message || err.message}`);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setChangingPassword(true);
    setPasswordMsg(null);
    try {
      await axios.post(
        `${API_URL}/api/v1/auth/change-password`,
        { oldPassword, newPassword },
        { headers: authHeaders }
      );
      setPasswordMsg({ type: 'success', text: 'Password successfully changed!' });
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg(null);
      }, 1500);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleManualLink = async (depositId: string, evidenceId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/v1/payments/admin/link`,
        { depositId, evidenceId },
        { headers: authHeaders }
      );
      setLinkingDepositId(null);
      fetchData();
    } catch (err: any) {
      alert(`Failed to link evidence: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleUnlink = async (depositId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/v1/payments/admin/unlink/${depositId}`,
        {},
        { headers: authHeaders }
      );
      fetchData();
    } catch (err: any) {
      alert(`Failed to unlink: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/payments/admin/simulate`,
        {
          providerId: simProvider,
          amount: parseFloat(simAmount) || 100,
          senderPhone: simPhone,
          senderName: simName,
          transactionReference: simRef,
          customText: simCustomText || undefined,
        },
        { headers: authHeaders }
      );
      setSimResult(res.data);
      fetchData();
    } catch (err: any) {
      alert(`Simulation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredRequests = paymentRequests.filter((r) => {
    // 1. Status Filter
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;

    // 2. Type Filter (DEPOSIT / WITHDRAWAL)
    if (filterType !== 'ALL' && r.requestType !== filterType) return false;

    // 3. Verification Method Filter
    if (filterVerification === 'AUTO') {
      if (r.approvedBy !== '00000000-0000-0000-0000-000000000000' && !r.matchedEvidenceId) return false;
    } else if (filterVerification === 'MANUAL') {
      if (r.approvedBy === '00000000-0000-0000-0000-000000000000') return false;
    }

    // 4. Free-text Search
    if (paymentSearch.trim()) {
      const q = paymentSearch.trim().toLowerCase();
      const matchPlayer =
        r.user?.phone?.toLowerCase().includes(q) ||
        r.user?.username?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.accountName?.toLowerCase().includes(q) ||
        r.accountNumber?.toLowerCase().includes(q) ||
        r.userId?.toLowerCase().includes(q);
      const matchApprover =
        r.approver?.phone?.toLowerCase().includes(q) ||
        r.approver?.username?.toLowerCase().includes(q) ||
        r.approver?.label?.toLowerCase().includes(q) ||
        r.approvedBy?.toLowerCase().includes(q);
      const matchRef = r.transactionReference?.toLowerCase().includes(q);
      const matchId = r.id?.toLowerCase().includes(q);
      const matchNote = r.adminNote?.toLowerCase().includes(q) || r.rawSmsText?.toLowerCase().includes(q);

      if (!matchPlayer && !matchApprover && !matchRef && !matchId && !matchNote) {
        return false;
      }
    }

    return true;
  });
  const pendingCount = paymentRequests.filter((r) => r.status === 'PENDING').length;

  const sideNavBtn = (tab: TabType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        if (isMobile) setMobileMenuOpen(false);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', borderRadius: '8px', border: 'none',
        backgroundColor: activeTab === tab ? '#1E293B' : 'transparent',
        color: activeTab === tab ? '#FBBF24' : '#94A3B8',
        fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: '100%',
        position: 'relative',
      }}
    >
      {icon} {label}
      {tab === 'payments' && pendingCount > 0 && (
        <span style={{
          marginLeft: 'auto', backgroundColor: '#EF4444', color: '#fff',
          borderRadius: '999px', fontSize: '10px', fontWeight: 900,
          padding: '2px 7px',
        }}>
          {pendingCount}
        </span>
      )}
    </button>
  );

  // If not authenticated, render AdminLogin now (after all hooks have executed)
  if (!adminToken) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0F1D', color: '#F8FAFC', position: 'relative' }}>
      {/* Mobile Top App Bar */}
      {isMobile && (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            backgroundColor: '#0F172A',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            zIndex: 90,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#F8FAFC',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#10B981', fontSize: '15px', fontWeight: 900, letterSpacing: '0.5px' }}>
                  KENO ADMIN
                </span>
                {isCreator && (
                  <span style={{ backgroundColor: '#F59E0B', color: '#000', fontSize: '9px', fontWeight: 900, padding: '1px 5px', borderRadius: '4px' }}>
                    CREATOR
                  </span>
                )}
                {isOwner && (
                  <span style={{ backgroundColor: '#3B82F6', color: '#fff', fontSize: '9px', fontWeight: 900, padding: '1px 5px', borderRadius: '4px' }}>
                    OWNER
                  </span>
                )}
                {isOperator && (
                  <span style={{ backgroundColor: '#10B981', color: '#000', fontSize: '9px', fontWeight: 900, padding: '1px 5px', borderRadius: '4px' }}>
                    OPERATOR
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOperator && agentFloatData && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981',
                padding: '4px 10px', borderRadius: '8px'
              }}>
                <span style={{ fontSize: '10px', color: '#A7F3D0', fontWeight: 800 }}>FLOAT:</span>
                <span style={{ fontSize: '12px', color: '#34D399', fontWeight: 900 }}>
                  {agentFloatData.floatBalanceETB.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                </span>
              </div>
            )}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('payments');
                  setMobileMenuOpen(false);
                }}
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                }}
              >
                <DollarSign size={13} /> {pendingCount}
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94A3B8',
                borderRadius: '8px',
                padding: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
      )}

      {/* Mobile Horizontal Quick-Nav Scroll Bar */}
      {isMobile && (
        <nav
          aria-label="Quick navigation tabs"
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            height: '46px',
            backgroundColor: '#0B1322',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: '6px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            zIndex: 85,
          }}
        >
          {(isOperator
            ? [
                { id: 'payments' as const, label: `Approve / Reject${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: <DollarSign size={13} /> }
              ]
            : [
                { id: 'overview' as const, label: 'Overview', icon: <TrendingUp size={13} /> },
                { id: 'payments' as const, label: `Approve / Reject${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: <DollarSign size={13} /> },
                { id: 'audits' as const, label: 'Audits', icon: <BarChart3 size={13} /> },
                ...((isCreator || isOwner) ? [{ id: 'staff' as const, label: 'Staff & Agents', icon: <Users size={13} /> }] : []),
                { id: 'players' as const, label: 'Players', icon: <UserCheck size={13} /> },
                ...(isCreator
                  ? [
                    { id: 'rtp' as const, label: 'RTP', icon: <Award size={13} /> },
                    { id: 'system' as const, label: 'System', icon: <Power size={13} /> },
                    { id: 'rounds' as const, label: 'Rounds', icon: <Activity size={13} /> },
                    { id: 'paytable' as const, label: 'Paytable', icon: <Layers size={13} /> },
                  ]
                  : []),
              ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: activeTab === item.id ? '1px solid #10B981' : '1px solid #1E293B',
                backgroundColor: activeTab === item.id ? 'rgba(16, 185, 129, 0.15)' : '#1E293B',
                color: activeTab === item.id ? '#10B981' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}
      {/* Sidebar */}
      <div style={{
        width: isMobile ? '280px' : '270px',
        maxWidth: isMobile ? '85vw' : '270px',
        minWidth: isMobile ? '280px' : '270px',
        flexShrink: 0,
        backgroundColor: '#0F172A',
        borderRight: '1px solid #1E293B',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        height: '100vh',
        bottom: 0,
        left: 0,
        zIndex: isMobile ? 1000 : 10,
        transform: isMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        boxShadow: isMobile && mobileMenuOpen ? '8px 0 32px rgba(0, 0, 0, 0.8)' : 'none',
        overflowY: 'auto',
        padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px'
      }}>
        {/* Brand */}
        <div style={{ marginBottom: '20px', paddingLeft: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ color: '#10B981', fontSize: '20px', fontWeight: 900, letterSpacing: '1px' }}>KENO ADMIN</h1>
              {isCreator && <span style={{ backgroundColor: '#F59E0B', color: '#000', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>CREATOR</span>}
              {isOwner && <span style={{ backgroundColor: '#3B82F6', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>OWNER</span>}
              {isOperator && <span style={{ backgroundColor: '#10B981', color: '#000', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>OPERATOR</span>}
            </div>
            <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
              {isCreator ? 'MASTER CONTROL CONSOLE' : isOwner ? 'BUSINESS OWNER PORTAL' : 'OPERATOR WORKSTATION'}
            </p>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94A3B8',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Global Emergency System Indicator for Creator */}
        {
          isCreator && (
            <div style={{
              backgroundColor: systemStatus.isSystemActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${systemStatus.isSystemActive ? '#10B981' : '#EF4444'}`,
              borderRadius: '8px', padding: '10px 12px', marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: systemStatus.isSystemActive ? '#34D399' : '#F87171' }}>
                  {systemStatus.isSystemActive ? '🟢 SYSTEM ACTIVE' : '🔴 MAINTENANCE ON'}
                </span>
                <button
                  onClick={handleToggleSystem}
                  disabled={systemToggling}
                  style={{
                    backgroundColor: systemStatus.isSystemActive ? '#7F1D1D' : '#064E3B',
                    color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px',
                    fontSize: '10px', fontWeight: 900, cursor: 'pointer',
                  }}
                >
                  {systemStatus.isSystemActive ? 'PAUSE' : 'RESUME'}
                </button>
              </div>
            </div>
          )
        }

        {/* Operator Agent Float Card */}
        {isOperator && (
          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1.5px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AGENT FLOAT BALANCE
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#34D399', marginTop: '4px' }}>
              {agentFloatData ? `${agentFloatData.floatBalanceETB.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB` : '...'}
            </div>
            {agentFloatData?.telebirrNumber && (
              <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '6px' }}>
                📱 Telebirr: <strong style={{ color: '#F8FAFC' }}>{agentFloatData.telebirrNumber}</strong>
              </div>
            )}
            {agentFloatData?.cbeNumber && (
              <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
                🏦 CBE: <strong style={{ color: '#F8FAFC' }}>{agentFloatData.cbeNumber}</strong>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items based on authorization */}
        {!isOperator && sideNavBtn('overview', <TrendingUp size={18} />, 'Dashboard Overview')}

        {/* Approve / Reject (Deposits & Withdrawals) */}
        {sideNavBtn('payments', <DollarSign size={18} />, isOperator ? 'Cashier Queue' : 'Approve / Reject Requests')}

        {/* Profit Audits: Creator & Business Owner only */}
        {!isOperator && sideNavBtn('audits', <BarChart3 size={18} />, 'Profit Audits')}

        {/* Staff & Agents Management: Creator & Business Owner */}
        {
          (isCreator || isOwner) && (
            sideNavBtn('staff', <Users size={18} />, isCreator ? 'Agents & Staff' : 'Cashier Agents')
          )
        }

        {/* Player Accounts: Creator & Business Owner */}
        {!isOperator && sideNavBtn('players', <UserCheck size={18} />, 'Player Accounts')}

        {/* RTP Engine & System Kill Switch: Creator only */}
        {
          isCreator && (
            <>
              {sideNavBtn('rtp', <Award size={18} />, 'Set RTP & Paytables')}
              {sideNavBtn('system', <Power size={18} />, 'System Control')}
              {sideNavBtn('rounds', <Activity size={18} />, 'Rounds & CSPRNG')}
              {sideNavBtn('paytable', <Layers size={18} />, 'Certified Paytables')}
            </>
          )
        }

        {/* Admin User Info & Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '12px', backgroundColor: '#1E293B', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#F8FAFC', fontSize: '12px', fontWeight: 800 }}>
                  {adminUser?.username || 'Staff'}
                </p>
                <p style={{ color: '#94A3B8', fontSize: '10px' }}>
                  {adminUser?.phone}
                </p>
              </div>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                title="Change Password"
                style={{
                  backgroundColor: '#334155', border: 'none', color: '#F8FAFC',
                  borderRadius: '6px', padding: '6px', cursor: 'pointer',
                }}
              >
                <KeyRound size={14} />
              </button>
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={{
                backgroundColor: isCreator ? '#78350F' : isOwner ? '#1E3A8A' : '#064E3B',
                color: isCreator ? '#FDE68A' : isOwner ? '#93C5FD' : '#A7F3D0',
                fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
              }}>
                {adminUser?.roles?.join(' • ')}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              padding: '10px', borderRadius: '8px', border: '1px solid #334155',
              backgroundColor: 'transparent', color: '#94A3B8',
              fontWeight: 700, cursor: 'pointer', fontSize: '12px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <LogOut size={14} /> SIGN OUT
          </button>
        </div>
      </div >

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          padding: isMobile ? '16px 12px' : '32px',
          paddingTop: isMobile ? '112px' : '32px',
          overflowY: 'auto',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* PC Top Navigation / Action Bar */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#10B981', fontSize: '13px', fontWeight: 900, letterSpacing: '0.5px' }}>
                KENO ADMIN CONSOLE
              </span>
              <span style={{ color: '#334155' }}>|</span>
              <span style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 800 }}>
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'payments' && 'Deposit & Withdrawal Approvals'}
                {activeTab === 'audits' && 'Audit Logs & Reporting'}
                {activeTab === 'staff' && 'Staff Accounts'}
                {activeTab === 'players' && 'Player Accounts Management'}
                {activeTab === 'rtp' && 'RTP & Paytable Engine'}
                {activeTab === 'system' && 'System Maintenance & Control'}
                {activeTab === 'rounds' && 'Live Rounds Stream'}
                {activeTab === 'paytable' && 'Certified Paytables'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Direct Quick Jump Button to Approve / Reject Queue */}
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: activeTab === 'payments' ? '#10B981' : pendingCount > 0 ? '#EF4444' : '#1E293B',
                  color: activeTab === 'payments' ? '#0F172A' : '#FFFFFF',
                  border: pendingCount > 0 ? '1px solid #F87171' : '1px solid #334155',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 900,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: pendingCount > 0 ? '0 0 16px rgba(239, 68, 68, 0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <CheckCircle size={15} />
                APPROVE / REJECT QUEUE
                {pendingCount > 0 && (
                  <span style={{
                    backgroundColor: activeTab === 'payments' ? '#0F172A' : '#FFFFFF',
                    color: activeTab === 'payments' ? '#10B981' : '#EF4444',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 900,
                    marginLeft: '2px',
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={fetchData}
                title="Refresh All Data"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#1E293B',
                  color: '#94A3B8',
                  border: '1px solid #334155',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} /> Refresh
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingLeft: '8px',
                borderLeft: '1px solid #1E293B',
              }}>
                <span style={{ color: '#F8FAFC', fontSize: '12px', fontWeight: 800 }}>
                  {adminUser?.username || 'Admin'}
                </span>
                <span style={{
                  backgroundColor: isCreator ? '#78350F' : isOwner ? '#1E3A8A' : '#064E3B',
                  color: isCreator ? '#FDE68A' : isOwner ? '#93C5FD' : '#A7F3D0',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  {adminUser?.roles?.[0] || 'ADMIN'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: OVERVIEW DASHBOARD                                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'overview' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900 }}>
                    {isCreator ? 'Creator Master Dashboard' : isOwner ? 'Business Owner Dashboard' : 'Operator Workstation'}
                  </h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Live operational state, financial activity, and risk metrics.
                  </p>
                </div>

                {!systemStatus.isSystemActive && (
                  <div style={{
                    backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444',
                    padding: '8px 16px', borderRadius: '8px', color: '#FCA5A5', fontSize: '12px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <AlertCircle size={16} /> SYSTEM MAINTENANCE ACTIVE — WAGERS PAUSED
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div
                  onClick={() => setActiveTab('payments')}
                  style={{
                    backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px',
                    border: pendingCount > 0 ? '1.5px solid #F59E0B' : '1px solid #1E293B',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10B981')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = pendingCount > 0 ? '#F59E0B' : '#1E293B')}
                >
                  <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>PENDING PAYMENTS</p>
                  <h3 style={{ color: pendingCount > 0 ? '#FBBF24' : '#64748B', fontSize: '26px', fontWeight: 900, marginTop: '4px' }}>
                    {pendingCount}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <p style={{ color: '#64748B', fontSize: '11px' }}>Requires approval decision</p>
                    <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 800 }}>OPEN QUEUE →</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>THEORETICAL RTP</p>
                  <h3 style={{ color: '#10B981', fontSize: '26px', fontWeight: 900, marginTop: '4px' }}>95.82%</h3>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Certified paytable math</p>
                </div>

                <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>HOUSE EDGE</p>
                  <h3 style={{ color: '#F59E0B', fontSize: '26px', fontWeight: 900, marginTop: '4px' }}>4.18%</h3>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Expected operator margin</p>
                </div>

                <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>RNG ENGINE</p>
                  <h3 style={{ color: '#A855F7', fontSize: '26px', fontWeight: 900, marginTop: '4px' }}>CSPRNG</h3>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Cryptographically secure</p>
                </div>
              </div>

              {/* Quick Actions for All Admin Tiers */}
              {pendingCount > 0 && (
                <div style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B',
                  borderRadius: '12px', padding: '20px', marginBottom: '24px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ color: '#FDE68A', fontSize: '16px', fontWeight: 900 }}>
                      ⚡ You have {pendingCount} payment requests awaiting review!
                    </h4>
                    <p style={{ color: '#CBD5E1', fontSize: '13px', marginTop: '4px' }}>
                      Process pending deposits with SMS evidence or review user transaction history for withdrawals.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('payments')}
                    style={{
                      backgroundColor: '#F59E0B', color: '#000', border: 'none',
                      padding: '10px 20px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer',
                    }}
                  >
                    OPEN QUEUE →
                  </button>
                </div>
              )}

              {/* Recent Game Rounds */}
              <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Live Game Rounds Stream</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '12px' }}>
                      <th style={{ padding: '10px' }}>ROUND</th>
                      <th style={{ padding: '10px' }}>STATUS</th>
                      <th style={{ padding: '10px' }}>DRAWN NUMBERS</th>
                      <th style={{ padding: '10px' }}>SHA-256 HASH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.slice(0, 6).map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #1E293B', fontSize: '13px' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#FBBF24' }}>#{r.roundNumber}</td>
                        <td style={{ padding: '12px 10px' }}><StatusBadge status={r.status} /></td>
                        <td style={{ padding: '12px 10px', color: '#60A5FA', fontFamily: 'monospace' }}>
                          {r.drawResult ? r.drawResult.join(', ') : 'Pending...'}
                        </td>
                        <td style={{ padding: '12px 10px', color: '#64748B', fontSize: '11px', fontFamily: 'monospace' }}>
                          {r.resultHash ? `${r.resultHash.substring(0, 16)}...` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: PAYMENT QUEUE & WITHDRAWAL INSPECTOR                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'payments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Payment Review & Approval Queue</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>
                    MacroDroid SMS matched deposits & secured withdrawal auditing.
                  </p>
                </div>

                <button
                  onClick={fetchData}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    backgroundColor: '#1E293B', color: '#F8FAFC', border: '1px solid #334155',
                    padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700
                  }}
                >
                  <RefreshCw size={14} /> Refresh Stream
                </button>
              </div>

              {/* Authorized Cashier Float Banner */}
              {isOperator && (
                <div style={{
                  backgroundColor: '#0B1320',
                  border: '1.5px solid #10B981',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#10B981', color: '#000', fontSize: '10px', fontWeight: 900, padding: '2px 7px', borderRadius: '4px' }}>
                        AUTHORIZED CASHIER TERMINAL
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                        Logged in as: <strong style={{ color: '#F8FAFC' }}>{adminUser?.username}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>AVAILABLE FLOAT BALANCE:</span>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: '#34D399' }}>
                        {agentFloatData ? `${agentFloatData.floatBalanceETB.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB` : '...'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {agentFloatData?.telebirrNumber && (
                        <span>📱 Telebirr: <strong style={{ color: '#F8FAFC' }}>{agentFloatData.telebirrNumber}</strong> ({agentFloatData.telebirrName})</span>
                      )}
                      {agentFloatData?.cbeNumber && (
                        <span>🏦 CBE: <strong style={{ color: '#F8FAFC' }}>{agentFloatData.cbeNumber}</strong> ({agentFloatData.cbeName})</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={fetchAgentFloat}
                    style={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      color: '#10B981',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ↻ Refresh Float
                  </button>
                </div>
              )}

              {/* Quick Metrics Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>PENDING DEPOSITS</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#FBBF24', fontSize: '22px', fontWeight: 900 }}>
                      {paymentRequests.filter((r) => r.requestType === 'DEPOSIT' && r.status === 'PENDING').length}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '11px' }}>awaiting approval</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>PENDING WITHDRAWALS</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#F87171', fontSize: '22px', fontWeight: 900 }}>
                      {paymentRequests.filter((r) => r.requestType === 'WITHDRAWAL' && r.status === 'PENDING').length}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '11px' }}>requires history audit</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>
                    {isOperator ? 'LIFETIME APPROVED DEPOSITS' : 'AUTO-MATCHED SMS'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#34D399', fontSize: '22px', fontWeight: 900 }}>
                      {isOperator
                        ? `${(agentFloatData?.totalDepositsApprovedETB || 0).toLocaleString()} ETB`
                        : paymentRequests.filter((r) => r.requestType === 'DEPOSIT' && r.status === 'PENDING' && r.matchedEvidenceId).length}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '11px' }}>
                      {isOperator ? 'by you' : 'evidence verified'}
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>
                    {isOperator ? 'LIFETIME APPROVED WITHDRAWALS' : 'SMS COLLECTED'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#60A5FA', fontSize: '22px', fontWeight: 900 }}>
                      {isOperator
                        ? `${(agentFloatData?.totalWithdrawalsApprovedETB || 0).toLocaleString()} ETB`
                        : evidenceList.length}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '11px' }}>
                      {isOperator ? 'by you' : 'Telebirr / CBE / M-Pesa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div style={{
                display: 'flex', gap: '8px', borderBottom: '1px solid #1E293B',
                paddingBottom: '12px', marginBottom: '20px'
              }}>
                {(isOperator ? [
                  { id: 'queue', label: 'Review & Approval Queue', icon: <CheckCircle size={15} /> },
                  { id: 'audit', label: 'My Approved History', icon: <History size={15} /> },
                ] : [
                  { id: 'queue', label: 'Review & Approval Queue', icon: <CheckCircle size={15} /> },
                  { id: 'evidence', label: 'MacroDroid Live Stream', icon: <Smartphone size={15} /> },
                  { id: 'simulator', label: 'SMS Simulator', icon: <Sparkles size={15} /> },
                  { id: 'guide', label: 'MacroDroid Config', icon: <HelpCircle size={15} /> },
                  { id: 'audit', label: 'Decision Audit Trail', icon: <History size={15} /> },
                ]).map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setPaymentsSubTab(sub.id as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px', borderRadius: '8px', border: 'none',
                      backgroundColor: paymentsSubTab === sub.id ? '#1E293B' : 'transparent',
                      color: paymentsSubTab === sub.id ? '#10B981' : '#94A3B8',
                      fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    {sub.icon} {sub.label}
                  </button>
                ))}
              </div>

              {/* SUB-TAB: QUEUE */}
              {paymentsSubTab === 'queue' && (
                <div>
                  {/* Filter Selector & Search Toolbar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                    {/* Search Bar */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                          size={16}
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
                        />
                        <input
                          type="text"
                          placeholder="Search player phone, username, reference code (e.g. DK19K143OH), approver, or request ID..."
                          value={paymentSearch}
                          onChange={(e) => setPaymentSearch(e.target.value)}
                          style={{
                            width: '100%',
                            backgroundColor: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '10px 38px 10px 36px',
                            color: '#F8FAFC',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        {paymentSearch && (
                          <button
                            type="button"
                            onClick={() => setPaymentSearch('')}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Pills Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      {/* Status Pills */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'PENDING', label: 'Pending', count: paymentRequests.filter((r) => r.status === 'PENDING').length, color: '#FBBF24' },
                          { id: 'APPROVED', label: 'Approved', count: paymentRequests.filter((r) => r.status === 'APPROVED').length, color: '#10B981' },
                          { id: 'REJECTED', label: 'Rejected', count: paymentRequests.filter((r) => r.status === 'REJECTED').length, color: '#EF4444' },
                          { id: 'CANCELLED', label: 'Cancelled', count: paymentRequests.filter((r) => r.status === 'CANCELLED').length, color: '#94A3B8' },
                          { id: 'EXPIRED', label: 'Expired', count: paymentRequests.filter((r) => r.status === 'EXPIRED').length, color: '#FB7185' },
                          { id: 'ALL', label: 'All Statuses', count: paymentRequests.length, color: '#38BDF8' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setFilterStatus(st.id as any)}
                            style={{
                              backgroundColor: filterStatus === st.id ? '#1E293B' : 'transparent',
                              color: filterStatus === st.id ? st.color : '#64748B',
                              border: `1.5px solid ${filterStatus === st.id ? st.color : '#334155'}`,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {st.label}
                            <span
                              style={{
                                backgroundColor: filterStatus === st.id ? st.color : '#334155',
                                color: filterStatus === st.id ? '#0F172A' : '#CBD5E1',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 900,
                                padding: '1px 6px',
                              }}
                            >
                              {st.count}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Type & Verification Pills */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Type Filter */}
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as any)}
                          style={{
                            backgroundColor: '#1E293B',
                            color: '#F8FAFC',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="ALL">All Types</option>
                          <option value="DEPOSIT">Deposits Only</option>
                          <option value="WITHDRAWAL">Withdrawals Only</option>
                        </select>

                        {/* Verification Filter */}
                        <select
                          value={filterVerification}
                          onChange={(e) => setFilterVerification(e.target.value as any)}
                          style={{
                            backgroundColor: '#1E293B',
                            color: '#F8FAFC',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="ALL">All Approvers</option>
                          <option value="AUTO">🤖 Auto-Approved (SMS)</option>
                          <option value="MANUAL">👤 Operator Approved</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {filteredRequests.length === 0 ? (
                    <div style={{ backgroundColor: '#0F172A', padding: '48px', borderRadius: '12px', border: '1px solid #1E293B', textAlign: 'center', color: '#64748B' }}>
                      No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} payment requests found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {filteredRequests.map((r) => {
                        const isWithdrawal = r.requestType === 'WITHDRAWAL';
                        const matched = r.matchedEvidence;
                        const hasMatch = Boolean(r.matchedEvidenceId && matched);

                        return (
                          <div
                            key={r.id}
                            style={{
                              backgroundColor: '#0F172A', padding: '20px', borderRadius: '14px',
                              border: `1.5px solid ${isWithdrawal
                                ? r.status === 'PENDING' ? '#B91C1C' : '#1E293B'
                                : hasMatch && r.status === 'PENDING' ? '#10B981' : r.status === 'PENDING' ? '#713F12' : '#1E293B'
                                }`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                  <span style={{ color: isWithdrawal ? '#F87171' : '#FBBF24', fontSize: '18px', fontWeight: 900 }}>
                                    {r.requestType} — {formatAmount(r.amountMinor)}
                                  </span>
                                  <StatusBadge status={r.status} />

                                  {isWithdrawal && r.status === 'PENDING' && (
                                    <span style={{
                                      backgroundColor: '#7F1D1D', color: '#FECACA',
                                      padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800
                                    }}>
                                      ⚠️ Operator History Inspection Mandatory
                                    </span>
                                  )}

                                  {!isWithdrawal && hasMatch && r.status === 'PENDING' && (
                                    <span style={{
                                      backgroundColor: '#064E3B', color: '#34D399',
                                      border: '1px solid #10B981', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800,
                                      display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                      <Sparkles size={12} /> AUTO-MATCHED ({r.matchConfidence || 100}%)
                                    </span>
                                  )}
                                </div>

                                <div style={{ color: '#64748B', fontSize: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                  <span>Provider: <strong style={{ color: '#F1F5F9' }}>{r.paymentMethod?.toUpperCase()}</strong></span>
                                  <span>Request ID: <code style={{ color: '#94A3B8' }}>{r.id.slice(0, 8)}</code></span>
                                  <span>Submitted: {formatDate(r.createdAt)}</span>
                                  {r.transactionReference && (
                                    <span>User Ref: <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{r.transactionReference}</strong></span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Audit Stamp: Who deposited & who verified/approved it */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '12px',
                                backgroundColor: '#1E293B',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                marginTop: '12px',
                                marginBottom: '12px',
                                border: '1px solid #334155',
                              }}
                            >
                              {/* Depositor Info */}
                              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                                <div style={{ color: '#38BDF8', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <User size={13} /> {isWithdrawal ? 'WITHDRAWAL REQUESTED BY' : 'DEPOSITED BY (PLAYER)'}
                                </div>
                                <div style={{ color: '#F1F5F9', fontWeight: 800, fontSize: '13px' }}>
                                  {r.user?.phone ? `${r.user.phone} (${r.user.username || 'Player'})` : (r.accountName || r.userId.slice(0, 8))}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                                  Target Account: <strong style={{ color: '#FBBF24' }}>{r.accountNumber || r.user?.phone || '—'}</strong>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                                  Submitted at: {formatDate(r.createdAt)}
                                </div>
                              </div>

                              {/* Approver / Verification Info */}
                              <div style={{ fontSize: '12px', color: '#94A3B8', borderLeft: '1px solid #334155', paddingLeft: '12px' }}>
                                <div
                                  style={{
                                    color: r.status === 'APPROVED' ? '#34D399' : r.status === 'REJECTED' ? '#F87171' : '#FBBF24',
                                    fontWeight: 800,
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                  }}
                                >
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {r.status === 'APPROVED' ? (
                                      <><ShieldCheck size={13} /> VERIFIED & APPROVED BY</>
                                    ) : r.status === 'REJECTED' ? (
                                      <><XCircle size={13} /> REJECTED BY</>
                                    ) : (
                                      <><Clock size={13} /> VERIFICATION AUDIT STATUS</>
                                    )}
                                  </span>

                                  {/* Confidential Detail Button (Owner & Creator only) */}
                                  {(isCreator || isOwner) && (r.status === 'APPROVED' || r.status === 'REJECTED') && (
                                    <button
                                      type="button"
                                      onClick={() => toggleAudit(r.id)}
                                      style={{
                                        backgroundColor: expandedAudit[r.id] ? '#1E3A8A' : '#0F172A',
                                        color: expandedAudit[r.id] ? '#93C5FD' : '#38BDF8',
                                        border: `1px solid ${expandedAudit[r.id] ? '#3B82F6' : '#334155'}`,
                                        borderRadius: '6px',
                                        padding: '2px 8px',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <Eye size={11} /> {expandedAudit[r.id] ? 'Hide Details' : 'View Approver Details'}
                                    </button>
                                  )}
                                </div>

                                {r.status === 'APPROVED' && (
                                  <>
                                    <div style={{ color: '#34D399', fontWeight: 800, fontSize: '13px' }}>
                                      {r.approvedBy === '00000000-0000-0000-0000-000000000000'
                                        ? '🤖 MacroDroid SMS Auto-Matching Engine'
                                        : (isCreator || isOwner)
                                          ? (r.approver?.phone ? `${r.approver.username || 'Staff'} (${r.approver.phone})` : r.approver?.username || 'Staff Operator')
                                          : 'Staff Operator'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                                      Approved at: {formatDate(r.approvedAt || r.updatedAt)}
                                    </div>
                                    {r.adminNote && (
                                      <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px', fontStyle: 'italic' }}>
                                        Decision Note: "{r.adminNote}"
                                      </div>
                                    )}
                                  </>
                                )}

                                {r.status === 'REJECTED' && (
                                  <>
                                    <div style={{ color: '#F87171', fontWeight: 800, fontSize: '13px' }}>
                                      {(isCreator || isOwner)
                                        ? (r.approver?.phone ? `${r.approver.username || 'Staff'} (${r.approver.phone})` : r.approver?.username || 'Staff Operator')
                                        : 'Staff Operator'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                                      Rejected at: {formatDate(r.approvedAt || r.updatedAt)}
                                    </div>
                                    {r.adminNote && (
                                      <div style={{ fontSize: '11px', color: '#FCA5A5', marginTop: '2px', fontStyle: 'italic' }}>
                                        Rejection Reason: "{r.adminNote}"
                                      </div>
                                    )}
                                  </>
                                )}

                                {r.status === 'PENDING' && (
                                  <>
                                    <div style={{ color: '#FBBF24', fontWeight: 700 }}>
                                      ⏳ Pending Operator Verification
                                    </div>
                                    {r.matchedEvidenceId ? (
                                      <div style={{ fontSize: '11px', color: '#34D399', marginTop: '3px' }}>
                                        ✨ MacroDroid SMS Evidence linked ({r.matchConfidence || 100}%)
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                                        Awaiting operator manual or SMS auto-match
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Confidential Approver Audit Drawer (Creator / Owner Eyes Only) */}
                                {(isCreator || isOwner) && expandedAudit[r.id] && (
                                  <div
                                    style={{
                                      backgroundColor: '#0A0F1D',
                                      border: '1.5px solid #3B82F6',
                                      borderRadius: '8px',
                                      padding: '10px 12px',
                                      marginTop: '10px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        🛡️ Confidential Approver Record (Owner / Creator Only)
                                      </span>
                                      <span style={{ fontSize: '9px', backgroundColor: '#1E3A8A', color: '#93C5FD', padding: '1px 6px', borderRadius: '4px', fontWeight: 900 }}>
                                        CONFIDENTIAL
                                      </span>
                                    </div>

                                    {r.approvedBy === '00000000-0000-0000-0000-000000000000' ? (
                                      <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.5 }}>
                                        <div>Engine: <strong style={{ color: '#34D399' }}>Automated Background Worker</strong></div>
                                        <div>Trigger: <strong style={{ color: '#FBBF24' }}>MacroDroid Android SMS Gateway</strong></div>
                                        {r.matchedEvidenceId && <div>Linked Evidence ID: <code style={{ color: '#94A3B8' }}>{r.matchedEvidenceId}</code></div>}
                                      </div>
                                    ) : (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px', fontSize: '11px', lineHeight: 1.4 }}>
                                        <div>
                                          <span style={{ color: '#64748B' }}>Approver Name: </span>
                                          <strong style={{ color: '#F8FAFC' }}>{r.approver?.username || 'Staff'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748B' }}>Phone Number: </span>
                                          <strong style={{ color: '#34D399' }}>{r.approver?.phone || 'No phone registered'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748B' }}>Staff Role: </span>
                                          <strong style={{ color: '#FBBF24' }}>{r.approver?.role || 'OPERATOR'}</strong>
                                        </div>
                                        <div>
                                          <span style={{ color: '#64748B' }}>Audit Timestamp: </span>
                                          <strong style={{ color: '#E2E8F0' }}>{formatDate(r.approvedAt || r.updatedAt)}</strong>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                          <span style={{ color: '#64748B' }}>Staff Account UUID: </span>
                                          <code style={{ color: '#94A3B8', fontSize: '10px' }}>{r.approvedBy}</code>
                                        </div>
                                        {r.approver?.email && (
                                          <div>
                                            <span style={{ color: '#64748B' }}>Email: </span>
                                            <span style={{ color: '#E2E8F0' }}>{r.approver.email}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>                            </div>

                            {/* Full SMS / Proof Text & Verification */}
                            {(() => {
                              const userText =
                                r.rawSmsText ||
                                (r.adminNote?.startsWith('SMS:')
                                  ? r.adminNote.replace(/^SMS:\s*/, '')
                                  : null) ||
                                (r.adminNote && !r.adminNote.startsWith('Auto-approved') && !r.adminNote.startsWith('Verified') ? r.adminNote : null);
                              const isTelebirr = (r.paymentMethod || '').toLowerCase().includes('telebirr');
                              const receiptUrl =
                                extractUrl(userText) ||
                                (isTelebirr && r.transactionReference
                                  ? `https://transactioninfo.ethiotelecom.et/receipt/${r.transactionReference}`
                                  : null);

                              if (!userText && !r.proofImageUrl && !r.transactionReference) return null;

                              return (
                                <div
                                  style={{
                                    backgroundColor: '#0F172A',
                                    border: '1.5px solid #334155',
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                    marginTop: '12px',
                                    marginBottom: '14px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginBottom: '8px',
                                      flexWrap: 'wrap',
                                      gap: '8px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        color: '#38BDF8',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                      }}
                                    >
                                      <FileText size={13} /> {userText ? 'Full SMS / Payment Proof Submitted by Player' : 'Payment Reference & Verification'}
                                    </span>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      {receiptUrl && (
                                        <a
                                          href={receiptUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            backgroundColor: '#0284C7',
                                            color: '#FFFFFF',
                                            borderRadius: '6px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)',
                                          }}
                                        >
                                          Verify Receipt on Ethio Telecom ↗
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const textToCopy = userText || r.transactionReference || '';
                                          navigator.clipboard?.writeText(textToCopy);
                                          alert('Copied to clipboard!');
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          backgroundColor: '#1E293B',
                                          color: '#94A3B8',
                                          border: '1px solid #334155',
                                          borderRadius: '6px',
                                          padding: '4px 10px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <Copy size={11} /> {userText ? 'Copy Full Text' : 'Copy Ref'}
                                      </button>
                                    </div>
                                  </div>

                                  {userText ? (
                                    <div
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        color: '#F1F5F9',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.5,
                                        backgroundColor: '#020617',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #1E293B',
                                        userSelect: 'text',
                                      }}
                                    >
                                      {userText}
                                    </div>
                                  ) : r.transactionReference ? (
                                    <div
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        color: '#E2E8F0',
                                        backgroundColor: '#020617',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #1E293B',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                      }}
                                    >
                                      <span>
                                        Registered Ref Code: <strong style={{ color: '#10B981', fontSize: '13px' }}>{r.transactionReference}</strong>
                                      </span>
                                      {receiptUrl && (
                                        <span style={{ color: '#38BDF8', fontSize: '11px' }}>
                                          Official Ethio Telecom receipt available
                                        </span>
                                      )}
                                    </div>
                                  ) : null}

                                  {r.proofImageUrl && (
                                    <div style={{ marginTop: '10px' }}>
                                      <a
                                        href={r.proofImageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#38BDF8', fontSize: '12px', fontWeight: 700, textDecoration: 'underline' }}
                                      >
                                        View Uploaded Proof Screenshot ↗
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Action Row */}
                            {r.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                                {isWithdrawal ? (
                                  // For withdrawal: Special inspection button as required by prompt
                                  <button
                                    onClick={() => handleInspectWithdrawal(r)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      backgroundColor: '#EF4444', color: '#fff',
                                      padding: '10px 20px', borderRadius: '8px', border: 'none',
                                      fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                                    }}
                                  >
                                    <Eye size={16} /> INSPECT USER TRANSACTION HISTORY & APPROVE
                                  </button>
                                ) : (
                                  <>
                                    <input
                                      placeholder="Optional administrator note (e.g. Verified via SMS)..."
                                      value={actionNote[r.id] || ''}
                                      onChange={(e) => setActionNote((n) => ({ ...n, [r.id]: e.target.value }))}
                                      style={{
                                        flex: 1, backgroundColor: '#1E293B', border: '1px solid #334155',
                                        borderRadius: '8px', padding: '10px 14px', color: '#F8FAFC',
                                        fontSize: '12px', minWidth: '220px',
                                      }}
                                    />
                                    <button
                                      onClick={() => handleAction(r.id, 'deposit', 'approve')}
                                      disabled={processing[r.id]}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        backgroundColor: '#10B981', color: '#0F172A',
                                        padding: '10px 22px', borderRadius: '8px', border: 'none',
                                        fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        opacity: processing[r.id] ? 0.5 : 1,
                                      }}
                                    >
                                      <CheckCircle size={16} /> APPROVE & CREDIT
                                    </button>
                                    <button
                                      onClick={() => handleAction(r.id, 'deposit', 'reject')}
                                      disabled={processing[r.id]}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        backgroundColor: '#EF4444', color: '#FFFFFF',
                                        padding: '10px 18px', borderRadius: '8px', border: 'none',
                                        fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                                        opacity: processing[r.id] ? 0.5 : 1,
                                      }}
                                    >
                                      <XCircle size={16} /> REJECT
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {r.adminNote && r.status !== 'PENDING' && (
                              <div style={{ marginTop: '10px', fontSize: '11px', color: r.status === 'REJECTED' ? '#FCA5A5' : '#34D399' }}>
                                Decision Note: {r.adminNote}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Other subtabs: evidence, simulator, guide, audit remain functional */}
              {paymentsSubTab === 'evidence' && (
                <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>MacroDroid SMS Notifications Stream</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {evidenceList.map((e) => (
                      <div key={e.id} style={{ backgroundColor: '#1E293B', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#10B981', fontWeight: 800 }}>{e.provider}</span>
                          <span style={{ color: '#64748B', fontSize: '11px' }}>{formatDate(e.receivedAt)}</span>
                        </div>
                        <p style={{ color: '#CBD5E1', fontSize: '13px', margin: 0, fontFamily: 'monospace' }}>{e.rawText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paymentsSubTab === 'simulator' && (
                <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B', maxWidth: '600px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>SMS Notification Simulator</h3>
                  <form onSubmit={handleSimulateWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                      value={simProvider}
                      onChange={(e) => setSimProvider(e.target.value as any)}
                      style={{ backgroundColor: '#1E293B', color: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}
                    >
                      <option value="telebirr">Telebirr SMS</option>
                      <option value="mpesa">M-Pesa SMS</option>
                      <option value="cbe_birr">CBE Birr</option>
                    </select>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="Amount (ETB)"
                      style={{ backgroundColor: '#1E293B', color: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}
                    />
                    <input
                      type="text"
                      value={simRef}
                      onChange={(e) => setSimRef(e.target.value)}
                      placeholder="Transaction Reference"
                      style={{ backgroundColor: '#1E293B', color: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}
                    />
                    <button
                      type="submit"
                      disabled={simLoading}
                      style={{ backgroundColor: '#10B981', color: '#000', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer' }}
                    >
                      {simLoading ? 'Simulating...' : 'Dispatch Simulated SMS'}
                    </button>
                  </form>
                </div>
              )}

              {paymentsSubTab === 'guide' && (
                <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>MacroDroid Android Configuration</h3>
                  <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.6 }}>
                    Configure MacroDroid on the dedicated payment phone to trigger on incoming SMS and forward via HTTP POST/GET to:
                    <code style={{ color: '#10B981', display: 'block', margin: '10px 0', padding: '10px', backgroundColor: '#1E293B', borderRadius: '6px' }}>
                      http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid
                    </code>
                  </p>
                </div>
              )}

              {paymentsSubTab === 'audit' && (
                <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
                    {isOperator ? 'My Decision History (Approved / Rejected)' : 'Deposit & Withdrawal Decision Audit Trail'}
                  </h3>
                  {isOperator ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {paymentRequests
                        .filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED')
                        .map((req) => (
                          <div key={req.id} style={{
                            backgroundColor: '#1E293B', padding: '14px', borderRadius: '8px', fontSize: '13px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  backgroundColor: req.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  color: req.status === 'APPROVED' ? '#34D399' : '#F87171',
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 900
                                }}>
                                  {req.status}
                                </span>
                                <span style={{ fontWeight: 800, color: '#F8FAFC' }}>
                                  {req.requestType} — {(Number(req.amountMinor) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                                Player: <strong style={{ color: '#E2E8F0' }}>{req.user?.username || req.user?.phone || 'Player'}</strong> ({req.user?.phone || ''}) • {formatDate(req.updatedAt || req.createdAt)}
                              </div>
                            </div>
                            {req.adminNote && (
                              <div style={{ fontSize: '11px', color: '#94A3B8', maxWidth: '300px' }}>
                                Note: {req.adminNote}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditLogs.map((log) => (
                        <div key={log.id} style={{ backgroundColor: '#1E293B', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                          <span style={{ color: '#94A3B8' }}>{formatDate(log.timestamp)}</span> —{' '}
                          <strong style={{ color: '#FBBF24' }}>{log.action}</strong> by <span>{log.actorId.slice(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: PROFIT AUDITS (DAILY, WEEKLY, MONTHLY)                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'audits' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900 }}>
                    {isOperator ? 'Daily Audit & Reconciliation' : 'Profit & Revenue Financial Audits'}
                  </h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    {isOperator
                      ? 'Operator daily cash reconciliation, GGR, and net settlement.'
                      : 'Daily, weekly, and monthly net house profit, player RTP, and cashflow audits.'}
                  </p>
                </div>

                {/* Period selection */}
                {!isOperator ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAuditPeriod(p)}
                        style={{
                          backgroundColor: auditPeriod === p ? '#1E293B' : 'transparent',
                          color: auditPeriod === p ? '#FBBF24' : '#94A3B8',
                          border: `1.5px solid ${auditPeriod === p ? '#FBBF24' : '#334155'}`,
                          padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                          textTransform: 'uppercase',
                        }}
                      >
                        {p === 'daily' ? 'Today (Daily)' : p === 'weekly' ? 'Last 7 Days (Weekly)' : 'Last 30 Days (Monthly)'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span style={{ backgroundColor: '#1E293B', padding: '6px 14px', borderRadius: '6px', color: '#10B981', fontSize: '12px', fontWeight: 800 }}>
                    TODAY'S OPERATOR AUDIT
                  </span>
                )}
              </div>

              {profitAuditLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Calculating financial audit...</div>
              ) : profitAuditData ? (
                <div>
                  {/* Metric Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                      <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>GROSS GAMING REVENUE (GGR)</p>
                      <h3 style={{ color: '#10B981', fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                        {formatAmount(profitAuditData.summary.grossGamingRevenueMinor)}
                      </h3>
                      <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Total Wagers - Payouts</p>
                    </div>

                    <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                      <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>NET CASHFLOW</p>
                      <h3 style={{ color: '#FBBF24', fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                        {formatAmount(profitAuditData.summary.netCashflowMinor)}
                      </h3>
                      <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Deposits - Withdrawals</p>
                    </div>

                    <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                      <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>OBSERVED RTP</p>
                      <h3 style={{ color: '#60A5FA', fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                        {profitAuditData.summary.observedRtp}
                      </h3>
                      <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>House Edge: {profitAuditData.summary.houseEdge}</p>
                    </div>

                    <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                      <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>TOTAL WAGERS PLACED</p>
                      <h3 style={{ color: '#F8FAFC', fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>
                        {formatAmount(profitAuditData.summary.totalWagersMinor)}
                      </h3>
                      <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>{profitAuditData.summary.totalBets} settled bets</p>
                    </div>
                  </div>

                  {/* Day-by-Day Timeline Breakdown */}
                  <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Financial Timeline Breakdown</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '11px' }}>
                          <th style={{ padding: '10px' }}>DATE</th>
                          <th style={{ padding: '10px' }}>WAGERS</th>
                          <th style={{ padding: '10px' }}>PAYOUTS</th>
                          <th style={{ padding: '10px' }}>GAMING PROFIT</th>
                          <th style={{ padding: '10px' }}>DEPOSITS</th>
                          <th style={{ padding: '10px' }}>WITHDRAWALS</th>
                          <th style={{ padding: '10px' }}>NET CASHFLOW</th>
                          <th style={{ padding: '10px' }}>BETS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitAuditData.timeline.map((item: any) => (
                          <tr key={item.date} style={{ borderBottom: '1px solid #1E293B' }}>
                            <td style={{ padding: '12px 10px', fontWeight: 800, color: '#FBBF24' }}>{item.date}</td>
                            <td style={{ padding: '12px 10px' }}>{formatAmount(item.wagersMinor)}</td>
                            <td style={{ padding: '12px 10px', color: '#F87171' }}>{formatAmount(item.payoutsMinor)}</td>
                            <td style={{ padding: '12px 10px', color: '#10B981', fontWeight: 800 }}>{formatAmount(item.grossProfitMinor)}</td>
                            <td style={{ padding: '12px 10px', color: '#34D399' }}>{formatAmount(item.depositsMinor)}</td>
                            <td style={{ padding: '12px 10px', color: '#F87171' }}>{formatAmount(item.withdrawalsMinor)}</td>
                            <td style={{ padding: '12px 10px', fontWeight: 800 }}>{formatAmount(item.netCashflowMinor)}</td>
                            <td style={{ padding: '12px 10px', color: '#94A3B8' }}>{item.betsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: STAFF MANAGEMENT (CREATOR & BUSINESS OWNER)           */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'staff' && (
            <div>
              {/* Header & Sub-Tab Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0 }}>Staff & Cashier Agent Management</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0 0' }}>
                    Manage retail cashier agents, float balances, payment accounts, and management roles.
                  </p>
                </div>

                {/* Sub-Tab Switcher */}
                <div style={{ display: 'flex', gap: '8px', backgroundColor: '#0B1320', padding: '4px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                  <button
                    type="button"
                    onClick={() => setStaffViewMode('agents')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: staffViewMode === 'agents' ? '#10B981' : 'transparent',
                      color: staffViewMode === 'agents' ? '#0F172A' : '#94A3B8',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>💼 Cashier Agents (Float Model)</span>
                    <span style={{
                      backgroundColor: staffViewMode === 'agents' ? 'rgba(0,0,0,0.2)' : '#1E293B',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                    }}>
                      {agentsList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStaffViewMode('management')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: staffViewMode === 'management' ? '#3B82F6' : 'transparent',
                      color: staffViewMode === 'management' ? '#FFFFFF' : '#94A3B8',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>👥 Management Staff</span>
                    <span style={{
                      backgroundColor: staffViewMode === 'management' ? 'rgba(255,255,255,0.2)' : '#1E293B',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                    }}>
                      {staffList.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: CASHIER AGENTS */}
              {staffViewMode === 'agents' && (
                <div>
                  {/* Info Box */}
                  <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div style={{ maxWidth: '800px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#34D399', marginBottom: '4px' }}>
                        ⚡ Retail Cashier Float Operating Model
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                        Agents receive real cash/transfers directly to their Telebirr or CBE account. When an agent approves a player deposit, the system <strong style={{ color: '#F8FAFC' }}>automatically deducts</strong> that amount from their Float Balance. When approving withdrawals, their float balance is <strong style={{ color: '#F8FAFC' }}>reimbursed</strong>.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={fetchAgentsList}
                        disabled={agentsLoading}
                        style={{
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          color: '#94A3B8',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ↻ Refresh
                      </button>

                      <button
                        onClick={() => setShowAddAgentModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: '#10B981',
                          color: '#000',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontSize: '13px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        + REGISTER CASHIER AGENT
                      </button>
                    </div>
                  </div>

                  {/* Agents Table */}
                  <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', backgroundColor: '#0B1320' }}>
                          <th style={{ padding: '14px 16px' }}>AGENT / USERNAME</th>
                          <th style={{ padding: '14px 16px' }}>PHONE</th>
                          <th style={{ padding: '14px 16px' }}>FLOAT WALLET BALANCE</th>
                          <th style={{ padding: '14px 16px' }}>PAYMENT ACCOUNTS</th>
                          <th style={{ padding: '14px 16px' }}>HISTORICAL ACTIVITY</th>
                          <th style={{ padding: '14px 16px' }}>STATUS</th>
                          <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                              {agentsLoading ? 'Loading cashier agents...' : 'No cashier agents registered yet. Click "+ REGISTER CASHIER AGENT" to add one.'}
                            </td>
                          </tr>
                        ) : (
                          agentsList.map((ag) => (
                            <tr key={ag.id} style={{ borderBottom: '1px solid #1E293B' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 800, color: '#F8FAFC' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, fontSize: '13px',
                                  }}>
                                    {ag.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div>{ag.username}</div>
                                    <div style={{ fontSize: '10px', color: '#64748B' }}>Role: OPERATOR</div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px', color: '#94A3B8' }}>{ag.phone}</td>

                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 900, color: ag.floatBalanceETB > 1000 ? '#34D399' : '#F59E0B' }}>
                                  {ag.floatBalanceETB.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748B' }}>
                                  Total Top-Ups: {ag.totalFloatCreditedETB.toLocaleString('en-US', { minimumFractionDigits: 0 })} ETB
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                {ag.telebirrNumber && (
                                  <div style={{ fontSize: '12px', color: '#E2E8F0', marginBottom: '2px' }}>
                                    📱 <strong style={{ color: '#F8FAFC' }}>{ag.telebirrNumber}</strong>
                                    {ag.telebirrName && <span style={{ color: '#94A3B8' }}> ({ag.telebirrName})</span>}
                                  </div>
                                )}
                                {ag.cbeNumber && (
                                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                                    🏦 CBE: <strong style={{ color: '#CBD5E1' }}>{ag.cbeNumber}</strong>
                                    {ag.cbeName && <span> ({ag.cbeName})</span>}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '14px 16px', fontSize: '11px', color: '#94A3B8' }}>
                                <div>Approved Dep: <strong style={{ color: '#10B981' }}>{ag.totalDepositsApprovedETB.toLocaleString('en-US', { minimumFractionDigits: 0 })} ETB</strong></div>
                                <div>Approved W/D: <strong style={{ color: '#3B82F6' }}>{ag.totalWithdrawalsApprovedETB.toLocaleString('en-US', { minimumFractionDigits: 0 })} ETB</strong></div>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                <span style={{
                                  backgroundColor: ag.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: ag.isActive ? '#34D399' : '#F87171',
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                                }}>
                                  {ag.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => {
                                      setShowTopUpModal(ag);
                                      setTopUpAmount('20000');
                                      setTopUpNote('');
                                    }}
                                    style={{
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                      border: '1px solid #10B981',
                                      color: '#34D399',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    + Top Up Float
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: MANAGEMENT STAFF */}
              {staffViewMode === 'management' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                    <button
                      onClick={() => setShowAddStaffModal(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        backgroundColor: '#3B82F6', color: '#fff', border: 'none',
                        padding: '10px 18px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                      }}
                    >
                      <Users size={16} /> + ADD NEW STAFF
                    </button>
                  </div>

                  <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', backgroundColor: '#0B1320' }}>
                          <th style={{ padding: '14px 16px' }}>STAFF USERNAME</th>
                          <th style={{ padding: '14px 16px' }}>PHONE</th>
                          <th style={{ padding: '14px 16px' }}>ASSIGNED ROLE</th>
                          <th style={{ padding: '14px 16px' }}>STATUS</th>
                          <th style={{ padding: '14px 16px' }}>CREATED</th>
                          <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((st) => (
                          <tr key={st.id} style={{ borderBottom: '1px solid #1E293B' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#F8FAFC' }}>
                              {st.username}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#94A3B8' }}>{st.phone}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                backgroundColor: st.roles.includes('CREATOR') ? '#78350F' : st.roles.includes('BUSINESS_OWNER') ? '#1E3A8A' : '#064E3B',
                                color: st.roles.includes('CREATOR') ? '#FDE68A' : st.roles.includes('BUSINESS_OWNER') ? '#93C5FD' : '#A7F3D0',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                              }}>
                                {st.roles.join(', ')}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <StatusBadge status={st.status} />
                            </td>
                            <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                              {formatDate(st.createdAt)}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              {adminUser?.id !== st.id && (
                                <button
                                  onClick={() => handleDeleteStaff(st.id, st.username)}
                                  style={{
                                    backgroundColor: 'transparent', border: '1px solid #EF4444', color: '#EF4444',
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                                  }}
                                >
                                  DELETE
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 5: PLAYERS MANAGEMENT (FREEZE / UNFREEZE)                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'players' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Player Accounts & Risk Control</h2>
                  <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                    Search registered players, view wallet balances, and activate or freeze player accounts.
                  </p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Search phone or username..."
                      style={{
                        backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px',
                        padding: '8px 12px 8px 34px', color: '#F8FAFC', fontSize: '12px', outline: 'none',
                      }}
                    />
                  </div>
                  <select
                    value={playerStatusFilter}
                    onChange={(e) => setPlayerStatusFilter(e.target.value)}
                    style={{
                      backgroundColor: '#1E293B', color: '#F8FAFC', border: '1px solid #334155',
                      borderRadius: '8px', padding: '8px 12px', fontSize: '12px',
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="FROZEN">Frozen Only</option>
                    <option value="SUSPENDED">Suspended Only</option>
                    <option value="SELF_EXCLUDED">Self-Excluded Only</option>
                    <option value="SELF_EXCLUDED">Self-Excluded Only</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', backgroundColor: '#0B1320' }}>
                      <th style={{ padding: '14px 16px' }}>PLAYER</th>
                      <th style={{ padding: '14px 16px' }}>PHONE</th>
                      <th style={{ padding: '14px 16px' }}>WALLET BALANCE</th>
                      <th style={{ padding: '14px 16px' }}>LOCKED FUNDS</th>
                      <th style={{ padding: '14px 16px' }}>ACCOUNT STATUS</th>
                      <th style={{ padding: '14px 16px' }}>SELF-EXCLUSION</th>
                      <th style={{ padding: '14px 16px' }}>SELF-EXCLUSION</th>
                      <th style={{ padding: '14px 16px' }}>JOINED</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerList.map((p) => {
                      const isFrozen = p.status === 'FROZEN';
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: '#F8FAFC' }}>{p.username}</td>
                          <td style={{ padding: '14px 16px', color: '#94A3B8' }}>{p.phone}</td>
                          <td style={{ padding: '14px 16px', color: '#10B981', fontWeight: 800 }}>{formatAmount(p.balanceMinor)}</td>
                          <td style={{ padding: '14px 16px', color: '#F59E0B' }}>{formatAmount(p.lockedMinor)}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <StatusBadge status={p.status} />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {p.selfExcludedUntil && new Date(p.selfExcludedUntil) > new Date() ? (
                              <span style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                              }}>
                                Until {new Date(p.selfExcludedUntil).toLocaleDateString()}
                              </span>
                            ) : (
                              <span style={{ color: '#64748B', fontSize: '12px' }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>{formatDate(p.createdAt)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            {p.selfExcludedUntil && new Date(p.selfExcludedUntil) > new Date() ? (
                              <button
                                onClick={() => handleToggleSelfExclusion(p.id, true)}
                                style={{
                                  backgroundColor: '#1E3A8A', color: '#93C5FD',
                                  border: '1px solid #3B82F6', padding: '6px 12px', borderRadius: '6px',
                                  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                                }}
                              >
                                ▶️ STOP EXCLUSION
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleSelfExclusion(p.id, false)}
                                style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#F87171',
                                  border: '1px solid rgba(239, 68, 68, 0.4)', padding: '6px 10px', borderRadius: '6px',
                                  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                                }}
                              >
                                ⏸️ EXCLUDE (7D)
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleFreeze(p.id, p.status)}
                              style={{
                                backgroundColor: isFrozen ? '#064E3B' : '#7F1D1D',
                                color: isFrozen ? '#34D399' : '#FCA5A5',
                                border: 'none', padding: '6px 12px', borderRadius: '6px',
                                fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                              }}
                            >
                              {isFrozen ? '✅ UNFREEZE' : '❄️ FREEZE'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 6: SET RTP (CREATOR ONLY)                                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'rtp' && isCreator && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>RTP Engine & Theoretical Paytables</h2>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
                Creator authority: Set target theoretical Return To Player (RTP) and certified mathematical constraints.
              </p>

              <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Configured Platform RTP</h3>
                  <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    Active in Engine: {currentPlatformRtp}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {[92.0, 94.0, 95.82, 96.0, 98.0].map((preset) => {
                    const isSelected = Math.abs(Number(targetRtpInput) - preset) < 0.05;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setTargetRtpInput(preset);
                          const previewPaytable = getPaytableForRtp(preset);
                          const previewAnalysis = calculateOverallRtp(previewPaytable, 1, 10);
                          setMathAnalysis(previewAnalysis);
                        }}
                        style={{
                          backgroundColor: isSelected ? '#F59E0B' : '#1E293B',
                          color: isSelected ? '#000' : '#F8FAFC',
                          border: isSelected ? '2px solid #F59E0B' : '1px solid #334155',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {preset}%
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleSaveRtp}
                    disabled={rtpSaving}
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: '#10B981',
                      color: '#000',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: 900,
                      cursor: rtpSaving ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      opacity: rtpSaving ? 0.7 : 1,
                    }}
                  >
                    {rtpSaving ? 'SAVING...' : 'APPLY RTP CONFIGURATION'}
                  </button>
                </div>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Spot Analysis Table (1–5 Spots)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '12px' }}>
                      <th style={{ padding: '10px' }}>SPOTS</th>
                      <th style={{ padding: '10px' }}>THEORETICAL RTP</th>
                      <th style={{ padding: '10px' }}>HOUSE EDGE</th>
                      <th style={{ padding: '10px' }}>HIT FREQUENCY</th>
                      <th style={{ padding: '10px' }}>MAX MULTIPLIER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mathAnalysis?.spotAnalyses?.map((s: any) => (
                      <tr key={s.spots} style={{ borderBottom: '1px solid #1E293B', fontSize: '13px' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#FBBF24' }}>Spot {s.spots}</td>
                        <td style={{ padding: '12px 10px', color: '#10B981', fontWeight: 700 }}>{(s.theoreticalRtp * 100).toFixed(2)}%</td>
                        <td style={{ padding: '12px 10px', color: '#F59E0B' }}>{(s.houseEdge * 100).toFixed(2)}%</td>
                        <td style={{ padding: '12px 10px' }}>{(s.hitFrequency * 100).toFixed(2)}%</td>
                        <td style={{ padding: '12px 10px', fontWeight: 800 }}>{s.maxMultiplier.toLocaleString()}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 7: WHOLE SYSTEM EMERGENCY CONTROL (CREATOR ONLY)         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'system' && isCreator && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Whole-System Operational Control</h2>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
                Creator authority: Immediate platform killswitch and emergency maintenance mode.
              </p>

              <div style={{
                backgroundColor: systemStatus.isSystemActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                border: `2px solid ${systemStatus.isSystemActive ? '#10B981' : '#EF4444'}`,
                borderRadius: '16px', padding: '32px', maxWidth: '750px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '12px',
                    backgroundColor: systemStatus.isSystemActive ? '#064E3B' : '#7F1D1D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Power size={28} color={systemStatus.isSystemActive ? '#34D399' : '#FCA5A5'} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: systemStatus.isSystemActive ? '#34D399' : '#FCA5A5' }}>
                      {systemStatus.isSystemActive ? 'SYSTEM OPERATIONAL (ACTIVE)' : 'MAINTENANCE MODE (DEACTIVATED)'}
                    </h3>
                    <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>
                      Last toggled by {systemStatus.lastToggledBy || 'Administrator'} at {formatDate(systemStatus.lastToggledAt || '')}
                    </p>
                  </div>
                </div>

                <p style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                  {systemStatus.isSystemActive
                    ? 'The platform is currently operating normally. Real-time draw rounds and wagers are active across all channels.'
                    : 'Platform maintenance mode is currently active. Player bets are blocked and round scheduler is halted.'}
                </p>

                <button
                  onClick={handleToggleSystem}
                  disabled={systemToggling}
                  style={{
                    backgroundColor: systemStatus.isSystemActive ? '#EF4444' : '#10B981',
                    color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px',
                    fontSize: '14px', fontWeight: 900, cursor: 'pointer',
                    boxShadow: `0 8px 24px ${systemStatus.isSystemActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  }}
                >
                  {systemStatus.isSystemActive ? '🔴 DEACTIVATE WHOLE SYSTEM (EMERGENCY KILLSWITCH)' : '🟢 RESUME SYSTEM OPERATIONS'}
                </button>
              </div>
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 8: ROUNDS & CSPRNG                                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'rounds' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Game Rounds & CSPRNG Inspector</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rounds.map((r) => (
                  <div key={r.id} style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ color: '#FBBF24', fontSize: '16px', fontWeight: 900 }}>Round #{r.roundNumber}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                      {r.drawResult?.map((ball: number) => (
                        <span key={ball} style={{ backgroundColor: '#2563EB', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                          {ball}
                        </span>
                      ))}
                    </div>
                    <p style={{ color: '#64748B', fontSize: '11px', fontFamily: 'monospace', marginTop: '6px' }}>
                      SHA-256: {r.resultHash || 'Pending...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 9: PAYTABLE                                              */}
        {/* ───────────────────────────────────────────────────────────── */}
        {
          activeTab === 'paytable' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Certified Paytable v1.0</h2>
              <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                  {DEFAULT_96_PAYTABLE_ENTRIES.map((entry, idx) => (
                    <div key={idx} style={{ backgroundColor: '#1E293B', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>SPOT {entry.spots} • {entry.hits} HITS</p>
                      <h4 style={{ color: '#FBBF24', fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>{entry.multiplier}x</h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }
      </div >

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: WITHDRAWAL REVIEW & FULL USER TRANSACTION HISTORY      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {
        selectedWithdrawalRequest && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            backdropFilter: 'blur(6px)', padding: '20px',
          }}>
            <div style={{
              backgroundColor: '#0F172A', border: '1.5px solid #EF4444',
              borderRadius: '18px', width: '900px', maxWidth: '96vw', maxHeight: '92vh',
              display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #1E293B',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#1E1B4B',
              }}>
                <div>
                  <span style={{ backgroundColor: '#EF4444', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '4px' }}>
                    WITHDRAWAL APPROVAL AUDIT
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, marginTop: '6px', color: '#F8FAFC' }}>
                    Reviewing {formatAmount(selectedWithdrawalRequest.amountMinor)} Withdrawal Request
                  </h3>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>
                    Operator is inspecting complete user transaction ledger before approving payout.
                  </p>
                </div>

                <button
                  onClick={() => { setSelectedWithdrawalRequest(null); setUserFinancialHistory(null); }}
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', fontSize: '24px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                    Loading complete player financial history...
                  </div>
                ) : userFinancialHistory ? (
                  <div>
                    {/* User Profile Banner */}
                    <div style={{
                      backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
                    }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#FBBF24' }}>
                          Player: {userFinancialHistory.user.username} ({userFinancialHistory.user.phone})
                        </h4>
                        <p style={{ color: '#94A3B8', fontSize: '12px', marginTop: '4px' }}>
                          Status: <strong style={{ color: userFinancialHistory.user.status === 'ACTIVE' ? '#34D399' : '#F87171' }}>{userFinancialHistory.user.status}</strong> • KYC Tier: {userFinancialHistory.user.kycStatus} • Registered: {formatDate(userFinancialHistory.user.createdAt)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleFreeze(userFinancialHistory.user.id, userFinancialHistory.user.status)}
                        style={{
                          backgroundColor: userFinancialHistory.user.status === 'FROZEN' ? '#064E3B' : '#7F1D1D',
                          color: userFinancialHistory.user.status === 'FROZEN' ? '#34D399' : '#FECACA',
                          border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, cursor: 'pointer',
                        }}
                      >
                        {userFinancialHistory.user.status === 'FROZEN' ? '✅ UNFREEZE ACCOUNT' : '❄️ FREEZE SUSPICIOUS ACCOUNT'}
                      </button>
                    </div>

                    {/* Lifetime Financial Summary Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ backgroundColor: '#0B1320', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>CURRENT WALLET BALANCE</span>
                        <h4 style={{ color: '#10B981', fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                          {formatAmount(userFinancialHistory.wallet.balanceMinor)}
                        </h4>
                        <span style={{ color: '#F59E0B', fontSize: '11px' }}>
                          Locked for payout: {formatAmount(userFinancialHistory.wallet.lockedMinor)}
                        </span>
                      </div>

                      <div style={{ backgroundColor: '#0B1320', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>TOTAL DEPOSITED</span>
                        <h4 style={{ color: '#34D399', fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                          {formatAmount(userFinancialHistory.summary.totalDepositsMinor)}
                        </h4>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>{userFinancialHistory.summary.depositCount} deposits</span>
                      </div>

                      <div style={{ backgroundColor: '#0B1320', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>TOTAL WITHDRAWN</span>
                        <h4 style={{ color: '#F87171', fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                          {formatAmount(userFinancialHistory.summary.totalWithdrawalsMinor)}
                        </h4>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>{userFinancialHistory.summary.withdrawalCount} payouts</span>
                      </div>

                      <div style={{ backgroundColor: '#0B1320', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>TOTAL BETS WAGERED</span>
                        <h4 style={{ color: '#60A5FA', fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                          {formatAmount(userFinancialHistory.summary.totalBetsMinor)}
                        </h4>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>{userFinancialHistory.summary.betCount} tickets</span>
                      </div>

                      <div style={{ backgroundColor: '#0B1320', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>TOTAL WINNINGS PAID</span>
                        <h4 style={{ color: '#FBBF24', fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>
                          {formatAmount(userFinancialHistory.summary.totalWinsMinor)}
                        </h4>
                      </div>

                      <div style={{ backgroundColor: '#0B1320', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>NET GAMING PROFIT</span>
                        <h4 style={{
                          color: BigInt(userFinancialHistory.summary.netGamingProfitMinor) >= 0n ? '#34D399' : '#F87171',
                          fontSize: '20px', fontWeight: 900, marginTop: '4px'
                        }}>
                          {formatAmount(userFinancialHistory.summary.netGamingProfitMinor)}
                        </h4>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>Player P&L vs house</span>
                      </div>
                    </div>

                    {/* Transaction History Table */}
                    <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
                      Complete Chronological Transaction Ledger
                    </h4>
                    <div style={{ backgroundColor: '#0B1320', borderRadius: '10px', border: '1px solid #1E293B', maxHeight: '220px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', backgroundColor: '#030712' }}>
                            <th style={{ padding: '8px 12px' }}>DATE / TIME</th>
                            <th style={{ padding: '8px 12px' }}>TRANSACTION</th>
                            <th style={{ padding: '8px 12px' }}>AMOUNT</th>
                            <th style={{ padding: '8px 12px' }}>BALANCE AFTER</th>
                            <th style={{ padding: '8px 12px' }}>REFERENCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userFinancialHistory.ledgerTransactions.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>No ledger entries found</td></tr>
                          ) : (
                            userFinancialHistory.ledgerTransactions.map((tx: any) => {
                              const isPositive = BigInt(tx.amountMinor) > 0n;
                              return (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #1E293B' }}>
                                  <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{formatDate(tx.createdAt)}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 800 }}>{tx.transactionType}</td>
                                  <td style={{ padding: '8px 12px', color: isPositive ? '#34D399' : '#F87171', fontWeight: 800 }}>
                                    {isPositive ? '+' : ''}{formatAmount(tx.amountMinor)}
                                  </td>
                                  <td style={{ padding: '8px 12px', color: '#CBD5E1' }}>{formatAmount(tx.balanceAfterMinor)}</td>
                                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748B' }}>
                                    {tx.referenceId ? tx.referenceId.slice(0, 16) : '—'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Decision Controls */}
                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1E293B' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>
                        OPERATOR AUDIT DECISION NOTE:
                      </label>
                      <input
                        type="text"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="e.g. Verified legit win history. Telebirr account matches registered player."
                        style={{
                          width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155',
                          borderRadius: '8px', padding: '12px', color: '#F8FAFC', fontSize: '13px', marginBottom: '14px',
                        }}
                      />

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleAction(selectedWithdrawalRequest.id, 'withdrawal', 'reject', reviewNote)}
                          disabled={processing[selectedWithdrawalRequest.id]}
                          style={{
                            backgroundColor: '#EF4444', color: '#fff', border: 'none',
                            padding: '12px 24px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                          }}
                        >
                          REJECT WITHDRAWAL
                        </button>

                        <button
                          onClick={() => handleAction(selectedWithdrawalRequest.id, 'withdrawal', 'approve', reviewNote)}
                          disabled={processing[selectedWithdrawalRequest.id]}
                          style={{
                            backgroundColor: '#10B981', color: '#000', border: 'none',
                            padding: '12px 28px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                          }}
                        >
                          CONFIRM & APPROVE WITHDRAWAL PAYOUT
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      }

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: REGISTER CASHIER AGENT (FLOAT MODEL)                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {
        showAddAgentModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}>
            <form onSubmit={handleRegisterAgent} style={{
              backgroundColor: '#0F172A', border: '1.5px solid #10B981', borderRadius: '16px',
              padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>
                  Register New Cashier Agent
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '20px' }}>
                Creates an Operator account with dedicated float balance and Telebirr/CBE payment accounts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    PHONE NUMBER *
                  </label>
                  <input
                    type="text"
                    required
                    value={agentForm.phone}
                    onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                    placeholder="e.g. 0912345678"
                    style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      LOGIN USERNAME *
                    </label>
                    <input
                      type="text"
                      required
                      value={agentForm.username}
                      onChange={(e) => setAgentForm({ ...agentForm, username: e.target.value })}
                      placeholder="e.g. agent_kassahun"
                      style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      PASSWORD *
                    </label>
                    <input
                      type="password"
                      required
                      value={agentForm.password}
                      onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                      style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', padding: '12px', borderRadius: '8px' }}>
                  <label style={{ color: '#34D399', fontSize: '11px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                    INITIAL FLOAT BALANCE (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={agentForm.initialFloatETB}
                    onChange={(e) => setAgentForm({ ...agentForm, initialFloatETB: e.target.value })}
                    placeholder="e.g. 20000"
                    style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid #10B981', color: '#34D399', padding: '10px', borderRadius: '8px', fontWeight: 900, fontSize: '16px', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                    Cash received in advance: credited directly into agent's float wallet.
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1E293B', paddingTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#CBD5E1', marginBottom: '8px' }}>
                    Agent Payment Accounts (Shown to Players)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        TELEBIRR NUMBER
                      </label>
                      <input
                        type="text"
                        value={agentForm.telebirrNumber}
                        onChange={(e) => setAgentForm({ ...agentForm, telebirrNumber: e.target.value })}
                        placeholder="e.g. 0912345678"
                        style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        TELEBIRR ACCOUNT NAME
                      </label>
                      <input
                        type="text"
                        value={agentForm.telebirrName}
                        onChange={(e) => setAgentForm({ ...agentForm, telebirrName: e.target.value })}
                        placeholder="e.g. Kassahun T."
                        style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        CBE ACCOUNT NUMBER (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        value={agentForm.cbeNumber}
                        onChange={(e) => setAgentForm({ ...agentForm, cbeNumber: e.target.value })}
                        placeholder="e.g. 100012345678"
                        style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        CBE ACCOUNT NAME (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        value={agentForm.cbeName}
                        onChange={(e) => setAgentForm({ ...agentForm, cbeName: e.target.value })}
                        placeholder="e.g. Kassahun T."
                        style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #334155', color: '#94A3B8', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={agentSaving}
                  style={{
                    backgroundColor: '#10B981', color: '#000', border: 'none',
                    padding: '10px 22px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer',
                    opacity: agentSaving ? 0.6 : 1,
                  }}
                >
                  {agentSaving ? 'Registering...' : 'Register Cashier Agent'}
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TOP UP AGENT FLOAT BALANCE                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {
        showTopUpModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}>
            <form onSubmit={handleTopUpFloat} style={{
              backgroundColor: '#0F172A', border: '1.5px solid #10B981', borderRadius: '16px',
              padding: '28px', width: '440px', maxWidth: '95vw',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>
                  Top Up Agent Float Balance
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Agent Details Card */}
              <div style={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '18px',
              }}>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Cashier Agent:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC' }}>
                  {showTopUpModal.username} ({showTopUpModal.phone})
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#94A3B8' }}>Current Float:</span>
                  <span style={{ fontWeight: 900, color: '#34D399' }}>
                    {showTopUpModal.floatBalanceETB?.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  QUICK PRESETS (ETB)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['5000', '10000', '20000', '50000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      style={{
                        backgroundColor: topUpAmount === preset ? '#10B981' : '#1E293B',
                        color: topUpAmount === preset ? '#000' : '#F8FAFC',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      +{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  TOP UP AMOUNT (ETB) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  style={{
                    width: '100%',
                    backgroundColor: '#1E293B',
                    border: '1.5px solid #10B981',
                    color: '#34D399',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 900,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Note / Memo */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  REFERENCE NOTE / MEMO (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  placeholder="e.g. Cash received via CBE transfer ref #12345"
                  style={{
                    width: '100%',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(null)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #334155', color: '#94A3B8', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpSaving}
                  style={{
                    backgroundColor: '#10B981', color: '#000', border: 'none',
                    padding: '10px 22px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer',
                    opacity: topUpSaving ? 0.6 : 1,
                  }}
                >
                  {topUpSaving ? 'Crediting Float...' : 'Confirm Top Up'}
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* MODAL: ADD NEW STAFF                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {
        showAddStaffModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}>
            <form onSubmit={handleCreateStaff} style={{
              backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px',
              padding: '32px', width: '420px', maxWidth: '95vw',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px' }}>Add New Staff Member</h3>
              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '20px' }}>
                {isOwner ? 'You are creating an OPERATOR account.' : 'Select staff role and initial credentials.'}
              </p>

              {staffActionError && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#FCA5A5', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
                  {staffActionError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    STAFF ROLE
                  </label>
                  {isOwner ? (
                    <input
                      disabled
                      value="OPERATOR"
                      style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#10B981', padding: '10px', borderRadius: '8px', fontWeight: 800 }}
                    />
                  ) : (
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value as any)}
                      style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                    >
                      <option value="OPERATOR">Operator (Approvals, user freeze, daily audit)</option>
                      <option value="BUSINESS_OWNER">Business Owner (Audits, operator management)</option>
                      <option value="CREATOR">Creator (Super Admin)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="e.g. 0912345678"
                    style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="e.g. operator_alex"
                    style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    INITIAL PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #334155', color: '#94A3B8', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#10B981', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CHANGE PASSWORD                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {
        showChangePasswordModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}>
            <form onSubmit={handleChangePassword} style={{
              backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px',
              padding: '32px', width: '400px', maxWidth: '95vw',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px' }}>Change Account Password</h3>
              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '18px' }}>
                Update your console credentials.
              </p>

              {passwordMsg && (
                <div style={{
                  backgroundColor: passwordMsg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: passwordMsg.type === 'success' ? '#34D399' : '#FCA5A5',
                  padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '14px'
                }}>
                  {passwordMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <input
                  type="password"
                  required
                  placeholder="Current Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                />
                <input
                  type="password"
                  required
                  placeholder="New Password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                />
                <input
                  type="password"
                  required
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #334155', color: '#94A3B8', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  style={{ backgroundColor: '#10B981', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )
      }
    </div >
  );
}
