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
  } = useGameStore();

  const referenceStakeMinor = betSlips[0]?.stakeMinor ?? '500';
  const stake = Number(referenceStakeMinor) / 100;
  const stakesMixed =
    betSlips.length > 1 &&
    betSlips.some((s) => s.stakeMinor !== referenceStakeMinor);

  const totalStake = betSlips
    .filter((s) => s.selectedNumbers.length > 0)
    .reduce((sum, s) => sum + Number(s.stakeMinor) / 100, 0);
  const totalWin = betSlips.reduce((sum, s) => {
    const sp = s.selectedNumbers.length;
    if (sp === 0) return sum;
    const mult = getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, sp, sp);
    return sum + (Number(s.stakeMinor) / 100) * mult;
  }, 0);

  const readySlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const canBet = readySlips.length > 0 && !disabled && !isLoading;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <View style={styles.slipInfo}>
          <Text style={styles.activeHint}>Stake for all slips</Text>
          <View style={styles.stakeStepper}>
            <TouchableOpacity
              onPress={decrementAllStakes}
              style={[styles.stepBtn, styles.stepMinus]}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>

            <View style={styles.stakeDisplay}>
              <Text style={styles.stakeAmount}>
                {stakesMixed ? '≈ ' : ''}${fmt(stake)}
              </Text>
              {stakesMixed && (
                <Text style={styles.stakeWin}>Per-slip stakes differ</Text>
              )}
            </View>

            <TouchableOpacity
              onPress={incrementAllStakes}
              style={[styles.stepBtn, styles.stepPlus]}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.vertDivider} />

        <View style={styles.betSection}>
          <View style={styles.totalsRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL STAKE</Text>
              <Text style={styles.totalValue}>${fmt(totalStake)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalLabel}>TO WIN</Text>
              <Text style={[styles.totalValue, styles.totalWinValue]}>${fmt(totalWin)}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onPlaceBet}
            disabled={!canBet}
            style={[styles.betBtn, !canBet && styles.betBtnDisabled]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0F1D" size="small" />
            ) : (
              <Text style={styles.betBtnText}>
                PLACE {readySlips.length > 1 ? `${readySlips.length} BETS` : 'BET'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    marginTop: 6,
    borderRadius: 10,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  slipInfo: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  activeHint: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stakeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepMinus: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepPlus: {
    backgroundColor: '#D97706',
  },
  stepBtnText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  stakeDisplay: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  stakeAmount: {
    color: '#F1F5F9',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
  },
  stakeWin: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '700',
  },
  vertDivider: {
    width: 1,
    backgroundColor: '#1E293B',
    marginVertical: 2,
  },
  betSection: {
    width: 130,
    gap: 6,
    justifyContent: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  totalLabel: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  totalValue: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '900',
  },
  totalWinValue: {
    color: '#34D399',
  },
  betBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  betBtnDisabled: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  betBtnText: {
    color: '#0A0F1D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
