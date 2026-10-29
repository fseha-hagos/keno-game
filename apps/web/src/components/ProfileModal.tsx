import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { X, User, Phone, ShieldCheck, LogOut, CheckCircle2, ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import { isWebWrapperApp } from '../utils/isAppWrapper';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLimits: () => void;
  onOpenFairness?: () => void;
  onOpenWallet?: (tab?: 'deposit' | 'withdraw' | 'history') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenLimits,
  onOpenFairness,
  onOpenWallet,
}) => {
  const { user, logout } = useAuthStore();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          padding: '24px 22px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <User size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
              {user?.username || 'Player'}
            </h3>
            <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>
              ● Verified Player
            </span>
          </div>
        </div>

        {/* Account Info Card */}
        <div
          style={{
            background: '#0B1320',
            border: '1px solid #1E293B',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>Phone Number:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
              {user?.phone || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>KYC Status:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} /> Verified
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>Account Type:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
              {user?.roles?.join(', ') || 'PLAYER'}
            </span>
          </div>
        </div>

        {/* Quick Deposit & Withdraw Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWallet?.('deposit');
            }}
            style={{
              padding: '12px 0',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDownLeft size={16} strokeWidth={2.8} />
            <span>Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWallet?.('withdraw');
            }}
            style={{
              padding: '12px 0',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1.5px solid #10B981',
              color: '#10B981',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUpRight size={16} strokeWidth={2.8} />
            <span>Withdraw</span>
          </button>
        </div>

        {/* Provably Fair Certificate */}
        <div
          onClick={() => {
            if (onOpenFairness) {
              onClose();
              onOpenFairness();
            }
          }}
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            cursor: onOpenFairness ? 'pointer' : 'default',
            transition: 'border-color 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#10B981" />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#F8FAFC' }}>
                CSPRNG Cryptographic Integrity
              </span>
            </div>
            {onOpenFairness && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981' }}>View Proof →</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
            Game round numbers are drawn in real-time by an authoritative Cryptographically Secure Random Number Generator. Tap to learn about Provably Fair hash verification.
          </p>
        </div>

        {/* Customer Support Card */}
        <div
          style={{
            background: '#0B1320',
            border: '1px solid #1E293B',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src="/telegram.png" alt="Telegram" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC' }}>Customer Support</span>
            </div>
            <span style={{ fontSize: 10.5, color: '#10B981', fontWeight: 700 }}>● 24/7 Support</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* Telegram Link */}
            <a
              href="https://t.me/Fastkenosupportteam"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(36, 161, 222, 0.12)',
                border: '1px solid rgba(36, 161, 222, 0.4)',
                borderRadius: 8,
                padding: '8px 10px',
                textDecoration: 'none',
                color: '#38BDF8',
                transition: 'all 0.15s ease',
              }}
            >
              <img src="/telegram.png" alt="Telegram" style={{ width: 16, height: 16, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#38BDF8' }}>Telegram</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>@Fastkenosupportteam</div>
              </div>
            </a>

            {/* Phone Support */}
            <a
              href="tel:0948491265"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 8,
                padding: '8px 10px',
                textDecoration: 'none',
                color: '#10B981',
                transition: 'all 0.15s ease',
              }}
            >
              <Phone size={16} color="#10B981" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#10B981' }}>Call Support</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>0948491265</div>
              </div>
            </a>
          </div>
        </div>

        {/* Download Android APK Button (only shown in normal browser) */}
        {!isWebWrapperApp() && (
          <a
            href="/FastKeno.apk"
            download="FastKeno.apk"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '11px 0',
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10B981',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              cursor: 'pointer',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          >
            <Download size={16} strokeWidth={2.5} />
            <span>Download Android App (APK)</span>
          </a>
        )}

        {/* Responsible Gaming Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenLimits();
          }}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 10,
            background: '#1E293B',
            border: '1px solid #334155',
            color: '#F8FAFC',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          🛡️ Manage Safe Play & Limits
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
