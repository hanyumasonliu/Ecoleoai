/**
 * CarbonSense AR - History Item Component
 * 
 * Displays a single scan history entry with summary information.
 * Tappable to view full details.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanRecord } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

/**
 * Props for HistoryItem component
 */
interface HistoryItemProps {
  /** The scan record to display */
  scan: ScanRecord;
  /** Callback when item is pressed */
  onPress?: (scan: ScanRecord) => void;
  /** Optional custom styles */
  style?: ViewStyle;
}

/**
 * Format date for display
 */
const formatDate = (isoString: string): { date: string; time: string } => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let dateStr: string;
  if (diffDays === 0) {
    dateStr = 'Today';
  } else if (diffDays === 1) {
    dateStr = 'Yesterday';
  } else if (diffDays < 7) {
    dateStr = `${diffDays} days ago`;
  } else {
    dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  return { date: dateStr, time: timeStr };
};

/**
 * Format carbon value
 */
const formatCarbon = (kg: number): string => {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  if (kg >= 1) {
    return `${kg.toFixed(1)}kg`;
  }
  return `${(kg * 1000).toFixed(0)}g`;
};

/**
 * Get overall severity color
 */
const getSeverityColor = (totalKg: number): string => {
  if (totalKg < 50) return Colors.carbonLow;
  if (totalKg < 300) return Colors.carbonMedium;
  return Colors.carbonHigh;
};

/**
 * HistoryItem Component
 * 
 * A tappable card showing scan summary with date, object count, and total carbon.
 */
export function HistoryItem({ scan, onPress, style }: HistoryItemProps) {
  const { date, time } = formatDate(scan.timestamp);
  const severityColor = getSeverityColor(scan.totalCarbonKg);
  
  // Get top 3 object names for preview
  const objectPreview = scan.objects
    .slice(0, 3)
    .map(obj => obj.name)
    .join(', ');
  const moreCount = scan.objects.length - 3;
  
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(scan)}
      activeOpacity={0.7}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: severityColor }]} />
      
      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Text style={styles.date}>{date}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          
          <View style={styles.carbonBadge}>
            <Ionicons name="leaf" size={14} color={severityColor} />
            <Text style={[styles.carbonValue, { color: severityColor }]}>
              {formatCarbon(scan.totalCarbonKg)} CO₂e
            </Text>
          </View>
        </View>
        
        {/* Objects preview */}
        <View style={styles.previewContainer}>
          <Ionicons name="cube-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.previewText} numberOfLines={1}>
            {objectPreview}
            {moreCount > 0 && ` +${moreCount} more`}
          </Text>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{scan.objects.length}</Text>
            <Text style={styles.statLabel}>objects</Text>
          </View>
          
          {/* Severity distribution mini-chart */}
          <View style={styles.severityChart}>
            {['low', 'medium', 'high'].map((sev) => {
              const count = scan.objects.filter(obj => obj.severity === sev).length;
              const color = sev === 'low' ? Colors.carbonLow : 
                           sev === 'medium' ? Colors.carbonMedium : Colors.carbonHigh;
              return count > 0 ? (
                <View key={sev} style={styles.severityDot}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.dotCount}>{count}</Text>
                </View>
              ) : null;
            })}
          </View>
          
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={Colors.textTertiary} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  time: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  carbonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  carbonValue: {
    ...TextStyles.label,
    marginLeft: Spacing.xs,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  previewText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  statLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  severityChart: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  severityDot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  dotCount: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
});

export default HistoryItem;

