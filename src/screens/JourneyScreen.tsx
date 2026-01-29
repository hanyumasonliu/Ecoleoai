/**
 * GreenSense AR - Journey Screen
 * 
 * Daily and weekly activity log showing carbon emissions by category.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistory } from '../context/HistoryContext';
import { TransportScreen } from './TransportScreen';
import { EnergyScreen } from './EnergyScreen';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

type ViewMode = 'day' | 'week';

/**
 * JourneyScreen Component
 * 
 * Shows daily/weekly carbon activity log grouped by category.
 */
export function JourneyScreen() {
  const { history, summary } = useHistory();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showTransport, setShowTransport] = useState(false);
  const [showEnergy, setShowEnergy] = useState(false);
  
  // Get today's date string
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Journey</Text>
        
        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'day' && styles.toggleActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date and Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.dateText}>{dateString}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total:</Text>
            <Text style={styles.summaryValue}>
              {summary.totalCarbonKg.toFixed(1)} kg CO₂e
            </Text>
          </View>
          <View style={styles.budgetBar}>
            <View 
              style={[
                styles.budgetFill, 
                { width: `${Math.min((summary.totalCarbonKg / 8) * 100, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.budgetText}>
            Daily Budget: 8.0 kg CO₂e
          </Text>
        </View>

        {/* Categories */}
        {history.length > 0 ? (
          <>
            {/* Products Category */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="cube-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.categoryTitle}>Products</Text>
                <Text style={styles.categoryTotal}>
                  {summary.totalCarbonKg.toFixed(1)} kg
                </Text>
              </View>
              
              {history.slice(0, 5).map((scan) => (
                <View key={scan.id} style={styles.activityItem}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {scan.objects.map(o => o.name).join(', ')}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(scan.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.activityCarbon}>
                    {scan.totalCarbonKg.toFixed(1)} kg
                  </Text>
                </View>
              ))}
            </View>

            {/* Transport Category */}
            <TouchableOpacity 
              style={styles.categorySection}
              onPress={() => setShowTransport(true)}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="car-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.categoryTitle}>Transport</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              <View style={styles.emptyCategory}>
                <Text style={styles.emptyCategoryText}>Track trips automatically</Text>
                <View style={styles.addButton}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Open Tracker</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Food Category - Placeholder */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="restaurant-outline" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.categoryTitle}>Food</Text>
                <Text style={styles.categoryTotal}>0.0 kg</Text>
              </View>
              <View style={styles.emptyCategory}>
                <Text style={styles.emptyCategoryText}>No meals logged today</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Add Meal</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Energy Category */}
            <TouchableOpacity 
              style={styles.categorySection}
              onPress={() => setShowEnergy(true)}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: '#EAB30820' }]}>
                  <Ionicons name="flash-outline" size={20} color="#EAB308" />
                </View>
                <Text style={styles.categoryTitle}>Energy</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              <View style={styles.emptyCategory}>
                <Text style={styles.emptyCategoryText}>Log home energy usage</Text>
                <View style={styles.addButton}>
                  <Ionicons name="flash" size={16} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Log Energy</Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyText}>
              Start scanning products or logging activities to see your carbon journey.
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Transport Modal */}
      <Modal
        visible={showTransport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTransport(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTransport(false)}>
              <Ionicons name="close" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TransportScreen />
        </View>
      </Modal>
      
      {/* Energy Modal */}
      <Modal
        visible={showEnergy}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEnergy(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEnergy(false)}>
              <Ionicons name="close" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <EnergyScreen />
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  
  // Summary card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  dateText: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  summaryValue: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  budgetBar: {
    height: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 4,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  budgetText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  
  // Category sections
  categorySection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryTotal: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
  },
  activityTime: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  activityCarbon: {
    ...TextStyles.body,
    color: Colors.carbonMedium,
    fontWeight: '600',
  },
  emptyCategory: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  emptyCategoryText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.carbonLowBg,
    borderRadius: BorderRadius.full,
  },
  addButtonText: {
    ...TextStyles.caption,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    ...TextStyles.h4,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
});

export default JourneyScreen;

