import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { KenoDrawDisplay } from './KenoDrawDisplay';
import { KenoGrid } from './KenoGrid';
import { KenoGradient } from './KenoGradient';
import { useGameStore } from '../store/useGameStore';
import { KENO_COLORS, KENO_GRADIENTS, KENO_GRADIENT_VERTICAL } from '../theme/kenoTheme';

interface KenoPlayStageProps {
  roundNumber?: number | string;
  timeLeft?: number;
  bettingOpen?: boolean;
}

export const KenoPlayStage = ({
  roundNumber,
  timeLeft = 0,
  bettingOpen = false,
}: KenoPlayStageProps) => {
  const { getActiveSlip, clearSelection } = useGameStore();
  const spots = getActiveSlip().selectedNumbers.length;

  return (
    <View style={styles.stageOuter}>
      <KenoGradient
        colors={KENO_GRADIENTS.stageFrame}
        start={KENO_GRADIENT_VERTICAL.start}
        end={KENO_GRADIENT_VERTICAL.end}
        style={styles.stageFrame}
      >
        <KenoGradient
          colors={KENO_GRADIENTS.stage}
          start={KENO_GRADIENT_VERTICAL.start}
          end={KENO_GRADIENT_VERTICAL.end}
          style={styles.stageInner}
        >
          <View style={styles.topBar}>
            <View style={styles.spotBadge}>
              <Text style={styles.spotBadgeText}>
                {spots > 0 ? `${spots} SPOT${spots !== 1 ? 'S' : ''}` : 'TAP TO PICK'}
              </Text>
            </View>
            <Text style={styles.title}>KENO</Text>
          </View>

          <View style={styles.mainRow}>
            <KenoDrawDisplay timeLeft={timeLeft} bettingOpen={bettingOpen} />

            <View style={styles.gridColumn}>
              {spots > 0 && (
                <TouchableOpacity
                  onPress={clearSelection}
                  style={styles.clearBtn}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearText}>Clear picks</Text>
                </TouchableOpacity>
              )}
              <KenoGrid />
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>
              {bettingOpen && timeLeft > 0 ? `${timeLeft}s until draw` : ' '}
            </Text>
            <Text style={styles.drawLabel}>DRAW {roundNumber ?? '…'}</Text>
          </View>
        </KenoGradient>
      </KenoGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  stageOuter: {
    marginHorizontal: 8,
    marginTop: 8,
  },
  stageFrame: {
    borderRadius: 12,
    padding: 2,
  },
  stageInner: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  title: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 3,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  gridColumn: {
    flex: 1,
    minWidth: 0,
  },
  spotBadge: {
    backgroundColor: KENO_COLORS.badgeGold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  spotBadgeText: {
    color: '#1A0505',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  clearBtn: {
    alignSelf: 'flex-end',
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearText: {
    color: KENO_COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  footerHint: {
    color: KENO_COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  drawLabel: {
    color: KENO_COLORS.drawLabel,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
