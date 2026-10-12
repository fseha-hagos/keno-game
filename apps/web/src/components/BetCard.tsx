import React from 'react';
import { KENO_COLORS } from '../theme/kenoTheme';

export interface BetCardProps {
  id: string;
  username: string;
  numbers: number[];
  stake: number;
  status: string;
  payout?: number;
  isUserTicket?: boolean;
  liveDrawnSet: Set<number>;
}

export const BetCard: React.FC<BetCardProps> = ({
  username,
  numbers,
  stake,
  status,
  payout,
  isUserTicket = false,
  liveDrawnSet,
}) => {
  // Exactly 10 slots per ticket representation (matching Shamo.bet)
  const slots: (number | null)[] = [...numbers];
  while (slots.length < 10) slots.push(null);

  const isWon = (payout ?? 0) > 0;
  const isLost = status === 'Lost';
  const isWaiting = !isWon && !isLost;

  return (
    <div
      style={{
        background: isUserTicket ? '#101F29' : '#0F1823',
        border: isUserTicket ? '1px solid #1E4436' : '1px solid #1A283B',
        borderRadius: 8,
        padding: '8px 10px',
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Top: Username in bright green */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: isUserTicket ? '#4ADE80' : KENO_COLORS.usernameGreen,
            letterSpacing: '0.02em',
          }}
        >
          {username}
        </span>

        {isUserTicket && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ADE80',
              padding: '1px 6px',
              borderRadius: 4,
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}
          >
            YOU
          </span>
        )}
      </div>

      {/* 10 Number Slots in a single line (White/grey tiles with green hit) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 3,
          marginBottom: 8,
        }}
      >
        {slots.map((num, idx) => {
          if (num === null) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  aspectRatio: '1/1',
                  borderRadius: 4,
                  background: '#14202E',
                }}
              />
            );
          }

          const isHit = liveDrawnSet.has(Number(num));
          return (
            <div
              key={`num-${idx}-${num}`}
              style={{
                aspectRatio: '1/1',
                borderRadius: 4,
                background: isHit ? '#22C55E' : '#334155',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isHit ? '0 0 8px rgba(34, 197, 94, 0.7)' : 'none',
                transition: 'background 0.2s ease',
              }}
            >
              {num}
            </div>
          );
        })}
      </div>

      {/* Bottom Split: "Bet 600" on left, "Waiting" in yellow or win amount on right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        <div style={{ color: '#CBD5E1' }}>
          Bet {stake}
        </div>

        <div>
          {isWon && payout ? (
            <span style={{ color: '#22C55E', fontWeight: 900 }}>
              +{payout % 1 === 0 ? payout.toLocaleString() : payout.toFixed(2)}
            </span>
          ) : isLost ? (
            <span style={{ color: '#64748B' }}>Lost</span>
          ) : (
            <span style={{ color: KENO_COLORS.statusWaiting }}>
              Waiting
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
