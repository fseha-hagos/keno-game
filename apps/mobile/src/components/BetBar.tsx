import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';

interface BetBarProps {
  onPlaceBet: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const BetBar = ({ onPlaceBet, isLoading, disabled }: BetBarProps) => {
  const {
    betSlips,
    incrementAllStakes,
    decrementAllStakes,
    setStakeMinor,
  } = useGameStore();

  const referenceStakeMinor = betSlips[0]?.stakeMinor ?? '200';
  const stake = Number(referenceStakeMinor) / 100;

  const [inputText, setInputText] = useState(stake.toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputText(stake.toFixed(2));
    }
  }, [stake, isFocused]);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setInputText(sanitized);

    const val = parseFloat(sanitized);
    if (!isNaN(val) && val > 0) {
      const minor = Math.round(val * 100);
      setStakeMinor(String(minor));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const val = parseFloat(inputText);
    if (isNaN(val) || val < 2) {
      setStakeMinor('200'); // minimum 2.00 ETB
      setInputText('2.00');
    } else {
      const clamped = Math.min(Math.max(val, 2), 4000);
      const minor = Math.round(clamped * 100);
      setStakeMinor(String(minor));
      setInputText(clamped.toFixed(2));
    }
  };

  const totalStake = betSlips
    .filter((s) => s.selectedNumbers.length > 0)
    .reduce((sum, s) => sum + Number(s.stakeMinor) / 100, 0);

  const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const canBet = readySlips.length > 0 && !disabled && !isLoading;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDoubleStake = () => {
    const current = Number(referenceStakeMinor);
    const doubled = Math.min(current * 2, 400000); // cap at 4000.00
    setStakeMinor(String(doubled));
  };

  const handleMaxStake = () => {
    setStakeMinor('400000'); // 4000.00
  };

  return (
    <View style={styles.container}>
      {/* Stake Controls Row */}
      <View style={styles.stakeRow}>
        {/* Minus button */}
        <TouchableOpacity
          onPress={decrementAllStakes}
          style={styles.stepBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>

        {/* Stake display - Editable TextInput for manual bet modification */}
        <View style={[styles.stakeDisplay, isFocused && styles.stakeDisplayFocused]}>
          <TextInput
            style={styles.stakeInput}
            value={isFocused ? inputText : fmt(stake)}
            onChangeText={handleTextChange}
            onFocus={() => {
              setIsFocused(true);
              setInputText(stake > 0 ? String(stake) : '');
            }}
            onBlur={handleBlur}
            keyboardType="numeric"
            selectTextOnFocus
            placeholder="5.00"
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Plus button */}
        <TouchableOpacity
          onPress={incrementAllStakes}
          style={styles.stepBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* X2 button */}
        <TouchableOpacity
          onPress={handleDoubleStake}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>X2</Text>
        </TouchableOpacity>

        {/* MAX button */}
        <TouchableOpacity
          onPress={handleMaxStake}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>MAX</Text>
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity
          style={styles.settingsBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* BET button */}
      <TouchableOpacity
        onPress={onPlaceBet}
        disabled={!canBet}
        style={[styles.betBtn, !canBet && styles.betBtnDisabled]}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#0F1923" size="small" />
        ) : (
          <Text style={[styles.betBtnText, !canBet && styles.betBtnTextDisabled]}>
            {readySlips.length > 1 ? `BET (${readySlips.length} slips)` : 'BET'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1923',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  stakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#1E2A38',
    borderWidth: 1,
    borderColor: '#2A3A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  stakeDisplay: {
    flex: 1,
    backgroundColor: '#1E2A38',
    borderWidth: 1,
    borderColor: '#2A3A4A',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 4,
  },
  stakeDisplayFocused: {
    borderColor: '#00E5FF',
    backgroundColor: '#162230',
  },
  stakeInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  stakeAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A3A4A',
  },
  actionBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#1E2A38',
    borderWidth: 1,
    borderColor: '#2A3A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '900',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#1E2A38',
    borderWidth: 1,
    borderColor: '#2A3A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
    color: '#94A3B8',
  },
  betBtn: {
    backgroundColor: '#487652',
    borderWidth: 1,
    borderColor: '#52865D',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#487652',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  betBtnDisabled: {
    backgroundColor: '#324D38',
    borderWidth: 1,
    borderColor: '#3A5841',
    shadowOpacity: 0,
    elevation: 0,
  },
  betBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  betBtnTextDisabled: {
    color: '#9EC0A6',
  },
});
