import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import * as SystemUI from 'expo-system-ui';

// Force light background for all system UI (affects image picker crop screen)
SystemUI.setBackgroundColorAsync('#ffffff');

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
