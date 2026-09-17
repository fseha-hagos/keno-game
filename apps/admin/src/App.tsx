import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  FileText,
  AlertCircle,
  BarChart3,
  DollarSign,
  Cpu,
} from 'lucide-react';
import { calculateOverallRtp, DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rtp' | 'rounds' | 'paytable' | 'audit'>('overview');
  const [rounds, setRounds] = useState<any[]>([]);
  const [mathAnalysis, setMathAnalysis] = useState<any>(null);

  useEffect(() => {
    // Calculate theoretical game math
    const analysis = calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10);
    setMathAnalysis(analysis);

    // Fetch recent rounds
    axios.get('/api/v1/keno/rounds/recent')
      .then((res) => setRounds(res.data))
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0F1D' }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        backgroundColor: '#0F172A',
        borderRight: '1px solid #1E293B',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ marginBottom: '24px', paddingLeft: '8px' }}>
          <h1 style={{ color: '#F59E0B', fontSize: '20px', fontWeight: 900, letterSpacing: '1px' }}>
            KENO OPERATOR
          </h1>
          <p style={{ color: '#64748B', fontSize: '11px', fontWeight: 700 }}>CERTIFIED ADMIN CONSOLE</p>
        </div>

        <button
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'overview' ? '#1E293B' : 'transparent',
            color: activeTab === 'overview' ? '#FBBF24' : '#94A3B8',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <TrendingUp size={18} /> Overview & Financials
        </button>

        <button
          onClick={() => setActiveTab('rtp')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'rtp' ? '#1E293B' : 'transparent',
            color: activeTab === 'rtp' ? '#FBBF24' : '#94A3B8',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <BarChart3 size={18} /> RTP & Math Engine
        </button>

        <button
          onClick={() => setActiveTab('rounds')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'rounds' ? '#1E293B' : 'transparent',
            color: activeTab === 'rounds' ? '#FBBF24' : '#94A3B8',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Activity size={18} /> Rounds & Live CSPRNG
        </button>

        <button
          onClick={() => setActiveTab('paytable')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'paytable' ? '#1E293B' : 'transparent',
            color: activeTab === 'paytable' ? '#FBBF24' : '#94A3B8',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Layers size={18} /> Certified Paytables
        </button>

        <div style={{ marginTop: 'auto', padding: '12px', backgroundColor: '#064E3B', borderRadius: '8px', border: '1px solid #059669' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontSize: '12px', fontWeight: 800 }}>
            <ShieldCheck size={16} /> CSPRNG AUTHORITATIVE
          </div>
          <p style={{ color: '#A7F3D0', fontSize: '10px', marginTop: '4px' }}>RTP fixed at paytable level. No dynamic compensation.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>Platform Overview</h2>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
              <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>THEORETICAL RTP</p>
                <h3 style={{ color: '#10B981', fontSize: '28px', fontWeight: 900, marginTop: '4px' }}>95.82%</h3>
                <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Certified fixed math</p>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>THEORETICAL HOUSE EDGE</p>
                <h3 style={{ color: '#F59E0B', fontSize: '28px', fontWeight: 900, marginTop: '4px' }}>4.18%</h3>
                <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>1.0 - RTP</p>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>ACTIVE GAME ENGINE</p>
                <h3 style={{ color: '#3B82F6', fontSize: '28px', fontWeight: 900, marginTop: '4px' }}>80-Ball Keno</h3>
                <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>20 drawn per round</p>
              </div>

              <div style={{ backgroundColor: '#0F172A', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>RNG ENGINE</p>
                <h3 style={{ color: '#A855F7', fontSize: '28px', fontWeight: 900, marginTop: '4px' }}>CSPRNG</h3>
                <p style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Fisher-Yates 20/80</p>
              </div>
            </div>

            {/* Recent Rounds Preview */}
            <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Recent Game Rounds & Authoritative Draws</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '12px' }}>
                    <th style={{ padding: '10px' }}>ROUND</th>
                    <th style={{ padding: '10px' }}>STATUS</th>
                    <th style={{ padding: '10px' }}>DRAWN NUMBERS (20 BALLS)</th>
                    <th style={{ padding: '10px' }}>SHA-256 PROVABLE HASH</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.slice(0, 8).map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #1E293B', fontSize: '13px' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#FBBF24' }}>#{r.roundNumber}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          backgroundColor: r.status === 'SETTLED' ? '#064E3B' : '#1E293B',
                          color: r.status === 'SETTLED' ? '#34D399' : '#94A3B8',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#60A5FA', fontFamily: 'monospace' }}>
                        {r.drawResult ? r.drawResult.join(', ') : 'Pending draw...'}
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

        {activeTab === 'rtp' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>RTP & Mathematical Model Inspector</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Theoretical analysis generated directly from hypergeometric distributions and certified paytable multipliers.
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
                    <th style={{ padding: '10px' }}>VOLATILITY (STD DEV)</th>
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

        {activeTab === 'rounds' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Game Rounds & CSPRNG Inspector</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
              Complete history of all generated 20-ball draw results with cryptographic hashes.
            </p>

            <div style={{ backgroundColor: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rounds.map((r) => (
                  <div key={r.id} style={{ backgroundColor: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ color: '#FBBF24', fontSize: '16px', fontWeight: 900 }}>Round #{r.roundNumber}</span>
                      <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 800 }}>{r.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                      {r.drawResult?.map((ball: number) => (
                        <span key={ball} style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800
                        }}>
                          {ball}
                        </span>
                      ))}
                    </div>
                    <p style={{ color: '#64748B', fontSize: '11px', fontFamily: 'monospace', marginTop: '6px' }}>
                      SHA-256 RESULT HASH: {r.resultHash || 'Pending...'}
                    </p>
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
