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
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const formatApiError = (err: any): string => {
    const data = err.response?.data;
    if (!data) {
      if (err.message === 'Network Error') {
        return 'Cannot connect to server. Please verify your connection.';
      }
      return err.message || 'Authentication failed. Please try again.';
    }
    if (Array.isArray(data.message)) {
      return data.message.join('. ');
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
    if (typeof data.error === 'string') {
      return data.error;
    }
    return 'Authentication failed. Please verify your details.';
  };

  if (!isOpen) return null;

  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      const msg = 'Please enter your phone number or username and password';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/v1/auth/login', {
        phone: cleanId,
        password,
      });

      const { user, tokens } = res.data;
      await setAuth(user, tokens.accessToken, tokens.refreshToken);
      toastSuccess('Welcome Back!', `Signed in as ${user.username}`);
      onClose();
    } catch (err: any) {
      const errText = formatApiError(err);
      setErrorMessage(errText);
      toastError('Login Failed', errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.trim();
    const cleanUser = username.trim();

    if (!cleanPhone || !cleanUser || !password || !confirmPassword) {
      const msg = 'Please fill in all registration fields';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    if (cleanPhone.length < 7) {
      const msg = 'Phone number must be at least 7 digits';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    if (cleanUser.length < 3) {
      const msg = 'Username must be at least 3 characters';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUser)) {
      const msg = 'Username can only contain letters, numbers, and underscores';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters long';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post('/api/v1/auth/register', {
        phone: cleanPhone,
        username: cleanUser,
        password,
        dateOfBirth: '2000-01-01',
        acceptTerms: true,
      });

      const { user, tokens } = res.data;
      await setAuth(user, tokens.accessToken, tokens.refreshToken);
      toastSuccess('Welcome to Fast Keno!', `Your player account ${user.username} is ready!`);
      onClose();
    } catch (err: any) {
      const errText = formatApiError(err);
      setErrorMessage(errText);
      toastError('Registration Failed', errText);
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
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => handleSwitchMode('login')}
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
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('register')}
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
              transition: 'all 0.15s ease',
            }}
          >
            Register
          </button>
        </div>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              color: '#FCA5A5',
              fontSize: 13,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ flex: 1 }}>{errorMessage}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'login' ? (
            /* Login Identifier (Phone or Username) */
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                Phone Number or Username
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
                  placeholder="0911223344 or PlayerName"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus
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
          ) : (
            /* Register: Username & Phone */
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Username <span style={{ fontSize: 11, color: '#64748B' }}>(Letters, numbers & _)</span>
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
                    placeholder="e.g. keno_pro"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoFocus
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

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                  Mobile Phone <span style={{ fontSize: 11, color: '#64748B' }}>(e.g. 0911223344)</span>
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
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
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
            </>
          )}

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
              Password <span style={{ fontSize: 11, color: '#64748B' }}>(Min. 6 characters)</span>
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
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
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
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
