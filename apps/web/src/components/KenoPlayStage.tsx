import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { HelpCircle } from 'lucide-react';

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

  // Settled balls: up to 20 drawn balls in 2 rows (Row 2 = balls 1-10, Row 1 = balls 11-20)
  const [settledBalls, setSettledBalls] = useState<number[]>([]);
  const [callingBall, setCallingBall] = useState<CallingBallInfo | null>(null);
  const [completedHoldActive, setCompletedHoldActive] = useState(false);

  const queueRef = useRef<number[]>([]);
  const isAnimatingRef = useRef(false);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const callBallRef = useRef<HTMLDivElement | null>(null);

  // Ingest incoming drawn numbers into settled sequence
  useEffect(() => {
    if (drawnNumbers.length === 0) {
      if (!completedHoldActive) {
        setSettledBalls([]);
        setCallingBall(null);
        queueRef.current = [];
        isAnimatingRef.current = false;
      }
      return;
    }

    // Determine numbers not yet displayed
    const existing = new Set([
      ...settledBalls,
      ...(callingBall ? [callingBall.num] : []),
      ...queueRef.current,
    ]);
    const newNums = drawnNumbers.filter((n) => !existing.has(n));

    if (newNums.length > 0) {
      if (settledBalls.length === 0 && newNums.length > 2) {
        // Fast-forward initial numbers if reconnecting mid-draw
        const instant = newNums.slice(0, newNums.length - 1);
        const nextAnimate = newNums[newNums.length - 1];
        setSettledBalls(instant);
        if (nextAnimate !== undefined) {
          queueRef.current.push(nextAnimate);
        }
      } else {
        queueRef.current.push(...newNums);
      }
      processNextBall();
    }
  }, [drawnNumbers, completedHoldActive]);

  const processNextBall = () => {
    if (isAnimatingRef.current || queueRef.current.length === 0) return;

    isAnimatingRef.current = true;
    const num = queueRef.current.shift()!;
    const targetIdx = settledBalls.length; // 0 to 19

    // Step 1: Center bounce
    setCallingBall({
      num,
      index: targetIdx,
      phase: 'bounce',
      deltaX: 0,
      deltaY: 0,
    });

    // Step 2: Transition to flying towards target slot after 450ms bounce
    setTimeout(() => {
      let dx = 0;
      let dy = 0;

      const targetEl = slotRefs.current[targetIdx];
      const callEl = callBallRef.current;

      if (targetEl && callEl) {
        const tRect = targetEl.getBoundingClientRect();
        const cRect = callEl.getBoundingClientRect();
        dx = tRect.left + tRect.width / 2 - (cRect.left + cRect.width / 2);
        dy = tRect.top + tRect.height / 2 - (cRect.top + cRect.height / 2);
      } else {
        // Fallback calculations based on 10 columns & 2 rows
        const col = targetIdx < 10 ? targetIdx : targetIdx - 10;
        const isBottom = targetIdx < 10;
        dx = (col - 4.5) * 36;
        dy = isBottom ? 95 : 55;
      }

      setCallingBall({
        num,
        index: targetIdx,
        phase: 'flying',
        deltaX: dx,
        deltaY: dy,
      });

      // Step 3: Land into settledBalls slot after 380ms flight
      setTimeout(() => {
        setSettledBalls((prev) => (prev.includes(num) ? prev : [...prev, num]));
        setCallingBall(null);
        isAnimatingRef.current = false;

        if (drawnNumbers.length >= 20 && queueRef.current.length === 0) {
          setCompletedHoldActive(true);
          setTimeout(() => setCompletedHoldActive(false), 3500);
        }

        if (queueRef.current.length > 0) {
          setTimeout(processNextBall, 80);
        }
      }, 380);
    }, 450);
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
      {/* 1. GAME STARTS / DRAW PHASE VIEW (Exact Match with Image 2) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {inDraw ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 220,
            padding: '4px 8px 8px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Overlapping concentric radar circles background */}
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
              height: 320,
              borderRadius: '50%',
              border: '1px solid rgba(34, 197, 94, 0.12)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 220,
              height: 220,
              borderRadius: '50%',
              border: '1px solid rgba(34, 197, 94, 0.18)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 130,
              height: 130,
              borderRadius: '50%',
              border: '1px solid rgba(34, 197, 94, 0.22)',
              pointerEvents: 'none',
            }}
          />

          {/* Top-Right: Draw count "X / 20" */}
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 14,
              zIndex: 10,
              fontSize: 16,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span>{Math.min(20, countDrawn)}</span>
            <span style={{ color: '#22C55E' }}>/</span>
            <span>20</span>
          </div>

          {/* Center / Flying CALLING BALL with Green Halo & Bounce Animation */}
          {callingBall && (
            <div
              ref={callBallRef}
              style={{
                position: 'absolute',
                top: 26,
                left: '50%',
                transform:
                  callingBall.phase === 'flying'
                    ? `translate(calc(-50% + ${callingBall.deltaX}px), ${callingBall.deltaY}px) scale(0.6)`
                    : 'translate(-50%, 0) scale(1)',
                transition:
                  callingBall.phase === 'flying'
                    ? 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)'
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
                  width: 86,
                  height: 86,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.45) 0%, rgba(34, 197, 94, 0) 70%)',
                  pointerEvents: 'none',
                }}
              />

              {/* 3D Glossy Ball */}
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: selectedNumbers.includes(callingBall.num)
                    ? 'radial-gradient(circle at 35% 28%, #4ADE80 0%, #16A34A 55%, #064E3B 100%)'
                    : 'radial-gradient(circle at 35% 28%, #5A6E86 0%, #202D3C 52%, #0C131B 100%)',
                  boxShadow: selectedNumbers.includes(callingBall.num)
                    ? '0 0 16px rgba(34, 197, 94, 0.9), inset 0 2px 4px rgba(255,255,255,0.7)'
                    : '0 8px 20px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                  border: selectedNumbers.includes(callingBall.num)
                    ? '1.5px solid #86EFAC'
                    : '1.5px solid #2B3D50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 25,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  position: 'relative',
                  animation:
                    callingBall.phase === 'bounce'
                      ? 'callBallBounce 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      : 'none',
                }}
              >
                {/* Specular shine highlight */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 11,
                    width: 12,
                    height: 7,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.65)',
                    transform: 'rotate(-25deg)',
                    filter: 'blur(1px)',
                    pointerEvents: 'none',
                  }}
                />
                <span>{callingBall.num}</span>
              </div>
            </div>
          )}

          {/* 2-ROW SETTLED BALLS GRID (Row 1: Balls 11-20, Row 2: Balls 1-10) */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              zIndex: 5,
            }}
          >
            {/* ROW 1 (TOP ROW): Balls 11 through 20 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: 4,
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
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ballNum !== undefined ? (
                      <div
                        className="animate-pop"
                        style={{
                          width: 33,
                          height: 33,
                          borderRadius: '50%',
                          background: isHit
                            ? 'radial-gradient(circle at 35% 28%, #4ADE80 0%, #16A34A 55%, #14532D 100%)'
                            : 'radial-gradient(circle at 35% 28%, #54667C 0%, #1E2A38 55%, #0B1118 100%)',
                          boxShadow: isHit
                            ? '0 0 10px rgba(34, 197, 94, 0.8), inset 0 1.5px 2px rgba(255,255,255,0.6)'
                            : '0 4px 8px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
                          border: isHit ? '1.5px solid #86EFAC' : '1px solid #283748',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 900,
                          color: '#FFFFFF',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 7,
                            width: 7,
                            height: 4,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.55)',
                            transform: 'rotate(-25deg)',
                            pointerEvents: 'none',
                          }}
                        />
                        <span>{ballNum}</span>
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
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: 4,
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
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ballNum !== undefined ? (
                      <div
                        className="animate-pop"
                        style={{
                          width: 33,
                          height: 33,
                          borderRadius: '50%',
                          background: isHit
                            ? 'radial-gradient(circle at 35% 28%, #4ADE80 0%, #16A34A 55%, #14532D 100%)'
                            : 'radial-gradient(circle at 35% 28%, #54667C 0%, #1E2A38 55%, #0B1118 100%)',
                          boxShadow: isHit
                            ? '0 0 10px rgba(34, 197, 94, 0.8), inset 0 1.5px 2px rgba(255,255,255,0.6)'
                            : '0 4px 8px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
                          border: isHit ? '1.5px solid #86EFAC' : '1px solid #283748',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 900,
                          color: '#FFFFFF',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 7,
                            width: 7,
                            height: 4,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.55)',
                            transform: 'rotate(-25deg)',
                            pointerEvents: 'none',
                          }}
                        />
                        <span>{ballNum}</span>
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
        /* 2. COUNTDOWN & BETTING PHASE (Exact Match with Image 1)     */
        /* ─────────────────────────────────────────────────────────── */
        <div>
          {/* Centered Digital Countdown Timer (e.g. "00 : 26" with Cyan/Green Glow) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2px 0 6px',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: '0.12em',
                color: timeLeft <= 5 && bettingOpen ? '#EF4444' : '#6EE7B7',
                textShadow: '0 0 12px rgba(110, 231, 183, 0.65)',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              }}
            >
              {bettingOpen && timeLeft > 0 ? formatTimer(timeLeft) : '00 : 00'}
            </div>
          </div>

          {/* When 0 numbers chosen: "Choose 10 numbers / From 1 to 80" Card */}
          {spots === 0 ? (
            <div
              style={{
                background: '#162329',
                border: '1px solid #1F333A',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 120,
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
                  border: '1px solid rgba(34, 197, 94, 0.15)',
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
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  pointerEvents: 'none',
                }}
              />

              {/* 3D Balls Cluster on the left: 80, 10, 1 (Exact Match with Image 1) */}
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
                    fontWeight: 900,
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
                    fontWeight: 900,
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
                    background: 'radial-gradient(circle at 35% 28%, #4ADE80 0%, #16A34A 52%, #064E3B 100%)',
                    boxShadow: '0 0 16px rgba(34, 197, 94, 0.75), inset 0 2px 4px rgba(255,255,255,0.7)',
                    border: '1.5px solid #86EFAC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 900,
                    color: '#86EFAC',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Glossy specular shine reflection on top of ball 1 */}
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

              {/* Card Center Text */}
              <div style={{ textAlign: 'left', zIndex: 2, marginLeft: 10, flex: 1 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Choose 10 numbers
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#22C55E',
                    marginTop: 4,
                  }}
                >
                  From 1 to 80
                </div>
              </div>

              {/* Right: Circular '?' Help Button */}
              <button
                type="button"
                onClick={onOpenPaytable}
                style={{
                  background: '#1D3035',
                  border: '1px solid #234346',
                  color: '#22C55E',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  padding: 0,
                }}
              >
                <HelpCircle size={15} />
              </button>
            </div>
          ) : (
            /* When 1 to 10 numbers chosen: "Possible win" + Paytable + 10 Slots */
            <div
              style={{
                background: '#162329',
                border: '1px solid #1F333A',
                borderRadius: 14,
                padding: '10px 14px 10px',
                marginBottom: 6,
                boxSizing: 'border-box',
              }}
            >
              {/* Line 1: Possible win + Help button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 800 }}>
                    Possible win
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#22C55E' }}>
                    {possibleWin}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenPaytable}
                  style={{
                    background: '#1D3035',
                    border: '1px solid #234346',
                    color: '#22C55E',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <HelpCircle size={13} />
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
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11, fontWeight: 800, color: '#8B9BB0', lineHeight: 1.25 }}>
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
                          fontSize: 11,
                          fontWeight: 800,
                          lineHeight: 1.25,
                        }}
                      >
                        <span style={{ color: '#E2E8F0' }}>{e.hits}</span>
                        <span style={{ color: '#8B9BB0' }}>x{e.multiplier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line 3: Exactly 10 Square Slots in a single line */}
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
                          borderRadius: 4,
                          background: '#121C26',
                          border: '1px solid #203144',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                        borderRadius: 4,
                        background: '#0B131D',
                        border: '1px dashed #1B2B3C',
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
