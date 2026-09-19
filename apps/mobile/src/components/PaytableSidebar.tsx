import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';
import { KENO_COLORS } from '../theme/kenoTheme';

export const PaytableSidebar = () => {
  const { getActiveSlip } = useGameStore();
  const activeSlip = getActiveSlip();
  const spots = activeSlip.selectedNumbers.length;
  const stake = Number(activeSlip.stakeMinor) / 100;

  if (spots === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Pick numbers to view paytable</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PAYTABLE</Text>
        <View style={styles.spotBadge}>
          <Text style={styles.spotNumber}>{spots}</Text>
          <Text style={styles.spotLabel}>SPOT</Text>
        </View>
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
              <Text style={[styles.hits, isMax && styles.hitsMax]}>{r.hits}</Text>
              <Text style={styles.hitsLabel}>hit{r.hits !== 1 ? 's' : ''}</Text>
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: KENO_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: KENO_COLORS.textOnOrange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  spotBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: KENO_COLORS.badgeGold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spotNumber: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '900',
  },
  spotLabel: {
    color: '#5C4A0A',
    fontSize: 8,
    fontWeight: '900',
  },
  list: {
    gap: 6,
    paddingRight: 4,
  },
  card: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 64,
  },
  cardMax: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderColor: KENO_COLORS.drawLabel,
  },
  hits: {
    color: KENO_COLORS.textOnOrange,
    fontSize: 16,
    fontWeight: '900',
  },
  hitsMax: {
    color: KENO_COLORS.drawLabel,
  },
  hitsLabel: {
    color: KENO_COLORS.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  mult: {
    color: KENO_COLORS.ballYellow,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  multMax: {
    color: KENO_COLORS.ballYellowBright,
  },
  pay: {
    color: KENO_COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  payMax: {
    color: KENO_COLORS.drawLabel,
  },
});
