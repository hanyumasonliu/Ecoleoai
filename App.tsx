/**
 * CarbonSense AR - Main App Entry Point
 * 
 * An AI-powered carbon footprint AR scanner for the Gemini 3 Hackathon.
 * 
 * Point your camera at everyday objects and see an AR overlay of their
 * estimated lifetime carbon footprint.
 * 
 * @author Gemini 3 Hackathon Team
 * @version 1.0.0 MVP
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { HistoryProvider } from './src/context/HistoryContext';
import { Colors } from './src/theme';

/**
 * Custom navigation theme to match app colors
 */
const AppTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundSecondary,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.primary,
  },
};

/**
 * Main App Component
 * 
 * Sets up navigation, global providers, and theme.
 */
export default function App() {
  return (
    <HistoryProvider>
      <NavigationContainer theme={AppTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </HistoryProvider>
  );
}
