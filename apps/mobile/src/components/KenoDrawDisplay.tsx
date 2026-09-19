import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS } from '../theme/kenoTheme';

const TOTAL_DRAWN = 20;

interface KenoDrawDisplayProps {
  timeLeft?: number;
  bettingOpen?: boolean;
}

export const KenoDrawDisplay = ({ timeLeft = 0, bettingOpen = false }: KenoDrawDisplayProps) => {
  const { drawnNumbers, isDrawing } = useGameStore();
  const current = drawnNumbers[drawnNumbers.length - 1];
  const count = drawnNumbers.length;
  const inDraw = isDrawing || count > 0;

  const displayNum =
    current != null ? (current < 10 ? `0${current}` : String(current)) : null;
  const digitA = displayNum?.[0] ?? '';
  const digitB = displayNum?.[1] ?? '';

  return (
    <View style={styles.wrap}>
      <View style={styles.machineRow}>
        <View style={styles.rod} />
        <View style={styles.machine}>
          <View style={styles.ringTop}>
            <View style={styles.ringShine} />
          </View>

          <View style={styles.glassOuter}>
            <View style={styles.glassInner}>
              <View style={styles.ball}>
                {displayNum ? (
                  <>
                    <Text style={[styles.ballDigitSide, styles.digitLeft]}>{digitA}</Text>
                    <Text style={styles.ballNumMain}>{displayNum}</Text>
                    <Text style={[styles.ballDigitSide, styles.digitRight]}>{digitB}</Text>
                  </>
                ) : (
                  <Text style={styles.ballWaiting}>—</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.ringBottom}>
            <View style={styles.ringShine} />
          </View>
          <View style={styles.stem} />
        </View>
        <View style={styles.rod} />
      </View>

      <Text style={styles.progress}>
        {inDraw
          ? `${count}/${TOTAL_DRAWN}`
          : bettingOpen && timeLeft > 0
            ? `${timeLeft}s`
            : '0/20'}
      </Text>

      {!inDraw && bettingOpen && timeLeft > 0 && (
        <Text style={styles.progressHint}>NEXT DRAW</Text>
      )}
      {inDraw && isDrawing && <Text style={styles.progressHint}>LIVE</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 88,
    flexShrink: 0,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  machineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  rod: {
    width: 4,
    height: 92,
    borderRadius: 2,
    backgroundColor: KENO_COLORS.chromeMid,
    borderWidth: 1,
    borderColor: KENO_COLORS.chromeEdge,
  },
  machine: {
    alignItems: 'center',
  },
  ringTop: {
    width: 78,
    height: 13,
    borderRadius: 7,
    backgroundColor: KENO_COLORS.chrome,
    borderWidth: 1,
    borderColor: KENO_COLORS.chromeEdge,
    marginBottom: -4,
    zIndex: 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  ringBottom: {
    width: 78,
    height: 13,
    borderRadius: 7,
    backgroundColor: KENO_COLORS.chrome,
    borderWidth: 1,
    borderColor: KENO_COLORS.chromeEdge,
    marginTop: -4,
    zIndex: 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  ringShine: {
    height: 3,
    marginHorizontal: 6,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  glassOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: KENO_COLORS.glassFill,
    borderWidth: 2,
    borderColor: KENO_COLORS.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  glassInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ball: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: KENO_COLORS.ballYellowBright,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  ballNumMain: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '900',
    zIndex: 3,
    letterSpacing: -1,
  },
  ballDigitSide: {
    position: 'absolute',
    color: 'rgba(0,0,0,0.22)',
    fontSize: 16,
    fontWeight: '900',
  },
  digitLeft: {
    left: 4,
    top: 8,
    transform: [{ rotate: '-18deg' }],
  },
  digitRight: {
    right: 4,
    bottom: 8,
    transform: [{ rotate: '16deg' }],
  },
  ballWaiting: {
    color: 'rgba(0,0,0,0.35)',
    fontSize: 26,
    fontWeight: '900',
  },
  stem: {
    width: 10,
    height: 16,
    backgroundColor: KENO_COLORS.chromeDark,
    borderRadius: 2,
    marginTop: 2,
    borderWidth: 1,
    borderColor: KENO_COLORS.chromeEdge,
  },
  progress: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressHint: {
    marginTop: 2,
    color: KENO_COLORS.textMuted,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
