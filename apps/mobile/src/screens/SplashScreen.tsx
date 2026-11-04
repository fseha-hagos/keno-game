import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export const SplashScreen = () => {
  const { checkAuth } = useAuthStore();

  // Pulse animation for the logo
  const pulse = useRef(new Animated.Value(1)).current;
  // Fade-in for the content
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuth();

    // Fade in content
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Infinite pulse on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [checkAuth]);

  return (
    <ImageBackground
      source={require('../../assets/splash.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Dark overlay for legibility */}
      <View style={styles.overlay} />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.logoK}>K</Text>
        </Animated.View>

        {/* Brand name */}
        <Text style={styles.brand}>KENO PRO</Text>
        <Text style={styles.tagline}>CERTIFIED REAL-MONEY GAMING</Text>

        {/* Feature pills */}
        <View style={styles.pills}>
          {['🎯 Pick 1–5', '💰 Instant Wins', '🔒 Secure'].map((label) => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Dots loader */}
        <View style={styles.loader}>
          {[0, 1, 2].map((i) => (
            <BouncingDot key={i} delay={i * 200} />
          ))}
        </View>
      </Animated.View>
    </ImageBackground>
  );
};

const BouncingDot = ({ delay }: { delay: number }) => {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounce, { toValue: -10, duration: 400, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY: bounce }] }]} />
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 15, 29, 0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
  },
  logoK: {
    color: '#0A0F1D',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#F59E0B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
    marginBottom: 28,
  },
  pills: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  loader: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
});
