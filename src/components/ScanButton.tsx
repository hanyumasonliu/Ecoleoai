/**
 * CarbonSense AR - Scan Button Component
 * 
 * A prominent, animated button for triggering camera scans.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

/**
 * Props for ScanButton component
 */
interface ScanButtonProps {
  /** Callback when button is pressed */
  onPress: () => void;
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button label text */
  label?: string;
  /** Optional custom styles */
  style?: ViewStyle;
}

/**
 * ScanButton Component
 * 
 * A visually prominent button with pulsing animation for the scan action.
 */
export function ScanButton({
  onPress,
  isLoading = false,
  disabled = false,
  label = 'Scan Scene',
  style,
}: ScanButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Pulse animation when idle
  useEffect(() => {
    if (!isLoading && !disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading, disabled, pulseAnim]);
  
  // Rotate animation when loading
  useEffect(() => {
    if (isLoading) {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isLoading, rotateAnim]);
  
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <View style={[styles.container, style]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            transform: [{ scale: pulseAnim }],
            opacity: disabled ? 0 : 0.4,
          },
        ]}
      />
      
      {/* Main button */}
      <TouchableOpacity
        style={[
          styles.button,
          disabled && styles.buttonDisabled,
          isLoading && styles.buttonLoading,
        ]}
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            isLoading && { transform: [{ rotate: rotation }] },
          ]}
        >
          <Ionicons
            name={isLoading ? 'sync' : 'scan'}
            size={32}
            color={disabled ? Colors.textTertiary : Colors.white}
          />
        </Animated.View>
        
        <Text
          style={[
            styles.label,
            disabled && styles.labelDisabled,
          ]}
        >
          {isLoading ? 'Analyzing...' : label}
        </Text>
      </TouchableOpacity>
      
      {/* Hint text */}
      {!isLoading && !disabled && (
        <Text style={styles.hint}>
          Point camera at objects and tap to scan
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    opacity: 0.4,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  buttonDisabled: {
    backgroundColor: Colors.backgroundTertiary,
  },
  buttonLoading: {
    backgroundColor: Colors.primaryDark,
  },
  iconContainer: {
    marginBottom: Spacing.xs,
  },
  label: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
    textAlign: 'center',
  },
  labelDisabled: {
    color: Colors.textTertiary,
  },
  hint: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});

export default ScanButton;

