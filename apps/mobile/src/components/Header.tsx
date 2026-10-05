import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { socketService } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  roundNumber?: number | string;
}

export const Header: React.FC<HeaderProps> = ({ roundNumber: propRoundNumber }) => {
  const { isAuthenticated } = useAuthStore();
  const { isOnline } = useGameStore();
  const navigation = useNavigation<any>();

  // Balance query when logged in
  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance?currency=ETB');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Current round fallback if not passed directly
  const { data: currentRound } = useQuery({
    queryKey: ['currentRound'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/keno/rounds/current');
      return res.data;
    },
    enabled: !propRoundNumber,
    refetchInterval: 5000,
  });

  const formattedBalance = wallet?.balanceMinor
    ? `${(Number(wallet.balanceMinor) / 100).toFixed(2)}`
    : '0.00';

  const displayRoundNumber = propRoundNumber ?? currentRound?.roundNumber ?? '—';

  return (
    <View style={styles.container}>
      {/* Brand Logo & Online / Offline Flag */}
      <View style={styles.brandRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main')}
          style={styles.logoBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.logoText}>Fast Keno</Text>
        </TouchableOpacity>

        {/* Live status badge */}
        <TouchableOpacity
          style={[styles.statusBadge, isOnline ? styles.statusBadgeOnline : styles.statusBadgeOffline]}
          onPress={() => {
            if (!isOnline) {
              socketService.reconnect();
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
          <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center Capsule Pill: [ 0.00 ETB | ID: 223270 ✔ ] */}
      <View style={styles.pillContainer}>
        {/* Balance Part */}
        <TouchableOpacity
          onPress={() => (isAuthenticated ? navigation.navigate('Wallet') : navigation.navigate('Login'))}
          style={styles.pillBalanceSection}
          activeOpacity={0.7}
        >
          <Text style={styles.balanceAmount}>{formattedBalance}</Text>
          <Text style={styles.balanceCurrency}> ETB</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.pillDivider} />

        {/* Round ID Part */}
        <View style={styles.pillIdSection}>
          <Text style={styles.idLabel}>ID: </Text>
          <Text style={styles.idValue}>{displayRoundNumber}</Text>
        </View>
      </View>

      {/* Right: Hamburger Menu */}
      <TouchableOpacity
        onPress={() => navigation.navigate(isAuthenticated ? 'Profile' : 'Login')}
        style={styles.iconBtn}
        activeOpacity={0.7}
      >
        <View style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F1923',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A38',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBtn: {
    justifyContent: 'center',
  },
  logoText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusBadgeOnline: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22C55E',
  },
  statusBadgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOnline: {
    backgroundColor: '#22C55E',
  },
  statusDotOffline: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusTextOnline: {
    color: '#4ADE80',
  },
  statusTextOffline: {
    color: '#F87171',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C28',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillBalanceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    color: '#FACC15',
    fontSize: 13,
    fontWeight: '900',
  },
  balanceCurrency: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 1,
  },
  pillDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#2A3A4A',
    marginHorizontal: 8,
  },
  pillIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  idValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  iconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburger: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  hamburgerBar: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#CBD5E1',
  },
});
