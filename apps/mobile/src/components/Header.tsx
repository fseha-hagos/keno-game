import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useNavigation } from '@react-navigation/native';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const formattedBalance = wallet?.balanceMinor
    ? `$${(Number(wallet.balanceMinor) / 100).toFixed(2)}`
    : '$0.00';

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>
          {user ? `Welcome, ${user.username}` : 'Guest Spectator'}
        </Text>
        <Text style={user ? styles.kycTag : styles.guestTag}>
          {user ? (user.phone || 'VERIFIED') : '👀 Live Watching'}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {user ? (
          <>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceLabel}>BALANCE</Text>
              <Text style={styles.balanceAmount}>{formattedBalance}</Text>
            </View>

            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Exit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>SIGN IN / PLAY</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  greeting: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  kycTag: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  guestTag: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: '800',
  },
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
});
