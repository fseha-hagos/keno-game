import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { toastSuccess, toastError } from '../services/toast';
import { X, Eye, EyeOff, Lock, Phone, User as UserIcon, Sparkles } from 'lucide-react';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
        backgroundColor: 'rgba(5, 10, 20, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(170deg, #1E293B 0%, #0F172A 100%)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 430,
          padding: '28px 24px 22px',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.75), 0 0 35px rgba(16, 185, 129, 0.18)',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radiant Top Accent Bar */}
        <div
          style={{
            height: 4,
            width: '100%',
            background: 'linear-gradient(90deg, #10B981 0%, #38BDF8 50%, #10B981 100%)',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '50%',
            color: '#E2E8F0',
            cursor: 'pointer',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#E2E8F0';
          }}
        >
          <X size={18} />
        </button>

        {/* Header Badge & Title */}
        <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 4 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              marginBottom: 8,
            }}
          >
            <Sparkles size={13} color="#34D399" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#34D399', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              {mode === 'login' ? 'Player Portal' : 'Instant Registration'}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '0.5px' }}>
            {mode === 'login' ? 'Sign In to Play' : 'Create Player Account'}
          </h2>
          <p style={{ fontSize: 13, color: '#CBD5E1', margin: '4px 0 0', fontWeight: 500 }}>
            {mode === 'login'
              ? 'Access your balance, active slips, and live draws'
              : 'Sign up in seconds and claim instant multipliers'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            background: '#0F172A',
            borderRadius: 12,
            padding: 4,
            border: '1px solid #334155',
            marginBottom: 18,
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.35)',
          }}
        >
          <button
            type="button"
            onClick={() => handleSwitchMode('login')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: mode === 'login' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              borderRadius: 9,
              background: mode === 'login' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'transparent',
              color: mode === 'login' ? '#FFFFFF' : '#94A3B8',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: mode === 'login' ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease',
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
              border: mode === 'register' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              borderRadius: 9,
              background: mode === 'register' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'transparent',
              color: mode === 'register' ? '#FFFFFF' : '#94A3B8',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: mode === 'register' ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Register
          </button>
        </div>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(248, 113, 113, 0.6)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              color: '#FEE2E2',
              fontSize: 13,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ flex: 1, fontWeight: 600 }}>{errorMessage}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'login' ? (
            /* Login Identifier (Phone or Username) */
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                Phone Number or Username
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1E293B',
                  border: focusedField === 'identifier' ? '1px solid #10B981' : '1px solid #475569',
                  boxShadow: focusedField === 'identifier' ? '0 0 0 3px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                  borderRadius: 10,
                  padding: '0 12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <UserIcon size={16} color={focusedField === 'identifier' ? '#10B981' : '#34D399'} />
                <input
                  type="text"
                  className="auth-modal-input"
                  placeholder="0911223344 or PlayerName"
                  value={identifier}
                  onFocus={() => setFocusedField('identifier')}
                  onBlur={() => setFocusedField(null)}
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
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ) : (
            /* Register: Username & Phone */
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                  Username <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>(Letters, numbers & _)</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1E293B',
                    border: focusedField === 'username' ? '1px solid #10B981' : '1px solid #475569',
                    boxShadow: focusedField === 'username' ? '0 0 0 3px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    padding: '0 12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <UserIcon size={16} color={focusedField === 'username' ? '#10B981' : '#34D399'} />
                  <input
                    type="text"
                    className="auth-modal-input"
                    placeholder="e.g. keno_pro"
                    value={username}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
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
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                  Mobile Phone <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>(e.g. 0911223344)</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1E293B',
                    border: focusedField === 'phone' ? '1px solid #10B981' : '1px solid #475569',
                    boxShadow: focusedField === 'phone' ? '0 0 0 3px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    padding: '0 12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Phone size={16} color={focusedField === 'phone' ? '#10B981' : '#34D399'} />
                  <input
                    type="tel"
                    className="auth-modal-input"
                    placeholder="0911223344"
                    value={phone}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 10px',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
              Password <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>(Min. 6 characters)</span>
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1E293B',
                border: focusedField === 'password' ? '1px solid #10B981' : '1px solid #475569',
                boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                borderRadius: 10,
                padding: '0 12px',
                transition: 'all 0.2s ease',
              }}
            >
              <Lock size={16} color={focusedField === 'password' ? '#10B981' : '#34D399'} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-modal-input"
                placeholder="••••••••"
                value={password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  padding: '12px 10px',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#34D399'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register mode) */}
          {mode === 'register' && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                Confirm Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1E293B',
                  border: focusedField === 'confirmPassword' ? '1px solid #10B981' : '1px solid #475569',
                  boxShadow: focusedField === 'confirmPassword' ? '0 0 0 3px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
                  borderRadius: 10,
                  padding: '0 12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lock size={16} color={focusedField === 'confirmPassword' ? '#10B981' : '#34D399'} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-modal-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '12px 10px',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: '0.6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45), 0 0 25px rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.6), 0 0 35px rgba(16, 185, 129, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(16, 185, 129, 0.45), 0 0 25px rgba(16, 185, 129, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
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

        {/* Bottom Switcher Helper */}
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#CBD5E1' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#34D399',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#34D399',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Sign in here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
