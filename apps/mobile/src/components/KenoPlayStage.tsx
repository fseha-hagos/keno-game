import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import { KenoGrid } from './KenoGrid';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES } from '@keno/game-math';
import { KENO_COLORS } from '../theme/kenoTheme';

interface KenoPlayStageProps {
  roundNumber?: number | string;
  timeLeft?: number;
  bettingOpen?: boolean;
}

interface QueueItem {
  num: number;
  index: number;
}

export const KenoPlayStage = ({
  roundNumber,
  timeLeft = 0,
  bettingOpen = false,
}: KenoPlayStageProps) => {
  const { getActiveSlip, toggleNumber, clearSelection, drawnNumbers, isDrawing } = useGameStore();
  const activeSlip = getActiveSlip();
  const selectedNumbers = activeSlip?.selectedNumbers ?? [];
  const spots = selectedNumbers.length;

  // Settled balls map: array of 20 elements (null or number)
  const [settledBalls, setSettledBalls] = useState<(number | null)[]>(() =>
    Array(20).fill(null),
  );
  const [callingItem, setCallingItem] = useState<QueueItem | null>(null);
  const [completedHoldActive, setCompletedHoldActive] = useState(false);

  const queueRef = useRef<QueueItem[]>([]);
  const isAnimatingRef = useRef(false);

  // Animated values for moving from top to specific bottom space
  const ballTranslateX = useRef(new Animated.Value(0)).current;
  const ballTranslateY = useRef(new Animated.Value(0)).current;
  const ballScaleAnim = useRef(new Animated.Value(0)).current;
  const radarWaveScale = useRef(new Animated.Value(0.7)).current;
  const radarWaveOpacity = useRef(new Animated.Value(0)).current;

  // Calculate target coordinate for ball index (0 to 19)
  // Tray width: 10 balls * 28 + 9 * 3.5 = 311.5px.
  // Center is X=0. Slot centers: -141.75 + col * 31.5
  const getSlotTarget = (idx: number) => {
    if (idx < 10) {
      // Row 1 (bottom row: balls 1..10)
      const col = idx;
      const targetX = -141.75 + col * 31.5;
      const targetY = 111;
      return { targetX, targetY };
    } else {
      // Row 2 (top row of tray: balls 11..20)
      const col = idx - 10;
      const targetX = -141.75 + col * 31.5;
      const targetY = 77;
      return { targetX, targetY };
    }
  };

  // Process next ball in the queue
  const processNextBall = () => {
    if (isAnimatingRef.current || queueRef.current.length === 0) return;

    isAnimatingRef.current = true;
    const item = queueRef.current.shift()!;
    setCallingItem(item);

    const { targetX, targetY } = getSlotTarget(item.index);

    // 1. Reset ball to top center in big size
    ballTranslateX.setValue(0);
    ballTranslateY.setValue(0);
    ballScaleAnim.setValue(0.2);

    // Radial wave burst behind the big ball
    radarWaveScale.setValue(0.7);
    radarWaveOpacity.setValue(0.85);

    Animated.parallel([
      Animated.timing(radarWaveScale, {
        toValue: 2.2,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(radarWaveOpacity, {
        toValue: 0.0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(ballScaleAnim, {
        toValue: 1.0,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Pause at top in big size (fast and snappy)
      const pauseDuration = queueRef.current.length > 2 ? 100 : queueRef.current.length > 0 ? 160 : 220;

      setTimeout(() => {
        // 3. Move smoothly to its EXACT SPECIFIC SPACE in the bottom row!
        Animated.parallel([
          Animated.timing(ballTranslateX, {
            toValue: targetX,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ballTranslateY, {
            toValue: targetY,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ballScaleAnim, {
            toValue: 0.39, // Shrink from 72px to 28px
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // 4. Lands right into that specific slot!
          setSettledBalls((prev) => {
            const next = [...prev];
            next[item.index] = item.num;
            return next;
          });
          setCallingItem(null);
          isAnimatingRef.current = false;

          // If this was the 20th ball (index 19), hold the completed results for 3s
          if (item.index >= 19) {
            setCompletedHoldActive(true);
            setTimeout(() => {
              setCompletedHoldActive(false);
            }, 3000);
          }

          // 5. Next number comes in with big size at top
          if (queueRef.current.length > 0) {
            setTimeout(processNextBall, 40);
          }
        });
      }, pauseDuration);
    });
  };

  // Ingest incoming drawn numbers into animation queue
  useEffect(() => {
    if (drawnNumbers.length === 0) {
      if (!completedHoldActive) {
        setSettledBalls(Array(20).fill(null));
        setCallingItem(null);
        queueRef.current = [];
        isAnimatingRef.current = false;
      }
      return;
    }

    // Determine which drawn numbers haven't been queued or settled yet
    const alreadyHandledIndices = new Set<number>();
    settledBalls.forEach((val, idx) => {
      if (val !== null) alreadyHandledIndices.add(idx);
    });
    if (callingItem) alreadyHandledIndices.add(callingItem.index);
    queueRef.current.forEach((q) => alreadyHandledIndices.add(q.index));

    const newItems: QueueItem[] = [];
    drawnNumbers.forEach((num, idx) => {
      if (idx < 20 && !alreadyHandledIndices.has(idx)) {
        newItems.push({ num, index: idx });
      }
    });

    if (newItems.length > 0) {
      // If user connects mid-draw with many numbers (> 4), instantly settle earlier ones
      const settledCount = settledBalls.filter((n) => n !== null).length;
      if (settledCount === 0 && newItems.length > 4) {
        const instantItems = newItems.slice(0, newItems.length - 2);
        const animateItems = newItems.slice(newItems.length - 2);

        setSettledBalls((prev) => {
          const next = [...prev];
          instantItems.forEach((it) => {
            next[it.index] = it.num;
          });
          return next;
        });

        queueRef.current.push(...animateItems);
      } else {
        queueRef.current.push(...newItems);
      }
      processNextBall();
    }
  }, [drawnNumbers, completedHoldActive]);

  // Count settled balls
  const settledCount = settledBalls.filter((n) => n !== null).length;
  const currentTotalDrawn = settledCount + (callingItem !== null ? 1 : 0);
  const isCallingHit = callingItem !== null && selectedNumbers.includes(callingItem.num);

  // Keep inDraw true so the draw stage never disappears prematurely
  const inDraw =
    isDrawing ||
    drawnNumbers.length > 0 ||
    callingItem !== null ||
    queueRef.current.length > 0 ||
    completedHoldActive ||
    settledCount > 0;

  // Format timer: "00 : 33" style like Shamo.bet
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
  };

  // Paytable entries for chosen spots
  const spotEntries = DEFAULT_96_PAYTABLE_ENTRIES
    .filter((e) => e.spots === spots && e.multiplier > 0)
    .sort((a, b) => a.hits - b.hits);

  const maxMultiplier = spotEntries.length > 0 ? (spotEntries[spotEntries.length - 1]?.multiplier ?? 0) : 0;
  const stake = Number(activeSlip?.stakeMinor ?? '400') / 100;
  const possibleWin = (stake * maxMultiplier).toFixed(2);

  // ═══════════════════════════════════════════════════
  // 1. DRAW PHASE — Big ball on top moving to its specific space at bottom
  // ═══════════════════════════════════════════════════
  if (inDraw) {
    return (
      <View style={styles.drawStageCard}>
        {/* Concentric radar circles centered behind the big ball */}
        <View style={styles.drawRadarContainer} pointerEvents="none">
          <View style={[styles.drawRadarRing, styles.drawRing1]} />
          <View style={[styles.drawRadarRing, styles.drawRing2]} />
          <View style={[styles.drawRadarRing, styles.drawRing3]} />
          <View style={[styles.drawRadarRing, styles.drawRing4]} />

          {/* Dynamic radar wave burst behind the big ball */}
          <Animated.View
            style={[
              styles.radarWaveBurst,
              {
                transform: [{ scale: radarWaveScale }],
                opacity: radarWaveOpacity,
              },
            ]}
          />
        </View>

        {/* Top-Right: Draw Progress Count (e.g. 19 / 20 with green slash) */}
        <View style={styles.drawCountBadge}>
          <Text style={styles.drawCountNumber}>{Math.min(20, currentTotalDrawn)}</Text>
          <Text style={styles.drawCountSlash}> / </Text>
          <Text style={styles.drawCountTotal}>20</Text>
        </View>

        {/* Center-Top: BIG CALLING BALL (pops at top, then moves to specific space) */}
        <View style={styles.callingBallContainer} pointerEvents="none">
          {callingItem !== null && (
            <Animated.View
              style={[
                styles.bigCallingBallWrap,
                {
                  transform: [
                    { translateX: ballTranslateX },
                    { translateY: ballTranslateY },
                    { scale: ballScaleAnim },
                  ],
                },
              ]}
            >
              <View style={[styles.bigCallingBall3D, isCallingHit && styles.bigCallingBallHit]}>
                <View style={styles.bigBallHighlight} />
                <Text style={[styles.bigBallText, isCallingHit && styles.bigBallHitText]}>
                  {callingItem.num}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Bottom Tray: Two Rows of 10 Specific Spaces */}
        <View style={styles.bottomTrayArea}>
          {/* Row 2: Spaces for Balls 11 to 20 */}
          <View style={styles.trayRow}>
            {Array.from({ length: 10 }, (_, col) => {
              const num = settledBalls[10 + col];
              if (num !== null && num !== undefined) {
                const isHit = selectedNumbers.includes(num);
                return (
                  <View key={`slot-r2-${col}-${num}`} style={[styles.trayBall3D, isHit && styles.trayBallHit]}>
                    <View style={styles.trayBallHighlight} />
                    <Text style={[styles.trayBallText, isHit && styles.trayBallHitText]}>{num}</Text>
                  </View>
                );
              }
              return (
                <View key={`empty-r2-${col}`} style={styles.trayBallSlotEmpty}>
                  <Text style={styles.emptySlotIndex}>{11 + col}</Text>
                </View>
              );
            })}
          </View>

          {/* Row 1: Spaces for Balls 1 to 10 */}
          <View style={styles.trayRow}>
            {Array.from({ length: 10 }, (_, col) => {
              const num = settledBalls[col];
              if (num !== null && num !== undefined) {
                const isHit = selectedNumbers.includes(num);
                return (
                  <View key={`slot-r1-${col}-${num}`} style={[styles.trayBall3D, isHit && styles.trayBallHit]}>
                    <View style={styles.trayBallHighlight} />
                    <Text style={[styles.trayBallText, isHit && styles.trayBallHitText]}>{num}</Text>
                  </View>
                );
              }
              return (
                <View key={`empty-r1-${col}`} style={styles.trayBallSlotEmpty}>
                  <Text style={styles.emptySlotIndex}>{1 + col}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════
  // 2. BETTING PHASE — Timer, choice card & 8x10 grid
  // ═══════════════════════════════════════════════════
  return (
    <View style={styles.stageOuter}>
      {/* Centered Digital Countdown Timer — Shamo.bet cyan glow */}
      <View style={styles.timerRow}>
        <Text style={styles.timerText}>
          {bettingOpen && timeLeft > 0 ? formatTimer(timeLeft) : '00 : 00'}
        </Text>
      </View>

      {/* When NO numbers chosen: "Choose 10 numbers" card */}
      {spots === 0 ? (
        <View style={styles.cardContainer}>
          {/* Radar concentric circles behind the balls */}
          <View style={styles.radarContainer} pointerEvents="none">
            <View style={[styles.radarRing, styles.ring1]} />
            <View style={[styles.radarRing, styles.ring2]} />
            <View style={[styles.radarRing, styles.ring3]} />
            <View style={[styles.radarRing, styles.ring4]} />
          </View>

          {/* 3D Balls Cluster */}
          <View style={styles.ballsCluster}>
            <View style={styles.ball80}>
              <View style={styles.specularSmall} />
              <Text style={styles.ball80Text}>80</Text>
            </View>
            <View style={styles.ball10}>
              <View style={styles.specularMedium} />
              <Text style={styles.ball10Text}>10</Text>
            </View>
            <View style={styles.ball1}>
              <View style={styles.ball1Inner}>
                <View style={styles.specularBig} />
                <Text style={styles.ball1Text}>1</Text>
              </View>
            </View>
          </View>

          {/* Card Text */}
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>Choose 10</Text>
            <Text style={styles.cardTitle}>numbers</Text>
            <Text style={styles.cardSubtitle}>From 1 to 80</Text>
          </View>

          {/* Top-Right Help Button */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'How to Play Fast Keno',
                'Select up to 10 numbers from the 1-80 grid.\nChoose your stake amount and press BET.\n20 numbers will be drawn. Match more to win up to 10,000x!',
                [{ text: 'Got it!' }],
              )
            }
            style={styles.helpBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* When 1+ numbers chosen: Possible win + Paytable + Slots */
        <View style={styles.cardContainerChosen}>
          {/* Top Row: "Possible win 15.48" + (?) help */}
          <View style={styles.chosenHeaderRow}>
            <View style={styles.possibleWinBox}>
              <Text style={styles.possibleWinLabel}>Possible win </Text>
              <Text style={styles.possibleWinAmount}>{possibleWin}</Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Paytable Info',
                  `Playing ${spots} spot${spots > 1 ? 's' : ''}. Maximum win is ${possibleWin} ETB with ${maxMultiplier}x payout.`,
                  [{ text: 'OK' }],
                )
              }
              style={styles.helpBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.helpIcon}>?</Text>
            </TouchableOpacity>
          </View>

          {/* Paytable Multipliers Row */}
          {spotEntries.length > 0 && (
            <View style={styles.paytableGrid}>
              <View style={styles.paytableColHeader}>
                <Text style={styles.paytableLabel}>Match</Text>
                <Text style={styles.paytableLabel}>Pays</Text>
              </View>

              <View style={styles.paytableColsContainer}>
                {spotEntries.map((e) => (
                  <View key={`spot-${e.hits}`} style={styles.paytableCol}>
                    <Text style={styles.paytableHitText}>{e.hits}</Text>
                    <Text style={styles.paytableMultText}>x{e.multiplier}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Selected Numbers Slots Row (10 slots) */}
          <View style={styles.slotsRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const num = selectedNumbers[i];
              if (num !== undefined) {
                return (
                  <TouchableOpacity
                    key={`slot-${num}`}
                    onPress={() => toggleNumber(num)}
                    style={styles.slotFilled}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.slotFilledText}>{num}</Text>
                  </TouchableOpacity>
                );
              }
              return <View key={`empty-slot-${i}`} style={styles.slotEmpty} />;
            })}
          </View>
        </View>
      )}

      {/* 8x10 Number Grid */}
      <View style={styles.gridArea}>
        <KenoGrid bettingOpen={bettingOpen} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stageOuter: {
    backgroundColor: '#0F1923',
    paddingBottom: 4,
  },

  // ── Countdown Timer (Shamo.bet cyan glow) ──
  timerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  timerText: {
    color: '#00E5FF',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 229, 255, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  // ── DRAW STAGE CARD (Top Big Ball -> Moves to Specific Space at Bottom) ──
  drawStageCard: {
    backgroundColor: '#060D0B',
    height: 185,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#152B23',
  },
  drawRadarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  drawRadarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.12)',
  },
  drawRing1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 10,
  },
  drawRing2: {
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -30,
  },
  drawRing3: {
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -75,
  },
  drawRing4: {
    width: 350,
    height: 350,
    borderRadius: 175,
    top: -125,
  },
  radarWaveBurst: {
    position: 'absolute',
    top: 14,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#00E676',
  },

  // Draw progress count (e.g. 19 / 20)
  drawCountBadge: {
    position: 'absolute',
    top: 8,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  drawCountNumber: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  drawCountSlash: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  drawCountTotal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },

  // Calling Ball Container at Top
  callingBallContainer: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 35,
  },
  bigCallingBallWrap: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigCallingBall3D: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#14271F',
    borderWidth: 2.5,
    borderColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 12,
  },
  bigCallingBallHit: {
    backgroundColor: '#00E676',
    borderColor: '#FFFFFF',
    shadowColor: '#00E676',
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  bigBallHighlight: {
    position: 'absolute',
    top: 5,
    left: 14,
    width: 42,
    height: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  bigBallText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  bigBallHitText: {
    color: '#000000',
    fontWeight: '900',
  },

  // Bottom Tray Area: Two Rows of 10 Specific Spaces
  bottomTrayArea: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    gap: 4,
    zIndex: 15,
    alignItems: 'center',
  },
  trayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
    minHeight: 28,
  },
  trayBall3D: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#14271F',
    borderWidth: 1.5,
    borderColor: '#1D4233',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  trayBallHit: {
    borderColor: '#00E676',
    backgroundColor: '#00E676',
  },
  trayBallHighlight: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  trayBallText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },
  trayBallHitText: {
    color: '#000000',
    fontWeight: '900',
  },
  trayBallSlotEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotIndex: {
    color: '#344c41',
    fontSize: 9,
    fontWeight: '700',
  },

  // ── BETTING PHASE: "Choose 10 numbers" card ──
  cardContainer: {
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#141D27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 95,
  },
  radarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.08)',
  },
  ring1: { width: 90, height: 90, borderRadius: 45, top: -10, left: -10 },
  ring2: { width: 170, height: 170, borderRadius: 85, top: -45, left: -40 },
  ring3: { width: 250, height: 250, borderRadius: 125, top: -85, left: -70 },
  ring4: { width: 340, height: 340, borderRadius: 170, top: -125, left: -100 },

  ballsCluster: {
    width: 78,
    height: 72,
    position: 'relative',
  },
  ball80: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'absolute',
    top: 4,
    left: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ball80Text: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '800',
  },
  specularSmall: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 7,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  ball10: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'absolute',
    top: 1,
    left: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ball10Text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  specularMedium: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 9,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  ball1: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#064E3B',
    borderWidth: 2,
    borderColor: '#22C55E',
    position: 'absolute',
    top: 20,
    left: 2,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ball1Inner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#065F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specularBig: {
    position: 'absolute',
    top: 3,
    left: 6,
    width: 15,
    height: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ rotate: '-30deg' }],
  },
  ball1Text: {
    color: '#4ADE80',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
  },

  cardTextCol: {
    marginLeft: 14,
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  cardSubtitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  helpBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  helpIcon: {
    color: '#8292A6',
    fontSize: 14,
    fontWeight: '900',
  },

  // ── CHOSEN NUMBERS CARD (Possible win, paytable, slots) ──
  cardContainerChosen: {
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#141D27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.18)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  chosenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  possibleWinBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  possibleWinLabel: {
    color: '#8292A6',
    fontSize: 14,
    fontWeight: '700',
  },
  possibleWinAmount: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: '900',
  },

  // Paytable preview
  paytableGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 2,
  },
  paytableColHeader: {
    gap: 3,
  },
  paytableLabel: {
    color: '#8292A6',
    fontSize: 11,
    fontWeight: '700',
  },
  paytableColsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  paytableCol: {
    alignItems: 'center',
    gap: 3,
  },
  paytableHitText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  paytableMultText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  // 10 Number Slots Row
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  slotFilled: {
    flex: 1,
    height: 28,
    marginHorizontal: 1.5,
    backgroundColor: '#1E2C3B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#31445A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotFilledText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  slotEmpty: {
    flex: 1,
    height: 28,
    marginHorizontal: 1.5,
    backgroundColor: '#141D27',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1F2C3C',
  },

  gridArea: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});