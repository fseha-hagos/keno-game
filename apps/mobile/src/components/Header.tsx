import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useNavigation } from '@react-navigation/native';

export const Header = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigation = useNavigation<any>();

  const { data: wallet } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/wallet/balance?currency=ETB');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const formattedBalance = wallet?.balanceMinor
    ? `${(Number(wallet.balanceMinor) / 100).toFixed(2)} ETB`
    : '0.00 ETB';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Main')}
        style={styles.brandRow}
        activeOpacity={0.8}
      >
        <Text style={styles.brandLogo}>🎯</Text>
        <Text style={styles.brandTitle}>
          KENO<Text style={styles.brandTitleAccent}>LIVE</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.rightSection}>
        {isAuthenticated ? (
          <>
            <TouchableOpacity
              onPress={() => navigation.navigate('Wallet')}
              style={styles.balanceBadge}
              activeOpacity={0.7}
            >
              <Text style={styles.balanceLabel}>BALANCE</Text>
              <Text style={styles.balanceAmount}>{formattedBalance}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileAvatarButton}
              activeOpacity={0.7}
            >
              <Text style={styles.profileEmoji}>👤</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
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
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    fontSize: 20,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandTitleAccent: {
    color: '#10B981',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
  },
  profileAvatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmoji: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
});
