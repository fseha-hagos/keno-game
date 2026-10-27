import React, { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isWebWrapperApp } from './utils/isAppWrapper';
import { Header } from './components/Header';
import { KenoPlayStage } from './components/KenoPlayStage';
import { KenoGrid } from './components/KenoGrid';
import { BetBar } from './components/BetBar';
import { BetSlipsPanel } from './components/BetSlipsPanel';
import { GameFeedPanel } from './components/GameFeedPanel';
import { ChatPanel } from './components/ChatPanel';
import { AuthModal } from './components/AuthModal';
import { WalletModal } from './components/WalletModal';
import { ResponsibleGamblingModal } from './components/ResponsibleGamblingModal';
import { ProfileModal } from './components/ProfileModal';
import { PaytableModal } from './components/PaytableModal';
import { ToastContainer } from './components/ToastContainer';
import { FloatingSupportButton } from './components/FloatingSupportButton';
import { useGameStore } from './store/useGameStore';
import { useAuthStore } from './store/useAuthStore';
import { apiClient } from './api/client';
import { socketService } from './services/socket';
import { toastSuccess, toastError, toastInfo } from './services/toast';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const {
    betSlips,
    currency,
    isDrawing,
    drawnNumbers,
    isOnline,
    resetSlips,
    addConfirmedTickets,
    clearConfirmedTickets,
    setDrawnNumbers,
    setIsDrawing,
    resetRoundDraw,
  } = useGameStore();

  const [showReconnectingPill, setShowReconnectingPill] = useState(false);

  useEffect(() => {
    let timer: any;
    if (!isOnline) {
      // Small 1.5s debounce so normal quick initial handshake is completely silent
      timer = setTimeout(() => {
        setShowReconnectingPill(true);
      }, 1500);
    } else {
      setShowReconnectingPill(false);
    }
    return () => clearTimeout(timer);
  }, [isOnline]);

  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false,
  );
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileChatOpen) {
        setMobileChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileChatOpen]);

  const handleToggleChat = () => {
    if (isMobile) {
      setMobileChatOpen((prev) => !prev);
    } else {
      setChatOpen((prev) => !prev);
    }
  };

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletInitialTab, setWalletInitialTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showApkBanner, setShowApkBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Hide install banner completely when running in the Android webwrapper APK or standalone app
    if (isWebWrapperApp()) return false;
    return localStorage.getItem('fastkeno_apk_banner_dismissed') !== 'true';
  });

  const handleOpenWallet = (tab: 'deposit' | 'withdraw' | 'history' = 'deposit') => {
    setWalletInitialTab(tab);
    setWalletModalOpen(true);
  };
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [paytableModalOpen, setPaytableModalOpen] = useState(false);
  const [rulesModalTab, setRulesModalTab] = useState<'rules' | 'fairness' | 'freebet'>('rules');

  // Initialize Auth & Socket
  useEffect(() => {
    checkAuth();
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Sync user authentication with websocket
  useEffect(() => {
    if (user?.id) {
      socketService.authenticateUser(user.id);
    }
  }, [user?.id]);

  // Fetch active game round
  const { data: round } = useQuery({
    queryKey: ['currentRound'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/rounds/current');
      return res.data;
    },
    refetchInterval: 2000,
  });

  const prevRoundIdRef = useRef<string | null>(null);

  // Clear caches & slips on new round
  useEffect(() => {
    if (!round?.id) return;
    if (prevRoundIdRef.current && prevRoundIdRef.current !== round.id) {
      resetSlips();
      clearConfirmedTickets();
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['betHistory'] });
      queryClient.invalidateQueries({ queryKey: ['recentBets'] });
    }
    prevRoundIdRef.current = round.id;
  }, [round?.id]);

  useEffect(() => {
    if (round?.status === 'SETTLED') {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['betHistory'] });
      queryClient.invalidateQueries({ queryKey: ['recentBets'] });
    }
  }, [round?.status]);

  const parseRoundDrawn = (r: any): number[] => {
    if (!r) return [];
    const raw = r.drawResult || r.drawnNumbers;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((n) => Number(n)).filter((n) => !isNaN(n));
    }
    if (typeof raw === 'string') {
      return raw.split(',').map((n) => Number(n.trim())).filter((n) => !isNaN(n));
    }
    return [];
  };

  // Synchronize live drawn numbers mid-draw
  useEffect(() => {
    if (!round) return;

    if (round.status === 'OPEN') {
      const currentDrawn = useGameStore.getState().drawnNumbers;
      if (currentDrawn.length > 0) {
        const timer = setTimeout(() => {
          resetRoundDraw();
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        resetRoundDraw();
      }
    } else if (
      round.status === 'DRAWING' ||
      round.status === 'DRAWN' ||
      round.status === 'SETTLED'
    ) {
      const parsed = parseRoundDrawn(round);
      if (parsed.length > 0) {
        setDrawnNumbers(parsed);
        setIsDrawing(round.status !== 'SETTLED');
      }
    }
  }, [round?.id, round?.status, JSON.stringify(round?.drawResult)]);

  // Live countdown timer calculation
  useEffect(() => {
    if (!round?.closedAt || round.status !== 'OPEN') {
      setTimeLeft(0);
      return;
    }

    const computeTime = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(round.closedAt).getTime() - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };

    computeTime();
    const timer = setInterval(computeTime, 1000);
    return () => clearInterval(timer);
  }, [round?.closedAt, round?.status]);

  // Place bet mutation
  const betMutation = useMutation({
    mutationFn: async () => {
      if (!round) throw new Error('No active round available');
      const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
      if (readySlips.length === 0) throw new Error('No numbers selected');

      const requests = readySlips.map((slip) => {
        const idempotencyKey = `bet_${slip.id}_${Date.now()}`;
        return apiClient.post('/api/v1/keno/bets', {
          roundId: round.id,
          stakeMinor: slip.stakeMinor,
          currency,
          selectedNumbers: slip.selectedNumbers,
          idempotencyKey,
        });
      });

      const results = await Promise.all(requests);
      return results.map((r) => r.data);
    },
    onSuccess: (results) => {
      const count = results.length;
      const totalStake = results.reduce(
        (sum: number, r: any) => sum + Number(r.stakeMinor || 0) / 100,
        0,
      );

      addConfirmedTickets(results);
      resetSlips();

      const displayStake = totalStake % 1 === 0 ? totalStake : totalStake.toFixed(2);
      toastSuccess(`${displayStake} ETB placed`);

      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['betHistory'] });
      queryClient.invalidateQueries({ queryKey: ['recentBets'] });
    },
    onError: (err: any) => {
      toastError(
        'Bet Failed',
        err.response?.data?.message || 'Could not place bet. Check your balance and limits.',
      );
    },
  });

  const handlePlaceBet = () => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }

    const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
    if (readySlips.length === 0) {
      toastInfo('No Numbers Selected', 'Pick at least 1 number on any slip.');
      return;
    }

    if (round?.status !== 'OPEN' || timeLeft <= 0) {
      toastInfo('Betting Closed', 'This round is closed. Next round will open shortly.');
      return;
    }

    betMutation.mutate();
  };

  const bettingOpen = round?.status === 'OPEN' && timeLeft > 0;
  const inDraw = isDrawing || drawnNumbers.length > 0;
  const isGameRunning = !bettingOpen || inDraw;

  return (
    <div
      style={{
        minHeight: '100dvh',
        height: isMobile ? '100dvh' : '100%',
        backgroundColor: '#000000',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "var(--font-ui)",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background wallpaper matching mock_web */}
      <div className="desktop-bg" />

      <ToastContainer />

      {/* Subtle non-intrusive reconnection pill (only shown if disconnected for >1.5s) */}
      {showReconnectingPill && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 20,
            padding: '3px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: '#FDE047',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none',
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#EAB308',
              boxShadow: '0 0 6px #EAB308',
              display: 'inline-block',
            }}
          />
          <span>Reconnecting...</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <Header
          roundNumber={round?.roundNumber}
          onOpenWallet={handleOpenWallet}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthModalOpen(true);
          }}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenFairness={() => {
            setRulesModalTab('fairness');
            setPaytableModalOpen(true);
          }}
          onToggleChat={handleToggleChat}
          chatOpen={isMobile ? mobileChatOpen : chatOpen}
        />
      </div>

      {/* Main 3-Column Container matching mock_web .content_super_wrapper */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 1240,
            height: '100%',
            boxSizing: 'border-box',
            padding: isMobile ? 0 : '4px',
            gap: 8,
            minHeight: 0,
          }}
        >
          {/* ═════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: Feed & Tabs (GAME, HISTORY, RESULTS, STATS) */}
          {/* ═════════════════════════════════════════════════════════ */}
          <aside
            style={{
              width: 320,
              flexShrink: 0,
              background: 'rgba(27, 30, 31, 0.94)',
              border: '1px solid rgba(81, 181, 121, 0.2)',
              borderRadius: 16,
              overflowY: 'auto',
              padding: '10px 8px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              scrollbarWidth: 'none',
            }}
            className="hide-on-mobile no-scrollbar"
          >
            <GameFeedPanel />
          </aside>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* CENTER COLUMN: Central Game Stage, Grid, Stake & Bet Bar */}
          {/* ═════════════════════════════════════════════════════════ */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflowY: 'auto',
              padding: isMobile ? '1px 4px 6px' : '1px 4px 5px',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: 500,
              margin: '0 auto',
              background: 'rgba(27, 30, 31, 0.94)',
              border: '1px solid rgba(81, 181, 121, 0.2)',
              borderBottom: isMobile ? 'none' : '1px solid rgba(81, 181, 121, 0.2)',
              borderRadius: isMobile ? '14px 14px 0 0' : 16,
              scrollbarWidth: 'none',
              minHeight: 0,
            }}
            className="no-scrollbar"
          >
            {/* Central Play Stage (Timer / 3D Spheres in Countdown, or Radar & Calling Ball in Draw) */}
            <KenoPlayStage
              roundNumber={round?.roundNumber}
              timeLeft={timeLeft}
              bettingOpen={bettingOpen}
              onOpenPaytable={() => {
                setRulesModalTab('rules');
                setPaytableModalOpen(true);
              }}
            />

            {/* 80-Grid: Always visible on desktop; on mobile hidden when the game starts/draws */}
            <div
              className={isGameRunning ? 'hide-on-mobile' : undefined}
              style={{
                width: '100%',
                display: isGameRunning && isMobile ? 'none' : 'block',
              }}
            >
              <KenoGrid disabled={!bettingOpen} />
            </div>

            {/* BetBar: Always visible on desktop; on mobile hidden when the game starts/draws */}
            <div
              className={isGameRunning ? 'hide-on-mobile' : undefined}
              style={{
                width: '100%',
                display: isGameRunning && isMobile ? 'none' : 'block',
              }}
            >
              <BetBar
                onPlaceBet={handlePlaceBet}
                isLoading={betMutation.isPending}
                disabled={!bettingOpen}
                onOpenSettings={() => setLimitsModalOpen(true)}
              />
            </div>

            <BetSlipsPanel />

            <div className="show-on-mobile" style={{ width: '100%', marginTop: 10 }}>
              <GameFeedPanel />
            </div>
          </main>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: Live Chat & Active Players                */}
          {/* ═════════════════════════════════════════════════════════ */}
          {chatOpen && (
            <aside
              style={{
                width: 300,
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
              className="hide-on-mobile"
            >
              <ChatPanel />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile Chat Slide-over Drawer */}
      {mobileChatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live Chat"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 140,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setMobileChatOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              height: '100%',
              maxHeight: '100dvh',
              background: 'rgba(20, 24, 26, 0.98)',
              borderLeft: '1px solid rgba(81, 181, 121, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 35px rgba(0, 0, 0, 0.85)',
              animation: 'slideDrawerRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChatPanel onClose={() => setMobileChatOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Floating APK Download Banner for Browser Users */}
      {showApkBanner && (
        <aside
          role="complementary"
          aria-label="Download Android App"
          style={{
            position: 'fixed',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: 480,
            zIndex: 900,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(11, 19, 32, 0.98) 100%)',
            border: '1.5px solid rgba(16, 185, 129, 0.45)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxSizing: 'border-box',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img
              src="/logo_keno.png"
              alt="Fast Keno"
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                objectFit: 'contain',
                background: '#0B1320',
                padding: 2,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                  Fast Keno Android App
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  APK
                </span>
              </div>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: 11,
                  color: '#94A3B8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Fast gameplay & instant updates
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href="/FastKeno.apk"
              download="FastKeno.apk"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Download size={14} strokeWidth={2.8} />
              <span>Install</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setShowApkBanner(false);
                localStorage.setItem('fastkeno_apk_banner_dismissed', 'true');
              }}
              aria-label="Dismiss app install banner"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                cursor: 'pointer',
                borderRadius: 8,
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        initialTab={walletInitialTab}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenLimits={() => setLimitsModalOpen(true)}
        onOpenFairness={() => {
          setRulesModalTab('fairness');
          setPaytableModalOpen(true);
        }}
        onOpenWallet={handleOpenWallet}
      />

      <ResponsibleGamblingModal
        isOpen={limitsModalOpen}
        onClose={() => setLimitsModalOpen(false)}
      />

      <PaytableModal
        isOpen={paytableModalOpen}
        onClose={() => setPaytableModalOpen(false)}
        initialTab={rulesModalTab}
      />

      {/* Floating Customer Support Button */}
      <FloatingSupportButton />
    </div>
  );
};
