/**
 * GreenSense AR - Item Detail Screen
 * 
 * Full analysis view for a scanned item showing:
 * - Item info with quantity adjuster
 * - Total carbon footprint
 * - Eco Score
 * - Lifecycle breakdown (Manufacturing, Transport, Usage, Disposal)
 * - Environmental impact warnings
 * - Greener alternatives
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuantitySelector } from '../components';
import { AnalyzedObject } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

interface ItemDetailScreenProps {
  item: AnalyzedObject;
  onClose: () => void;
  onAddToLog?: (item: AnalyzedObject, quantity: number) => void;
}

/**
 * Calculate lifecycle breakdown based on item category
 */
const calculateLifecycle = (carbonKg: number, itemName: string) => {
  // Different categories have different lifecycle profiles
  const isElectronics = /laptop|phone|tablet|monitor|headphones|watch/i.test(itemName);
  const isClothing = /shirt|jeans|hoodie|jacket|sneakers|shoes/i.test(itemName);
  const isFood = /bottle|cup|container|food/i.test(itemName);
  const isFurniture = /chair|desk|shelf|table/i.test(itemName);
  
  if (isElectronics) {
    return {
      manufacturing: Math.round(carbonKg * 0.70 * 100) / 100,
      transport: Math.round(carbonKg * 0.05 * 100) / 100,
      usage: Math.round(carbonKg * 0.20 * 100) / 100,
      disposal: Math.round(carbonKg * 0.05 * 100) / 100,
    };
  } else if (isClothing) {
    return {
      manufacturing: Math.round(carbonKg * 0.55 * 100) / 100,
      transport: Math.round(carbonKg * 0.15 * 100) / 100,
      usage: Math.round(carbonKg * 0.25 * 100) / 100,
      disposal: Math.round(carbonKg * 0.05 * 100) / 100,
    };
  } else if (isFood) {
    return {
      manufacturing: Math.round(carbonKg * 0.60 * 100) / 100,
      transport: Math.round(carbonKg * 0.20 * 100) / 100,
      usage: Math.round(carbonKg * 0.05 * 100) / 100,
      disposal: Math.round(carbonKg * 0.15 * 100) / 100,
    };
  } else if (isFurniture) {
    return {
      manufacturing: Math.round(carbonKg * 0.65 * 100) / 100,
      transport: Math.round(carbonKg * 0.20 * 100) / 100,
      usage: Math.round(carbonKg * 0.05 * 100) / 100,
      disposal: Math.round(carbonKg * 0.10 * 100) / 100,
    };
  }
  
  // Default breakdown
  return {
    manufacturing: Math.round(carbonKg * 0.60 * 100) / 100,
    transport: Math.round(carbonKg * 0.15 * 100) / 100,
    usage: Math.round(carbonKg * 0.15 * 100) / 100,
    disposal: Math.round(carbonKg * 0.10 * 100) / 100,
  };
};

/**
 * Calculate eco score (0-100, higher is better)
 */
const calculateEcoScore = (carbonKg: number): number => {
  // Score based on carbon footprint ranges
  if (carbonKg < 1) return 95;
  if (carbonKg < 5) return 85;
  if (carbonKg < 20) return 70;
  if (carbonKg < 50) return 55;
  if (carbonKg < 100) return 40;
  if (carbonKg < 200) return 25;
  return 15;
};

/**
 * Get environmental impact warnings
 */
const getImpactWarnings = (item: AnalyzedObject): string[] => {
  const warnings: string[] = [];
  
  if (item.severity === 'high') {
    warnings.push('High carbon footprint item - consider alternatives');
  }
  
  if (/plastic/i.test(item.name) || /disposable/i.test(item.name)) {
    warnings.push('Single-use item - switch to reusable options');
  }
  
  if (/electronic|laptop|phone/i.test(item.name)) {
    warnings.push('E-waste concern - ensure proper recycling');
  }
  
  if (/leather/i.test(item.name)) {
    warnings.push('Animal-derived material - high environmental impact');
  }
  
  if (/fast fashion|synthetic/i.test(item.description || '')) {
    warnings.push('Synthetic fibers may shed microplastics');
  }
  
  return warnings;
};

/**
 * Get greener alternatives
 */
const getAlternatives = (item: AnalyzedObject): { name: string; carbonKg: number; savings: number }[] => {
  const alternatives: { name: string; carbonKg: number; savings: number }[] = [];
  
  if (/plastic.*bottle/i.test(item.name)) {
    alternatives.push({ 
      name: 'Reusable Water Bottle', 
      carbonKg: 0.5, 
      savings: Math.round((1 - 0.5 / item.carbonKg) * 100)
    });
  }
  
  if (/laptop/i.test(item.name)) {
    alternatives.push({ 
      name: 'Refurbished Laptop', 
      carbonKg: Math.round(item.carbonKg * 0.15), 
      savings: 85 
    });
  }
  
  if (/jeans|clothing/i.test(item.name)) {
    alternatives.push({ 
      name: 'Second-hand Option', 
      carbonKg: Math.round(item.carbonKg * 0.05 * 100) / 100, 
      savings: 95 
    });
  }
  
  if (/disposable.*cup/i.test(item.name)) {
    alternatives.push({ 
      name: 'Reusable Coffee Cup', 
      carbonKg: 0.2, 
      savings: Math.round((1 - 0.2 / Math.max(item.carbonKg, 0.1)) * 100)
    });
  }
  
  // Generic alternative
  if (alternatives.length === 0 && item.carbonKg > 10) {
    alternatives.push({
      name: 'Refurbished/Second-hand',
      carbonKg: Math.round(item.carbonKg * 0.1 * 100) / 100,
      savings: 90,
    });
  }
  
  return alternatives;
};

/**
 * Severity color helper
 */
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'low': return Colors.carbonLow;
    case 'medium': return Colors.carbonMedium;
    case 'high': return Colors.carbonHigh;
    default: return Colors.textSecondary;
  }
};

/**
 * ItemDetailScreen Component
 */
export function ItemDetailScreen({ item, onClose, onAddToLog }: ItemDetailScreenProps) {
  const [quantity, setQuantity] = useState(1);
  
  const totalCarbon = useMemo(() => item.carbonKg * quantity, [item.carbonKg, quantity]);
  const lifecycle = useMemo(() => calculateLifecycle(totalCarbon, item.name), [totalCarbon, item.name]);
  const ecoScore = useMemo(() => calculateEcoScore(item.carbonKg), [item.carbonKg]);
  const warnings = useMemo(() => getImpactWarnings(item), [item]);
  const alternatives = useMemo(() => getAlternatives(item), [item]);
  
  const severityColor = getSeverityColor(item.severity);
  
  const handleAddToLog = () => {
    if (onAddToLog) {
      onAddToLog(item, quantity);
    }
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <View style={styles.backButton} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Header */}
        <View style={styles.itemHeader}>
          <View style={[styles.itemIcon, { backgroundColor: severityColor + '20' }]}>
            <Ionicons name="cube" size={32} color={severityColor} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
          </View>
        </View>
        
        {/* Quantity Selector */}
        <View style={styles.quantitySection}>
          <Text style={styles.sectionLabel}>Quantity</Text>
          <QuantitySelector
            quantity={quantity}
            onQuantityChange={setQuantity}
            min={1}
            max={99}
          />
        </View>
        
        {/* Total Carbon Display */}
        <View style={styles.carbonCard}>
          <View style={styles.carbonMain}>
            <Text style={[styles.carbonValue, { color: severityColor }]}>
              {totalCarbon >= 1 ? totalCarbon.toFixed(1) : totalCarbon.toFixed(2)}
            </Text>
            <Text style={styles.carbonUnit}>kg CO₂e</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} Impact
            </Text>
          </View>
        </View>
        
        {/* Eco Score */}
        <View style={styles.ecoScoreCard}>
          <View style={styles.ecoScoreHeader}>
            <Ionicons name="leaf" size={20} color={Colors.primary} />
            <Text style={styles.ecoScoreTitle}>Eco Score</Text>
          </View>
          <View style={styles.ecoScoreDisplay}>
            <View style={styles.ecoScoreCircle}>
              <Text style={[
                styles.ecoScoreValue,
                { color: ecoScore >= 70 ? Colors.carbonLow : ecoScore >= 40 ? Colors.carbonMedium : Colors.carbonHigh }
              ]}>
                {ecoScore}
              </Text>
            </View>
            <View style={styles.ecoScoreBar}>
              <View 
                style={[
                  styles.ecoScoreFill,
                  { 
                    width: `${ecoScore}%`,
                    backgroundColor: ecoScore >= 70 ? Colors.carbonLow : ecoScore >= 40 ? Colors.carbonMedium : Colors.carbonHigh,
                  }
                ]} 
              />
            </View>
            <Text style={styles.ecoScoreLabel}>
              {ecoScore >= 70 ? 'Excellent' : ecoScore >= 40 ? 'Moderate' : 'Poor'}
            </Text>
          </View>
        </View>
        
        {/* Lifecycle Breakdown */}
        <View style={styles.lifecycleCard}>
          <Text style={styles.cardTitle}>Lifecycle Breakdown</Text>
          
          <View style={styles.lifecycleItem}>
            <View style={styles.lifecycleIcon}>
              <Ionicons name="construct-outline" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.lifecycleName}>Manufacturing</Text>
            <Text style={styles.lifecycleValue}>{lifecycle.manufacturing.toFixed(1)} kg</Text>
          </View>
          
          <View style={styles.lifecycleItem}>
            <View style={styles.lifecycleIcon}>
              <Ionicons name="airplane-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.lifecycleName}>Transport</Text>
            <Text style={styles.lifecycleValue}>{lifecycle.transport.toFixed(1)} kg</Text>
          </View>
          
          <View style={styles.lifecycleItem}>
            <View style={styles.lifecycleIcon}>
              <Ionicons name="flash-outline" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.lifecycleName}>Usage</Text>
            <Text style={styles.lifecycleValue}>{lifecycle.usage.toFixed(1)} kg</Text>
          </View>
          
          <View style={styles.lifecycleItem}>
            <View style={styles.lifecycleIcon}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <Text style={styles.lifecycleName}>Disposal</Text>
            <Text style={styles.lifecycleValue}>{lifecycle.disposal.toFixed(1)} kg</Text>
          </View>
        </View>
        
        {/* Environmental Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsCard}>
            <View style={styles.warningsHeader}>
              <Ionicons name="warning" size={20} color={Colors.carbonMedium} />
              <Text style={styles.warningsTitle}>Environmental Impact</Text>
            </View>
            {warnings.map((warning, index) => (
              <View key={index} style={styles.warningItem}>
                <Ionicons name="alert-circle" size={14} color={Colors.carbonMedium} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Greener Alternatives */}
        {alternatives.length > 0 && (
          <View style={styles.alternativesCard}>
            <View style={styles.alternativesHeader}>
              <Ionicons name="sparkles" size={20} color={Colors.carbonLow} />
              <Text style={styles.alternativesTitle}>Greener Alternatives</Text>
            </View>
            {alternatives.map((alt, index) => (
              <View key={index} style={styles.alternativeItem}>
                <View style={styles.alternativeInfo}>
                  <Text style={styles.alternativeName}>{alt.name}</Text>
                  <Text style={styles.alternativeCarbon}>{alt.carbonKg.toFixed(1)} kg CO₂e</Text>
                </View>
                <View style={styles.savingsBadge}>
                  <Ionicons name="trending-down" size={12} color={Colors.carbonLow} />
                  <Text style={styles.savingsText}>{alt.savings}% less</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Action Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddToLog}>
          <Ionicons name="add-circle" size={22} color={Colors.white} />
          <Text style={styles.addButtonText}>Add to Today's Log</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  
  // Item header
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  itemIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  itemDescription: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  
  // Quantity
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  
  // Carbon card
  carbonCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  carbonMain: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  carbonValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  carbonUnit: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  severityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  severityText: {
    ...TextStyles.bodySmall,
    fontWeight: '600',
  },
  
  // Eco score
  ecoScoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  ecoScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ecoScoreTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  ecoScoreDisplay: {
    alignItems: 'center',
  },
  ecoScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  ecoScoreValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  ecoScoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 4,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  ecoScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  ecoScoreLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  
  // Lifecycle
  lifecycleCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  cardTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  lifecycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lifecycleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  lifecycleName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  lifecycleValue: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  
  // Warnings
  warningsCard: {
    backgroundColor: Colors.carbonMediumBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  warningsTitle: {
    ...TextStyles.h5,
    color: Colors.carbonMedium,
    marginLeft: Spacing.sm,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  warningText: {
    ...TextStyles.bodySmall,
    color: Colors.carbonMedium,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  
  // Alternatives
  alternativesCard: {
    backgroundColor: Colors.carbonLowBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  alternativesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  alternativesTitle: {
    ...TextStyles.h5,
    color: Colors.carbonLow,
    marginLeft: Spacing.sm,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  alternativeCarbon: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonLowBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  savingsText: {
    ...TextStyles.caption,
    color: Colors.carbonLow,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Action bar
  actionBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
  },
  addButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
});

export default ItemDetailScreen;

