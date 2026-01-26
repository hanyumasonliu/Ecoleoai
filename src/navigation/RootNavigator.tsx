/**
 * CarbonSense AR - Root Navigator
 * 
 * Bottom tab navigation for the main app screens.
 */

import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ScanScreen, HistoryScreen, CoachScreen, ProfileScreen } from '../screens';
import { Colors, Layout } from '../theme';

/**
 * Type definitions for tab navigator
 */
export type RootTabParamList = {
  Scan: undefined;
  History: undefined;
  Coach: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Tab bar icon component
 */
interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
  route: keyof RootTabParamList;
}

const getTabIcon = ({ route, focused }: TabIconProps): keyof typeof Ionicons.glyphMap => {
  switch (route) {
    case 'Scan':
      return focused ? 'scan' : 'scan-outline';
    case 'History':
      return focused ? 'time' : 'time-outline';
    case 'Coach':
      return focused ? 'sparkles' : 'sparkles-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse-outline';
  }
};

/**
 * RootNavigator Component
 * 
 * Main bottom tab navigation with 4 tabs: Scan, History, Coach, Profile.
 */
export function RootNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Scan"
      screenOptions={({ route }) => ({
        // Hide header - each screen handles its own header
        headerShown: false,
        
        // Tab bar styling
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        
        // Tab bar icons
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon({ 
            route: route.name as keyof RootTabParamList, 
            focused, 
            color, 
            size 
          });
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{
          tabBarLabel: 'Scan',
        }}
      />
      
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
      
      <Tab.Screen 
        name="Coach" 
        component={CoachScreen}
        options={{
          tabBarLabel: 'Coach',
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Layout.bottomTabHeight,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default RootNavigator;

