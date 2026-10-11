import React from 'react';
import { DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';
import { X } from 'lucide-react';

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
      }}
    >
      <div
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: 20,
          width: '100%',
          maxWidth: 440,
          padding: '24px 20px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
          Certified Keno Paytable
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94A3B8' }}>
          96% Certified Return to Player (RTP). Multipliers are applied to your selected stake.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4, 5].map((spot) => {
            const entries = DEFAULT_96_PAYTABLE_ENTRIES.filter((e) => e.spots === spot);
            return (
              <div
                key={spot}
                style={{
                  background: '#0B1320',
                  border: '1px solid #1E293B',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#10B981', marginBottom: 6 }}>
                  {spot} {spot === 1 ? 'Number Picked' : 'Numbers Picked'}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {entries.map((e) => (
                    <div
                      key={e.hits}
                      style={{
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 6,
                        padding: '4px 8px',
                        display: 'flex',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ color: '#94A3B8' }}>{e.hits} Hits:</span>
                      <span style={{ color: '#F8FAFC' }}>x{e.multiplier}</span>
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
