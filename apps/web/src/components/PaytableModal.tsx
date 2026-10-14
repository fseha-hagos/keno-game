import React from 'react';
import { DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';
import { X } from 'lucide-react';
import { KENO_FONTS, KENO_COLORS } from '../theme/kenoTheme';

interface PaytableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaytableModal: React.FC<PaytableModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
        fontFamily: KENO_FONTS.ui,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #242b31, #1b2124)',
          border: '1px solid rgba(81, 181, 121, 0.3)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          padding: '22px 20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: '#a0a0a0',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#FFFFFF' }}>
          Certified Keno Paytable
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
          96% Certified Return to Player (RTP). Multipliers are applied to your selected stake.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((spot) => {
            const entries = DEFAULT_96_PAYTABLE_ENTRIES.filter((e) => e.spots === spot);
            if (entries.length === 0) return null;
            return (
              <div
                key={spot}
                style={{
                  background: 'rgba(32, 40, 43, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: KENO_COLORS.actionBtnGreen, marginBottom: 6 }}>
                  {spot} {spot === 1 ? 'Number Picked' : 'Numbers Picked'}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {entries.map((e) => (
                    <div
                      key={e.hits}
                      style={{
                        background: 'linear-gradient(180deg, #333f46, #242b31)',
                        border: '1px solid rgba(81, 181, 121, 0.2)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: KENO_FONTS.numbers,
                      }}
                    >
                      <span style={{ color: 'rgba(255, 255, 255, 0.65)' }}>{e.hits} Hits:</span>
                      <span style={{ color: '#51b579' }}>x{e.multiplier}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

