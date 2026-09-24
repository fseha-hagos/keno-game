import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS } from '../theme/kenoTheme';

const COLS = 10;
const ROWS = 8;
const GAP = 1;
const H_PAD = 2;

export const KenoGrid: React.FC = () => {
  const { toggleNumber, drawnNumbers, getActiveSlip } = useGameStore();
  const activeSlip = getActiveSlip();
  const selectedNumbers = activeSlip.selectedNumbers;
  const drawnSet = new Set(drawnNumbers);

  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const { cellSize, gridWidth, gridHeight } = useMemo(() => {
    const usable = Math.max(0, containerWidth - H_PAD * 2);
    if (usable <= 0) {
      return { cellSize: 24, gridWidth: 0, gridHeight: 0 };
    }
    const byWidth = Math.floor((usable - GAP * (COLS - 1)) / COLS);
    const cell = Math.max(20, byWidth);
    return {
      cellSize: cell,
      gridWidth: COLS * cell + GAP * (COLS - 1),
      gridHeight: ROWS * cell + GAP * (ROWS - 1),
    };
  }, [containerWidth]);

  const numbers = Array.from({ length: 80 }, (_, i) => i + 1);
  const fontSize = Math.max(9, Math.min(13, cellSize * 0.38));

  return (
    <View style={styles.gridWrap} onLayout={onLayout}>
      {containerWidth > 0 && (
        <View style={[styles.gridContainer, { width: gridWidth, minHeight: gridHeight }]}>
          {numbers.map((num) => {
            const isSelected = selectedNumbers.includes(num);
            const isDrawn = drawnSet.has(num);
            const isHit = isSelected && isDrawn;

            let stateBallStyle = styles.ballDefault;
            let stateTextStyle = styles.textDefault;

            if (isHit) {
              stateBallStyle = styles.ballHit;
              stateTextStyle = styles.textHit;
            } else if (isSelected) {
              stateBallStyle = styles.ballSelected;
              stateTextStyle = styles.textPick;
            } else if (isDrawn) {
              stateBallStyle = styles.ballDrawn;
              stateTextStyle = styles.textDrawn;
            }

            const cellRadius = Math.max(5, cellSize * 0.22);

            return (
              <TouchableOpacity
                key={num}
                activeOpacity={0.75}
                style={[
                  styles.ball,
                  stateBallStyle,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRadius: cellRadius,
                  },
                ]}
                onPress={() => toggleNumber(num)}
              >
                <Text
                  style={[styles.ballText, stateTextStyle, { fontSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {num < 10 ? `0${num}` : num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  gridWrap: {
    width: '100%',
    paddingHorizontal: H_PAD,
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    justifyContent: 'flex-start',
  },
  ball: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  ballDefault: {
    backgroundColor: KENO_COLORS.cellDefault,
    borderWidth: 1,
    borderColor: KENO_COLORS.cellBorder,
  },
  ballSelected: {
    backgroundColor: KENO_COLORS.pickFill,
    borderWidth: 2,
    borderColor: KENO_COLORS.pickBorder,
  },
  ballDrawn: {
    backgroundColor: KENO_COLORS.drawnFill,
    borderWidth: 2,
    borderColor: KENO_COLORS.drawnBorder,
  },
  ballHit: {
    backgroundColor: KENO_COLORS.hitFill,
    borderWidth: 2,
    borderColor: KENO_COLORS.hitBorder,
  },
  ballText: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  textDefault: {
    color: KENO_COLORS.textOnOrange,
    fontWeight: '800',
  },
  textPick: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  textDrawn: {
    color: '#0C4A6E',
    fontWeight: '800',
  },
  textHit: {
    color: '#14532D',
    fontWeight: '800',
  },
});
