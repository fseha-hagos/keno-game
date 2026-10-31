import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { socketService } from './src/services/socket';
import { View, StatusBar } from 'react-native';
import { Toaster } from 'burnt/web';

export default function App() {
  useEffect(() => {
    // Establish immediate connection with backend on launch
    socketService.connect();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#0A0F1D' }}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
        <Toaster position="top-center" theme="dark" richColors />
      </View>
    </SafeAreaProvider>
  );
}

