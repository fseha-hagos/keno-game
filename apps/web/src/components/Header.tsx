import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ShieldCheck, Menu, MessageSquare, Wallet, Plus } from 'lucide-react';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';

interface HeaderProps {
  roundNumber?: number | string;
  onOpenWallet: (tab?: 'deposit' | 'withdraw' | 'history') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenFairness?: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roundNumber: propRoundNumber,
  onOpenWallet,
  onOpenAuth,
  onOpenProfile,
  onOpenFairness,
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
      {/* In-Game Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: 'linear-gradient(180deg, #09111C 0%, #060B12 100%)',
          borderBottom: '1px solid #152232',
          gap: 6,
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* Left: Official Fast Keno Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}>
          <img
            src="/logo_keno.png"
            alt="Fast Keno"
            style={{
              height: 26,
              maxHeight: 30,
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
            }}
          />
        </div>

        {/* Center: Money & Deposit Pill (when authenticated) + Round ID */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            flexShrink: 1,
            justifyContent: 'center',
          }}
        >
          {/* Money & Easy Deposit Pill: ONLY visible when authenticated */}
          {isAuthenticated && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(30, 43, 34, 0.5)',
                border: '1px solid rgba(31, 85, 54, 0.7)',
                borderRadius: 50,
                overflow: 'hidden',
                height: 28,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                flexShrink: 0,
              }}
            >
              {/* Left: Wallet icon and balance */}
              <button
                type="button"
                onClick={() => onOpenWallet('deposit')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                }}
                title="Open Wallet"
              >
                <Wallet size={13} color="#71ce96" strokeWidth={2.2} />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#e6b529',
                    fontFamily: KENO_FONTS.ui,
                  }}
                >
                  {formattedBalance}
                </span>
                {/* Omitted on mobile screens to preserve space for the chat button */}
                <span
                  className="header-mobile-hide-currency"
                  style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', marginLeft: 2 }}
                >
                  ETB
                </span>
              </button>

              {/* Action green deposit '+' button */}
              <button
                type="button"
                onClick={() => onOpenWallet('deposit')}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  height: '100%',
                  padding: '0 7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderLeft: '1px solid rgba(31, 85, 54, 0.7)',
                  transition: 'filter 0.15s ease',
                }}
                title="Deposit Funds"
              >
                <Plus size={13} color="#FFFFFF" strokeWidth={3} />
              </button>
            </div>
          )}

          {/* Round ID side - Clickable to open Fairness modal */}
          <div
            onClick={onOpenFairness}
            style={{
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: 400,
              color: '#FFFFFF',
              fontFamily: KENO_FONTS.ui,
              background: 'rgba(30, 43, 34, 0.45)',
              border: '1px solid rgba(31, 85, 54, 0.6)',
              borderRadius: 50,
              height: 28,
              cursor: onOpenFairness ? 'pointer' : 'default',
              flexShrink: 0,
            }}
            title="Provably Fair Cryptographic Verification"
          >
            <span style={{ color: '#71ce96', fontWeight: 600 }}>ID:</span>
            <span style={{ color: '#FFFFFF' }}>{displayRoundNumber}</span>
            <ShieldCheck size={12} color="#71ce96" />
          </div>
        </div>

        {/* Right side:
            flexShrink: 0 ensures Menu & Chat buttons are NEVER squished or hidden off-screen!
        */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!isAuthenticated ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    color: '#10B981',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 8px',
                    color: '#FFFFFF',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Register
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenAuth('login')}
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
                    background: chatOpen ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    border: chatOpen ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                    borderRadius: 6,
                    color: chatOpen ? '#22C55E' : '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    transition: 'all 0.15s ease',
                  }}
                  title="Toggle Live Chat"
                >
                  <MessageSquare size={19} color={chatOpen ? '#22C55E' : '#94A3B8'} />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenProfile}
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
                    background: chatOpen ? 'rgba(34, 197, 94, 0.18)' : 'transparent',
                    border: chatOpen ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent',
                    borderRadius: 6,
                    color: chatOpen ? '#22C55E' : '#CBD5E1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    transition: 'all 0.15s ease',
                  }}
                  title="Toggle Live Chat"
                >
                  <MessageSquare size={19} color={chatOpen ? '#22C55E' : '#CBD5E1'} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
