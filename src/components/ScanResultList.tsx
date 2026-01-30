/**
 * CarbonSense AR - Scan Result List Component
 * 
 * Displays a list of analyzed objects from a scan with total carbon summary.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnalyzedObject } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

/**
 * Props for ScanResultList component
 */
interface ScanResultListProps {
  /** Array of analyzed objects */
  objects: AnalyzedObject[];
  /** Optional title for the list */
  title?: string;
  /** Whether to show the total summary */
  showTotal?: boolean;
  /** Optional custom styles */
  style?: ViewStyle;
  /** Callback when user wants to remove an item (enables edit mode) */
  onRemoveItem?: (objectId: string) => void;
  /** Whether items can be removed */
  editable?: boolean;
}

/**
 * Calculate total carbon from objects
 */
const calculateTotal = (objects: AnalyzedObject[]): number => {
  return objects.reduce((sum, obj) => sum + obj.carbonKg, 0);
};

/**
 * Format total carbon for display
 */
const formatTotalCarbon = (kg: number): string => {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} tonnes CO₂e`;
  }
  if (kg >= 1) {
    return `${kg.toFixed(2)} kg CO₂e`;
  }
  return `${(kg * 1000).toFixed(0)} g CO₂e`;
};

/**
 * Format individual carbon for display
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
 * Get overall severity based on total carbon
 */
const getOverallSeverity = (totalKg: number): 'low' | 'medium' | 'high' => {
  if (totalKg < 50) return 'low';
  if (totalKg < 300) return 'medium';
  return 'high';
};

/**
 * Get severity color
 */
const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
  switch (severity) {
    case 'low': return Colors.carbonLow;
    case 'medium': return Colors.carbonMedium;
    case 'high': return Colors.carbonHigh;
  }
};

/**
 * ScanResultList Component
 * 
 * Displays scan results with visual feedback and carbon summary.
 */
export function ScanResultList({
  objects,
  title = 'Detected Objects',
  showTotal = true,
  style,
  onRemoveItem,
  editable = false,
}: ScanResultListProps) {
  const totalCarbon = calculateTotal(objects);
  const severity = getOverallSeverity(totalCarbon);
  
  /**
   * Handle remove item with confirmation
   */
  const handleRemoveItem = (item: AnalyzedObject) => {
    if (!onRemoveItem) return;
    
    Alert.alert(
      'Remove Item',
      `Remove "${item.name}" from this scan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onRemoveItem(item.id)
        },
      ]
    );
  };
  
  const severityColors = {
    low: Colors.carbonLow,
    medium: Colors.carbonMedium,
    high: Colors.carbonHigh,
  };
  
  if (objects.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Ionicons name="scan-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>No objects detected</Text>
        <Text style={styles.emptySubtext}>
          Try scanning a scene with visible items
        </Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Total summary at top */}
      {showTotal && (
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <View style={styles.totalLabel}>
              <Ionicons 
                name="analytics" 
                size={20} 
                color={severityColors[severity]} 
              />
              <Text style={styles.totalLabelText}>Total Carbon Footprint</Text>
            </View>
            <Text style={[styles.totalValue, { color: severityColors[severity] }]}>
              {formatTotalCarbon(totalCarbon)}
            </Text>
          </View>
          
          {/* Context bar */}
          <View style={styles.contextBar}>
            <View 
              style={[
                styles.contextFill,
                { 
                  width: `${Math.min(totalCarbon / 5, 100)}%`,
                  backgroundColor: severityColors[severity],
                }
              ]} 
            />
          </View>
          
          <Text style={styles.contextText}>
            {severity === 'low' && "Great! This scan has a relatively low carbon impact."}
            {severity === 'medium' && "Moderate carbon impact. Consider eco-friendly alternatives."}
            {severity === 'high' && "High carbon impact. Focus on reducing or offsetting."}
          </Text>
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{objects.length} items</Text>
        </View>
      </View>
      
      {/* Objects list - scrollable */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.listContent}
        bounces={true}
      >
        {objects.map((object, index) => (
          <View key={object.id} style={styles.itemCard}>
            {/* Severity indicator */}
            <View style={[styles.severityBar, { backgroundColor: getSeverityColor(object.severity) }]} />
            
            <View style={styles.itemContent}>
              {/* Icon and name */}
              <View style={styles.itemHeader}>
                <View style={[styles.itemIcon, { backgroundColor: getSeverityColor(object.severity) + '20' }]}>
                  <Ionicons 
                    name={object.severity === 'low' ? 'leaf' : object.severity === 'medium' ? 'alert-circle' : 'warning'} 
                    size={20} 
                    color={getSeverityColor(object.severity)} 
                  />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{object.name}</Text>
                  {object.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>{object.description}</Text>
                  )}
                </View>
              </View>
              
              {/* Carbon value and remove button */}
              <View style={styles.itemRight}>
                <View style={styles.itemCarbon}>
                  <Text style={[styles.itemCarbonValue, { color: getSeverityColor(object.severity) }]}>
                    {formatCarbon(object.carbonKg)}
                  </Text>
                  <Text style={styles.itemCarbonUnit}>CO₂e</Text>
                </View>
                
                {/* Remove button - only shown when editable */}
                {editable && onRemoveItem && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(object)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.carbonHigh} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
        
        {/* Bottom padding for scrolling */}
        <View style={{ height: Spacing['2xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.base,
  },
  title: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  countText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.base,
  },
  
  // Individual item card
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    flexDirection: 'row',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    minHeight: 72,
  },
  severityBar: {
    width: 5,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  itemHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  itemName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  itemDescription: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 4,
    lineHeight: 18,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCarbon: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  itemCarbonValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  itemCarbonUnit: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  removeButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  
  // Total summary styles
  totalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  totalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabelText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  totalValue: {
    ...TextStyles.h4,
  },
  contextBar: {
    height: 4,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  contextFill: {
    height: '100%',
    borderRadius: 2,
  },
  contextText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  emptyText: {
    ...TextStyles.h5,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...TextStyles.body,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

export default ScanResultList;
