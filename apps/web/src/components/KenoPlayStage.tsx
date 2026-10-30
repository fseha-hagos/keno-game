import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { HelpCircle } from 'lucide-react';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';

interface KenoPlayStageProps {
  roundNumber?: number | string;
  timeLeft?: number;
  bettingOpen?: boolean;
  onOpenPaytable?: () => void;
}

interface QueueItem {
  num: number;
  index: number;
}

export const KenoPlayStage: React.FC<KenoPlayStageProps> = ({
  roundNumber,
  timeLeft = 0,
  bettingOpen = false,
  onOpenPaytable,
}) => {
  const {
    getActiveSlip,
    toggleNumber,
    drawnNumbers,
    isDrawing,
  } = useGameStore();

  const activeSlip = getActiveSlip();
  const selectedNumbers = activeSlip?.selectedNumbers ?? [];
  const spots = selectedNumbers.length;

  interface CallingBallInfo {
    id: number;
    num: number;
    index: number;
    phase: 'bounce' | 'flying';
    deltaX: number;
    deltaY: number;
    duration?: number;
  }

  // Synchronous settled balls reference to prevent stale state race conditions during animations & reconnects
  const settledBallsRef = useRef<number[]>([]);
  const [settledBalls, setSettledBalls] = useState<number[]>([]);
  const [activeBalls, setActiveBalls] = useState<CallingBallInfo[]>([]);
  const activeBallsRef = useRef<CallingBallInfo[]>([]);
  const [completedHoldActive, setCompletedHoldActive] = useState(false);

  const queueRef = useRef<number[]>([]);
  const nextSlotIdxRef = useRef(0);
  const centerOccupiedRef = useRef(false);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callBallAnchorRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastRoundRef = useRef<number | string | undefined>(roundNumber);

  // Clear timers helper
  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Reset stage cleanly when a new round starts
  useEffect(() => {
    if (roundNumber !== undefined && lastRoundRef.current !== roundNumber) {
      lastRoundRef.current = roundNumber;
      clearAllTimers();
      queueRef.current = [];
      nextSlotIdxRef.current = 0;
      centerOccupiedRef.current = false;
      settledBallsRef.current = [];
      setSettledBalls([]);
      activeBallsRef.current = [];
      setActiveBalls([]);
      setCompletedHoldActive(false);
    }
  }, [roundNumber]);

  // Robust ingestion of drawn numbers handling page refreshes, reconnection batches & live draws
  useEffect(() => {
    if (drawnNumbers.length === 0) {
      if (!completedHoldActive) {
        clearAllTimers();
        queueRef.current = [];
        nextSlotIdxRef.current = 0;
        centerOccupiedRef.current = false;
        settledBallsRef.current = [];
        setSettledBalls([]);
        activeBallsRef.current = [];
        setActiveBalls([]);
      }
      return;
    }

    // Determine numbers not yet accounted for in settled, currently calling, or in queue
    const accounted = new Set([
      ...settledBallsRef.current.filter((n) => n !== undefined && n !== null),
      ...activeBallsRef.current.map((b) => b.num),
      ...queueRef.current,
    ]);
    const missing = drawnNumbers.filter((n) => !accounted.has(n));
    if (missing.length === 0) return;

    // Case 1: Page refreshed after round already completed (all 20 balls present immediately)
    if (settledBallsRef.current.length === 0 && drawnNumbers.length >= 20) {
      settledBallsRef.current = [...drawnNumbers];
      setSettledBalls([...drawnNumbers]);
      nextSlotIdxRef.current = drawnNumbers.length;
      setCompletedHoldActive(true);
      return;
    }

    // Case 2: Page refreshed mid-draw or reconnected after drop with multiple balls (> 2) waiting
    if (missing.length > 2) {
      // Instantly settle all previous balls up to the last 2 balls
      const instantList = missing.slice(0, missing.length - 2);
      const toAnimate = missing.slice(missing.length - 2);

      const updatedSettled = [...settledBallsRef.current, ...instantList];
      settledBallsRef.current = updatedSettled;
      setSettledBalls(updatedSettled);
      nextSlotIdxRef.current = updatedSettled.length;

      queueRef.current.push(...toAnimate);
      triggerNextBall();
    } else {
      // Case 3: Live single-ball or dual-ball emission - queue smoothly
      queueRef.current.push(...missing);
      triggerNextBall();
    }
  }, [drawnNumbers, completedHoldActive]);

  const triggerNextBall = () => {
    if (centerOccupiedRef.current || queueRef.current.length === 0) return;

    const targetIdx = nextSlotIdxRef.current;
    if (targetIdx >= 20) return;

    nextSlotIdxRef.current += 1;
    centerOccupiedRef.current = true;
    const num = queueRef.current.shift()!;

    // Step 1: Center bounce
    const newBall: CallingBallInfo = {
      id: num,
      num,
      index: targetIdx,
      phase: 'bounce',
      deltaX: 0,
      deltaY: 0,
    };

    activeBallsRef.current = [...activeBallsRef.current, newBall];
    setActiveBalls([...activeBallsRef.current]);

    const centerDuration = queueRef.current.length > 2 ? 380 : 520;

    const t1 = setTimeout(() => {
      // Measure delta from static anchor to target slot
      let dx = 0;
      let dy = 0;

      const targetEl = slotRefs.current[targetIdx];
      const anchorEl = callBallAnchorRef.current;

      if (targetEl && anchorEl) {
        const tRect = targetEl.getBoundingClientRect();
        const aRect = anchorEl.getBoundingClientRect();
        dx = tRect.left + tRect.width / 2 - (aRect.left + aRect.width / 2);
        dy = tRect.top + tRect.height / 2 - (aRect.top + aRect.height / 2);
      } else {
        const col = targetIdx < 10 ? targetIdx : targetIdx - 10;
        const isBottom = targetIdx < 10;
        dx = (col - 4.5) * 40;
        dy = isBottom ? 95 : 55;
      }

      const flightDuration = queueRef.current.length > 2 ? 620 : 820;

      // Step 2: Smooth flight to target slot
      activeBallsRef.current = activeBallsRef.current.map((b) =>
        b.index === targetIdx
          ? { ...b, phase: 'flying', deltaX: dx, deltaY: dy, duration: flightDuration }
          : b
      );
      setActiveBalls([...activeBallsRef.current]);

      // Center is now freed! Next number can pop up while this ball is flying!
      centerOccupiedRef.current = false;

      // Check if another number is queued, start popping it smoothly while current ball moves
      if (queueRef.current.length > 0 && nextSlotIdxRef.current < 20) {
        const tNext = setTimeout(triggerNextBall, 120);
        timersRef.current.push(tNext);
      }

      const t2 = setTimeout(() => {
        // Step 3: Land in slot
        const updated = [...settledBallsRef.current];
        updated[targetIdx] = num;
        settledBallsRef.current = updated;
        setSettledBalls(updated);

        // Remove from active flying balls
        activeBallsRef.current = activeBallsRef.current.filter((b) => b.index !== targetIdx);
        setActiveBalls([...activeBallsRef.current]);

        if (settledBallsRef.current.filter((n) => n !== undefined).length >= 20) {
          setCompletedHoldActive(true);
          const t4 = setTimeout(() => setCompletedHoldActive(false), 3500);
          timersRef.current.push(t4);
        }

        if (queueRef.current.length > 0 && !centerOccupiedRef.current) {
          triggerNextBall();
        }
      }, flightDuration);
      timersRef.current.push(t2);
    }, centerDuration);
    timersRef.current.push(t1);
  };

  const countDrawn = Math.min(20, settledBalls.filter((n) => n !== undefined).length + activeBalls.length);
  const inDraw =
    isDrawing ||
    drawnNumbers.length > 0 ||
    activeBalls.length > 0 ||
    queueRef.current.length > 0 ||
    completedHoldActive;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
  };


  const spotEntries = spots > 0 ? DEFAULT_96_PAYTABLE_ENTRIES.filter((e) => e.spots === spots) : [];
  const maxMultiplier = spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, spots) : 0;
  const stakeAmount = Number(activeSlip?.stakeMinor || '200') / 100;
  const possibleWin = Math.min(30000, stakeAmount * maxMultiplier).toFixed(2);

  // 10 selected slots
  const selectedSlots: (number | null)[] = [...selectedNumbers];
  while (selectedSlots.length < 10) selectedSlots.push(null);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 450,
        margin: '0 0',
        padding: '0 0',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. GAME STARTS / DRAW PHASE VIEW (Exact Match with Image 1) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {inDraw ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 155,
            background: 'radial-gradient(ellipse at 50% 50%, #17261E 0%, #111C16 55%, #0B130F 100%)',
            borderBottom: '1px solid #142017',
            padding: '4px 6px 6px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Animated concentric radar rings with center illumination placed near the top */}
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 140,
              height: 140,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(52, 211, 153, 0.28) 0%, rgba(20, 80, 45, 0.1) 40%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />

          {/* Ring 0 (Smallest Circle where ball emerges, 54px): ~14s counter-clockwise */}
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              width: 54,
              height: 54,
              pointerEvents: 'none',
              animation: 'radarSpinCcw 14s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="54"
              height="54"
              viewBox="0 0 54 54"
              style={{
                display: 'block',
                filter: 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.4))',
              }}
            >
              <circle
                cx="27"
                cy="27"
                r="24"
                fill="none"
                stroke="rgba(52, 211, 153, 0.36)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="14 10 18 10"
              />
            </svg>
          </div>

          {/* Ring 1 (Inner, 105px): Smooth Clockwise Rotation ~18s */}
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              width: 105,
              height: 105,
              pointerEvents: 'none',
              animation: 'radarSpinCw 18s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="105"
              height="105"
              viewBox="0 0 105 105"
              style={{
                display: 'block',
                filter: 'blur(1px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.18))',
              }}
            >
              <circle
                cx="52.5"
                cy="52.5"
                r="49"
                fill="none"
                stroke="rgba(52, 211, 153, 0.22)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="32 15 11 17 24 13"
              />
            </svg>
          </div>

          {/* Ring 2 (Middle-Inner, 170px): Clockwise Rotation ~28s */}
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              width: 170,
              height: 170,
              pointerEvents: 'none',
              animation: 'radarSpinCw 28s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="170"
              height="170"
              viewBox="0 0 170 170"
              style={{
                display: 'block',
                filter: 'blur(1px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.15))',
              }}
            >
              <circle
                cx="85"
                cy="85"
                r="81"
                fill="none"
                stroke="rgba(52, 211, 153, 0.18)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="50 25 18 20 54 26"
              />
            </svg>
          </div>

          {/* Ring 3 (Middle-Outer, 250px): Clockwise Rotation ~42s */}
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              width: 250,
              height: 250,
              pointerEvents: 'none',
              animation: 'radarSpinCw 42s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="250"
              height="250"
              viewBox="0 0 250 250"
              style={{
                display: 'block',
                filter: 'blur(1.1px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.12))',
              }}
            >
              <circle
                cx="125"
                cy="125"
                r="120"
                fill="none"
                stroke="rgba(52, 211, 153, 0.14)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="70 32 28 26 80 36"
              />
            </svg>
          </div>

          {/* Ring 4 (Outer, 340px): Clockwise Rotation ~60s */}
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              width: 340,
              height: 340,
              pointerEvents: 'none',
              animation: 'radarSpinCw 60s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="340"
              height="340"
              viewBox="0 0 340 340"
              style={{
                display: 'block',
                filter: 'blur(1.2px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.08))',
              }}
            >
              <circle
                cx="170"
                cy="170"
                r="165"
                fill="none"
                stroke="rgba(52, 211, 153, 0.10)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="100 44 36 34 80 44"
              />
            </svg>
          </div>

          {/* Top-Right: Draw count "18 / 20" matching Image 1 */}
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 12,
              zIndex: 10,
              fontSize: 20,
              fontWeight: 800,
              fontFamily: KENO_FONTS.numbers,
              color: '#FFFFFF',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{Math.min(20, countDrawn)}</span>
            <span style={{ color: '#51b579' }}>/</span>
            <span>20</span>
          </div>

          {/* Static reference anchor for measuring flight trajectory from smallest circle */}
          <div
            ref={callBallAnchorRef}
            style={{
              position: 'absolute',
              top: 34,
              left: '50%',
              width: 58,
              height: 58,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              visibility: 'hidden',
            }}
          />

          {/* Calling & Flying Balls with overlapping smooth movement */}
          {activeBalls.map((b) => (
            <div
              key={`active-ball-${b.index}-${b.num}`}
              style={{
                position: 'absolute',
                top: 34,
                left: '50%',
                transform:
                  b.phase === 'flying'
                    ? `translate(calc(-50% + ${b.deltaX}px), calc(-50% + ${b.deltaY}px)) scale(0.448)`
                    : 'translate(-50%, -50%) scale(1)',
                transition:
                  b.phase === 'flying'
                    ? `transform ${b.duration || 820}ms cubic-bezier(0.25, 1, 0.35, 1)`
                    : 'none',
                zIndex: b.phase === 'bounce' ? 30 : 25,
                pointerEvents: 'none',
                willChange: 'transform',
              }}
            >
              {/* Green ambient halo directly behind calling ball when emerging */}
              <div
                style={{
                  position: 'absolute',
                  top: -19,
                  left: -19,
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(52, 211, 153, 0.55) 0%, rgba(34, 197, 94, 0.15) 45%, transparent 72%)',
                  pointerEvents: 'none',
                  opacity: b.phase === 'flying' ? 0 : 1,
                  transition: 'opacity 250ms ease-out',
                }}
              />

              {/* 3D Glossy Ball (58px diameter, visibly larger when picked at first) */}
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: selectedNumbers.includes(b.num)
                    ? 'radial-gradient(circle at 45% 28%, #4ADE80 0%, #16A34A 45%, #064E3B 80%, #022C22 100%)'
                    : 'radial-gradient(circle at 45% 28%, #36495b 0%, #1c2a38 40%, #0d1620 75%, #050a0f 100%)',
                  boxShadow: selectedNumbers.includes(b.num)
                    ? '0 0 22px rgba(34, 197, 94, 0.95), inset 0 2px 3px rgba(255, 255, 255, 0.7)'
                    : '0 6px 14px rgba(0, 0, 0, 0.8), inset 0 1.5px 2px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.6)',
                  border: selectedNumbers.includes(b.num)
                    ? '1.5px solid #86EFAC'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  animation:
                    b.phase === 'bounce'
                      ? 'callBallBounce 480ms cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'none',
                }}
              >
                {/* Curved Specular Dome Shine */}
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: '18%',
                    width: '64%',
                    height: '38%',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
                {/* Bottom Shadow Depth */}
                <div
                  style={{
                    position: 'absolute',
                    right: '5%',
                    bottom: '5%',
                    width: '60%',
                    height: '60%',
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, #020911 0%, rgba(1, 8, 15, 0.3) 54%, transparent 75%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    zIndex: 3,
                    fontFamily: KENO_FONTS.numbers,
                    fontSize: 38,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
                  }}
                >
                  {b.num}
                </span>
              </div>
            </div>
          ))}

          {/* 2-ROW SETTLED BALLS GRID (Row 1: Balls 11-20, Row 2: Balls 1-10) */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 0,
              right: 0,
              margin: '0 auto',
              width: '100%',
              maxWidth: 430,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              zIndex: 5,
              padding: '0',
              boxSizing: 'border-box',
            }}
          >
            {/* ROW 1 (TOP ROW): Balls 11 through 20 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                gap: 'clamp(5px, 1.5vw, 8px)',
                width: '100%',
              }}
            >
              {Array.from({ length: 10 }).map((_, col) => {
                const slotIdx = 10 + col;
                const ballNum = settledBalls[slotIdx];
                const isHit = ballNum !== undefined && selectedNumbers.includes(ballNum);

                return (
                  <div
                    key={`top-slot-${col}`}
                    ref={(el) => {
                      slotRefs.current[slotIdx] = el;
                    }}
                    style={{
                      width: '100%',
                      maxWidth: 26,
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      padding: 0,
                    }}
                  >
                    {ballNum !== undefined ? (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isHit
                            ? 'radial-gradient(circle at 45% 28%, #4ADE80 0%, #16A34A 45%, #064E3B 80%, #022C22 100%)'
                            : 'radial-gradient(circle at 45% 28%, #36495b 0%, #1c2a38 40%, #0d1620 75%, #050a0f 100%)',
                          boxShadow: isHit
                            ? '0 0 10px rgba(34, 197, 94, 0.85), inset 0 1.2px 2px rgba(255, 255, 255, 0.6)'
                            : '0 3px 6px rgba(0, 0, 0, 0.7), inset 0 1.2px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1.5px 3px rgba(0, 0, 0, 0.55)',
                          border: isHit
                            ? '1px solid #86EFAC'
                            : '1px solid rgba(255, 255, 255, 0.2)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Curved Specular Dome Shine */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '3%',
                            left: '18%',
                            width: '64%',
                            height: '38%',
                            borderRadius: '50%',
                            background:
                              'linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                        {/* Bottom Shadow Depth */}
                        <div
                          style={{
                            position: 'absolute',
                            right: '5%',
                            bottom: '5%',
                            width: '60%',
                            height: '60%',
                            borderRadius: '50%',
                            background:
                              'radial-gradient(circle, #020911 0%, rgba(1, 8, 15, 0.3) 54%, transparent 75%)',
                            pointerEvents: 'none',
                            zIndex: 1,
                          }}
                        />
                        <span
                          style={{
                            position: 'relative',
                            zIndex: 3,
                            fontFamily: KENO_FONTS.numbers,
                            fontSize: 17,
                            fontWeight: 800,
                            color: '#FFFFFF',
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.95)',
                            padding: 0,
                            margin: 0,
                          }}
                        >
                          {ballNum}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* ROW 2 (BOTTOM ROW): Balls 1 through 10 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                gap: 'clamp(5px, 1.5vw, 8px)',
                width: '100%',
                marginBottom: 8,
                marginTop: 6
              }}
            >
              {Array.from({ length: 10 }).map((_, col) => {
                const slotIdx = col;
                const ballNum = settledBalls[slotIdx];
                const isHit = ballNum !== undefined && selectedNumbers.includes(ballNum);

                return (
                  <div
                    key={`bot-slot-${col}`}
                    ref={(el) => {
                      slotRefs.current[slotIdx] = el;
                    }}
                    style={{
                      width: '100%',
                      maxWidth: 26,
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      padding: 0,
                    }}
                  >
                    {ballNum !== undefined ? (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isHit
                            ? 'radial-gradient(circle at 45% 28%, #4ADE80 0%, #16A34A 45%, #064E3B 80%, #022C22 100%)'
                            : 'radial-gradient(circle at 45% 28%, #36495b 0%, #1c2a38 40%, #0d1620 75%, #050a0f 100%)',
                          boxShadow: isHit
                            ? '0 0 10px rgba(34, 197, 94, 0.85), inset 0 1.2px 2px rgba(255, 255, 255, 0.6)'
                            : '0 3px 6px rgba(0, 0, 0, 0.7), inset 0 1.2px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1.5px 3px rgba(0, 0, 0, 0.55)',
                          border: isHit
                            ? '1px solid #86EFAC'
                            : '1px solid rgba(255, 255, 255, 0.2)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Curved Specular Dome Shine */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '3%',
                            left: '18%',
                            width: '64%',
                            height: '38%',
                            borderRadius: '50%',
                            background:
                              'linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                        {/* Bottom Shadow Depth */}
                        <div
                          style={{
                            position: 'absolute',
                            right: '5%',
                            bottom: '5%',
                            width: '60%',
                            height: '60%',
                            borderRadius: '50%',
                            background:
                              'radial-gradient(circle, #020911 0%, rgba(1, 8, 15, 0.3) 54%, transparent 75%)',
                            pointerEvents: 'none',
                            zIndex: 1,
                          }}
                        />
                        <span
                          style={{
                            position: 'relative',
                            zIndex: 3,
                            fontFamily: KENO_FONTS.numbers,
                            fontSize: 17,
                            fontWeight: 800,
                            color: '#FFFFFF',
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.95)',
                            padding: 0,
                            margin: 0,
                          }}
                        >
                          {ballNum}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────── */
        /* 2. COUNTDOWN & BETTING PHASE (Matching mock_web style_one)  */
        /* ─────────────────────────────────────────────────────────── */
        <div>
          {/* Centered Digital Countdown Timer with DS-Digital and timer_bg */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 0,
            }}
          >
            <div className="game_timer">
              <span>00 : </span>
              <span className="game_timer_sec">
                {bettingOpen && timeLeft > 0 ? (timeLeft < 10 ? `0${timeLeft}` : timeLeft) : '00'}
              </span>
            </div>
          </div>

          {/* When 0 numbers chosen: "Choose 10 numbers / From 1 to 80" Card matching .bet_selections */}
          {spots === 0 ? (
            <div
              style={{
                backgroundColor: '#20282b',
                backgroundImage: 'url(https://cdn-atlas-v.com/games/keno/img/ticket_bg.svg)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: '0 50%',
                borderRadius: 8,
                padding: '16px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 2,
                marginBottom: 8,
                position: 'relative',
                overflow: 'visible',
                minHeight: 115,
                boxSizing: 'border-box',
              }}
            >
              {/* Overlapping concentric radar rings in faint green */}
              <div
                style={{
                  position: 'absolute',
                  left: 20,
                  top: 0,
                  width: 110,
                  height: 110,

                  borderRadius: '50%',
                  border: '1px solid rgba(113, 206, 150, 0.18)',
                  pointerEvents: 'none',
                }}
              />

              {/* 3D Balls Cluster: big ball out of the box, balls spaced apart */}
              <div
                style={{
                  position: 'relative',
                  width: 104,
                  height: 106,
                  flexShrink: 0,

                  zIndex: 2,
                }}
              >
                {/* Ball 80 (top-left, spaced apart from 10) */}
                <div
                  style={{
                    position: 'absolute',
                    top: -13,
                    left: -16,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 28%, #4A5C70 0%, #1A2532 60%, #0B1118 100%)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10.5,
                    fontWeight: 900,
                    fontFamily: KENO_FONTS.numbers,
                    color: '#FFFFFF',
                    zIndex: 1,
                  }}
                >
                  80
                </div>

                {/* Ball 10 (top-right, placed farther to the right, tilted 10) */}
                <div
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: 28,
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 28%, #4A5C70 0%, #1A2532 60%, #0B1118 100%)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  {/* Curved Specular Dome Shine */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: '18%',
                      width: '64%',
                      height: '38%',
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      fontFamily: KENO_FONTS.numbers,
                      color: '#FFFFFF',
                      transform: 'rotate(-16deg)',
                      display: 'inline-block',
                      lineHeight: 1,
                    }}
                  >
                    10
                  </span>
                </div>

                {/* Ball 1 (FRONT, large green ball hanging OUT OF THE BOX to the left) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 24,
                    left: -25,
                    width: 62,
                    height: 62,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 30%, #173826 0%, #0d2218 55%, #06150e 100%)',
                    boxShadow: '0 0 18px rgba(81, 181, 121, 0.55), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
                    border: '1.5px solid #51b579',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3,
                  }}
                >
                  {/* Glossy specular shine reflection */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: '18%',
                      width: '64%',
                      height: '38%',
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  />
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 3,
                      fontSize: 29,
                      fontWeight: 900,
                      fontFamily: KENO_FONTS.numbers,
                      color: '#51b579',
                      lineHeight: 1,
                      transform: 'rotate(-10deg) skewX(-6deg)',
                      display: 'inline-block',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                    }}
                  >
                    1
                  </span>
                </div>
              </div>

              {/* Card Center Text matching mock_web .ticket_helptext */}
              <div style={{ textAlign: 'left', zIndex: 2, marginLeft: 22, flex: 1 }}>
                <div
                  style={{
                    fontSize: 23,
                    fontWeight: 900,
                    color: '#FFFFFF',
                    lineHeight: 1.15,
                    fontFamily: KENO_FONTS.numbers,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Choose 10 numbers
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#51b579',
                    marginTop: 4,
                    fontFamily: KENO_FONTS.numbers,
                  }}
                >
                  From 1 to 80
                </div>
              </div>

              {/* Right: Circular '?' Help Button matching mock_web .ticket_help */}
              <button
                type="button"
                onClick={onOpenPaytable}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 16,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#51b579',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                  zIndex: 2,
                  padding: 0,
                  fontFamily: KENO_FONTS.numbers,
                  transition: 'background 0.15s ease',
                }}
              >
                ?
              </button>
            </div>
          ) : (
            /* When 1 to 10 numbers chosen: "Possible win" + Paytable + 10 Slots */
            <div
              style={{
                backgroundColor: '#283134',
                backgroundImage: 'url(https://cdn-atlas-v.com/games/keno/img/ticket_bg.svg)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: '0 50%',
                borderRadius: 6,
                padding: '12px 14px',
                marginTop: 2,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            >
              {/* Line 1: Possible win + Help button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 700,
                      fontFamily: KENO_FONTS.numbers,
                    }}
                  >
                    Possible win:
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#51b579',
                      fontFamily: KENO_FONTS.numbers,
                    }}
                  >
                    {possibleWin}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenPaytable}
                  style={{
                    background: '#35434b',
                    border: 'none',
                    color: '#51b579',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: KENO_FONTS.numbers,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  ?
                </button>
              </div>

              {/* Line 2: Multipliers Table (Match / Pays) */}
              {spotEntries.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 8,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    fontFamily: KENO_FONTS.numbers,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.25 }}>
                    <span>Match</span>
                    <span>Pays</span>
                  </div>

                  <div style={{ display: 'flex', gap: 14 }}>
                    {spotEntries.map((e) => (
                      <div
                        key={e.hits}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.25,
                        }}
                      >
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{e.hits}</span>
                        <span style={{ color: '#51b579' }}>x{e.multiplier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line 3: Exactly 10 Square Slots in a single line matching mock_web .ticket_sel_tbl */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3.5 }}>
                {selectedSlots.map((num, i) => {
                  if (num !== null) {
                    return (
                      <button
                        key={`sel-${num}`}
                        type="button"
                        onClick={() => toggleNumber(num)}
                        style={{
                          aspectRatio: '1/1',
                          borderRadius: 3,
                          background: '#20282b',
                          border: 'none',
                          color: '#FFFFFF',
                          fontFamily: KENO_FONTS.numbers,
                          fontSize: 16,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          transition: 'background 0.1s ease',
                        }}
                      >
                        {num}
                      </button>
                    );
                  }
                  return (
                    <div
                      key={`empty-${i}`}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: 3,
                        background: 'rgba(32, 40, 43, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
