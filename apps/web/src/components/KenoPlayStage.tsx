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
    num: number;
    index: number;
    phase: 'bounce' | 'flying';
    deltaX: number;
    deltaY: number;
  }

  // Synchronous settled balls reference to prevent stale state race conditions during animations & reconnects
  const settledBallsRef = useRef<number[]>([]);
  const [settledBalls, setSettledBalls] = useState<number[]>([]);
  const [callingBall, setCallingBall] = useState<CallingBallInfo | null>(null);
  const [justLandedNum, setJustLandedNum] = useState<number | null>(null);
  const [completedHoldActive, setCompletedHoldActive] = useState(false);

  const queueRef = useRef<number[]>([]);
  const isAnimatingRef = useRef(false);
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
      isAnimatingRef.current = false;
      settledBallsRef.current = [];
      setSettledBalls([]);
      setCallingBall(null);
      setJustLandedNum(null);
      setCompletedHoldActive(false);
    }
  }, [roundNumber]);

  // Robust ingestion of drawn numbers handling page refreshes, reconnection batches & live draws
  useEffect(() => {
    if (drawnNumbers.length === 0) {
      if (!completedHoldActive) {
        clearAllTimers();
        queueRef.current = [];
        isAnimatingRef.current = false;
        settledBallsRef.current = [];
        setSettledBalls([]);
        setCallingBall(null);
        setJustLandedNum(null);
      }
      return;
    }

    // Determine numbers not yet accounted for in settled, currently calling, or in queue
    const accounted = new Set([
      ...settledBallsRef.current,
      ...(callingBall ? [callingBall.num] : []),
      ...queueRef.current,
    ]);
    const missing = drawnNumbers.filter((n) => !accounted.has(n));
    if (missing.length === 0) return;

    // Case 1: Page refreshed after round already completed (all 20 balls present immediately)
    if (settledBallsRef.current.length === 0 && drawnNumbers.length >= 20) {
      settledBallsRef.current = [...drawnNumbers];
      setSettledBalls([...drawnNumbers]);
      setCompletedHoldActive(true);
      return;
    }

    // Case 2: Page refreshed mid-draw or reconnected after drop with multiple balls (> 2) waiting
    if (missing.length > 2) {
      // Instantly settle all previous balls up to the second-to-last ball
      const instantList = missing.slice(0, missing.length - 1);
      const nextToAnimate = missing[missing.length - 1];

      const updatedSettled = [...settledBallsRef.current, ...instantList];
      settledBallsRef.current = updatedSettled;
      setSettledBalls(updatedSettled);

      // Smoothly animate only the newest active ball to its correct target slot
      if (nextToAnimate !== undefined) {
        queueRef.current.push(nextToAnimate);
      }
      triggerNextBall();
    } else {
      // Case 3: Live single-ball or dual-ball emission - queue smoothly
      queueRef.current.push(...missing);
      triggerNextBall();
    }
  }, [drawnNumbers, completedHoldActive]);

  const triggerNextBall = () => {
    if (isAnimatingRef.current || queueRef.current.length === 0) return;

    const targetIdx = settledBallsRef.current.length;
    if (targetIdx >= 20) {
      isAnimatingRef.current = false;
      return;
    }

    isAnimatingRef.current = true;
    const num = queueRef.current.shift()!;

    // Step 1: Center bounce
    setCallingBall({
      num,
      index: targetIdx,
      phase: 'bounce',
      deltaX: 0,
      deltaY: 0,
    });

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

      // Step 2: Smooth flight to target slot
      setCallingBall({
        num,
        index: targetIdx,
        phase: 'flying',
        deltaX: dx,
        deltaY: dy,
      });

      const t2 = setTimeout(() => {
        // Step 3: Land in slot
        const updated = settledBallsRef.current.includes(num)
          ? settledBallsRef.current
          : [...settledBallsRef.current, num];
        settledBallsRef.current = updated;
        setSettledBalls(updated);
        setCallingBall(null);
        setJustLandedNum(num);

        const t3 = setTimeout(() => {
          setJustLandedNum(null);
        }, 800);
        timersRef.current.push(t3);

        isAnimatingRef.current = false;

        if (drawnNumbers.length >= 20 && queueRef.current.length === 0) {
          setCompletedHoldActive(true);
          const t4 = setTimeout(() => setCompletedHoldActive(false), 3500);
          timersRef.current.push(t4);
        }

        if (queueRef.current.length > 0) {
          const t5 = setTimeout(triggerNextBall, 150);
          timersRef.current.push(t5);
        }
      }, 500);
      timersRef.current.push(t2);
    }, 650);
    timersRef.current.push(t1);
  };

  const countDrawn = settledBalls.length + (callingBall !== null ? 1 : 0);
  const inDraw =
    isDrawing ||
    drawnNumbers.length > 0 ||
    callingBall !== null ||
    queueRef.current.length > 0 ||
    completedHoldActive;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
  };


  const spotEntries = spots > 0 ? DEFAULT_96_PAYTABLE_ENTRIES.filter((e) => e.spots === spots) : [];
  const maxMultiplier = spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, spots) : 0;
  const stakeAmount = Number(activeSlip?.stakeMinor || '400') / 100;
  const possibleWin = (stakeAmount * maxMultiplier).toFixed(2);

  // 10 selected slots
  const selectedSlots: (number | null)[] = [...selectedNumbers];
  while (selectedSlots.length < 10) selectedSlots.push(null);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 450,
        margin: '0 auto',
        padding: '0 2px',
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
          {/* Animated concentric radar rings with center illumination (Matching Shamo.bet) */}
          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 150,
              height: 150,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(34, 197, 94, 0.16) 0%, rgba(20, 80, 45, 0.05) 50%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />

          {/* Ring 1 (Inner, 110px): Smooth Clockwise Rotation ~18s */}
          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              width: 110,
              height: 110,
              pointerEvents: 'none',
              animation: 'radarSpinCw 18s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="110"
              height="110"
              viewBox="0 0 110 110"
              style={{
                display: 'block',
                filter: 'blur(1px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.18))',
              }}
            >
              <circle
                cx="55"
                cy="55"
                r="50"
                fill="none"
                stroke="rgba(52, 211, 153, 0.22)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="34 16 12 18 26 14"
              />
            </svg>
          </div>

          {/* Ring 2 (Middle-Inner, 180px): Clockwise Rotation ~28s */}
          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              width: 180,
              height: 180,
              pointerEvents: 'none',
              animation: 'radarSpinCw 28s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              style={{
                display: 'block',
                filter: 'blur(1px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.15))',
              }}
            >
              <circle
                cx="90"
                cy="90"
                r="85"
                fill="none"
                stroke="rgba(52, 211, 153, 0.18)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="52 26 20 22 58 28"
              />
            </svg>
          </div>

          {/* Ring 3 (Middle-Outer, 260px): Clockwise Rotation ~42s */}
          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              width: 260,
              height: 260,
              pointerEvents: 'none',
              animation: 'radarSpinCw 42s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="260"
              height="260"
              viewBox="0 0 260 260"
              style={{
                display: 'block',
                filter: 'blur(1.1px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.12))',
              }}
            >
              <circle
                cx="130"
                cy="130"
                r="124"
                fill="none"
                stroke="rgba(52, 211, 153, 0.14)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="72 34 30 28 84 38"
              />
            </svg>
          </div>

          {/* Ring 4 (Outer, 350px): Clockwise Rotation ~60s */}
          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '50%',
              width: 350,
              height: 350,
              pointerEvents: 'none',
              animation: 'radarSpinCw 60s linear infinite',
              willChange: 'transform',
            }}
          >
            <svg
              width="350"
              height="350"
              viewBox="0 0 350 350"
              style={{
                display: 'block',
                filter: 'blur(1.2px) drop-shadow(0 0 3px rgba(34, 197, 94, 0.08))',
              }}
            >
              <circle
                cx="175"
                cy="175"
                r="169"
                fill="none"
                stroke="rgba(52, 211, 153, 0.10)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="110 48 38 36 86 48"
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

          {/* Static reference anchor for measuring flight trajectory */}
          <div
            ref={callBallAnchorRef}
            style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              width: 52,
              height: 52,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              visibility: 'hidden',
            }}
          />

          {/* Center / Flying CALLING BALL with Green Halo & Bounce Animation */}
          {callingBall && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: '50%',
                transform:
                  callingBall.phase === 'flying'
                    ? `translate(calc(-50% + ${callingBall.deltaX}px), ${callingBall.deltaY}px) scale(0.74)`
                    : 'translate(-50%, 0) scale(1)',
                transition:
                  callingBall.phase === 'flying'
                    ? 'transform 500ms cubic-bezier(0.25, 0.9, 0.32, 1)'
                    : 'none',
                zIndex: 25,
                pointerEvents: 'none',
              }}
            >
              {/* Green ambient halo directly behind calling ball */}
              <div
                style={{
                  position: 'absolute',
                  top: -16,
                  left: -16,
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.45) 0%, rgba(34, 197, 94, 0) 72%)',
                  pointerEvents: 'none',
                }}
              />

              {/* 3D Glossy Ball (52px diameter matching Image 1) */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: selectedNumbers.includes(callingBall.num)
                    ? 'radial-gradient(circle at 45% 28%, #4ADE80 0%, #16A34A 45%, #064E3B 80%, #022C22 100%)'
                    : 'radial-gradient(circle at 45% 28%, #36495b 0%, #1c2a38 40%, #0d1620 75%, #050a0f 100%)',
                  boxShadow: selectedNumbers.includes(callingBall.num)
                    ? '0 0 18px rgba(34, 197, 94, 0.9), inset 0 2px 3px rgba(255, 255, 255, 0.7)'
                    : '0 6px 14px rgba(0, 0, 0, 0.8), inset 0 1.5px 2px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.6)',
                  border: selectedNumbers.includes(callingBall.num)
                    ? '1.5px solid #86EFAC'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  animation:
                    callingBall.phase === 'bounce'
                      ? 'callBallBounce 650ms cubic-bezier(0.25, 1, 0.5, 1)'
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
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
                  }}
                >
                  {callingBall.num}
                </span>
              </div>
            </div>
          )}

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
              gap: 6,
              zIndex: 5,
              padding: '0 8px',
              boxSizing: 'border-box',
            }}
          >
            {/* ROW 1 (TOP ROW): Balls 11 through 20 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                gap: 'clamp(4px, 1.2vw, 6px)',
                width: '100%',
              }}
            >
              {Array.from({ length: 10 }).map((_, col) => {
                const slotIdx = 10 + col;
                const ballNum = settledBalls[slotIdx];
                const isHit = ballNum !== undefined && selectedNumbers.includes(ballNum);
                const isJustLanded = ballNum !== undefined && ballNum === justLandedNum;

                return (
                  <div
                    key={`top-slot-${col}`}
                    ref={(el) => {
                      slotRefs.current[slotIdx] = el;
                    }}
                    style={{
                      width: '100%',
                      maxWidth: 37,
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                    }}
                  >
                    {ballNum !== undefined ? (
                      <div
                        className="animate-pop"
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
                          boxShadow: isJustLanded
                            ? '0 0 16px rgba(112, 247, 166, 0.9), 0 0 6px rgba(112, 247, 166, 0.6)'
                            : isHit
                            ? '0 0 10px rgba(34, 197, 94, 0.85), inset 0 1.2px 2px rgba(255, 255, 255, 0.6)'
                            : '0 3px 6px rgba(0, 0, 0, 0.7), inset 0 1.2px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1.5px 3px rgba(0, 0, 0, 0.55)',
                          border: isJustLanded
                            ? '1.5px solid #70f7a6'
                            : isHit
                            ? '1px solid #86EFAC'
                            : '1px solid rgba(255, 255, 255, 0.12)',
                          transform: isJustLanded ? 'scale(1.06)' : 'scale(1)',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
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
                            fontSize: 'clamp(16px, 4.4vw, 20px)',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            lineHeight: 1,
                            letterSpacing: '-0.03em',
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
                gap: 'clamp(4px, 1.2vw, 6px)',
                width: '100%',
              }}
            >
              {Array.from({ length: 10 }).map((_, col) => {
                const slotIdx = col;
                const ballNum = settledBalls[slotIdx];
                const isHit = ballNum !== undefined && selectedNumbers.includes(ballNum);
                const isJustLanded = ballNum !== undefined && ballNum === justLandedNum;

                return (
                  <div
                    key={`bot-slot-${col}`}
                    ref={(el) => {
                      slotRefs.current[slotIdx] = el;
                    }}
                    style={{
                      width: '100%',
                      maxWidth: 37,
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                    }}
                  >
                    {ballNum !== undefined ? (
                      <div
                        className="animate-pop"
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
                          boxShadow: isJustLanded
                            ? '0 0 16px rgba(112, 247, 166, 0.9), 0 0 6px rgba(112, 247, 166, 0.6)'
                            : isHit
                            ? '0 0 10px rgba(34, 197, 94, 0.85), inset 0 1.2px 2px rgba(255, 255, 255, 0.6)'
                            : '0 3px 6px rgba(0, 0, 0, 0.7), inset 0 1.2px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1.5px 3px rgba(0, 0, 0, 0.55)',
                          border: isJustLanded
                            ? '1.5px solid #70f7a6'
                            : isHit
                            ? '1px solid #86EFAC'
                            : '1px solid rgba(255, 255, 255, 0.12)',
                          transform: isJustLanded ? 'scale(1.06)' : 'scale(1)',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
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
                            fontSize: 'clamp(16px, 4.4vw, 20px)',
                            fontWeight: 800,
                            color: '#FFFFFF',
                            lineHeight: 1,
                            letterSpacing: '-0.03em',
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
              padding: '2px 0 6px',
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
                backgroundColor: '#283134',
                backgroundImage: 'url(https://cdn-atlas-v.com/games/keno/img/ticket_bg.svg)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: '0 50%',
                borderRadius: 6,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 125,
                boxSizing: 'border-box',
              }}
            >
              {/* Overlapping concentric radar rings in faint green */}
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: -30,
                  width: 170,
                  height: 170,
                  borderRadius: '50%',
                  border: '1px solid rgba(113, 206, 150, 0.15)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: -5,
                  top: -15,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: '1px solid rgba(113, 206, 150, 0.2)',
                  pointerEvents: 'none',
                }}
              />

              {/* 3D Balls Cluster on the left: 80, 10, 1 */}
              <div
                style={{
                  position: 'relative',
                  width: 82,
                  height: 82,
                  zIndex: 2,
                }}
              >
                {/* Ball 80 (top-left, back) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 2,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 28%, #475569 0%, #1E293B 60%, #0F172A 100%)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: KENO_FONTS.numbers,
                    color: '#FFFFFF',
                  }}
                >
                  80
                </div>

                {/* Ball 10 (top-right, back) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 4,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 28%, #4A5C70 0%, #1A2532 60%, #0B1118 100%)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: KENO_FONTS.numbers,
                    color: '#FFFFFF',
                  }}
                >
                  10
                </div>

                {/* Ball 1 (bottom-left, FRONT, largest with green rim glow & mint numeral) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 28%, #5fdb94 0%, #254632 65%, #1b3826 100%)',
                    boxShadow: '0 0 16px rgba(113, 206, 150, 0.75), inset 0 2px 4px rgba(255,255,255,0.7)',
                    border: '1.5px solid #86EFAC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: KENO_FONTS.numbers,
                    color: '#FFFFFF',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Glossy specular shine reflection */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 5,
                      left: 11,
                      width: 12,
                      height: 6,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.7)',
                      transform: 'rotate(-25deg)',
                      pointerEvents: 'none',
                    }}
                  />
                  <span>1</span>
                </div>
              </div>

              {/* Card Center Text matching mock_web .ticket_helptext */}
              <div style={{ textAlign: 'left', zIndex: 2, marginLeft: 14, flex: 1 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.2,
                    fontFamily: KENO_FONTS.numbers,
                  }}
                >
                  Choose 10 numbers
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#5fdb94',
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
                  background: '#35434b',
                  border: 'none',
                  color: '#51b579',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  padding: 0,
                  fontFamily: KENO_FONTS.numbers,
                  fontSize: 20,
                  fontWeight: 700,
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
