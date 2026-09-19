import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuthStore } from '../store/useAuthStore';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { KenoGameScreen } from '../screens/KenoGameScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { BetHistoryScreen } from '../screens/BetHistoryScreen';
import { ResponsibleGamblingScreen } from '../screens/ResponsibleGamblingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DarkTheme } from '@react-navigation/native';

const customTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0F1D',
    card: '#0F172A',
    text: '#F8FAFC',
    border: '#1E293B',
    primary: '#F59E0B',
  },
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: '#0A0F1D' }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="Play"
        component={KenoGameScreen}
        options={{
          tabBarLabel: 'Keno',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎯</Text>,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💳</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={customTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0F1D' },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="History"
          component={BetHistoryScreen}
          options={{
            headerShown: true,
            title: 'Bet History',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '800' },
          }}
        />
        <Stack.Screen
          name="Limits"
          component={ResponsibleGamblingScreen}
          options={{
            headerShown: true,
            title: 'Responsible Gaming Limits',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '800' },
          }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
