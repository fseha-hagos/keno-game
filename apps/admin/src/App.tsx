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
} from 'lucide-react';
import { calculateOverallRtp, DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://192.168.100.228:3000';

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
        setError('Access denied. This account does not have admin privileges.');
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
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    const analysis = calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10);
    setMathAnalysis(analysis);

    axios.get(`${API_URL}/api/v1/keno/rounds/recent`)
      .then((res) => setRounds(res.data))
      .catch(() => {});

    axios.get(`${API_URL}/api/v1/wallet/admin/payment-requests`, {
      headers: authHeaders,
    })
      .then((res) => {
        setPaymentRequests(res.data);
        setFetchError(null);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          // Token expired — force re-login
          handleLogout();
        } else if (err.response?.status === 403) {
          setFetchError('Access denied. Your account does not have admin privileges.');
        } else {
          setFetchError(`Failed to load payment requests: ${err.message}`);
        }
      });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
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
        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Payment Approvals</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
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
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Review and approve/reject player deposit and withdrawal requests. Deposits are only credited to wallet on approval.
            </p>

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

            {filteredRequests.length === 0 ? (
              <div style={{ backgroundColor: '#0F172A', padding: '40px', borderRadius: '12px', border: '1px solid #1E293B', textAlign: 'center', color: '#64748B' }}>
                No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} payment requests.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRequests.map((r) => (
                  <div key={r.id} style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: `1px solid ${r.status === 'PENDING' ? '#713F12' : '#1E293B'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ color: '#FBBF24', fontSize: '16px', fontWeight: 900 }}>
                            {r.requestType} — {formatAmount(r.amountMinor)}
                          </span>
                          <StatusBadge status={r.status} />
                        </div>
                        <div style={{ color: '#64748B', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>Method: <strong style={{ color: '#F1F5F9' }}>{r.paymentMethod?.toUpperCase()}</strong></span>
                          {r.accountNumber && <span>Account: <strong style={{ color: '#F1F5F9' }}>{r.accountNumber}</strong> — {r.accountName}</span>}
                          {r.transactionReference && (
                            <span>Ref: <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{r.transactionReference}</strong></span>
                          )}
                          <span>User ID: <span style={{ fontFamily: 'monospace' }}>{r.userId?.slice(0, 8)}...</span></span>
                          <span>Submitted: {formatDate(r.createdAt)}</span>
                          {r.expiresAt && <span>Expires: {formatDate(r.expiresAt)}</span>}
                          {r.adminNote && <span style={{ color: r.status === 'REJECTED' ? '#FCA5A5' : '#A7F3D0' }}>Note: {r.adminNote}</span>}
                        </div>
                      </div>
                    </div>

                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          placeholder="Optional admin note..."
                          value={actionNote[r.id] || ''}
                          onChange={(e) => setActionNote((n) => ({ ...n, [r.id]: e.target.value }))}
                          style={{
                            flex: 1, backgroundColor: '#1E293B', border: '1px solid #334155',
                            borderRadius: '8px', padding: '8px 12px', color: '#F8FAFC',
                            fontSize: '12px', minWidth: '200px',
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
                            padding: '10px 18px', borderRadius: '8px', border: 'none',
                            fontWeight: 900, cursor: 'pointer', fontSize: '13px',
                            opacity: processing[r.id] ? 0.5 : 1,
                          }}
                        >
                          <CheckCircle size={16} /> APPROVE
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
                  </div>
                ))}
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
