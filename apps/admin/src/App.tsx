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
} from 'lucide-react';
import { calculateOverallRtp, DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';

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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#713F12', text: '#FDE68A' },
    APPROVED: { bg: '#064E3B', text: '#34D399' },
    REJECTED: { bg: '#7F1D1D', text: '#FCA5A5' },
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/login`, {
        phone: phone.trim(),
        password,
      });
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

  const setDemoAccount = (u: string, p: string) => {
    setPhone(u);
    setPassword(p);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#0A0F1D', padding: '20px',
    }}>
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
              placeholder="e.g. 0900000000, admin, owner, or operator"
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

        {/* Quick Role Fill shortcuts */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #1E293B' }}>
          <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>
            QUICK LOGIN DEMO ACCOUNTS:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setDemoAccount('admin', 'admin123')}
              style={{
                backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '6px',
                padding: '6px 4px', color: '#FBBF24', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              👑 Creator
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('owner', 'owner123')}
              style={{
                backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '6px',
                padding: '6px 4px', color: '#60A5FA', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              🏢 Owner
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('operator', 'operator123')}
              style={{
                backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '6px',
                padding: '6px 4px', color: '#34D399', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              ⚡ Operator
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────── MAIN APP ─────────────────────── */

export default function App() {
  type TabType = 'overview' | 'payments' | 'audits' | 'staff' | 'players' | 'rtp' | 'system' | 'rounds' | 'paytable';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
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
  const [targetRtpInput, setTargetRtpInput] = useState<number>(96.0);
  const [rtpSaving, setRtpSaving] = useState(false);

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

  const fetchData = () => {
    if (!adminToken) return;
    const analysis = calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10);
    setMathAnalysis(analysis);

    axios.get(`${API_URL}/api/v1/keno/rounds/recent`)
      .then((res) => setRounds(res.data))
      .catch(() => {});

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
      .catch(() => {});

    // Audit logs
    axios.get(`${API_URL}/api/v1/audit/recent?limit=50`, { headers: authHeaders })
      .then((res) => setAuditLogs(res.data))
      .catch(() => {});

    // System status
    axios.get(`${API_URL}/api/v1/admin/system/status`, { headers: authHeaders })
      .then((res) => setSystemStatus(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!adminToken) return;
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [adminToken]);

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
      await axios.post(
        `${API_URL}/api/v1/admin/system/rtp`,
        { targetRtp: targetRtpInput },
        { headers: authHeaders }
      );
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

  const filteredRequests = paymentRequests.filter((r) =>
    filterStatus === 'ALL' ? true : r.status === filterStatus
  );
  const pendingCount = paymentRequests.filter((r) => r.status === 'PENDING').length;

  const sideNavBtn = (tab: TabType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0F1D', color: '#F8FAFC' }}>
      {/* Sidebar */}
      <div style={{
        width: '270px', backgroundColor: '#0F172A', borderRight: '1px solid #1E293B',
        padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px'
      }}>
        {/* Brand */}
        <div style={{ marginBottom: '20px', paddingLeft: '8px' }}>
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

        {/* Global Emergency System Indicator for Creator */}
        {isCreator && (
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
        )}

        {/* Navigation Items based on authorization */}
        {sideNavBtn('overview', <TrendingUp size={18} />, 'Dashboard Overview')}

        {/* Creator & Operator have access to Payments & Withdrawals */}
        {(isCreator || isOperator) && (
          sideNavBtn('payments', <DollarSign size={18} />, 'Payment Approvals')
        )}

        {/* Profit Audits: Creator, Business Owner, and Operator (Daily only) */}
        {sideNavBtn(
          'audits',
          <BarChart3 size={18} />,
          isOperator ? 'Daily Audit' : 'Profit Audits'
        )}

        {/* Staff Management: Creator & Business Owner */}
        {(isCreator || isOwner) && (
          sideNavBtn('staff', <Users size={18} />, isCreator ? 'Staff Management' : 'Operator Staff')
        )}

        {/* Player Accounts: All 3 tiers */}
        {sideNavBtn('players', <UserCheck size={18} />, 'Player Accounts')}

        {/* RTP Engine & System Kill Switch: Creator only */}
        {isCreator && (
          <>
            {sideNavBtn('rtp', <Award size={18} />, 'Set RTP & Paytables')}
            {sideNavBtn('system', <Power size={18} />, 'System Control')}
            {sideNavBtn('rounds', <Activity size={18} />, 'Rounds & CSPRNG')}
            {sideNavBtn('paytable', <Layers size={18} />, 'Certified Paytables')}
          </>
        )}

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
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: OVERVIEW DASHBOARD                                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
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
              <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>PENDING PAYMENTS</p>
                <h3 style={{ color: '#FBBF24', fontSize: '26px', fontWeight: 900, marginTop: '4px' }}>{pendingCount}</h3>
                <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Requires operator decision</p>
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

            {/* Quick Actions for Operator */}
            {isOperator && pendingCount > 0 && (
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
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: PAYMENT QUEUE & WITHDRAWAL INSPECTOR                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'payments' && (
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
                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>AUTO-MATCHED SMS</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#34D399', fontSize: '22px', fontWeight: 900 }}>
                    {paymentRequests.filter((r) => r.requestType === 'DEPOSIT' && r.status === 'PENDING' && r.matchedEvidenceId).length}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '11px' }}>evidence verified</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>SMS COLLECTED</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#60A5FA', fontSize: '22px', fontWeight: 900 }}>{evidenceList.length}</span>
                  <span style={{ color: '#64748B', fontSize: '11px' }}>Telebirr / CBE / M-Pesa</span>
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div style={{
              display: 'flex', gap: '8px', borderBottom: '1px solid #1E293B',
              paddingBottom: '12px', marginBottom: '20px'
            }}>
              {[
                { id: 'queue', label: 'Review & Approval Queue', icon: <CheckCircle size={15} /> },
                { id: 'evidence', label: 'MacroDroid Live Stream', icon: <Smartphone size={15} /> },
                { id: 'simulator', label: 'SMS Simulator', icon: <Sparkles size={15} /> },
                { id: 'guide', label: 'MacroDroid Config', icon: <HelpCircle size={15} /> },
                { id: 'audit', label: 'Decision Audit Trail', icon: <History size={15} /> },
              ].map((sub) => (
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
                {/* Filter Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        style={{
                          backgroundColor: filterStatus === st ? '#1E293B' : 'transparent',
                          color: filterStatus === st ? '#FBBF24' : '#64748B',
                          border: `1px solid ${filterStatus === st ? '#FBBF24' : '#334155'}`,
                          padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                        }}
                      >
                        {st}
                      </button>
                    ))}
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
                            border: `1.5px solid ${
                              isWithdrawal
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
                                <span>User ID: <code style={{ color: '#94A3B8' }}>{r.userId.slice(0, 8)}</code></span>
                                <span>Submitted: {formatDate(r.createdAt)}</span>
                                {r.accountNumber && <span>Target Account: <strong style={{ color: '#FBBF24' }}>{r.accountNumber}</strong></span>}
                                {r.transactionReference && (
                                  <span>User Ref: <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{r.transactionReference}</strong></span>
                                )}
                              </div>
                            </div>
                          </div>

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
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Deposit & Withdrawal Decision Audit Trail</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditLogs.map((log) => (
                    <div key={log.id} style={{ backgroundColor: '#1E293B', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                      <span style={{ color: '#94A3B8' }}>{formatDate(log.timestamp)}</span> —{' '}
                      <strong style={{ color: '#FBBF24' }}>{log.action}</strong> by <span>{log.actorId.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: PROFIT AUDITS (DAILY, WEEKLY, MONTHLY)                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'audits' && (
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
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: STAFF MANAGEMENT (CREATOR & BUSINESS OWNER)           */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'staff' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Staff Authorization Management</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                  {isCreator
                    ? 'Creator authority: Full CRUD control over Business Owners, Operators, and Staff.'
                    : 'Business Owner authority: Create, edit, and delete Operator accounts only.'}
                </p>
              </div>

              <button
                onClick={() => setShowAddStaffModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: '#10B981', color: '#000', border: 'none',
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

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 5: PLAYERS MANAGEMENT (FREEZE / UNFREEZE)                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'players' && (
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
                        <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>{formatDate(p.createdAt)}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleToggleFreeze(p.id, p.status)}
                            style={{
                              backgroundColor: isFrozen ? '#064E3B' : '#7F1D1D',
                              color: isFrozen ? '#34D399' : '#FCA5A5',
                              border: 'none', padding: '6px 12px', borderRadius: '6px',
                              fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                            }}
                          >
                            {isFrozen ? '✅ UNFREEZE USER' : '❄️ FREEZE ACCOUNT'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 6: SET RTP (CREATOR ONLY)                                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'rtp' && isCreator && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>RTP Engine & Theoretical Paytables</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Creator authority: Set target theoretical Return To Player (RTP) and certified mathematical constraints.
            </p>

            <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Configured Platform RTP</h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {[92.0, 94.0, 95.82, 96.0, 98.0].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTargetRtpInput(preset)}
                    style={{
                      backgroundColor: targetRtpInput === preset ? '#F59E0B' : '#1E293B',
                      color: targetRtpInput === preset ? '#000' : '#F8FAFC',
                      border: 'none', padding: '10px 18px', borderRadius: '8px',
                      fontWeight: 900, cursor: 'pointer', fontSize: '14px',
                    }}
                  >
                    {preset}%
                  </button>
                ))}

                <button
                  onClick={handleSaveRtp}
                  disabled={rtpSaving}
                  style={{
                    marginLeft: 'auto', backgroundColor: '#10B981', color: '#000',
                    border: 'none', padding: '10px 24px', borderRadius: '8px',
                    fontWeight: 900, cursor: 'pointer', fontSize: '13px',
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
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 7: WHOLE SYSTEM EMERGENCY CONTROL (CREATOR ONLY)         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'system' && isCreator && (
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
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 8: ROUNDS & CSPRNG                                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'rounds' && (
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
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 9: PAYTABLE                                              */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'paytable' && (
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
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: WITHDRAWAL REVIEW & FULL USER TRANSACTION HISTORY      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedWithdrawalRequest && (
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
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD NEW STAFF                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddStaffModal && (
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
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CHANGE PASSWORD                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showChangePasswordModal && (
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
      )}
    </div>
  );
}
