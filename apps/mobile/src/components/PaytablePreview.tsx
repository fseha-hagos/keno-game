import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';

export const PaytablePreview: React.FC = () => {
  const { getActiveSlip } = useGameStore();
  const activeSlip = getActiveSlip();
  const spots = activeSlip?.selectedNumbers?.length ?? 0;
  const stake = activeSlip ? Number(activeSlip.stakeMinor) / 100 : 0;

  if (spots === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Select 1 to 10 numbers to view paytable & payouts</Text>
      </View>
    );
  }

  const rows = [];
  for (let hits = spots; hits >= 0; hits--) {
    const mult = getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, hits);
    if (mult > 0 || hits === spots) {
      const payout = (stake * mult).toFixed(2);
      rows.push({ hits, mult, payout });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>PAYTABLE (SPOTS: {spots})</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        <View style={styles.tableRow}>
          {rows.map((r) => (
            <View key={r.hits} style={styles.cell}>
              <Text style={styles.hitsText}>{r.hits} HITS</Text>
              <Text style={styles.multText}>{r.mult}x</Text>
              <Text style={styles.payoutText}>${r.payout}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyContainer: {
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRtp: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  rowScroll: {
    flexDirection: 'row',
  },
  tableRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hitsText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  multText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '800',
    marginVertical: 2,
  },
  payoutText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
});
