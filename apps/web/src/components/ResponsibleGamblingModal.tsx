import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toastSuccess, toastError } from '../services/toast';
import { X, ShieldAlert, CheckCircle } from 'lucide-react';
import { LimitType, LimitDuration } from '@keno/shared-types';

interface ResponsibleGamblingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResponsibleGamblingModal: React.FC<ResponsibleGamblingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [wagerLimit, setWagerLimit] = useState('500');
  const [depositLimit, setDepositLimit] = useState('1000');

  const { data: limits } = useQuery({
    queryKey: ['rgLimits'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/limits');
      return res.data;
    },
    enabled: isOpen,
  });

  const setLimitMutation = useMutation({
    mutationFn: async ({
      type,
      duration,
      amount,
    }: {
      type: LimitType;
      duration: LimitDuration;
      amount: string;
    }) => {
      const amountMinor = (parseFloat(amount) * 100).toString();
      const res = await apiClient.put('/api/v1/limits', {
        limitType: type,
        duration,
        amountMinor,
      });
      return res.data;
    },
    onSuccess: () => {
      toastSuccess('Limit Updated', 'Responsible gambling limit saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['rgLimits'] });
    },
    onError: (err: any) => {
      toastError('Update Failed', err.response?.data?.message || 'Error updating limit');
    },
  });

  const selfExcludeMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiClient.post('/api/v1/limits/self-exclude', {
        durationDays: days,
        reason: 'Player voluntary request',
      });
      return res.data;
    },
    onSuccess: () => {
      toastSuccess('Self-Exclusion Active', 'Your account has been temporarily self-excluded. Bets are paused.');
      useAuthStore.getState().checkAuth?.();
      onClose();
    },
    onError: (err: any) => {
      toastError('Error', err.response?.data?.message || 'Could not set self-exclusion');
    },
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 1100,
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
          maxWidth: 440,
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <ShieldAlert size={24} color="#10B981" />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#F8FAFC' }}>
            Responsible Gaming
          </h3>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
          Set personal wager and deposit limits to keep your play safe and controlled.
        </p>

        {/* Daily Deposit Limit */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
            Daily Deposit Limit (ETB)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={depositLimit}
              onChange={(e) => setDepositLimit(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                background: '#0B1320',
                border: '1px solid #334155',
                color: '#F8FAFC',
                fontSize: 14,
                fontWeight: 700,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() =>
                setLimitMutation.mutate({
                  type: LimitType.DEPOSIT,
                  duration: LimitDuration.DAILY,
                  amount: depositLimit,
                })
              }
              style={{
                padding: '0 16px',
                borderRadius: 8,
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#10B981',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Daily Wager Limit */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
            Daily Wager Limit (ETB)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={wagerLimit}
              onChange={(e) => setWagerLimit(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                background: '#0B1320',
                border: '1px solid #334155',
                color: '#F8FAFC',
                fontSize: 14,
                fontWeight: 700,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() =>
                setLimitMutation.mutate({
                  type: LimitType.WAGER,
                  duration: LimitDuration.DAILY,
                  amount: wagerLimit,
                })
              }
              style={{
                padding: '0 16px',
                borderRadius: 8,
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#10B981',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Self Exclusion */}
        <div style={{ borderTop: '1px solid #1E293B', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#EF4444', marginBottom: 8 }}>
            Take a Break (Self-Exclusion)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  selfExcludeMutation.mutate(days);
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {days} {days === 1 ? 'Day' : 'Days'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
