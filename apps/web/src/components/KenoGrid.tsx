import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';

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
          gap: '2.5px',
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
          let textColor = KENO_COLORS.textDefault;
          let shadow = 'none';

          if (isHit) {
            bg = KENO_COLORS.hitFill;
            textColor = '#FFFFFF';
            shadow = '0 0 12px rgba(107, 226, 168, 0.85)';
          } else if (isDrawn) {
            bg = KENO_COLORS.drawnFill;
            textColor = '#FFFFFF';
          } else if (isSelected) {
            bg = KENO_COLORS.pickFill;
            textColor = '#FFFFFF';
            shadow = '0 0 6px rgba(76, 139, 101, 0.6)';
          }

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => toggleNumber(num)}
              className={isHit ? 'animate-pop' : ''}
              style={{
                aspectRatio: '1 / 1',
                width: '100%',
                borderRadius: '3px',
                border: 'none',
                background: bg,
                color: textColor,
                fontFamily: KENO_FONTS.numbers,
                fontSize: 'clamp(15px, 3.6vw, 20px)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                boxShadow: shadow,
                transition: 'background 0.12s ease-out, transform 0.08s ease',
                position: 'relative',
                padding: 0,
              }}
            >
              <span>{num}</span>

              {/* Hot indicator red dot (top-left matching mock_web .bet_board_itm.max:after) */}
              {isHot && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8%',
                    left: '8%',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: KENO_COLORS.dotHot,
                  }}
                />
              )}

              {/* Cold indicator light blue dot (top-left matching mock_web .bet_board_itm.min:after) */}
              {isCold && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8%',
                    left: '8%',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: KENO_COLORS.dotCold,
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
