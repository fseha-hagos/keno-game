import React, { useState } from 'react';
import { DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';
import { X, Info, ShieldCheck, Gift, Copy, Check } from 'lucide-react';
import { KENO_FONTS, KENO_COLORS } from '../theme/kenoTheme';

interface PaytableModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'rules' | 'fairness' | 'freebet';
}

export const PaytableModal: React.FC<PaytableModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'rules',
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'fairness' | 'freebet'>(initialTab);
  const [copiedHash, setCopiedHash] = useState(false);

  // Sync initialTab when modal opens
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const exampleHash =
    '3586ED7EECC3AEA4A6AC4A359D96E5CF30BBC47E24ED9E030066D7C7DE6C82B1F1376122E35B5165342F27243E1BE5B46B31F2A5D97E6DE26E0E4A6202DF3CDD';

  const copyHash = () => {
    navigator.clipboard?.writeText(exampleHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        fontFamily: KENO_FONTS.ui,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#0D1217',
          border: '1px solid #1E2B22',
          borderRadius: 16,
          width: '100%',
          maxWidth: 460,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.95), 0 0 30px rgba(34, 197, 94, 0.1)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Header with Close Button */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#86948A',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* 3 Top Navigation Tabs matching screenshot */}
        <div
          style={{
            padding: '16px 16px 12px',
            paddingRight: 48,
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid #142017',
            background: 'linear-gradient(180deg, #101712 0%, #0D1217 100%)',
          }}
        >
          {/* TAB 1: RULES */}
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            style={{
              flex: 1,
              padding: '9px 10px',
              borderRadius: 8,
              background:
                activeTab === 'rules'
                  ? 'linear-gradient(180deg, #143823 0%, #0D2617 100%)'
                  : 'linear-gradient(180deg, #121914 0%, #0B0F0C 100%)',
              border:
                activeTab === 'rules'
                  ? '1.5px solid #22C55E'
                  : '1px solid #1C2B20',
              color: activeTab === 'rules' ? '#4ADE80' : '#8B9B90',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow:
                activeTab === 'rules'
                  ? '0 0 12px rgba(34, 197, 94, 0.25)'
                  : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: activeTab === 'rules' ? '#22C55E' : '#334D3C',
                color: '#080E0A',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: 'serif',
                fontStyle: 'italic',
              }}
            >
              i
            </span>
            <span>RULES</span>
          </button>

          {/* TAB 2: FAIRNESS */}
          <button
            type="button"
            onClick={() => setActiveTab('fairness')}
            style={{
              flex: 1,
              padding: '9px 10px',
              borderRadius: 8,
              background:
                activeTab === 'fairness'
                  ? 'linear-gradient(180deg, #143823 0%, #0D2617 100%)'
                  : 'linear-gradient(180deg, #121914 0%, #0B0F0C 100%)',
              border:
                activeTab === 'fairness'
                  ? '1.5px solid #22C55E'
                  : '1px solid #1C2B20',
              color: activeTab === 'fairness' ? '#4ADE80' : '#8B9B90',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow:
                activeTab === 'fairness'
                  ? '0 0 12px rgba(34, 197, 94, 0.25)'
                  : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={16} color={activeTab === 'fairness' ? '#4ADE80' : '#8B9B90'} />
            <span>FAIRNESS</span>
          </button>

          {/* TAB 3: FREE BET */}
          <button
            type="button"
            onClick={() => setActiveTab('freebet')}
            style={{
              flex: 1,
              padding: '9px 10px',
              borderRadius: 8,
              background:
                activeTab === 'freebet'
                  ? 'linear-gradient(180deg, #143823 0%, #0D2617 100%)'
                  : 'linear-gradient(180deg, #121914 0%, #0B0F0C 100%)',
              border:
                activeTab === 'freebet'
                  ? '1.5px solid #22C55E'
                  : '1px solid #1C2B20',
              color: activeTab === 'freebet' ? '#4ADE80' : '#8B9B90',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow:
                activeTab === 'freebet'
                  ? '0 0 12px rgba(34, 197, 94, 0.25)'
                  : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Gift size={15} color={activeTab === 'freebet' ? '#4ADE80' : '#8B9B90'} />
            <span>FREE BET</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div
          style={{
            padding: '18px 20px 24px',
            overflowY: 'auto',
            flex: 1,
            color: '#E2E8F0',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: RULES CONTENT (Exact match with Screenshot 1)         */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                RTP: 97%
              </div>

              <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                Max Win - 30000 ETB
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                Keno is a game where the player bets on balls numbered 1-80 by choosing a combination from balls numbered 1 to 10.
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                During each round, 20 of the balls numbered from 1-80 are drawn in sequence using a random number generator.
              </div>

              {/* Heading: How to play */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  marginTop: 6,
                  letterSpacing: '-0.01em',
                }}
              >
                How to play
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                To participate in the game, the player must perform the following actions during the round, which lasts one minute:
              </div>

              {/* Action List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontWeight: 600 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#22C55E' }} />
                  Choose the combination of numbers
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontWeight: 600 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#22C55E' }} />
                  Set the amount limit for betting
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontWeight: 600 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#22C55E' }} />
                  Click the "Bet" button
                </div>
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                The player can also delete the combination of already selected numbers.
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                In the field where the numbers from 1 to 80 are present, HOT and COLD numbers are indicated in red and blue colors, with hot numbers being drawn frequently and cold numbers being drawn less frequently.
              </div>

              {/* Collapsible/Embedded Certified Multipliers Table */}
              <div
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  background: 'rgba(20, 30, 24, 0.6)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#22C55E', marginBottom: 10 }}>
                  📊 Certified Paytable Multipliers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((spot) => {
                    const entries = DEFAULT_96_PAYTABLE_ENTRIES.filter((e) => e.spots === spot);
                    if (entries.length === 0) return null;
                    return (
                      <div
                        key={spot}
                        style={{
                          background: 'rgba(10, 16, 12, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 6,
                          padding: '6px 10px',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#86EFAC', marginBottom: 4 }}>
                          {spot} {spot === 1 ? 'Number Picked' : 'Numbers Picked'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {entries.map((e) => (
                            <div
                              key={e.hits}
                              style={{
                                background: '#16221A',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              <span style={{ color: '#94A3B8' }}>{e.hits} hits: </span>
                              <span style={{ color: '#22C55E' }}>x{e.multiplier}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 2: FAIRNESS CONTENT (Exact match with Screenshot 2)      */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'fairness' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Shield Icon & Header */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '4px 0 10px',
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                  }}
                >
                  <ShieldCheck size={42} color="#22C55E" />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  ABOUT FAIRNESS
                </div>
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                Before the start of a round, the players are provided with a "Hash Code*" - an encrypted text combination "Key*". Here are the round outcome numbers.
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                The outcome of the round is determined not at the moment of the game, but in advance for current round, and is given to the players in coded form.
              </div>

              {/* Hash Code Example Box */}
              <div>
                <div style={{ color: '#CBD5E1', fontSize: 13, marginBottom: 6 }}>
                  For example, "Hash (Hash) code *"
                </div>
                <div
                  style={{
                    background: '#070C09',
                    border: '1px solid #1D3323',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#86EFAC',
                    wordBreak: 'break-all',
                    lineHeight: 1.4,
                    position: 'relative',
                  }}
                >
                  {exampleHash}
                  <button
                    type="button"
                    onClick={copyHash}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 8,
                      background: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: 6,
                      color: '#4ADE80',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedHash ? <Check size={12} color="#22C55E" /> : <Copy size={12} />}
                    <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                After the end of a round, the players are provided with a "Key*" and an additional input parameter for getting the "Hash Code*" - "Salt*" Using them, every player can copy and encrypt this combination to see that the encrypted "Key * " corresponds to the "Hash code *" previously determined by the system. This ensures that the round results are provably fair and cannot be altered.
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 3: FREE BET CONTENT                                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'freebet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '4px 0 10px',
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, transparent 70%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Gift size={38} color="#FBBF24" />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  FREE BETS & BONUSES
                </div>
              </div>

              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                Free bets are special promotional rewards that allow players to participate in real rounds without staking their deposited balance.
              </div>

              <div
                style={{
                  background: 'rgba(20, 30, 24, 0.6)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#4ADE80' }}>
                  🎁 How Free Bets Work:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#CBD5E1' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#22C55E' }}>1.</span>
                    <span>Free bets can be awarded during events, promotional campaigns, or daily bonus milestones.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#22C55E' }}>2.</span>
                    <span>When placed, the free bet covers the ticket stake value.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#22C55E' }}>3.</span>
                    <span>If the bet wins, the net winnings (Total Payout minus Free Bet stake) are credited directly to your withdrawable balance.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#22C55E' }}>4.</span>
                    <span>All free bet rounds share the exact same authoritative CSPRNG draw algorithm and 97% RTP.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
