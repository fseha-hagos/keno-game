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
        colors={['#FF0000', '#CC0000', '#990000']}
        start={KENO_GRADIENT_VERTICAL.start}
        end={KENO_GRADIENT_VERTICAL.end}
        style={styles.stageFrame}
      >
        <KenoGradient
          colors={['#FF0000', '#B30000']}
          start={KENO_GRADIENT_VERTICAL.start}
          end={KENO_GRADIENT_VERTICAL.end}
          style={styles.stageInner}
        >
          {/* Top Bar with balanced top/bottom padding */}
          <View style={styles.topBar}>
            <View style={styles.drawTitleRow}>
              <Text style={styles.drawHeaderLabel}>DRAW </Text>
              <Text style={styles.drawHeaderNumber}>{roundNumber ?? '197'}</Text>
            </View>

            <View style={styles.spotBadge}>
              <Text style={styles.spotBadgeText}>
                {spots > 0 ? `${spots} SPOTS` : 'HEADS'}
              </Text>
            </View>

            {spots > 0 && (
              <TouchableOpacity
                onPress={clearSelection}
                style={styles.clearBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.clearText}>Clear picks</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Main Content Area with clear horizontal separation */}
          <View style={styles.mainRow}>
            <View style={styles.gridColumn}>
              <KenoGrid />
            </View>

            <View style={styles.machineColumn}>
              <KenoDrawDisplay timeLeft={timeLeft} bettingOpen={bettingOpen} />
            </View>
          </View>

          {/* Bottom Footer Row */}
          <View style={styles.footerRow}>
            <Text style={styles.title}>KENO</Text>
            <Text style={styles.footerHint}>
              {bettingOpen && timeLeft > 0 ? `${timeLeft}s until draw` : ''}
            </Text>
          </View>
        </KenoGradient>
      </KenoGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  stageOuter: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  stageFrame: {
    flex: 1,
    padding: 0,
  },
  stageInner: {
    flex: 1,
    paddingHorizontal: 16, // Extra horizontal padding to prevent machine clipping
    paddingTop: 14,        // Gives room for vertical tube & header text
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 40,      // Reserves space so "Clear picks" doesn't overlap the "0/20" counter
    zIndex: 10,
  },
  drawTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  drawHeaderLabel: {
    color: '#CCFF00',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  drawHeaderNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  spotBadge: {
    backgroundColor: '#CCFF00',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  spotBadgeText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  clearBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  gridColumn: {
    flex: 1,
    paddingRight: 16, // Prevents grid numbers from touching machine clamps
  },
  machineColumn: {
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,  // Ensures tube has space to render fully without clipping
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
});