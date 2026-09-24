import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  Animated,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS } from '../theme/kenoTheme';

const COLS = 10;
const ROWS = 8;
const GAP = 1;
const H_PAD = 2;

interface GridCellProps {
  num: number;
  isSelected: boolean;
  isDrawn: boolean;
  isHit: boolean;
  cellSize: number;
  cellRadius: number;
  fontSize: number;
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
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const prevDrawn = useRef(isDrawn);

  useEffect(() => {
    if (!prevDrawn.current && isDrawn) {
      // Number was just drawn — start BIG (2.4x) and shrink down to 1.0x
      setIsAnimating(true);
      scaleAnim.setValue(2.4);

      Animated.spring(scaleAnim, {
        toValue: 1.0,
        friction: 5,
        tension: 120,
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

  return (
    <Animated.View
      style={{
        zIndex: isAnimating ? 99 : 1,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
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
        onPress={onPress}
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
    </Animated.View>
  );
});

export const KenoGrid: React.FC = () => {
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
  const fontSize = Math.max(9, Math.min(13, cellSize * 0.38));
  const cellRadius = Math.max(5, cellSize * 0.22);

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
