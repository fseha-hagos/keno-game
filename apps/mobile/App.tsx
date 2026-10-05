import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { socketService } from './src/services/socket';
import { View, StatusBar } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2000,
    },
  },
});

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
      </View>
    </SafeAreaProvider>
  );
}
