import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/useAuthStore';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { KenoGameScreen } from '../screens/KenoGameScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { BetHistoryScreen } from '../screens/BetHistoryScreen';
import { ResponsibleGamblingScreen } from '../screens/ResponsibleGamblingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const customTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0F1D',
    card: '#0F172A',
    text: '#F8FAFC',
    border: '#1E293B',
    primary: '#10B981',
  },
};

const Stack = createNativeStackNavigator();

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
        <Stack.Screen name="Main" component={KenoGameScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerShown: true,
            title: 'My Profile',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '800' },
          }}
        />
        <Stack.Screen
          name="Wallet"
          component={WalletScreen}
          options={{
            headerShown: true,
            title: 'Wallet & Deposits',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '800' },
          }}
        />
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
