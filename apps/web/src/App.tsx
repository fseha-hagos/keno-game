import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useGameStore } from './store/useGameStore';
import { useAuthStore } from './store/useAuthStore';
import { apiClient } from './api/client';
import { socketService } from './services/socket';
import { toastSuccess, toastError, toastInfo } from './services/toast';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const {
    betSlips,
    currency,
    isDrawing,
    drawnNumbers,
    resetSlips,
    addConfirmedTickets,
    clearConfirmedTickets,
    setDrawnNumbers,
    setIsDrawing,
    resetRoundDraw,
  } = useGameStore();

  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [chatOpen, setChatOpen] = useState(true);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [paytableModalOpen, setPaytableModalOpen] = useState(false);

  // Initialize Auth & Socket
  useEffect(() => {
    checkAuth();
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

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

      toastSuccess(
        count > 1 ? `🎉 ${count} Bets Placed!` : '🎉 Bet Placed!',
        `${totalStake.toFixed(2)} ETB placed for Round #${round?.roundNumber}.`,
      );

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

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#09110D',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      }}
    >
      <ToastContainer />

      {/* Top Header */}
      <Header
        roundNumber={round?.roundNumber}
        onOpenWallet={() => setWalletModalOpen(true)}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
      />

      {/* Main 3-Column Container matching Shamo.bet */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 25%, #132219 0%, #0A120D 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 1360,
            height: 'calc(100vh - 82px)',
            boxSizing: 'border-box',
          }}
        >
          {/* ═════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: Feed & Tabs (GAME, HISTORY, RESULTS, STATS) */}
          {/* ═════════════════════════════════════════════════════════ */}
          <aside
            style={{
              width: 320,
              flexShrink: 0,
              borderRight: '1px solid #162436',
              background: '#08101A',
              overflowY: 'auto',
              padding: '10px 8px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
            }}
            className="hide-on-mobile"
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
              padding: '6px 8px 24px',
              boxSizing: 'border-box',
              width: '100%',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            {/* Central Play Stage (Timer / 3D Spheres in Countdown, or Radar & Calling Ball in Draw) */}
            <KenoPlayStage
              roundNumber={round?.roundNumber}
              timeLeft={timeLeft}
              bettingOpen={bettingOpen}
              onOpenPaytable={() => setPaytableModalOpen(true)}
            />

            {/* 1. COUNTDOWN & BETTING PHASE (Image 1): 80-Grid + BetBar */}
            {!inDraw ? (
              <>
                <KenoGrid disabled={!bettingOpen} />

                <BetBar
                  onPlaceBet={handlePlaceBet}
                  isLoading={betMutation.isPending}
                  disabled={!bettingOpen}
                  onOpenSettings={() => setLimitsModalOpen(true)}
                />

                <BetSlipsPanel />

                <div className="show-on-mobile" style={{ width: '100%', marginTop: 10 }}>
                  <GameFeedPanel />
                </div>
              </>
            ) : (
              /* 2. GAME STARTS / DRAW PHASE (Image 2): Tabs row directly follows settled balls */
              <div style={{ width: '100%', marginTop: 2 }}>
                <GameFeedPanel />
              </div>
            )}
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

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenLimits={() => setLimitsModalOpen(true)}
      />

      <ResponsibleGamblingModal
        isOpen={limitsModalOpen}
        onClose={() => setLimitsModalOpen(false)}
      />

      <PaytableModal
        isOpen={paytableModalOpen}
        onClose={() => setPaytableModalOpen(false)}
      />
    </div>
  );
};
