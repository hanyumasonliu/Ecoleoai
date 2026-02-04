/**
 * Carbon Tracer AR - Main App Entry Point
 * 
 * An AI-powered greenhouse gas tracker for the Gemini 3 Hackathon.
 * 
 * Track your daily carbon footprint by scanning products, logging meals,
 * transport, and energy usage.
 * 
 * @author Gemini 3 Hackathon Team
 * @version 2.0.0
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { HistoryProvider } from './src/context/HistoryContext';
import { CarbonProvider } from './src/context/CarbonContext';
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
      <CarbonProvider>
        <NavigationContainer theme={AppTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </CarbonProvider>
    </HistoryProvider>
  );
}
