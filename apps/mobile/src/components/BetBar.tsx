import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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

  const referenceStakeMinor = betSlips[0]?.stakeMinor ?? '500';
  const stake = Number(referenceStakeMinor) / 100;

  const totalStake = betSlips
    .filter((s) => s.selectedNumbers.length > 0)
    .reduce((sum, s) => sum + Number(s.stakeMinor) / 100, 0);

  const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const canBet = readySlips.length > 0 && !disabled && !isLoading;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDoubleStake = () => {
    const current = Number(referenceStakeMinor);
    const doubled = Math.min(current * 2, 500000); // cap at 5000.00
    setStakeMinor(String(doubled));
  };

  const handleMaxStake = () => {
    setStakeMinor('500000'); // 5000.00
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

        {/* Stake display */}
        <View style={styles.stakeDisplay}>
          <Text style={styles.stakeAmount}>{fmt(stake)}</Text>
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
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  betBtnDisabled: {
    backgroundColor: '#1E2A38',
    borderWidth: 1,
    borderColor: '#2A3A4A',
    shadowOpacity: 0,
    elevation: 0,
  },
  betBtnText: {
    color: '#0F1923',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  betBtnTextDisabled: {
    color: '#64748B',
  },
});
