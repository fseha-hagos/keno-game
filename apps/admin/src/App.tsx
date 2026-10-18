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
  return new Date(d).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#713F12', text: '#FDE68A' },
    APPROVED: { bg: '#064E3B', text: '#34D399' },
    REJECTED: { bg: '#7F1D1D', text: '#FCA5A5' },
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

      // Verify user has admin role
      const adminRoles = ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'];
      const hasAdminRole = user.roles?.some((r: string) => adminRoles.includes(r));
      if (!hasAdminRole) {
        setError('Access denied: This account has PLAYER role only. Use an admin account (default: 0900000000 or admin / admin123) to access the Admin Console.');
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

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#0A0F1D',
    }}>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: '#0F172A', padding: '48px 40px', borderRadius: '20px',
        border: '1px solid #1E293B', width: '420px', maxWidth: '95vw',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldCheck size={32} color="#fff" />
          </div>
          <h1 style={{ color: '#10B981', fontSize: '22px', fontWeight: 900, letterSpacing: '1px' }}>
            KENO OPERATOR
          </h1>
          <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
            Admin Console Login
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
              placeholder="e.g. 0900000000 or admin"
              required
              style={{
                width: '100%', backgroundColor: '#1E293B', border: '1px solid #334155',
                borderRadius: '10px', padding: '14px 14px 14px 40px', color: '#F8FAFC',
                fontSize: '14px', fontWeight: 600, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#10B981'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: '28px' }}>
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
              onFocus={(e) => e.target.style.borderColor = '#10B981'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
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
          {loading ? 'SIGNING IN...' : 'SIGN IN TO ADMIN CONSOLE'}
        </button>

        <p style={{ color: '#475569', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>
          Default: admin / admin123
        </p>
      </form>
    </div>
  );
}

/* ─────────────────────── MAIN APP ─────────────────────── */

export default function App() {
  type TabType = 'overview' | 'payments' | 'rtp' | 'rounds' | 'paytable';
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [rounds, setRounds] = useState<any[]>([]);
  const [mathAnalysis, setMathAnalysis] = useState<any>(null);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Payments sub-navigation tabs
  const [paymentsSubTab, setPaymentsSubTab] = useState<'queue' | 'evidence' | 'simulator' | 'guide' | 'audit'>('queue');
  const [showRawEvidence, setShowRawEvidence] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual evidence linking modal/dropdown
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

  // Auth state
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });

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

  // If not logged in, show login
  if (!adminToken) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  const fetchData = () => {
    const analysis = calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 5);
    setMathAnalysis(analysis);

    axios.get(`${API_URL}/api/v1/keno/rounds/recent`)
      .then((res) => setRounds(res.data))
      .catch(() => {});

    // Payment requests
    axios.get(`${API_URL}/api/v1/wallet/admin/payment-requests`, {
      headers: authHeaders,
    })
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

    // MacroDroid payment evidence feed
    axios.get(`${API_URL}/api/v1/payments/admin/evidence?limit=100`, {
      headers: authHeaders,
    })
      .then((res) => setEvidenceList(res.data))
      .catch(() => {});

    // Recent audit logs
    axios.get(`${API_URL}/api/v1/audit/recent?limit=50`, {
      headers: authHeaders,
    })
      .then((res) => setAuditLogs(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [adminToken]);

  const handleAction = async (
    id: string,
    type: 'deposit' | 'withdrawal',
    action: 'approve' | 'reject',
  ) => {
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      const url = `${API_URL}/api/v1/wallet/admin/${type}/${id}/${action}`;
      await axios.patch(url, { adminNote: actionNote[id] || undefined }, { headers: authHeaders });
      fetchData();
    } catch (err: any) {
      alert(`Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0F1D', color: '#F8FAFC' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', backgroundColor: '#0F172A', borderRight: '1px solid #1E293B', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ marginBottom: '24px', paddingLeft: '8px' }}>
          <h1 style={{ color: '#10B981', fontSize: '20px', fontWeight: 900, letterSpacing: '1px' }}>KENO OPERATOR</h1>
          <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700 }}>CERTIFIED ADMIN CONSOLE</p>
        </div>

        {sideNavBtn('overview', <TrendingUp size={18} />, 'Overview & Financials')}
        {sideNavBtn('payments', <DollarSign size={18} />, 'Payment Approvals')}
        {sideNavBtn('rtp', <BarChart3 size={18} />, 'RTP & Math Engine')}
        {sideNavBtn('rounds', <Activity size={18} />, 'Rounds & Live CSPRNG')}
        {sideNavBtn('paytable', <Layers size={18} />, 'Certified Paytables')}

        {/* Admin user info & logout */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '12px', backgroundColor: '#1E293B', borderRadius: '8px' }}>
            <p style={{ color: '#F8FAFC', fontSize: '12px', fontWeight: 700 }}>
              {adminUser?.username || 'Admin'}
            </p>
            <p style={{ color: '#64748B', fontSize: '10px' }}>
              {adminUser?.roles?.join(', ')}
            </p>
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

          <div style={{ padding: '12px', backgroundColor: '#064E3B', borderRadius: '8px', border: '1px solid #059669' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontSize: '12px', fontWeight: 800 }}>
              <ShieldCheck size={16} /> CSPRNG AUTHORITATIVE
            </div>
            <p style={{ color: '#A7F3D0', fontSize: '10px', marginTop: '4px' }}>RTP fixed at paytable level.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>Platform Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'THEORETICAL RTP', value: '95.82%', color: '#10B981', sub: 'Certified fixed math' },
                { label: 'THEORETICAL HOUSE EDGE', value: '4.18%', color: '#F59E0B', sub: '1.0 - RTP' },
                { label: 'ACTIVE GAME ENGINE', value: '80-Ball Keno', color: '#3B82F6', sub: '20 drawn per round' },
                { label: 'RNG ENGINE', value: 'CSPRNG', color: '#A855F7', sub: 'Fisher-Yates 20/80' },
              ].map((card) => (
                <div key={card.label} style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>{card.label}</p>
                  <h3 style={{ color: card.color, fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>{card.value}</h3>
                  <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>{card.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Recent Game Rounds</h3>
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
                  {rounds.slice(0, 8).map((r) => (
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

        {/* PAYMENT APPROVALS TAB */}
        {/* PAYMENT APPROVALS & AUTOMATED MATCHING TAB */}
        {activeTab === 'payments' && (
          <div>
            {/* Top Header & Overview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Automated Deposit Approval & Review Engine</h2>
                  <span style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399',
                    border: '1px solid #10B981', padding: '3px 10px', borderRadius: '999px',
                    fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px'
                  }}>
                    <Radio size={12} className="animate-pulse" /> MacroDroid Active
                  </span>
                </div>
                <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>
                  Automated SMS notification collection, multi-provider regex parsing, deposit matching engine, and atomic manual approval.
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
                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>AUTO-MATCHED WITH SMS</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#34D399', fontSize: '22px', fontWeight: 900 }}>
                    {paymentRequests.filter((r) => r.requestType === 'DEPOSIT' && r.status === 'PENDING' && r.matchedEvidenceId).length}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '11px' }}>evidence verified</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>TOTAL NOTIFICATIONS COLLECTED</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#60A5FA', fontSize: '22px', fontWeight: 900 }}>
                    {evidenceList.length}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '11px' }}>Telebirr / CBE / M-Pesa</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '16px 18px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>IMMUTABLE AUDIT LOGS</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#A855F7', fontSize: '22px', fontWeight: 900 }}>
                    {auditLogs.filter((a) => a.action?.includes('DEPOSIT')).length}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '11px' }}>recorded decisions</span>
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
                { id: 'simulator', label: 'SMS Notification Simulator', icon: <Sparkles size={15} /> },
                { id: 'guide', label: 'MacroDroid Android Config', icon: <HelpCircle size={15} /> },
                { id: 'audit', label: 'Audit Trail & Immutable Logs', icon: <History size={15} /> },
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
                    transition: 'all 0.15s',
                  }}
                >
                  {sub.icon} {sub.label}
                </button>
              ))}
            </div>

            {/* Error banner */}
            {fetchError && (
              <div style={{
                backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid #EF4444',
                borderRadius: '10px', padding: '14px 18px', marginBottom: '16px',
                color: '#FCA5A5', fontSize: '13px', fontWeight: 600,
              }}>
                ⚠️ {fetchError}
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 1: REVIEW & APPROVAL QUEUE                           */}
            {/* ───────────────────────────────────────────────────────────── */}
            {paymentsSubTab === 'queue' && (
              <div>
                {/* Filter buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>
                    Pending Deposit & Withdrawal Requests
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        style={{
                          padding: '6px 14px', borderRadius: '6px', border: 'none',
                          backgroundColor: filterStatus === s ? '#10B981' : '#1E293B',
                          color: filterStatus === s ? '#0F172A' : '#94A3B8',
                          fontWeight: 800, cursor: 'pointer', fontSize: '12px',
                        }}
                      >
                        {s} {s === 'PENDING' && pendingCount > 0 ? `(${pendingCount})` : ''}
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
                      const matched = r.matchedEvidence;
                      const hasMatch = Boolean(r.matchedEvidenceId && matched);

                      return (
                        <div
                          key={r.id}
                          style={{
                            backgroundColor: '#0F172A',
                            padding: '20px',
                            borderRadius: '14px',
                            border: `1.5px solid ${
                              hasMatch && r.status === 'PENDING'
                                ? '#10B981'
                                : r.status === 'PENDING'
                                ? '#713F12'
                                : '#1E293B'
                            }`,
                            boxShadow: hasMatch && r.status === 'PENDING' ? '0 0 20px rgba(16, 185, 129, 0.1)' : 'none',
                          }}
                        >
                          {/* Request Top Bar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <span style={{ color: '#FBBF24', fontSize: '18px', fontWeight: 900 }}>
                                  {r.requestType} — {formatAmount(r.amountMinor)}
                                </span>
                                <StatusBadge status={r.status} />

                                {hasMatch && r.status === 'PENDING' && (
                                  <span style={{
                                    backgroundColor: '#064E3B', color: '#34D399',
                                    border: '1px solid #10B981', padding: '3px 10px',
                                    borderRadius: '999px', fontSize: '11px', fontWeight: 800,
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                  }}>
                                    <Sparkles size={12} /> AUTO-MATCHED ({r.matchConfidence || 100}%)
                                  </span>
                                )}

                                {!hasMatch && r.requestType === 'DEPOSIT' && r.status === 'PENDING' && (
                                  <span style={{
                                    backgroundColor: '#451A03', color: '#FCD34D',
                                    border: '1px solid #F59E0B', padding: '3px 10px',
                                    borderRadius: '999px', fontSize: '11px', fontWeight: 800
                                  }}>
                                    ⌛ Awaiting SMS Evidence
                                  </span>
                                )}
                              </div>

                              <div style={{ color: '#64748B', fontSize: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span>Provider: <strong style={{ color: '#F1F5F9' }}>{r.paymentMethod?.toUpperCase()}</strong></span>
                                <span>Deposit ID: <code style={{ color: '#94A3B8' }}>{r.id.slice(0, 8)}</code></span>
                                <span>User ID: <code style={{ color: '#94A3B8' }}>{r.userId.slice(0, 8)}</code></span>
                                <span>Submitted: {formatDate(r.createdAt)}</span>
                                {r.transactionReference && (
                                  <span>User Ref: <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{r.transactionReference}</strong></span>
                                )}
                              </div>
                            </div>

                            {/* Unlink / Link action buttons */}
                            {r.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {hasMatch ? (
                                  <button
                                    onClick={() => handleUnlink(r.id)}
                                    style={{
                                      background: '#1E293B', border: '1px solid #334155', color: '#EF4444',
                                      padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                  >
                                    <Unlink2 size={12} /> Unlink Evidence
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setLinkingDepositId(r.id)}
                                    style={{
                                      background: '#1E293B', border: '1px solid #334155', color: '#60A5FA',
                                      padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                  >
                                    <Link2 size={12} /> Manual Match
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Matched Evidence Card Side-by-Side */}
                          {hasMatch && matched && (
                            <div style={{
                              backgroundColor: '#0B1320', border: '1px solid #1E293B',
                              borderRadius: '10px', padding: '14px 16px', marginBottom: '16px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Smartphone size={16} color="#10B981" />
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#34D399' }}>
                                    MATCHED PAYMENT EVIDENCE (Phone: {matched.deviceId || 'Android Primary'})
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                                    Received: {formatDate(matched.receivedAt)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setShowRawEvidence((prev) => ({ ...prev, [matched.id]: !prev[matched.id] }))}
                                  style={{
                                    background: 'transparent', border: 'none', color: '#60A5FA',
                                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  {showRawEvidence[matched.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                  {showRawEvidence[matched.id] ? 'Hide Raw SMS' : 'View Raw SMS'}
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>DETECTED PROVIDER</span>
                                  <strong style={{ color: '#F8FAFC' }}>{matched.provider}</strong>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>TRANSACTION CODE</span>
                                  <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>
                                    {matched.parsedTransactionRef || 'N/A'}
                                  </strong>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>EXTRACTED AMOUNT</span>
                                  <strong style={{ color: '#FBBF24' }}>
                                    {matched.parsedAmountMinor ? formatAmount(matched.parsedAmountMinor) : 'N/A'}
                                  </strong>
                                </div>
                                <div>
                                  <span style={{ color: '#64748B', display: 'block', fontSize: '10px' }}>SENDER PHONE / NAME</span>
                                  <strong style={{ color: '#F8FAFC' }}>
                                    {matched.parsedSenderPhone || matched.parsedSenderName || 'N/A'}
                                  </strong>
                                </div>
                              </div>

                              {r.matchReason && (
                                <div style={{ marginTop: '8px', fontSize: '11px', color: '#93C5FD' }}>
                                  💡 <em>Match Rule: {r.matchReason}</em>
                                </div>
                              )}

                              {showRawEvidence[matched.id] && (
                                <div style={{
                                  marginTop: '10px', backgroundColor: '#030712',
                                  padding: '10px 12px', borderRadius: '8px', border: '1px solid #1E293B',
                                  fontFamily: 'monospace', fontSize: '11px', color: '#94A3B8',
                                  whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                }}>
                                  {matched.rawText}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Approval / Rejection Action Row */}
                          {r.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                              <input
                                placeholder="Optional administrator note (e.g. Verified via Telebirr SMS)..."
                                value={actionNote[r.id] || ''}
                                onChange={(e) => setActionNote((n) => ({ ...n, [r.id]: e.target.value }))}
                                style={{
                                  flex: 1, backgroundColor: '#1E293B', border: '1px solid #334155',
                                  borderRadius: '8px', padding: '10px 14px', color: '#F8FAFC',
                                  fontSize: '12px', minWidth: '220px',
                                }}
                              />
                              <button
                                onClick={() => handleAction(
                                  r.id,
                                  r.requestType === 'DEPOSIT' ? 'deposit' : 'withdrawal',
                                  'approve'
                                )}
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
                                <CheckCircle size={16} /> APPROVE & CREDIT BALANCE
                              </button>
                              <button
                                onClick={() => handleAction(
                                  r.id,
                                  r.requestType === 'DEPOSIT' ? 'deposit' : 'withdrawal',
                                  'reject'
                                )}
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
                            </div>
                          )}

                          {/* Rejection / Note footer */}
                          {r.adminNote && r.status !== 'PENDING' && (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: r.status === 'REJECTED' ? '#FCA5A5' : '#34D399' }}>
                              Admin Note: {r.adminNote} (by {r.approvedBy ? r.approvedBy.slice(0, 8) : 'Admin'})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Manual Link Modal / Selector */}
                {linkingDepositId && (
                  <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                  }}>
                    <div style={{
                      backgroundColor: '#0F172A', border: '1px solid #1E293B',
                      borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px',
                      maxHeight: '80vh', overflowY: 'auto'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Link Unmatched Evidence to Deposit #{linkingDepositId.slice(0, 8)}</h3>
                        <button
                          onClick={() => setLinkingDepositId(null)}
                          style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>

                      <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '16px' }}>
                        Select from incoming notifications captured by MacroDroid:
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {evidenceList.filter((e) => e.status !== 'PROCESSED').slice(0, 10).map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              backgroundColor: '#0B1320', border: '1px solid #1E293B',
                              borderRadius: '8px', padding: '12px', display: 'flex',
                              justifyContent: 'space-between', alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ color: '#10B981', fontWeight: 800, fontSize: '13px' }}>{ev.provider}</span>
                                {ev.parsedAmountMinor && (
                                  <span style={{ color: '#FBBF24', fontWeight: 800 }}>{formatAmount(ev.parsedAmountMinor)}</span>
                                )}
                                {ev.parsedTransactionRef && (
                                  <code style={{ color: '#60A5FA' }}>{ev.parsedTransactionRef}</code>
                                )}
                              </div>
                              <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', maxWidth: '400px' }}>
                                {ev.rawText.slice(0, 80)}...
                              </p>
                            </div>
                            <button
                              onClick={() => handleManualLink(linkingDepositId, ev.id)}
                              style={{
                                backgroundColor: '#10B981', color: '#0F172A', border: 'none',
                                borderRadius: '6px', padding: '6px 14px', fontSize: '12px',
                                fontWeight: 800, cursor: 'pointer'
                              }}
                            >
                              Link
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 2: MACRODROID LIVE EVIDENCE FEED                     */}
            {/* ───────────────────────────────────────────────────────────── */}
            {paymentsSubTab === 'evidence' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800 }}>MacroDroid Ingested Notification Stream</h3>
                    <p style={{ color: '#94A3B8', fontSize: '12px' }}>
                      Incoming SMS messages and app notifications sent from MacroDroid on authorized Android devices.
                    </p>
                  </div>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>{evidenceList.length} evidence items recorded</span>
                </div>

                {evidenceList.length === 0 ? (
                  <div style={{ backgroundColor: '#0F172A', padding: '40px', borderRadius: '12px', border: '1px solid #1E293B', textAlign: 'center', color: '#64748B' }}>
                    No notifications received yet. You can use the SMS Simulator to test or configure MacroDroid on your phone.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          backgroundColor: '#0F172A', border: '1px solid #1E293B',
                          borderRadius: '12px', padding: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              backgroundColor: '#1E293B', color: '#10B981',
                              padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800
                            }}>
                              {ev.provider}
                            </span>
                            <span style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 800 }}>
                              {ev.parsedAmountMinor ? formatAmount(ev.parsedAmountMinor) : 'Amount Unparsed'}
                            </span>
                            {ev.parsedTransactionRef && (
                              <code style={{ color: '#60A5FA', fontSize: '12px' }}>
                                Ref: {ev.parsedTransactionRef}
                              </code>
                            )}
                            <StatusBadge status={ev.status} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: '#64748B', fontSize: '11px' }}>
                              {formatDate(ev.receivedAt)}
                            </span>
                            <button
                              onClick={() => setShowRawEvidence((p) => ({ ...p, [ev.id]: !p[ev.id] }))}
                              style={{
                                background: 'transparent', border: 'none', color: '#94A3B8',
                                cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              {showRawEvidence[ev.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              {showRawEvidence[ev.id] ? 'Hide Raw' : 'View Raw'}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', color: '#64748B', fontSize: '11px', marginBottom: '6px' }}>
                          <span>Sender Header: <strong style={{ color: '#94A3B8' }}>{ev.senderHeader}</strong></span>
                          <span>Sender Phone/Name: <strong style={{ color: '#94A3B8' }}>{ev.parsedSenderPhone || ev.parsedSenderName || '—'}</strong></span>
                          <span>Device: <code style={{ color: '#94A3B8' }}>{ev.deviceId || 'Primary'}</code></span>
                          {ev.matchedPaymentRequestId && (
                            <span>Linked Deposit: <code style={{ color: '#34D399' }}>#{ev.matchedPaymentRequestId.slice(0, 8)}</code></span>
                          )}
                        </div>

                        {showRawEvidence[ev.id] && (
                          <div style={{
                            backgroundColor: '#030712', border: '1px solid #1E293B',
                            borderRadius: '8px', padding: '10px 14px', marginTop: '8px',
                            fontFamily: 'monospace', fontSize: '11px', color: '#94A3B8',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {ev.rawText}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 3: SMS NOTIFICATION SIMULATOR                        */}
            {/* ───────────────────────────────────────────────────────────── */}
            {paymentsSubTab === 'simulator' && (
              <div style={{ maxWidth: '800px' }}>
                <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '16px', border: '1px solid #1E293B', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Sparkles size={20} color="#10B981" />
                    <h3 style={{ fontSize: '18px', fontWeight: 900 }}>Simulate Incoming MacroDroid Payment Webhook</h3>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
                    Trigger real incoming webhook payloads with authentic Ethiopian bank & mobile money SMS templates. The engine will parse, store evidence, and match pending deposits in real-time.
                  </p>

                  {/* Preset Template Selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>
                      QUICK TEST PRESETS:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'telebirr', name: 'Telebirr 100 ETB', amt: '100', ref: 'CI94719082', phone: '0912345678' },
                        { id: 'mpesa', name: 'M-Pesa 250 ETB', amt: '250', ref: 'NL47JK890', phone: '0712345678' },
                        { id: 'cbe_birr', name: 'CBE Birr 150 ETB', amt: '150', ref: 'CB987654321', phone: '0922334455' },
                        { id: 'cbe_bank', name: 'CBE Bank 1,000 ETB', amt: '1000', ref: 'FT262920XXXX', phone: '1000234567891' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSimProvider(preset.id as any);
                            setSimAmount(preset.amt);
                            setSimRef(preset.ref);
                            setSimPhone(preset.phone);
                            setSimCustomText('');
                          }}
                          style={{
                            backgroundColor: simProvider === preset.id ? 'rgba(16, 185, 129, 0.15)' : '#0B1320',
                            border: simProvider === preset.id ? '1px solid #10B981' : '1px solid #1E293B',
                            color: simProvider === preset.id ? '#10B981' : '#94A3B8',
                            padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSimulateWebhook}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                          PROVIDER
                        </label>
                        <select
                          value={simProvider}
                          onChange={(e) => setSimProvider(e.target.value as any)}
                          style={{
                            width: '100%', backgroundColor: '#0B1320', border: '1px solid #334155',
                            borderRadius: '8px', padding: '10px 12px', color: '#F8FAFC', fontSize: '13px', outline: 'none'
                          }}
                        >
                          <option value="telebirr">Telebirr</option>
                          <option value="mpesa">M-Pesa (Safaricom)</option>
                          <option value="cbe_birr">CBE Birr</option>
                          <option value="cbe_bank">Commercial Bank of Ethiopia (CBE)</option>
                          <option value="other_bank">Other Bank Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                          AMOUNT (ETB)
                        </label>
                        <input
                          type="number"
                          value={simAmount}
                          onChange={(e) => setSimAmount(e.target.value)}
                          style={{
                            width: '100%', backgroundColor: '#0B1320', border: '1px solid #334155',
                            borderRadius: '8px', padding: '10px 12px', color: '#F8FAFC', fontSize: '13px', outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                          TRANSACTION REFERENCE CODE
                        </label>
                        <input
                          type="text"
                          value={simRef}
                          onChange={(e) => setSimRef(e.target.value)}
                          style={{
                            width: '100%', backgroundColor: '#0B1320', border: '1px solid #334155',
                            borderRadius: '8px', padding: '10px 12px', color: '#F8FAFC', fontSize: '13px', outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                          SENDER PHONE OR ACCOUNT
                        </label>
                        <input
                          type="text"
                          value={simPhone}
                          onChange={(e) => setSimPhone(e.target.value)}
                          style={{
                            width: '100%', backgroundColor: '#0B1320', border: '1px solid #334155',
                            borderRadius: '8px', padding: '10px 12px', color: '#F8FAFC', fontSize: '13px', outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                        OPTIONAL: CUSTOM RAW SMS BODY (Overrides template)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Paste or write any custom Ethiopian SMS text here..."
                        value={simCustomText}
                        onChange={(e) => setSimCustomText(e.target.value)}
                        style={{
                          width: '100%', backgroundColor: '#0B1320', border: '1px solid #334155',
                          borderRadius: '8px', padding: '10px 12px', color: '#F8FAFC', fontSize: '12px',
                          outline: 'none', fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={simLoading}
                      style={{
                        backgroundColor: '#10B981', color: '#0F172A', border: 'none',
                        borderRadius: '8px', padding: '12px 24px', fontSize: '13px', fontWeight: 900,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <Send size={15} /> {simLoading ? 'Simulating Webhook...' : 'Fire MacroDroid Webhook'}
                    </button>
                  </form>

                  {/* Simulator Result Banner */}
                  {simResult && (
                    <div style={{
                      marginTop: '20px', backgroundColor: '#030712', border: '1px solid #10B981',
                      borderRadius: '12px', padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                        <CheckCircle size={16} /> Webhook Ingested & Evaluated Successfully!
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px', color: '#94A3B8' }}>
                        <div>Evidence ID: <strong style={{ color: '#F8FAFC' }}>{simResult.evidenceId?.slice(0, 8)}...</strong></div>
                        <div>Detected Provider: <strong style={{ color: '#F8FAFC' }}>{simResult.provider}</strong></div>
                        <div>Extracted Ref: <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{simResult.parsed?.transactionReference || 'N/A'}</strong></div>
                        <div>Match Status: <strong style={{ color: simResult.matchStatus === 'MATCHED' ? '#34D399' : '#FBBF24' }}>{simResult.matchStatus}</strong></div>
                        {simResult.matchedDepositId && (
                          <div style={{ gridColumn: 'span 2' }}>
                            Auto-Linked to Deposit ID: <strong style={{ color: '#34D399' }}>#{simResult.matchedDepositId}</strong> ({simResult.matchReason})
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 4: MACRODROID SETUP GUIDE                            */}
            {/* ───────────────────────────────────────────────────────────── */}
            {paymentsSubTab === 'guide' && (
              <div style={{ maxWidth: '850px' }}>
                <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '16px', border: '1px solid #1E293B', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>
                    MacroDroid Android Automation Configuration
                  </h3>
                  <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
                    Configure MacroDroid on your physical Android phone receiving payment notifications. Follow these exact parameters:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* LAN URL Box for Real Phone */}
                    <div style={{ backgroundColor: '#1E1B4B', padding: '16px', borderRadius: '10px', border: '1px solid #6366F1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#C7D2FE' }}>
                          PHONE WEBHOOK URL (USE THIS IN MACRODROID ON YOUR PHONE):
                        </span>
                        <button
                          onClick={() => copyText('lanUrl', 'http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid')}
                          style={{
                            background: '#4F46E5', border: 'none', color: '#F8FAFC',
                            padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          {copiedKey === 'lanUrl' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          {copiedKey === 'lanUrl' ? 'Copied' : 'Copy Phone URL'}
                        </button>
                      </div>
                      <code style={{ color: '#A5B4FC', fontSize: '13px', fontWeight: 700, wordBreak: 'break-all' }}>
                        http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid
                      </code>
                      <p style={{ color: '#CBD5E1', fontSize: '12px', marginTop: '8px', margin: 0 }}>
                        <strong style={{ color: '#FBBF24' }}>Important:</strong> A physical Android phone cannot reach <code>localhost:3000</code>. Connect your phone to the same Wi-Fi or computer hotspot, and enter the IP URL above in MacroDroid.
                      </p>
                    </div>

                    {/* Endpoint URL Box */}
                    <div style={{ backgroundColor: '#0B1320', padding: '16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>LOCAL / PROXY WEBHOOK URL:</span>
                        <button
                          onClick={() => copyText('url', `${API_URL}/api/v1/payments/webhook/macrodroid`)}
                          style={{
                            background: '#1E293B', border: 'none', color: '#F8FAFC',
                            padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          {copiedKey === 'url' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          {copiedKey === 'url' ? 'Copied' : 'Copy URL'}
                        </button>
                      </div>
                      <code style={{ color: '#10B981', fontSize: '13px', wordBreak: 'break-all' }}>
                        {API_URL}/api/v1/payments/webhook/macrodroid
                      </code>
                    </div>

                    {/* Headers Box */}
                    <div style={{ backgroundColor: '#0B1320', padding: '16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>HTTP HEADERS:</span>
                        <button
                          onClick={() => copyText('headers', 'Content-Type: application/json\nx-macrodroid-secret: keno_macrodroid_secure_webhook_secret_2026')}
                          style={{
                            background: '#1E293B', border: 'none', color: '#F8FAFC',
                            padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          {copiedKey === 'headers' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          {copiedKey === 'headers' ? 'Copied' : 'Copy Headers'}
                        </button>
                      </div>
                      <pre style={{ margin: 0, color: '#60A5FA', fontSize: '12px' }}>
{`Content-Type: application/json
x-macrodroid-secret: keno_macrodroid_secure_webhook_secret_2026`}
                      </pre>
                    </div>

                    {/* Recommended Setup: Single URL (GET Method - Easiest & Zero Errors) */}
                    <div style={{ backgroundColor: '#064E3B', padding: '16px', borderRadius: '10px', border: '1px solid #10B981' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#A7F3D0' }}>
                          ⚡ METHOD 1 (RECOMMENDED): SUPER EASY 1-LINE GET URL
                        </span>
                        <button
                          onClick={() => copyText('getUrl', 'http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid?secret=keno_macrodroid_secure_webhook_secret_2026&sender=[sms_number]&message=[sms_message]')}
                          style={{
                            background: '#059669', border: 'none', color: '#F8FAFC',
                            padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          {copiedKey === 'getUrl' ? <Check size={12} color="#fff" /> : <Copy size={12} />}
                          {copiedKey === 'getUrl' ? 'Copied GET URL!' : 'Copy 1-Line URL'}
                        </button>
                      </div>
                      <code style={{ color: '#D1FAE5', fontSize: '12px', wordBreak: 'break-all', display: 'block', backgroundColor: '#022C22', padding: '10px', borderRadius: '6px', margin: '8px 0' }}>
                        http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid?secret=keno_macrodroid_secure_webhook_secret_2026&sender=[sms_number]&message=[sms_message]
                      </code>
                      <p style={{ color: '#A7F3D0', fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
                        <strong>Why this is best:</strong> In MacroDroid, just set <strong>HTTP Request Method: GET</strong> and paste this URL. No headers to add, no JSON quotes to worry about! MacroDroid will automatically replace <code>[sms_number]</code> and <code>[sms_message]</code> with the actual Telebirr SMS.
                      </p>
                    </div>

                    {/* Method 2: POST with JSON Body (Notice Square Brackets) */}
                    <div style={{ backgroundColor: '#0B1320', padding: '16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#FBBF24', display: 'block', marginBottom: '8px' }}>
                        METHOD 2: HTTP POST (JSON BODY)
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Request Method: <strong>POST</strong></li>
                        <li>URL: <code>http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid</code></li>
                        <li>Header: <code>x-macrodroid-secret: keno_macrodroid_secure_webhook_secret_2026</code></li>
                        <li>Content Type: <code>application/json</code></li>
                      </ul>

                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>
                            POST JSON BODY (Must use square brackets <code>[...]</code>):
                          </span>
                          <button
                            onClick={() => copyText('postBody', '{\n  "sender": "[sms_number]",\n  "message": "[sms_message]",\n  "deviceId": "primary_phone",\n  "type": "sms"\n}')}
                            style={{
                              background: '#1E293B', border: 'none', color: '#F8FAFC',
                              padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            {copiedKey === 'postBody' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            {copiedKey === 'postBody' ? 'Copied Body' : 'Copy JSON'}
                          </button>
                        </div>
                        <pre style={{
                          backgroundColor: '#030712', padding: '12px', borderRadius: '8px',
                          border: '1px solid #1E293B', color: '#A7F3D0', fontSize: '11px', margin: 0
                        }}>
{`{
  "sender": "[sms_number]",
  "message": "[sms_message]",
  "deviceId": "primary_phone",
  "type": "sms"
}`}
                        </pre>
                        <span style={{ color: '#F87171', fontSize: '11px', display: 'block', marginTop: '6px' }}>
                          💡 Tip: In your version of MacroDroid, the SMS message variable is <code>[sms_message]</code> (or <code>[sms_body]</code>). The backend accepts either!
                        </span>
                      </div>
                    </div>

                    {/* Trigger 2: Notification Received */}
                    <div style={{ backgroundColor: '#0B1320', padding: '16px', borderRadius: '10px', border: '1px solid #1E293B' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#FBBF24', display: 'block', marginBottom: '8px' }}>
                        TRIGGER 2: APP NOTIFICATIONS (Optional for push alerts)
                      </span>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Trigger: <strong>Notification Received</strong></li>
                        <li>Select Applications: <code>telebirr, M-PESA, CBE Mobile</code></li>
                        <li>Body: <code>{`{ "sender": "{not_app_name}", "message": "{not_text}", "type": "notification" }`}</code></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-TAB 5: AUDIT TRAIL & IMMUTABLE LOGS                      */}
            {/* ───────────────────────────────────────────────────────────── */}
            {paymentsSubTab === 'audit' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Deposit Decision Audit Trail</h3>
                    <p style={{ color: '#94A3B8', fontSize: '12px' }}>
                      Immutable records of every deposit approval, rejection, administrator ID, timestamp, and transaction reference.
                    </p>
                  </div>
                  <span style={{ color: '#64748B', fontSize: '12px' }}>{auditLogs.length} audit records</span>
                </div>

                {auditLogs.length === 0 ? (
                  <div style={{ backgroundColor: '#0F172A', padding: '40px', borderRadius: '12px', border: '1px solid #1E293B', textAlign: 'center', color: '#64748B' }}>
                    No audit records logged yet.
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', backgroundColor: '#0B1320' }}>
                          <th style={{ padding: '12px 16px' }}>TIMESTAMP</th>
                          <th style={{ padding: '12px 16px' }}>ACTION</th>
                          <th style={{ padding: '12px 16px' }}>ADMINISTRATOR</th>
                          <th style={{ padding: '12px 16px' }}>DEPOSIT ID</th>
                          <th style={{ padding: '12px 16px' }}>TX REF</th>
                          <th style={{ padding: '12px 16px' }}>AMOUNT</th>
                          <th style={{ padding: '12px 16px' }}>DETAILS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => {
                          const isApprove = log.action === 'DEPOSIT_APPROVED';
                          return (
                            <tr key={log.id} style={{ borderBottom: '1px solid #1E293B' }}>
                              <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{formatDate(log.timestamp)}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  backgroundColor: isApprove ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isApprove ? '#34D399' : '#F87171',
                                  padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px'
                                }}>
                                  {log.action}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#F8FAFC', fontWeight: 700 }}>
                                {log.actorId ? log.actorId.slice(0, 8) : 'Admin'}
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#60A5FA' }}>
                                #{log.entityId ? log.entityId.slice(0, 8) : '—'}
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#10B981', fontWeight: 700 }}>
                                {log.metadata?.transactionReference || '—'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#FBBF24', fontWeight: 800 }}>
                                {log.metadata?.amountMinor ? formatAmount(log.metadata.amountMinor) : '—'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '11px' }}>
                                {log.metadata?.decision || log.metadata?.reason || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* RTP TAB */}
        {activeTab === 'rtp' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>RTP & Mathematical Model Inspector</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Theoretical analysis from hypergeometric distributions and certified paytable multipliers.
            </p>
            <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '12px' }}>
                    <th style={{ padding: '10px' }}>SPOTS</th>
                    <th style={{ padding: '10px' }}>THEORETICAL RTP</th>
                    <th style={{ padding: '10px' }}>HOUSE EDGE</th>
                    <th style={{ padding: '10px' }}>HIT FREQUENCY</th>
                    <th style={{ padding: '10px' }}>MAX MULTIPLIER</th>
                    <th style={{ padding: '10px' }}>VOLATILITY</th>
                  </tr>
                </thead>
                <tbody>
                  {mathAnalysis?.spotAnalyses.map((s: any) => (
                    <tr key={s.spots} style={{ borderBottom: '1px solid #1E293B', fontSize: '13px' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#FBBF24' }}>Spot {s.spots}</td>
                      <td style={{ padding: '12px 10px', color: '#10B981', fontWeight: 700 }}>{(s.theoreticalRtp * 100).toFixed(2)}%</td>
                      <td style={{ padding: '12px 10px', color: '#F59E0B' }}>{(s.houseEdge * 100).toFixed(2)}%</td>
                      <td style={{ padding: '12px 10px' }}>{(s.hitFrequency * 100).toFixed(2)}%</td>
                      <td style={{ padding: '12px 10px', fontWeight: 800 }}>{s.maxMultiplier.toLocaleString()}x</td>
                      <td style={{ padding: '12px 10px', color: '#94A3B8' }}>{s.standardDeviation.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROUNDS TAB */}
        {activeTab === 'rounds' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Game Rounds & CSPRNG Inspector</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Complete history of all 20-ball draw results with cryptographic hashes.
            </p>
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

        {/* PAYTABLE TAB */}
        {activeTab === 'paytable' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Certified Paytable v1.0</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Immutable paytable configuration applied during bet settlement.
            </p>
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
    </div>
  );
}
