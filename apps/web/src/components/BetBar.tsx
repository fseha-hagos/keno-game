import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Minus, Plus, Settings } from 'lucide-react';
import { KENO_COLORS } from '../theme/kenoTheme';

interface BetBarProps {
  onPlaceBet: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  onOpenSettings?: () => void;
}

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
  const stake = Number(referenceStakeMinor) / 100;

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
    if (!isNaN(val) && val > 0) {
      setStakeMinor(String(Math.round(val * 100)));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const val = parseFloat(inputText);
    if (isNaN(val) || val <= 0) {
      setStakeMinor('100'); // minimum 1.00 ETB
      setInputText('1.00');
    } else {
      const clamped = Math.min(Math.max(val, 1), 50000);
      setStakeMinor(String(Math.round(clamped * 100)));
      setInputText(clamped.toFixed(2));
    }
  };

  const handleDoubleStake = () => {
    const current = Number(referenceStakeMinor);
    const doubled = Math.min(current * 2, 500000); // cap at 5000.00
    setStakeMinor(String(doubled));
  };

  const handleMaxStake = () => {
    setStakeMinor('500000'); // 5000.00
  };

  const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const canBet = readySlips.length > 0 && !disabled && !isLoading;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        padding: '6px 4px 8px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* 1. Stake Stepper & Multiplier Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: KENO_COLORS.stakeBarBg,
          border: '1.5px solid #1E2D3D',
          borderRadius: 10,
          padding: '4px 6px',
          marginBottom: 6,
          height: 48,
          boxSizing: 'border-box',
        }}
      >
        {/* Stepper Minus */}
        <button
          type="button"
          onClick={decrementAllStakes}
          style={{
            width: 38,
            height: 38,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Minus size={20} />
        </button>

        {/* Stake Numeric Display / Input */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <input
            type="text"
            value={isFocused ? inputText : stake.toFixed(2)}
            onChange={handleTextChange}
            onFocus={() => {
              setIsFocused(true);
              setInputText(stake > 0 ? String(stake) : '');
            }}
            onBlur={handleBlur}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              textAlign: 'center',
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 900,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Stepper Plus */}
        <button
          type="button"
          onClick={incrementAllStakes}
          style={{
            width: 38,
            height: 38,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Plus size={20} />
        </button>

        {/* X2 Button */}
        <button
          type="button"
          onClick={handleDoubleStake}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#182433',
            border: '1px solid #203144',
            color: KENO_COLORS.actionBtnGreen,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            marginLeft: 4,
          }}
        >
          X2
        </button>

        {/* MAX Button */}
        <button
          type="button"
          onClick={handleMaxStake}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#182433',
            border: '1px solid #203144',
            color: KENO_COLORS.actionBtnGreen,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            marginLeft: 4,
          }}
        >
          MAX
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: '#182433',
            border: '1px solid #203144',
            color: KENO_COLORS.actionBtnGreen,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: 4,
            padding: 0,
          }}
        >
          <Settings size={17} />
        </button>
      </div>

      {/* 2. Primary BET Button */}
      <button
        type="button"
        disabled={!canBet}
        onClick={onPlaceBet}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 10,
          background: canBet ? KENO_COLORS.betBtnActive : KENO_COLORS.betBtnIdle,
          border: 'none',
          color: canBet ? '#FFFFFF' : '#8CA397',
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: '0.04em',
          cursor: canBet ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: canBet ? '0 4px 16px rgba(22, 163, 74, 0.45)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: 22,
              height: 22,
              border: '2.5px solid rgba(255,255,255,0.3)',
              borderTopColor: '#FFFFFF',
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
