import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useGameStore } from '../store/useGameStore';

const TOTAL_DRAWN = 20;

interface KenoDrawDisplayProps {
  timeLeft?: number;
  bettingOpen?: boolean;
}

export const KenoDrawDisplay = ({ timeLeft = 0, bettingOpen = false }: KenoDrawDisplayProps) => {
  const { drawnNumbers, isDrawing } = useGameStore();
  const current = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;
  const count = drawnNumbers.length;
  const inDraw = isDrawing || count > 0;

  // Track the number specifically displayed during animation steps
  const [animatingNum, setAnimatingNum] = useState<number | null>(current ?? null);

  const displayNum =
    animatingNum != null ? (animatingNum < 10 ? `0${animatingNum}` : String(animatingNum)) : null;
  const digitA = displayNum?.[0] ?? '';
  const digitB = displayNum?.[1] ?? '';

  const translateY = useRef(new Animated.Value(220)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const prevNum = useRef<number | null>(null);

  useEffect(() => {
    if (current != null && current !== prevNum.current) {
      if (prevNum.current !== null) {
        // Step 1: Shoot OLD number OUT to the TOP
        Animated.timing(translateY, {
          toValue: -220,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          // Step 2: Once off-screen at top, update number to NEW draw & reset to bottom
          setAnimatingNum(current);
          translateY.setValue(220);

          // Step 3: Rise NEW ball from bottom into center glass
          Animated.timing(translateY, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        });
      } else {
        // First ball of the round
        setAnimatingNum(current);
        translateY.setValue(220);
        opacity.setValue(1);

        Animated.timing(translateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }

      prevNum.current = current;
    } else if (current == null || drawnNumbers.length === 0) {
      // Refresh & reset to a 100% fresh start when game ends or round restarts
      translateY.setValue(220);
      opacity.setValue(0);
      setAnimatingNum(null);
      prevNum.current = null;
    }
  }, [current, drawnNumbers.length, translateY, opacity]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.progressTopRight}>
        {inDraw ? `${count}/${TOTAL_DRAWN}` : bettingOpen && timeLeft > 0 ? `${timeLeft}s` : '0/20'}
      </Text>

      <View style={styles.machineRow}>
        {/* Central Red Pipe Backing */}
        <View style={styles.centerRedTube}>
          <View style={styles.tubeHighlight} />
        </View>

        <View style={styles.machine}>
          {/* Top Metal Clamp (Narrow top, wide base for reversed tilt) */}
          <View style={styles.clampCapNarrow} />
          <View style={styles.silverRing}>
            <View style={styles.rivet} />
            <View style={styles.rivet} />
          </View>
          <View style={styles.clampCapWide} />

          {/* Glass Chamber */}
          <View style={styles.glassOuter}>
            <View style={styles.glassInner}>
              <View style={styles.glassReflection} />

              {/* Animated Movable Keno Ball */}
              <Animated.View
                style={[
                  styles.ball,
                  {
                    opacity,
                    transform: [{ translateY }],
                  },
                ]}
              >
                {displayNum ? (
                  <>
                    <Text style={[styles.ballDigitSide, styles.digitLeft]}>{digitA}</Text>
                    <Text style={styles.ballNumMain}>{displayNum}</Text>
                    <Text style={[styles.ballDigitSide, styles.digitRight]}>{digitB}</Text>
                  </>
                ) : (
                  <Text style={styles.ballWaiting}>—</Text>
                )}
              </Animated.View>
            </View>
          </View>

          {/* Bottom Metal Clamp (Wide top, narrow base facing bottom pipe) */}
          <View style={styles.clampCapWide} />
          <View style={styles.silverRing}>
            <View style={styles.rivet} />
            <View style={styles.rivet} />
          </View>
          <View style={styles.clampCapNarrow} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 16,
    overflow: 'hidden',
  },
  progressTopRight: {
    position: 'absolute',
    top: -6,
    right: -4,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    zIndex: 15,
  },
  machineRow: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerRedTube: {
    position: 'absolute',
    width: 38,
    height: '160%',
    backgroundColor: '#b30000',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderColor: '#000000',
    zIndex: 1,
  },
  tubeHighlight: {
    position: 'absolute',
    left: 3,
    width: 5,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  machine: {
    alignItems: 'center',
    zIndex: 2,
  },
  clampCapWide: {
    width: 106,
    height: 5,
    backgroundColor: '#111111',
    borderRadius: 2,
    zIndex: 4,
  },
  clampCapNarrow: {
    width: 96,
    height: 4,
    backgroundColor: '#111111',
    borderRadius: 2,
    zIndex: 4,
  },
  silverRing: {
    width: 96,
    height: 16,
    backgroundColor: '#DCDCDC',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#888888',
    zIndex: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rivet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#222222',
  },
  glassOuter: {
    width: 116,
    height: 98,
    backgroundColor: 'transparent',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 49,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    marginTop: -2,
    marginBottom: -2,
    overflow: 'visible',
  },
  glassInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glassReflection: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 8,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 4,
    transform: [{ rotate: '12deg' }],
    zIndex: 10,
  },
  ball: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFEC00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    position: 'relative',
    zIndex: 2,
  },
  ballNumMain: {
    color: '#000000',
    fontSize: 48,
    fontWeight: '900',
    zIndex: 3,
    includeFontPadding: false,
  },
  ballDigitSide: {
    position: 'absolute',
    color: '#000000',
    fontSize: 32,
    fontWeight: '900',
  },
  digitLeft: {
    left: -6,
    transform: [{ scaleX: 0.5 }, { rotate: '-14deg' }],
  },
  digitRight: {
    right: -6,
    transform: [{ scaleX: 0.5 }, { rotate: '14deg' }],
  },
  ballWaiting: {
    color: 'rgba(0,0,0,0.35)',
    fontSize: 32,
    fontWeight: '900',
  },
});