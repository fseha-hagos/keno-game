import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { toastSuccess, toastError, toastInfo } from '../services/toast';
import { X, Eye, EyeOff, Lock, Phone, User as UserIcon, Sparkles, Send } from 'lucide-react';

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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Forgot password OTP step state
  const [forgotStep, setForgotStep] = useState<'identifier' | 'otp' | 'newPassword'>('identifier');
  const [resetSessionId, setResetSessionId] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetBotLink, setResetBotLink] = useState('');
  const [hasTelegramLinked, setHasTelegramLinked] = useState(false);

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

  const handleSwitchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setErrorMessage(null);
    setForgotSuccess(false);
    setForgotStep('identifier');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = (identifier || phone || username).trim();
    if (!cleanId) {
      const msg = 'Please enter your registered phone number or username';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post('/api/v1/auth/forgot-password', { identifier: cleanId });
      const { resetSessionId: sId, hasTelegramLinked: linked, botLinkUrl } = res.data;

      setResetSessionId(sId);
      setHasTelegramLinked(linked);
      if (botLinkUrl) {
        setResetBotLink(botLinkUrl);
      }

      setForgotStep('otp');
      toastSuccess('Code Sent', linked ? 'OTP sent to your Telegram bot!' : 'Click to open Telegram bot to get your OTP.');

      // If user has not linked bot yet, open the deep-link in telegram
      if (botLinkUrl && !linked) {
        window.open(botLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      const errText = formatApiError(err);
      setErrorMessage(errText);
      toastError('Verification Failed', errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = resetOtp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      const msg = 'Please enter the 6-digit OTP code';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/v1/auth/verify-reset-otp', {
        resetSessionId,
        otp: cleanOtp,
      });

      setForgotStep('newPassword');
      toastSuccess('Verified', 'OTP verified! Enter your new password.');
    } catch (err: any) {
      const errText = formatApiError(err);
      setErrorMessage(errText);
      toastError('Invalid Code', errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters long';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      const msg = 'Passwords do not match';
      setErrorMessage(msg);
      toastError('Validation Error', msg);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/v1/auth/reset-password', {
        resetSessionId,
        otp: resetOtp.trim(),
        newPassword,
      });

      toastSuccess('Success!', 'Password reset successfully! Please sign in with your new password.');
      handleSwitchMode('login');
      setPassword('');
    } catch (err: any) {
      const errText = formatApiError(err);
      setErrorMessage(errText);
      toastError('Reset Failed', errText);
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
            background: mode === 'forgot'
              ? 'linear-gradient(90deg, #24A1DE 0%, #38BDF8 50%, #10B981 100%)'
              : 'linear-gradient(90deg, #10B981 0%, #38BDF8 50%, #10B981 100%)',
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
              background: mode === 'forgot' ? 'rgba(36, 161, 222, 0.18)' : 'rgba(16, 185, 129, 0.15)',
              border: mode === 'forgot' ? '1px solid rgba(36, 161, 222, 0.4)' : '1px solid rgba(16, 185, 129, 0.35)',
              marginBottom: 8,
            }}
          >
            {mode === 'forgot' ? (
              <Send size={13} color="#38BDF8" />
            ) : (
              <Sparkles size={13} color="#34D399" />
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: mode === 'forgot' ? '#38BDF8' : '#34D399',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              {mode === 'login' ? 'Player Portal' : mode === 'register' ? 'Instant Registration' : 'Telegram Recovery'}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '0.5px' }}>
            {mode === 'login' ? 'Sign In to Play' : mode === 'register' ? 'Create Player Account' : 'Reset Your Password'}
          </h2>
          <p style={{ fontSize: 13, color: '#CBD5E1', margin: '4px 0 0', fontWeight: 500 }}>
            {mode === 'login'
              ? 'Access your balance, active slips, and live draws'
              : mode === 'register'
                ? 'Sign up in seconds and claim instant multipliers'
                : 'Recover your account directly via official Telegram support'}
          </p>
        </div>

        {/* Tab Toggle (Shown for login and register) */}
        {mode !== 'forgot' && (
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
        )}

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

        {/* FORMS */}
        {mode === 'forgot' ? (
                    /* Forgot Password Multi-Step Flow */
                    <div>
                      {forgotStep === 'identifier' && (
                        <form onSubmit={handleForgotPassword}>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                              Phone Number or Username
                            </label>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#1E293B',
                                border: focusedField === 'identifier' ? '1px solid #38BDF8' : '1px solid #475569',
                                boxShadow: focusedField === 'identifier' ? '0 0 0 3px rgba(56, 189, 248, 0.25)' : 'none',
                                borderRadius: 10,
                                padding: '0 12px',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <UserIcon size={16} color={focusedField === 'identifier' ? '#38BDF8' : '#64748B'} />
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

                          <div
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              borderRadius: 10,
                              padding: '12px 14px',
                              marginBottom: 20,
                              fontSize: 12,
                              color: '#E2E8F0',
                              lineHeight: 1.5,
                            }}
                          >
                            <p style={{ margin: 0, fontWeight: 600 }}>
                              ⚡ <strong>Automatic OTP Verification:</strong> We'll verify that your account exists and send an instant 6-digit code via our Telegram Security Bot <strong>@FastKeno3_bot</strong>.
                            </p>
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                              width: '100%',
                              padding: '13px 0',
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: 900,
                              letterSpacing: '0.5px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              boxShadow: '0 4px 18px rgba(2, 132, 199, 0.45)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              transition: 'all 0.15s ease',
                            }}
                      >
                  <Send size={16} />
                  <span>{isLoading ? 'VERIFYING...' : 'SEND AUTOMATIC OTP'}</span>
                </button>
          </form>
        )}

        {forgotStep === 'otp' && (
          <form onSubmit={handleVerifyResetOtp}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                6-Digit Verification Code
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1E293B',
                  border: focusedField === 'resetOtp' ? '1px solid #10B981' : '1px solid #475569',
                  boxShadow: focusedField === 'resetOtp' ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none',
                  borderRadius: 10,
                  padding: '0 12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lock size={16} color={focusedField === 'resetOtp' ? '#10B981' : '#64748B'} />
                <input
                  type="text"
                  className="auth-modal-input"
                  placeholder="123456"
                  maxLength={6}
                  value={resetOtp}
                  onFocus={() => setFocusedField('resetOtp')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setResetOtp(e.target.value.replace(/\D/g, ''));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    padding: '12px 10px',
                    color: '#FFFFFF',
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '4px',
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: 12,
                color: '#E2E8F0',
                lineHeight: 1.5,
              }}
            >
              <p style={{ margin: 0 }}>
                {hasTelegramLinked
                  ? '✅ Code has been sent to your Telegram chat from @FastKeno3_bot.'
                  : '💬 Tap the button below to get your code directly from @FastKeno3_bot in Telegram:'}
              </p>
              {resetBotLink && (
                <a
                  href={resetBotLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    padding: '6px 12px',
                    backgroundColor: '#24A1DE',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Send size={12} />
                  <span>Open @FastKeno3_bot to Get Code</span>
                </a>
              )}
            </div>

              <button
                type="submit"
                disabled={isLoading || resetOtp.length < 6}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 10,
                  background: resetOtp.length === 6 ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#334155',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: (isLoading || resetOtp.length < 6) ? 'not-allowed' : 'pointer',
                  boxShadow: resetOtp.length === 6 ? '0 4px 18px rgba(16, 185, 129, 0.45)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>{isLoading ? 'VERIFYING...' : 'VERIFY CODE'}</span>
              </button>
          </form>
        )}

        {forgotStep === 'newPassword' && (
          <form onSubmit={handleResetPasswordSubmit}>
            {/* New Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                New Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1E293B',
                  border: focusedField === 'newPassword' ? '1px solid #10B981' : '1px solid #475569',
                  boxShadow: focusedField === 'newPassword' ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none',
                  borderRadius: 10,
                  padding: '0 12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lock size={16} color={focusedField === 'newPassword' ? '#10B981' : '#64748B'} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-modal-input"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                Confirm New Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1E293B',
                  border: focusedField === 'confirmNewPassword' ? '1px solid #10B981' : '1px solid #475569',
                  boxShadow: focusedField === 'confirmNewPassword' ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none',
                  borderRadius: 10,
                  padding: '0 12px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lock size={16} color={focusedField === 'confirmNewPassword' ? '#10B981' : '#64748B'} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-modal-input"
                  placeholder="Repeat new password"
                  value={confirmNewPassword}
                  onFocus={() => setFocusedField('confirmNewPassword')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
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

            <button
              type="submit"
              disabled={isLoading || newPassword.length < 6}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 900,
                cursor: (isLoading || newPassword.length < 6) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>{isLoading ? 'UPDATING...' : 'SET NEW PASSWORD & SIGN IN'}</span>
            </button>
          </form>
        )}

        {/* Back / Navigation links */}
        <div style={{ marginTop: 18, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16 }}>
          {forgotStep !== 'identifier' && (
            <button
              type="button"
              onClick={() => setForgotStep('identifier')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              ← Change Number
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSwitchMode('login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#34D399',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 4,
              textDecoration: 'underline',
            }}
          >
            Back to Sign In
          </button>
        </div>
    </div>
  ) : (
    /* Login or Register Form */
    <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
      {mode === 'login' ? (
        /* Login Identifier */
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
        /* Register Mode */
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
      <div style={{ marginBottom: 6 }}>
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

      {/* Forgot Password link (Visible on login mode) */}
      {mode === 'login' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setErrorMessage(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#34D399',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '2px 0',
              textDecoration: 'underline',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#10B981')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#34D399')}
          >
            Forgot Password?
          </button>
        </div>
      )}

      {/* Confirm Password (register mode) */}
      {mode === 'register' && (
        <div style={{ marginBottom: 18, marginTop: 14 }}>
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
  )
}

{/* Bottom Switcher Helper */ }
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
  ) : mode === 'register' ? (
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
  ) : null}
</div>
      </div >
    </div >
  );
};
