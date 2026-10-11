import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ShieldCheck, Menu, MessageSquare, X } from 'lucide-react';
import { KENO_COLORS } from '../theme/kenoTheme';

interface HeaderProps {
  roundNumber?: number | string;
  onOpenWallet: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roundNumber: propRoundNumber,
  onOpenWallet,
  onOpenAuth,
  onOpenProfile,
  onToggleChat,
  chatOpen = true,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance?currency=ETB');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: currentRound } = useQuery({
    queryKey: ['currentRound'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/rounds/current');
      return res.data;
    },
    enabled: !propRoundNumber,
    refetchInterval: 5000,
  });

  const formattedBalance = wallet?.balanceMinor
    ? (Number(wallet.balanceMinor) / 100).toFixed(2)
    : '0.00';

  const displayRoundNumber = propRoundNumber ?? currentRound?.roundNumber ?? '229495';

  return (
    <header style={{ width: '100%', background: KENO_COLORS.topBarBg, userSelect: 'none' }}>
      {/* 1. Top Window Bar: "Fast Keno" on left, "✕" on right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          borderBottom: '1px solid #131B26',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>
          Fast Keno
        </span>

        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#CBD5E1',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* 2. In-Game Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'linear-gradient(180deg, #09111C 0%, #060B12 100%)',
          borderBottom: '1px solid #152232',
          gap: 12,
        }}
      >
        {/* Left: FAST KENO metallic slanted logo */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.9, cursor: 'pointer' }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#FFFFFF',
              letterSpacing: '0.08em',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            FAST
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#22C55E',
              letterSpacing: '0.06em',
              textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
            }}
          >
            KENO
          </span>
        </div>

        {/* Center: Split Pill (Balance on left, ID on right) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#091613',
            border: '1.5px solid #1F3E2F',
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          {/* Balance side (Clickable to wallet / auth) */}
          <button
            type="button"
            onClick={isAuthenticated ? onOpenWallet : () => onOpenAuth('login')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              cursor: 'pointer',
              borderRight: '1px solid #1F3E2F',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#FBBF24',
                letterSpacing: '0.02em',
              }}
            >
              {isAuthenticated ? formattedBalance : '0.00'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>ETB</span>
          </button>

          {/* Round ID side */}
          <div
            style={{
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: '#E2E8F0',
            }}
          >
            <span>ID: {displayRoundNumber}</span>
            <ShieldCheck size={14} color="#22C55E" />
          </div>
        </div>

        {/* Right: Hamburger Menu & Chat Toggle Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={isAuthenticated ? onOpenProfile : () => onOpenAuth('login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            }}
            title="Menu & Account"
          >
            <Menu size={20} color="#22C55E" />
          </button>

          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              style={{
                background: 'transparent',
                border: 'none',
                color: chatOpen ? '#22C55E' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
              title="Toggle Live Chat"
            >
              <MessageSquare size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
