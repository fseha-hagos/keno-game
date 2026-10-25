import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { X, User, Phone, ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLimits: () => void;
  onOpenFairness?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenLimits,
  onOpenFairness,
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
