import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { KenoDrawDisplay } from './KenoDrawDisplay';
import { KenoGrid } from './KenoGrid';
import { KenoGradient } from './KenoGradient';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS, KENO_GRADIENTS, KENO_GRADIENT_VERTICAL } from '../theme/kenoTheme';

interface KenoPlayStageProps {
  roundNumber?: number | string;
  timeLeft?: number;
  bettingOpen?: boolean;
}

const DrawnBallPill: React.FC<{ num: number | null; isHit: boolean; isLatest: boolean }> = React.memo(({ num, isHit, isLatest }) => {
  const scaleAnim = useRef(new Animated.Value(1.0)).current;

  useEffect(() => {
    if (isLatest && num !== null) {
      scaleAnim.setValue(2.4);
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 750,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start();
    }
  }, [isLatest, num, scaleAnim]);

  if (num === null) {
    return (
      <View style={[styles.pillBall, styles.pillEmpty]}>
        <Text style={styles.pillEmptyText}>—</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], zIndex: isLatest ? 99 : 1 }}>
      <View style={[styles.pillBall, isHit ? styles.pillHit : styles.pillDrawn]}>
        <Text style={[styles.pillText, isHit && styles.pillHitText]}>
          {num < 10 ? `0${num}` : num}
        </Text>
      </View>
    </Animated.View>
  );
});

export const KenoPlayStage = ({
  roundNumber,
  timeLeft = 0,
  bettingOpen = false,
}: KenoPlayStageProps) => {
  const { getActiveSlip, clearSelection, drawnNumbers } = useGameStore();
  const activeSlip = getActiveSlip();
  const selectedNumbers = activeSlip?.selectedNumbers ?? [];
  const spots = selectedNumbers.length;

  const top10 = Array.from({ length: 10 }, (_, i) => (drawnNumbers[i] !== undefined ? drawnNumbers[i] : null));
  const bottom10 = Array.from({ length: 10 }, (_, i) => (drawnNumbers[i + 10] !== undefined ? drawnNumbers[i + 10] : null));

  return (
    <View style={styles.stageOuter}>
      <KenoGradient
        colors={['#FF0000', '#CC0000', '#990000']}
        start={KENO_GRADIENT_VERTICAL.start}
        end={KENO_GRADIENT_VERTICAL.end}
        style={styles.stageFrame}
      >
        <KenoGradient
          colors={['#FF0000', '#B30000']}
          start={KENO_GRADIENT_VERTICAL.start}
          end={KENO_GRADIENT_VERTICAL.end}
          style={styles.stageInner}
        >
          {/* Top Bar with balanced top/bottom padding */}
          <View style={styles.topBar}>
            <View style={styles.drawTitleRow}>
              <Text style={styles.drawHeaderLabel}>DRAW </Text>
              <Text style={styles.drawHeaderNumber}>{roundNumber ?? '197'}</Text>
            </View>

            <View style={styles.spotBadge}>
              <Text style={styles.spotBadgeText}>
                {spots > 0 ? `${spots} SPOTS` : 'HEADS'}
              </Text>
            </View>

            {spots > 0 && (
              <TouchableOpacity
                onPress={clearSelection}
                style={styles.clearBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.clearText}>Clear picks</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 2-Row Drawn Numbers Display: Top = First 10 balls, Bottom = Next 10 balls */}
          {drawnNumbers.length > 0 && (
            <View style={styles.drawnContainer2Rows}>
              {/* Top Row: Balls 1 to 10 */}
              <View style={styles.drawnRow}>
                {top10.map((n, idx) => {
                  const isHit = n !== null && selectedNumbers.includes(n);
                  const isLatest = idx === drawnNumbers.length - 1;
                  return (
                    <DrawnBallPill
                      key={`top-${idx}-${n ?? 'empty'}`}
                      num={n}
                      isHit={isHit}
                      isLatest={isLatest}
                    />
                  );
                })}
              </View>

              {/* Bottom Row: Balls 11 to 20 */}
              <View style={styles.drawnRow}>
                {bottom10.map((n, idx) => {
                  const actualIdx = idx + 10;
                  const isHit = n !== null && selectedNumbers.includes(n);
                  const isLatest = actualIdx === drawnNumbers.length - 1;
                  return (
                    <DrawnBallPill
                      key={`bot-${idx}-${n ?? 'empty'}`}
                      num={n}
                      isHit={isHit}
                      isLatest={isLatest}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Main Content Area with clear horizontal separation */}
          <View style={styles.mainRow}>
            <View style={styles.gridColumn}>
              <KenoGrid />
            </View>

            <View style={styles.machineColumn}>
              <KenoDrawDisplay timeLeft={timeLeft} bettingOpen={bettingOpen} />
            </View>
          </View>

          {/* Bottom Footer Row */}
          <View style={styles.footerRow}>
            <Text style={styles.title}>KENO</Text>
            <Text style={styles.footerHint}>
              {bettingOpen && timeLeft > 0 ? `${timeLeft}s until draw` : ''}
            </Text>
          </View>
        </KenoGradient>
      </KenoGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  stageOuter: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  stageFrame: {
    flex: 1,
    padding: 0,
  },
  stageInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingRight: 40,
    zIndex: 10,
  },
  drawTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  drawHeaderLabel: {
    color: '#CCFF00',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  drawHeaderNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  spotBadge: {
    backgroundColor: '#CCFF00',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  spotBadgeText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  clearBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  drawnContainer2Rows: {
    marginVertical: 4,
    gap: 4,
  },
  drawnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillBall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  pillEmpty: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pillEmptyText: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 9,
    fontWeight: '700',
  },
  pillDrawn: {
    backgroundColor: '#FFEC00',
    borderColor: '#D97706',
  },
  pillHit: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  pillText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  pillHitText: {
    color: '#FFFFFF',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  gridColumn: {
    flex: 1,
    paddingRight: 16,
  },
  machineColumn: {
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
});