import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useGameStore } from '../store/useGameStore';

interface BetBarProps {
  onPlaceBet: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const STAKE_OPTIONS = [
  { label: '$1', value: '100' },
  { label: '$2', value: '200' },
  { label: '$5', value: '500' },
  { label: '$10', value: '1000' },
  { label: '$20', value: '2000' },
  { label: '$50', value: '5000' },
];

export const BetBar = ({ onPlaceBet, isLoading, disabled }: BetBarProps) => {
  const { selectedNumbers, stakeMinor, setStakeMinor, quickPick, clearSelection } =
    useGameStore();

  const spots = selectedNumbers.length;
  const canBet = spots >= 1 && spots <= 10 && !disabled && !isLoading;

  return (
    <View style={styles.container}>
      {/* Quick Pick and Clear Controls */}
      <View style={styles.quickPickRow}>
        <View style={styles.quickPickGroup}>
          <Text style={styles.sectionLabel}>QUICK PICK:</Text>
          <TouchableOpacity onPress={() => quickPick(3)} style={styles.qpButton}>
            <Text style={styles.qpText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => quickPick(5)} style={styles.qpButton}>
            <Text style={styles.qpText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => quickPick(7)} style={styles.qpButton}>
            <Text style={styles.qpText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => quickPick(10)} style={styles.qpButton}>
            <Text style={styles.qpText}>10</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Stake Selector Chips */}
      <View style={styles.stakeRow}>
        {STAKE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setStakeMinor(opt.value)}
            style={[
              styles.stakeChip,
              stakeMinor === opt.value && styles.stakeChipActive,
            ]}
          >
            <Text
              style={[
                styles.stakeChipText,
                stakeMinor === opt.value && styles.stakeChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Action Button */}
      <TouchableOpacity
        onPress={onPlaceBet}
        disabled={!canBet}
        style={[styles.betButton, !canBet && styles.betButtonDisabled]}
      >
        {isLoading ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <View style={styles.betButtonContent}>
            <Text style={styles.betButtonText}>
              PLACE BET (${(Number(stakeMinor) / 100).toFixed(2)})
            </Text>
            <Text style={styles.spotsCountText}>
              {spots}/10 SPOTS SELECTED
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  quickPickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickPickGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  qpButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  qpText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  clearButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  clearText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  stakeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stakeChip: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stakeChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#FCD34D',
  },
  stakeChipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  stakeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  betButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  betButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  betButtonContent: {
    alignItems: 'center',
  },
  betButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  spotsCountText: {
    color: '#451A03',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
