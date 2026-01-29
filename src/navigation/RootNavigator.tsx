/**
 * GreenSense AR - Root Navigator
 * 
 * Bottom tab navigation with 5 tabs:
 * Home, Scan, Journey, Stats, Profile
 */

import React from 'react';
import { StyleSheet, Platform, View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { 
  HomeScreen, 
  ScanScreen, 
  JourneyScreen, 
  StatsScreen, 
  ProfileScreen 
} from '../screens';
import { Colors, Layout } from '../theme';

/**
 * Type definitions for tab navigator
 */
export type RootTabParamList = {
  Home: undefined;
  Scan: undefined;
  Journey: undefined;
  Stats: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Get tab icon based on route
 */
const getTabIcon = (
  route: keyof RootTabParamList, 
  focused: boolean
): keyof typeof Ionicons.glyphMap => {
  switch (route) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Scan':
      return focused ? 'scan' : 'scan-outline';
    case 'Journey':
      return focused ? 'calendar' : 'calendar-outline';
    case 'Stats':
      return focused ? 'stats-chart' : 'stats-chart-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse-outline';
  }
};

/**
 * Custom Scan button (center tab with special styling)
 */
const ScanTabButton = ({ children, onPress, accessibilityState }: any) => {
  const focused = accessibilityState?.selected;
  
  return (
    <TouchableOpacity 
      style={styles.scanButtonContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.scanButton, focused && styles.scanButtonFocused]}>
        {children}
      </View>
    </TouchableOpacity>
  );
};

/**
 * RootNavigator Component
 * 
 * Main bottom tab navigation with 5 tabs.
 */
export function RootNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name as keyof RootTabParamList, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      
      <Tab.Screen 
        name="Journey" 
        component={JourneyScreen}
        options={{
          tabBarLabel: 'Journey',
        }}
      />
      
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />
      
      <Tab.Screen 
        name="Stats" 
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
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
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  scanButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonFocused: {
    backgroundColor: Colors.primaryLight,
  },
});

export default RootNavigator;
