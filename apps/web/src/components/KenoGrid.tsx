import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';
import { usePlacedBetNumbers } from '../hooks/usePlacedBetNumbers';

interface KenoGridProps {
  disabled?: boolean;
  roundId?: string;
  isGameRunning?: boolean;
}

export const KenoGrid: React.FC<KenoGridProps> = ({ disabled = false, roundId, isGameRunning = false }) => {
  const placedBetNumbers = usePlacedBetNumbers(roundId);
  const { getActiveSlip, toggleNumber, drawnNumbers, lastGameNumbers } = useGameStore();
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

  const lastGameSet = React.useMemo(() => {
    const set = new Set<number>();
    (lastGameNumbers || []).forEach((n) => {
      const v = Number(n);
      if (!isNaN(v) && v >= 1 && v <= 80) set.add(v);
    });
    return set;
  }, [lastGameNumbers]);

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
          const isBetPlaced = placedBetNumbers.has(num);
          const isHit = isBetPlaced && isDrawn;
          const isLastGameDrawn = lastGameSet.has(num);

          let bg = KENO_COLORS.cellDefault;
          let textColor = KENO_COLORS.textDefault;
          let shadow = 'none';

          if (isHit) {
            bg = KENO_COLORS.hitFill;
            textColor = '#FFFFFF';
            shadow = 'none';
          } else if (isDrawn) {
            bg = KENO_COLORS.drawnFill;
            textColor = '#FFFFFF';
            shadow = 'none';
          } else if (isSelected) {
            bg = KENO_COLORS.pickFill;
            textColor = '#FFFFFF';
            shadow = 'none';
          }

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => toggleNumber(num)}
              className=""
              style={{
                aspectRatio: '1 / 1',
                width: '100%',
                borderRadius: '3px',
                border: 'none',
                background: bg,
                color: textColor,
                fontFamily: KENO_FONTS.numbers,
                fontSize: 'clamp(21px, 5.4vw, 30px)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                boxShadow: shadow,
                transition: 'none',
                position: 'relative',
                padding: 0,
              }}
            >
              <span>{num}</span>

              {/* Indicator dot on numbers drawn in the last game (hot red color) */}
              {isLastGameDrawn && !isHit && !isDrawn && (
                <span
                  title={`Drawn in last game (${num})`}
                  style={{
                    position: 'absolute',
                    top: '2%',
                    left: '2%',
                    width: 5.5,
                    height: 5.5,
                    borderRadius: '50%',
                    backgroundColor: KENO_COLORS.dotHot,
                    boxShadow: '0 0 3.5px rgba(255, 92, 92, 0.9)',
                    pointerEvents: 'none',
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
