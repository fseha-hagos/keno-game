import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export const SplashScreen = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KENO PRO</Text>
      <Text style={styles.subtitle}>CERTIFIED REAL-MONEY GAMING</Text>
      <ActivityIndicator size="large" color="#F59E0B" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F59E0B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  loader: {
    marginTop: 40,
  },
});
