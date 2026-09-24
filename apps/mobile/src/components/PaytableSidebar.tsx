import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { KENO_COLORS } from '../theme/kenoTheme';

export const PaytableSidebar = () => {
  const { getActiveSlip } = useGameStore();
  const activeSlip = getActiveSlip();
  const spots = activeSlip?.selectedNumbers?.length ?? 0;
  const stake = activeSlip ? Number(activeSlip.stakeMinor) / 100 : 0;

  if (spots === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyBadgeText}>PAYTABLE</Text>
        </View>
        <Text style={styles.emptyText}>Pick 1–10 numbers to view potential multipliers & payouts</Text>
      </View>
    );
  }

  const rows: { hits: number; mult: number; payout: string }[] = [];
  for (let hits = spots; hits >= 0; hits--) {
    const mult = getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, hits);
    if (mult > 0) {
      rows.push({ hits, mult, payout: (stake * mult).toFixed(2) });
    }
  }

  const maxMult = rows[0]?.mult ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>PAYTABLE</Text>
          <View style={styles.spotBadge}>
            <Text style={styles.spotNumber}>{spots}</Text>
            <Text style={styles.spotLabel}>SPOT{spots > 1 ? 'S' : ''}</Text>
          </View>
        </View>
        {maxMult > 0 && (
          <Text style={styles.maxMultText}>MAX WIN: <Text style={styles.maxMultVal}>{maxMult}×</Text></Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {rows.map((r) => {
          const isMax = r.hits === spots;
          return (
            <View key={r.hits} style={[styles.card, isMax && styles.cardMax]}>
              <Text style={[styles.hits, isMax && styles.hitsMax]}>{r.hits} {r.hits === 1 ? 'hit' : 'hits'}</Text>
              <Text style={[styles.mult, isMax && styles.multMax]}>{r.mult}×</Text>
              <Text style={[styles.pay, isMax && styles.payMax]}>${r.payout}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 8,
  },
  emptyBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  container: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  spotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  spotNumber: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
  },
  spotLabel: {
    color: '#0F172A',
    fontSize: 8,
    fontWeight: '900',
  },
  maxMultText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  maxMultVal: {
    color: '#10B981',
    fontWeight: '900',
  },
  list: {
    gap: 5,
    paddingRight: 2,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 54,
  },
  cardMax: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  hits: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
  },
  hitsMax: {
    color: '#34D399',
  },
  mult: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 1,
  },
  multMax: {
    color: '#FBBF24',
  },
  pay: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  payMax: {
    color: '#34D399',
    fontWeight: '900',
  },
});

