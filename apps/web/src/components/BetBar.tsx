import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Minus, Plus, Settings } from 'lucide-react';
import { KENO_COLORS, KENO_FONTS } from '../theme/kenoTheme';

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
        padding: '10px 4px 12px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Stake Stepper UI matching mock_web .bet_input_ui */}
        <div
          style={{
            flex: '1 1 180px',
            minWidth: 150,
            height: 46,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #242b31, #333f46)',
            borderRadius: 3,
            padding: '0 4px',
            boxSizing: 'border-box',
          }}
        >
          {/* Stepper Minus */}
          <button
            type="button"
            onClick={decrementAllStakes}
            style={{
              width: 32,
              height: 32,
              borderRadius: 3,
              background: 'transparent',
              border: 'none',
              color: '#d7d9db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Minus size={16} />
          </button>

          {/* Stake Input */}
          <input
            type="text"
            inputMode="decimal"
            value={isFocused ? inputText : stake.toFixed(2)}
            onChange={handleTextChange}
            onFocus={() => {
              setIsFocused(true);
              setInputText(stake > 0 ? String(stake) : '');
            }}
            onBlur={handleBlur}
            style={{
              width: '100%',
              maxWidth: 90,
              background: 'transparent',
              border: 'none',
              textAlign: 'center',
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 900,
              outline: 'none',
              fontFamily: KENO_FONTS.ui,
            }}
          />

          {/* Stepper Plus */}
          <button
            type="button"
            onClick={incrementAllStakes}
            style={{
              width: 32,
              height: 32,
              borderRadius: 3,
              background: 'transparent',
              border: 'none',
              color: '#d7d9db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* X2 Button matching mock_web .bet_input_btn */}
        <button
          type="button"
          onClick={handleDoubleStake}
          style={{
            height: 46,
            padding: '0 12px',
            borderRadius: 3,
            background: 'linear-gradient(180deg, #333f46, #242b31)',
            border: 'none',
            color: '#51b579',
            fontFamily: KENO_FONTS.ui,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          X2
        </button>

        {/* MAX Button matching mock_web .bet_input_btn */}
        <button
          type="button"
          onClick={handleMaxStake}
          style={{
            height: 46,
            padding: '0 12px',
            borderRadius: 3,
            background: 'linear-gradient(180deg, #333f46, #242b31)',
            border: 'none',
            color: '#51b579',
            fontFamily: KENO_FONTS.ui,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          MAX
        </button>

        {/* Settings Button matching mock_web */}
        <button
          type="button"
          onClick={onOpenSettings}
          style={{
            width: 44,
            height: 46,
            borderRadius: 3,
            background: 'linear-gradient(180deg, #333f46, #242b31)',
            border: 'none',
            color: '#51b579',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Settings size={18} />
        </button>

        {/* Primary BET Button matching mock_web .bet_set_btn */}
        <button
          type="button"
          disabled={!canBet}
          onClick={onPlaceBet}
          style={{
            flex: '1 1 120px',
            height: 46,
            borderRadius: 3,
            background: canBet
              ? 'linear-gradient(180deg, #4c8b65, #254632)'
              : 'linear-gradient(180deg, #333f46, #242b31)',
            border: 'none',
            color: canBet ? '#FFFFFF' : '#a0a0a0',
            fontFamily: KENO_FONTS.ui,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: canBet ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: canBet ? '0 3px 12px rgba(76, 139, 101, 0.5)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          {isLoading ? (
            <div
              style={{
                width: 20,
                height: 20,
                border: '2px solid rgba(255,255,255,0.3)',
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
    </div>
  );
};
