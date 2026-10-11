import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS } from '../theme/kenoTheme';

interface KenoGridProps {
  disabled?: boolean;
}

const HOT_NUMBERS = [1, 14, 28, 35, 48, 58, 66, 75];
const COLD_NUMBERS = [5, 16, 27, 39, 44, 50, 62, 78];

export const KenoGrid: React.FC<KenoGridProps> = ({ disabled = false }) => {
  const { getActiveSlip, toggleNumber, drawnNumbers } = useGameStore();
  const activeSlip = getActiveSlip();
  const selectedNumbers = activeSlip?.selectedNumbers ?? [];

  const drawnSet = React.useMemo(() => {
    const set = new Set<number>();
    (drawnNumbers || []).forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v > 0) set.add(v);
    });
    return set;
  }, [drawnNumbers]);

  const selectedSet = React.useMemo(() => new Set(selectedNumbers), [selectedNumbers]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        padding: '6px 4px',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: '3.5px',
        }}
      >
        {Array.from({ length: 80 }, (_, i) => {
          const num = i + 1;
          const isSelected = selectedSet.has(num);
          const isDrawn = drawnSet.has(num);
          const isHit = isSelected && isDrawn;
          const isHot = !isSelected && !isDrawn && HOT_NUMBERS.includes(num);
          const isCold = !isSelected && !isDrawn && COLD_NUMBERS.includes(num);

          let bg = KENO_COLORS.cellDefault;
          let borderColor = KENO_COLORS.cellBorder;
          let textColor = KENO_COLORS.textDefault;
          let shadow = 'none';

          if (isHit) {
            bg = KENO_COLORS.hitFill;
            borderColor = KENO_COLORS.hitBorder;
            textColor = '#FFFFFF';
            shadow = '0 0 14px rgba(34, 197, 94, 0.85)';
          } else if (isDrawn) {
            bg = KENO_COLORS.drawnFill;
            borderColor = KENO_COLORS.drawnBorder;
            textColor = '#FFFFFF';
          } else if (isSelected) {
            bg = KENO_COLORS.pickFill;
            borderColor = KENO_COLORS.pickBorder;
            textColor = '#FFFFFF';
            shadow = '0 0 8px rgba(22, 163, 74, 0.5)';
          }

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => toggleNumber(num)}
              className={isHit ? 'ball-pop' : ''}
              style={{
                aspectRatio: '1 / 1',
                width: '100%',
                borderRadius: '6px',
                border: `1.5px solid ${borderColor}`,
                background: bg,
                color: textColor,
                fontSize: '14px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                boxShadow: shadow,
                transition: 'all 0.12s ease-out',
                position: 'relative',
                padding: 0,
              }}
            >
              <span>{num}</span>

              {/* Hot indicator red dot */}
              {isHot && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2.5,
                    left: 2.5,
                    width: 3.5,
                    height: 3.5,
                    borderRadius: '50%',
                    backgroundColor: KENO_COLORS.dotHot,
                    boxShadow: '0 0 3px #EF4444',
                  }}
                />
              )}

              {/* Cold indicator blue dot */}
              {isCold && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2.5,
                    right: 2.5,
                    width: 3.5,
                    height: 3.5,
                    borderRadius: '50%',
                    backgroundColor: KENO_COLORS.dotCold,
                    boxShadow: '0 0 3px #38BDF8',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
