import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { toastSuccess, toastError } from '../services/toast';
import { X, Eye, EyeOff, Lock, Phone, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      toastError('Validation Error', 'Please enter your phone number and password');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/v1/auth/login', {
        phone: phone.trim(),
        password,
      });

      const { user, tokens } = res.data;
      await setAuth(user, tokens.accessToken, tokens.refreshToken);
      toastSuccess('Welcome Back!', `Signed in as ${user.username}`);
      onClose();
    } catch (err: any) {
      toastError(
        'Login Failed',
        err.response?.data?.message || 'Invalid credentials. Please verify and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !username.trim() || !password || !confirmPassword) {
      toastError('Validation Error', 'Please fill in all required registration fields');
      return;
    }

    if (password.length < 6) {
      toastError('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toastError('Validation Error', 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/v1/auth/register', {
        phone: phone.trim(),
        username: username.trim(),
        password,
        dateOfBirth: '2000-01-01',
        acceptTerms: true,
      });

      const { user, tokens } = res.data;
      await setAuth(user, tokens.accessToken, tokens.refreshToken);
      toastSuccess('Welcome to Fast Keno!', `Your player account ${user.username} is ready!`);
      onClose();
    } catch (err: any) {
      toastError(
        'Registration Failed',
        err.response?.data?.message || 'Could not complete registration. Try another phone or username.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
        {/* Close Button */}
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

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            background: '#0B1320',
            borderRadius: 12,
            padding: 4,
            border: '1px solid #1E293B',
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              background: mode === 'login' ? '#1E293B' : 'transparent',
              color: mode === 'login' ? '#F8FAFC' : '#64748B',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              background: mode === 'register' ? '#1E293B' : 'transparent',
              color: mode === 'register' ? '#F8FAFC' : '#64748B',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                Username
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0B1320',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: '0 12px',
                }}
              >
                <UserIcon size={16} color="#64748B" />
                <input
                  type="text"
                  placeholder="Player username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '12px 10px',
                    color: '#F8FAFC',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Phone */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
              Mobile Phone
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0B1320',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '0 12px',
              }}
            >
              <Phone size={16} color="#64748B" />
              <input
                type="tel"
                placeholder="0911223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  padding: '12px 10px',
                  color: '#F8FAFC',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0B1320',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '0 12px',
              }}
            >
              <Lock size={16} color="#64748B" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  padding: '12px 10px',
                  color: '#F8FAFC',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register mode) */}
          {mode === 'register' && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                Confirm Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0B1320',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: '0 12px',
                }}
              >
                <Lock size={16} color="#64748B" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '12px 10px',
                    color: '#F8FAFC',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? (
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            ) : mode === 'login' ? (
              'SIGN IN TO PLAY'
            ) : (
              'CREATE PLAYER ACCOUNT'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
