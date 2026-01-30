/**
 * GreenSense AR - Root Navigator
 * 
 * Bottom tab navigation with 5 tabs:
 * Home, Scan, Journey, Stats, Profile
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, View, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
 * Features: Animated pulse glow, gradient background, premium feel
 */
const ScanTabButton = ({ onPress, accessibilityState }: any) => {
  const focused = accessibilityState?.selected;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    // Subtle pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Glow animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseLoop.start();
    glowLoop.start();
    
    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);
  
  return (
    <TouchableOpacity 
      style={styles.scanButtonContainer}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Outer glow ring */}
      <Animated.View 
        style={[
          styles.scanButtonGlow,
          { 
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          }
        ]} 
      />
      
      {/* Main button with gradient */}
      <Animated.View 
        style={[
          styles.scanButtonOuter,
          focused && styles.scanButtonOuterFocused,
          { transform: [{ scale: focused ? 1.05 : 1 }] }
        ]}
      >
        <LinearGradient
          colors={focused ? ['#14D9A6', '#0D9373', '#087A5E'] : ['#10B981', '#0D9373', '#065F46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scanButtonGradient}
        >
          {/* Inner highlight */}
          <View style={styles.scanButtonInner}>
            <Ionicons 
              name="scan" 
              size={28} 
              color="#FFFFFF" 
            />
          </View>
        </LinearGradient>
      </Animated.View>
      
      {/* Bottom accent line */}
      <View style={styles.scanButtonAccent} />
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
          tabBarLabel: () => null, // Hide label for custom button
          tabBarIcon: () => null,   // Hide icon for custom button
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
    marginTop: -28,
  },
  scanButtonGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    top: 4,
  },
  scanButtonOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  scanButtonOuterFocused: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    shadowOpacity: 0.7,
  },
  scanButtonGradient: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  scanButtonAccent: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
    marginTop: 6,
    opacity: 0.8,
  },
});

export default RootNavigator;
