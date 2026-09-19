import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';

const MAX_SLIPS = 5;

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BetSlipsPanel = () => {
  const {
    betSlips,
    activeSlipId,
    addSlip,
    setActiveSlip,
    incrementStakeForSlip,
    decrementStakeForSlip,
  } = useGameStore();

  const filledSlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const showSlips = betSlips.filter(
    (s) => s.selectedNumbers.length > 0 || s.id === activeSlipId,
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>YOUR SLIPS</Text>

      {filledSlips.length < MAX_SLIPS && (
        <TouchableOpacity onPress={addSlip} style={styles.addSlipBtn} activeOpacity={0.8}>
          <Text style={styles.addSlipText}>+ Add Slip</Text>
        </TouchableOpacity>
      )}

      <View style={styles.list}>
        {showSlips.map((slip, idx) => {
          const isActive = slip.id === activeSlipId;
          const spots = slip.selectedNumbers.length;
          const stake = Number(slip.stakeMinor) / 100;
          const maxMult =
            spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, spots) : 0;
          const maxWin = stake * maxMult;
          const numbersText =
            spots > 0
              ? slip.selectedNumbers.map((n) => (n < 10 ? `0${n}` : String(n))).join('  ')
              : 'Select numbers on the board';

          return (
            <View key={slip.id} style={[styles.row, isActive && styles.rowActive]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setActiveSlip(slip.id)}
                style={styles.rowMain}
              >
                <View style={styles.rowTop}>
                  <Text style={[styles.slipLabel, isActive && styles.slipLabelActive]}>
                    Slip {idx + 1}
                    {isActive ? ' · editing' : ''}
                  </Text>
                  {spots > 0 && (
                    <Text style={styles.spotsTag}>{spots} spot{spots !== 1 ? 's' : ''}</Text>
                  )}
                </View>

                <Text style={styles.numbersLine} numberOfLines={2}>
                  {numbersText}
                </Text>

                {spots > 0 && (
                  <Text style={styles.winLine}>Max win ${fmt(maxWin)}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.stakeCol}>
                <Text style={styles.stakeColLabel}>Stake</Text>
                <View style={styles.stakeStepper}>
                  <TouchableOpacity
                    onPress={() => decrementStakeForSlip(slip.id)}
                    style={styles.stepBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stakeAmount}>${fmt(stake)}</Text>
                  <TouchableOpacity
                    onPress={() => incrementStakeForSlip(slip.id)}
                    style={[styles.stepBtn, styles.stepBtnPlus]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 6,
    marginTop: 8,
    gap: 6,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  rowActive: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    paddingLeft: 8,
  },
  rowMain: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slipLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  slipLabelActive: {
    color: '#F59E0B',
  },
  spotsTag: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
  },
  numbersLine: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  winLine: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '700',
  },
  stakeCol: {
    alignItems: 'center',
    gap: 4,
  },
  stakeColLabel: {
    color: '#475569',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stakeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnPlus: {
    backgroundColor: '#92400E',
    borderColor: '#D97706',
  },
  stepBtnText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  stakeAmount: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 52,
    textAlign: 'center',
  },
  addSlipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  addSlipText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
});
