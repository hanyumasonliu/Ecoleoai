/**
 * CarbonSense AR - Carbon Badge Component
 * 
 * Displays an object's name and carbon footprint with severity color coding.
 * Used in scan results and history details.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CarbonSeverity } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

/**
 * Props for CarbonBadge component
 */
interface CarbonBadgeProps {
  /** Name of the object */
  name: string;
  /** Carbon footprint in kg CO₂e */
  carbonKg: number;
  /** Severity level for color coding */
  severity: CarbonSeverity;
  /** Optional description */
  description?: string;
  /** Optional custom styles */
  style?: ViewStyle;
  /** Whether to show the full card or compact badge */
  variant?: 'card' | 'badge' | 'minimal';
  /** Animation delay for staggered entrance */
  animationDelay?: number;
}

/**
 * Get colors based on severity
 */
const getSeverityColors = (severity: CarbonSeverity) => {
  switch (severity) {
    case 'low':
      return {
        background: Colors.carbonLowBg,
        accent: Colors.carbonLow,
        icon: 'leaf' as const,
      };
    case 'medium':
      return {
        background: Colors.carbonMediumBg,
        accent: Colors.carbonMedium,
        icon: 'alert-circle' as const,
      };
    case 'high':
      return {
        background: Colors.carbonHighBg,
        accent: Colors.carbonHigh,
        icon: 'warning' as const,
      };
  }
};

/**
 * Format carbon value for display
 */
const formatCarbon = (kg: number): { value: string; unit: string } => {
  if (kg >= 1000) {
    return { value: (kg / 1000).toFixed(1), unit: 't CO₂e' };
  }
  if (kg >= 1) {
    return { value: kg.toFixed(1), unit: 'kg CO₂e' };
  }
  return { value: (kg * 1000).toFixed(0), unit: 'g CO₂e' };
};

/**
 * CarbonBadge Component
 * 
 * Displays carbon footprint information with visual severity indicators.
 */
export function CarbonBadge({
  name,
  carbonKg,
  severity,
  description,
  style,
  variant = 'card',
  animationDelay = 0,
}: CarbonBadgeProps) {
  const colors = getSeverityColors(severity);
  const carbon = formatCarbon(carbonKg);
  
  // Animation value
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, animationDelay]);
  
  if (variant === 'minimal') {
    return (
      <View style={[styles.minimal, style]}>
        <View style={[styles.minimalDot, { backgroundColor: colors.accent }]} />
        <Text style={styles.minimalName} numberOfLines={1}>{name}</Text>
        <Text style={[styles.minimalValue, { color: colors.accent }]}>
          {carbon.value} {carbon.unit}
        </Text>
      </View>
    );
  }
  
  if (variant === 'badge') {
    return (
      <Animated.View
        style={[
          styles.badge,
          { backgroundColor: colors.background, borderColor: colors.accent },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          style,
        ]}
      >
        <Ionicons name={colors.icon} size={14} color={colors.accent} />
        <Text style={styles.badgeName} numberOfLines={1}>{name}</Text>
        <Text style={[styles.badgeValue, { color: colors.accent }]}>
          {carbon.value}
        </Text>
      </Animated.View>
    );
  }
  
  // Default: card variant
  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        style,
      ]}
    >
      {/* Severity indicator bar */}
      <View style={[styles.severityBar, { backgroundColor: colors.accent }]} />
      
      <View style={styles.cardContent}>
        {/* Header with name and icon */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
            <Ionicons name={colors.icon} size={20} color={colors.accent} />
          </View>
          <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
        </View>
        
        {/* Carbon value */}
        <View style={styles.carbonContainer}>
          <Text style={[styles.carbonValue, { color: colors.accent }]}>
            {carbon.value}
          </Text>
          <Text style={styles.carbonUnit}>{carbon.unit}</Text>
        </View>
        
        {/* Description if provided */}
        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Card variant styles
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  severityBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardName: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    flex: 1,
  },
  carbonContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  carbonValue: {
    ...TextStyles.carbonValue,
    marginRight: Spacing.xs,
  },
  carbonUnit: {
    ...TextStyles.carbonUnit,
    color: Colors.textSecondary,
  },
  description: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  
  // Badge variant styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  badgeName: {
    ...TextStyles.bodySmall,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.sm,
    maxWidth: 100,
  },
  badgeValue: {
    ...TextStyles.label,
    fontWeight: '600',
  },
  
  // Minimal variant styles
  minimal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  minimalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  minimalName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  minimalValue: {
    ...TextStyles.bodySmall,
    fontWeight: '600',
  },
});

export default CarbonBadge;

