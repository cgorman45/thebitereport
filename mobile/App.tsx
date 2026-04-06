import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/AuthProvider';
import TabNavigator from './src/navigation/TabNavigator';

const DarkNavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00d4ff',
    background: '#0a0f1a',
    card: '#0a0f1a',
    text: '#e2e8f0',
    border: '#1e2a42',
    notification: '#f97316',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={DarkNavTheme}>
          <StatusBar style="light" />
          <TabNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
