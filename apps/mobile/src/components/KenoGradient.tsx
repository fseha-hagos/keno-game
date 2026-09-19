import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ColorValue, StyleProp, ViewStyle } from 'react-native';

interface KenoGradientProps {
  colors: readonly [ColorValue, ColorValue, ...ColorValue[]];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** 0–1, default top-left → bottom-right */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const KenoGradient = ({
  colors,
  style,
  children,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}: KenoGradientProps) => (
  <LinearGradient colors={colors} start={start} end={end} style={style}>
    {children}
  </LinearGradient>
);
