import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Minus, Plus, Settings } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';

interface BetBarProps {
  onPlaceBet: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  onOpenSettings?: () => void;
}

const MIN_BET = 4; // Minimum allowed bet amount is 4.00 ETB

export const BetBar: React.FC<BetBarProps> = ({
  onPlaceBet,
  isLoading = false,
  disabled = false,
  onOpenSettings,
}) => {
  const {
    betSlips,
    incrementAllStakes,
    decrementAllStakes,
    setStakeMinor,
  } = useGameStore();

  const referenceStakeMinor = betSlips[0]?.stakeMinor ?? '400';
  const stake = Math.max(MIN_BET, Number(referenceStakeMinor) / 100);

  const [inputText, setInputText] = useState(stake.toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputText(stake.toFixed(2));
    }
  }, [stake, isFocused]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/[^0-9.]/g, '');
    setInputText(text);

    const val = parseFloat(text);
    if (!isNaN(val)) {
      const clamped = Math.max(MIN_BET, val);
      setStakeMinor(String(Math.round(clamped * 100)));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const val = parseFloat(inputText);
    if (isNaN(val) || val < MIN_BET) {
      setStakeMinor('400'); // Minimum 4.00 ETB
      setInputText('4.00');
    } else {
      const clamped = Math.min(Math.max(val, MIN_BET), 50000);
      setStakeMinor(String(Math.round(clamped * 100)));
      setInputText(clamped.toFixed(2));
    }
  };

  const handleDecrement = () => {
    if (stake <= MIN_BET) {
      setStakeMinor('400');
      setInputText('4.00');
      return;
    }
    decrementAllStakes();
  };

  const handleIncrement = () => {
    incrementAllStakes();
  };

  const handleDoubleStake = () => {
    const current = Math.max(MIN_BET * 100, Number(referenceStakeMinor));
    const doubled = Math.min(current * 2, 500000); // cap at 5000.00 ETB
    setStakeMinor(String(doubled));
  };

  const handleMaxStake = () => {
    setStakeMinor('500000'); // 5000.00 ETB
  };

  const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const canBet = readySlips.length > 0 && !disabled && !isLoading;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        padding: '8px 2px 14px',
        boxSizing: 'border-box',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Top Row: Stepper ( - 4.00 + ), X2, MAX, Settings (Gear) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
        }}
      >
        {/* Stepper Capsule */}
        <div
          style={{
            flex: 1,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#242b31',
            borderRadius: 4,
            padding: '0 8px',
            boxSizing: 'border-box',
          }}
        >
          {/* Stepper Minus (Disallowed below 4.00) */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={stake <= MIN_BET}
            title={stake <= MIN_BET ? 'Minimum bet is 4.00 ETB' : 'Decrease bet'}
            style={{
              width: 32,
              height: 32,
              borderRadius: 3,
              background: 'transparent',
              border: 'none',
              color: stake <= MIN_BET ? '#4b5563' : '#cdd5df',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: stake <= MIN_BET ? 'not-allowed' : 'pointer',
              padding: 0,
              transition: 'color 0.15s ease',
            }}
          >
            <Minus size={17} strokeWidth={2.4} />
          </button>

          {/* Stake Input Value (e.g. 4.00) */}
          <input
            type="text"
            inputMode="decimal"
            value={isFocused ? inputText : stake.toFixed(2)}
            onChange={handleTextChange}
            onFocus={() => {
              setIsFocused(true);
              setInputText(stake >= MIN_BET ? String(stake) : '4');
            }}
            onBlur={handleBlur}
            style={{
              width: '100%',
              maxWidth: 95,
              background: 'transparent',
              border: 'none',
              textAlign: 'center',
              color: '#FFFFFF',
              fontSize: 19,
              fontWeight: 800,
              outline: 'none',
              fontFamily: KENO_FONTS.ui,
            }}
          />

          {/* Stepper Plus */}
          <button
            type="button"
            onClick={handleIncrement}
            title="Increase bet"
            style={{
              width: 32,
              height: 32,
              borderRadius: 3,
              background: 'transparent',
              border: 'none',
              color: '#cdd5df',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.15s ease',
            }}
          >
            <Plus size={17} strokeWidth={2.4} />
          </button>
        </div>

        {/* X2 Button */}
        <button
          type="button"
          onClick={handleDoubleStake}
          title="Double bet"
          style={{
            height: 44,
            padding: '0 13px',
            borderRadius: 4,
            background: '#242b31',
            border: 'none',
            color: '#51b579',
            fontFamily: KENO_FONTS.ui,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.12s ease',
          }}
        >
          X2
        </button>

        {/* MAX Button */}
        <button
          type="button"
          onClick={handleMaxStake}
          title="Max bet"
          style={{
            height: 44,
            padding: '0 13px',
            borderRadius: 4,
            background: '#242b31',
            border: 'none',
            color: '#51b579',
            fontFamily: KENO_FONTS.ui,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.12s ease',
          }}
        >
          MAX
        </button>

        {/* Settings Gear Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings"
          style={{
            width: 44,
            height: 44,
            borderRadius: 4,
            background: '#242b31',
            border: 'none',
            color: '#51b579',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.12s ease',
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Bottom Row: Full-Width Primary BET Button */}
      <button
        type="button"
        disabled={!canBet}
        onClick={onPlaceBet}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 4,
          background: canBet ? '#2d4a34' : '#223226',
          border: 'none',
          color: canBet ? '#a8bdae' : '#596e60',
          fontFamily: KENO_FONTS.ui,
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: canBet ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          boxShadow: canBet ? '0 2px 8px rgba(0, 0, 0, 0.4)' : 'none',
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: 20,
              height: 20,
              border: '2px solid rgba(168, 189, 174, 0.3)',
              borderTopColor: '#a8bdae',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        ) : (
          <span>BET</span>
        )}
      </button>
    </div>
  );
};
