import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  Animated,
  Easing,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS } from '../theme/kenoTheme';

const COLS = 10;
const ROWS = 8;
const GAP = 3;
const H_PAD = 6;

interface GridCellProps {
  num: number;
  isSelected: boolean;
  isDrawn: boolean;
  isHit: boolean;
  cellSize: number;
  cellRadius: number;
  fontSize: number;
  disabled?: boolean;
  onPress: () => void;
}

const GridCell: React.FC<GridCellProps> = React.memo(({
  num,
  isSelected,
  isDrawn,
  isHit,
  cellSize,
  cellRadius,
  fontSize,
  disabled,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const prevDrawn = useRef(isDrawn);

  useEffect(() => {
    if (!prevDrawn.current && isDrawn) {
      // Number was just drawn — start BIG (2.4x) and shrink down to 1.0x over 750ms
      setIsAnimating(true);
      scaleAnim.setValue(2.4);

      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 750,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    } else if (!isDrawn) {
      scaleAnim.setValue(1.0);
      setIsAnimating(false);
    }
    prevDrawn.current = isDrawn;
  }, [isDrawn, scaleAnim]);

  // Hot/cold number indicators (hardcoded demo like Shamo.bet)
  const isHot = !isSelected && !isDrawn && [14, 28, 32, 48, 58, 61, 71, 75].includes(num);
  const isCold = !isSelected && !isDrawn && [6, 8, 16, 27, 39, 42, 59, 67].includes(num);

  let cellBg = KENO_COLORS.cellDefault;
  let cellBorderColor = KENO_COLORS.cellBorder;
  let textColor = KENO_COLORS.textDefault;
  let borderWidth = 1;
  let hasGlow = false;

  if (isHit) {
    // Drawn + selected = bright radiant winning green with glow
    cellBg = KENO_COLORS.hitFill;
    cellBorderColor = KENO_COLORS.hitBorder;
    textColor = '#FFFFFF';
    borderWidth = 2;
    hasGlow = true;
  } else if (isDrawn) {
    // Drawn only = sleek dark emerald tile
    cellBg = KENO_COLORS.drawnFill;
    cellBorderColor = KENO_COLORS.drawnBorder;
    textColor = KENO_COLORS.drawnText;
    borderWidth = 1.5;
  } else if (isSelected) {
    // Selected = rich casino felt emerald green (Shamo.bet cell 4)
    cellBg = KENO_COLORS.pickFill;
    cellBorderColor = KENO_COLORS.pickBorder;
    textColor = '#FFFFFF';
    borderWidth = 1.5;
  }

  return (
    <Animated.View
      style={{
        zIndex: isAnimating || isHit ? 99 : 1,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        disabled={disabled}
        style={[
          styles.ball,
          {
            width: cellSize,
            height: cellSize,
            borderRadius: cellRadius,
            backgroundColor: cellBg,
            borderWidth,
            borderColor: cellBorderColor,
            ...(hasGlow
              ? {
                shadowColor: '#22C55E',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.85,
                shadowRadius: 8,
                elevation: 6,
              }
              : {}),
          },
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.ballText,
            {
              fontSize,
              color: textColor,
              fontWeight: isSelected || isDrawn || isHit ? '900' : '700',
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {num}
        </Text>
        {/* Hot / Cold dot indicator on top corner */}
        {isHot && (
          <View style={[styles.statDot, styles.hotDotPos, { backgroundColor: KENO_COLORS.hotDot }]} />
        )}
        {isCold && (
          <View style={[styles.statDot, styles.coldDotPos, { backgroundColor: KENO_COLORS.coldDot }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

interface KenoGridProps {
  bettingOpen?: boolean;
}

export const KenoGrid: React.FC<KenoGridProps> = ({ bettingOpen = true }) => {
  const { toggleNumber, drawnNumbers, getActiveSlip } = useGameStore();
  const activeSlip = getActiveSlip();
  const selectedNumbers = activeSlip?.selectedNumbers ?? [];
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
  const fontSize = Math.max(13, Math.min(24, cellSize * 0.65));
  const cellRadius = Math.max(4, cellSize * 0.14);

  return (
    <View style={styles.gridWrap} onLayout={onLayout}>
      {containerWidth > 0 && (
        <View style={[styles.gridContainer, { width: gridWidth, minHeight: gridHeight }]}>
          {numbers.map((num) => {
            const isSelected = selectedNumbers.includes(num);
            const isDrawn = drawnSet.has(num);
            const isHit = isSelected && isDrawn;

            return (
              <GridCell
                key={num}
                num={num}
                isSelected={isSelected}
                isDrawn={isDrawn}
                isHit={isHit}
                cellSize={cellSize}
                cellRadius={cellRadius}
                fontSize={fontSize}
                disabled={!bettingOpen}
                onPress={() => toggleNumber(num)}
              />
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
    position: 'relative',
  },
  ballText: {
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  statDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hotDotPos: {
    top: 2,
    right: 2,
  },
  coldDotPos: {
    top: 2,
    left: 2,
  },
});
