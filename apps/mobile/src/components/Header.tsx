import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  roundNumber?: number | string;
}

export const Header: React.FC<HeaderProps> = ({ roundNumber: propRoundNumber }) => {
  const { isAuthenticated } = useAuthStore();
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
      {/* Brand Logo: Fast Keno */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Main')}
        style={styles.logoBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.logoText}>Fast Keno</Text>
      </TouchableOpacity>

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
