import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { Plus, Minus, X } from 'lucide-react';

const MAX_SLIPS = 5;

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BetSlipsPanel: React.FC = () => {
  const {
    betSlips,
    activeSlipId,
    addSlip,
    removeSlip,
    setActiveSlip,
    incrementStakeForSlip,
    decrementStakeForSlip,
    setStakeForSlip,
    drawnNumbers,
  } = useGameStore();

  const liveDrawnSet = React.useMemo(() => {
    const set = new Set<number>();
    (drawnNumbers || []).forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v > 0) set.add(v);
    });
    return set;
  }, [drawnNumbers]);

  const filledSlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const showSlips = betSlips.filter(
    (s) => s.selectedNumbers.length > 0 || s.id === activeSlipId,
  );

  if (betSlips.length <= 1) return null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 500,
        margin: '0 auto',
        padding: '8px 8px 12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: '#94A3B8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          YOUR SLIPS ({filledSlips.length}/{MAX_SLIPS})
        </span>

        {betSlips.length < MAX_SLIPS && (
          <button
            type="button"
            onClick={addSlip}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={12} />
            <span>Add Slip</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {showSlips.map((slip, idx) => {
          const isActive = slip.id === activeSlipId;
          const spots = slip.selectedNumbers.length;
          const stake = Number(slip.stakeMinor) / 100;
          const maxMult =
            spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, spots) : 0;
          const maxWin = stake * maxMult;

          const cleanSlipNums = slip.selectedNumbers.map(Number).filter((n) => !isNaN(n));
          const hitCount = cleanSlipNums.filter((n) => liveDrawnSet.has(n)).length;
          const currentMult =
            spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, hitCount) : 0;
          const currentWin = stake * currentMult;

          // 5 slots representation
          const slots: (number | null)[] = [...slip.selectedNumbers];
          while (slots.length < 5) slots.push(null);

          return (
            <div
              key={slip.id}
              onClick={() => setActiveSlip(slip.id)}
              style={{
                background: isActive ? '#131F33' : '#0B1320',
                border: isActive ? '1.5px solid #10B981' : '1px solid #1E293B',
                borderRadius: 12,
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isActive ? '#10B981' : '#F8FAFC',
                    }}
                  >
                    Slip {idx + 1}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10B981',
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      EDITING
                    </span>
                  )}
                  {spots > 0 && (
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      ({spots} spot{spots > 1 ? 's' : ''})
                    </span>
                  )}
                </div>

                {/* Per-slip stake controls */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => decrementStakeForSlip(slip.id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: '#1E293B',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Minus size={12} />
                  </button>

                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) {
                        setStakeForSlip(slip.id, String(Math.round(v * 100)));
                      }
                    }}
                    style={{
                      width: 50,
                      background: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#F8FAFC',
                      fontSize: 12,
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '4px 0',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => incrementStakeForSlip(slip.id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: '#1E293B',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} />
                  </button>

                  {betSlips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlip(slip.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '0 0 0 4px',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Number Slots */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 4,
                  marginBottom: 6,
                }}
              >
                {slots.map((num, slotIdx) => {
                  const isHit = num !== null && liveDrawnSet.has(Number(num));

                  if (num !== null) {
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          aspectRatio: '1.2/1',
                          borderRadius: 6,
                          background: isHit
                            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                            : '#1E293B',
                          border: isHit ? '1px solid #34D399' : '1px solid #334155',
                          color: isHit ? '#FFFFFF' : '#F8FAFC',
                          fontSize: 12,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isHit ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                        }}
                      >
                        {num}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={slotIdx}
                      style={{
                        aspectRatio: '1.2/1',
                        borderRadius: 6,
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px dashed #334155',
                      }}
                    />
                  );
                })}
              </div>

              {/* Payout Forecast Line */}
              {spots > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: currentWin > 0 ? '#10B981' : '#94A3B8' }}>
                    {currentWin > 0 ? `Live Win: ${fmt(currentWin)} ETB` : 'Matches: ' + hitCount}
                  </span>
                  <span style={{ color: '#64748B' }}>
                    Max Win: {fmt(maxWin)} ETB
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
