import React from 'react';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';

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
  // Exactly 10 slots per ticket representation (matching mock_web)
  const slots: (number | null)[] = [...numbers];
  while (slots.length < 10) slots.push(null);

  const isWon = (payout ?? 0) > 0;
  const isLost = status === 'Lost';
  const isWaiting = !isWon && !isLost;

  return (
    <div
      style={{
        background: isUserTicket ? '#1c2e23' : '#1e2629',
        border: isUserTicket ? '1px solid #38704c' : '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: 4,
        padding: '6px 7px',
        marginBottom: 4,
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Top: Username in #51b579 Roboto Condensed matching mock_web .pid */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 15.5,
            fontWeight: 700,
            fontFamily: KENO_FONTS.numbers,
            color: '#51b579',
            letterSpacing: '0.02em',
          }}
        >
          {username}
        </span>

        {isUserTicket && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: KENO_FONTS.numbers,
              background: 'rgba(76, 139, 101, 0.3)',
              color: '#86EFAC',
              padding: '1px 5px',
              borderRadius: 3,
              border: '1px solid rgba(134, 239, 172, 0.3)',
            }}
          >
            YOU
          </span>
        )}
      </div>

      {/* 10 Number Slots in a single line matching mock_web .picks_row & .pick_nms */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 3,
          marginBottom: 5,
        }}
      >
        {slots.map((num, idx) => {
          if (num === null) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  aspectRatio: '1/1',
                  borderRadius: 3,
                  background: 'rgba(20, 25, 26, 0.45)',
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
                borderRadius: 3,
                background: isHit ? '#51b579' : '#35434b',
                color: isHit ? '#FFFFFF' : '#d7d9db',
                fontFamily: KENO_FONTS.numbers,
                fontSize: 14.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isHit ? '0 0 8px rgba(81, 181, 121, 0.75)' : 'none',
                transition: 'background 0.15s ease',
              }}
            >
              {num}
            </div>
          );
        })}
      </div>

      {/* Bottom Split: Bet amount and Waiting/Won have the EXACT same width (50/50) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          fontFamily: KENO_FONTS.numbers,
          fontSize: 14,
          fontWeight: 700,
          marginTop: 4,
        }}
      >
        <div
          style={{
            background: 'rgba(20, 25, 26, 0.45)',
            borderRadius: 3,
            padding: '3px 6px',
            color: '#d7d9db',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          Bet {stake}
        </div>

        {isWon && payout !== undefined ? (
          <div
            style={{
              background: 'rgba(20, 25, 26, 0.45)',
              borderRadius: 3,
              padding: '3px 6px',
              color: '#51b579',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {payout >= stake ? `+${payout.toLocaleString()}` : payout.toLocaleString()}
          </div>
        ) : isLost ? (
          <div
            style={{
              background: 'rgba(20, 25, 26, 0.45)',
              borderRadius: 3,
              padding: '3px 6px',
              color: '#ff5c5c',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            Lost
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(20, 25, 26, 0.45)',
              borderRadius: 3,
              padding: '3px 6px',
              color: '#ffe833',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            Waiting
          </div>
        )}
      </div>
    </div>
  );
};
