import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProgressProvider } from './src/state/ProgressContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProgressProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </ProgressProvider>
    </SafeAreaProvider>
  );
}
