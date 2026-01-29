/**
 * GreenSense AR - Journey Screen
 * 
 * Daily and weekly activity log showing carbon emissions by category.
 * Shows consistent data from CarbonContext.
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCarbon } from '../context/CarbonContext';
import { TransportScreen } from './TransportScreen';
import { EnergyScreen } from './EnergyScreen';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';
import { getDateString } from '../services/dataLayer';
import { Activity, ActivityCategory } from '../types/activity';

type ViewMode = 'day' | 'week';

// Category info for display
const CATEGORY_INFO: Record<ActivityCategory, { icon: string; color: string; label: string }> = {
  product: { icon: 'cube-outline', color: '#8B5CF6', label: 'Products' },
  food: { icon: 'restaurant-outline', color: '#3B82F6', label: 'Food' },
  transport: { icon: 'car-outline', color: '#F59E0B', label: 'Transport' },
  energy: { icon: 'flash-outline', color: '#EAB308', label: 'Energy' },
};

/**
 * JourneyScreen Component
 * 
 * Shows daily/weekly carbon activity log grouped by category.
 */
export function JourneyScreen() {
  const { 
    selectedDate,
    setSelectedDate,
    selectedDateLog,
    weeklySummary,
    settings,
  } = useCarbon();
  
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showTransport, setShowTransport] = useState(false);
  const [showEnergy, setShowEnergy] = useState(false);
  
  const todayString = getDateString();
  const selectedDateString = getDateString(selectedDate);
  const isToday = selectedDateString === todayString;
  
  // Get today's date string
  const dateString = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Group activities by category for selected date
  const activitiesByCategory = useMemo(() => {
    const grouped: Record<ActivityCategory, Activity[]> = {
      product: [],
      food: [],
      transport: [],
      energy: [],
    };
    
    for (const activity of selectedDateLog.activities) {
      if (grouped[activity.category]) {
        grouped[activity.category].push(activity);
      }
    }
    
    return grouped;
  }, [selectedDateLog.activities]);

  // Calculate totals
  const dailyTotal = selectedDateLog.totalCarbonKg;
  const dailyBudget = settings.goals.dailyBudgetKg;
  const weeklyTotal = weeklySummary?.weekTotal || 0;
  const weeklyBudget = dailyBudget * 7;

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.dateText}>
            {viewMode === 'day' ? dateString : 'This Week'}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total:</Text>
            <Text style={styles.summaryValue}>
              {viewMode === 'day' 
                ? `${dailyTotal.toFixed(1)} kg CO₂e`
                : `${weeklyTotal.toFixed(1)} kg CO₂e`
              }
            </Text>
          </View>
          <View style={styles.budgetBar}>
            <View 
              style={[
                styles.budgetFill, 
                { 
                  width: `${Math.min(
                    viewMode === 'day' 
                      ? (dailyTotal / dailyBudget) * 100
                      : (weeklyTotal / weeklyBudget) * 100,
                    100
                  )}%`,
                  backgroundColor: viewMode === 'day' 
                    ? (dailyTotal > dailyBudget ? Colors.carbonHigh : Colors.primary)
                    : (weeklyTotal > weeklyBudget ? Colors.carbonHigh : Colors.primary)
                }
              ]} 
            />
          </View>
          <Text style={styles.budgetText}>
            {viewMode === 'day' 
              ? `Daily Budget: ${dailyBudget.toFixed(1)} kg CO₂e`
              : `Weekly Budget: ${weeklyBudget.toFixed(1)} kg CO₂e`
            }
          </Text>
          
          {/* Weekly breakdown */}
          {viewMode === 'week' && weeklySummary && (
            <View style={styles.weeklyBreakdown}>
              <Text style={styles.breakdownTitle}>Daily Breakdown</Text>
              <View style={styles.weekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                  const dayTotal = weeklySummary.dailyTotals[index] || 0;
                  const isUnderBudget = dayTotal <= dailyBudget;
                  return (
                    <View key={index} style={styles.weekDayColumn}>
                      <Text style={styles.weekDayLabel}>{day}</Text>
                      <View style={styles.weekDayBar}>
                        <View 
                          style={[
                            styles.weekDayBarFill,
                            { 
                              height: `${Math.min((dayTotal / dailyBudget) * 100, 100)}%`,
                              backgroundColor: isUnderBudget ? Colors.primary : Colors.carbonHigh,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.weekDayValue}>{dayTotal.toFixed(0)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Category breakdown for week view */}
        {viewMode === 'week' && weeklySummary && (
          <View style={styles.categoryBreakdownSection}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <View style={styles.categoryBreakdownGrid}>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                const categoryKey = key as ActivityCategory;
                const total = weeklySummary.categoryTotals[categoryKey] || 0;
                const percentage = weeklyTotal > 0 ? (total / weeklyTotal) * 100 : 0;
                return (
                  <View key={key} style={styles.categoryBreakdownCard}>
                    <View style={[styles.categoryBreakdownIcon, { backgroundColor: info.color + '20' }]}>
                      <Ionicons name={info.icon as any} size={24} color={info.color} />
                    </View>
                    <Text style={styles.categoryBreakdownLabel}>{info.label}</Text>
                    <Text style={styles.categoryBreakdownValue}>{total.toFixed(1)} kg</Text>
                    <Text style={styles.categoryBreakdownPercent}>{percentage.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Day view: Categories with activities */}
        {viewMode === 'day' && (
          <>
            {/* Products Category */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_INFO.product.color + '20' }]}>
                  <Ionicons name="cube-outline" size={20} color={CATEGORY_INFO.product.color} />
                </View>
                <Text style={styles.categoryTitle}>Products</Text>
                <Text style={styles.categoryTotal}>
                  {selectedDateLog.categoryTotals.product.toFixed(1)} kg
                </Text>
              </View>
              
              {activitiesByCategory.product.length > 0 ? (
                activitiesByCategory.product.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatTime(activity.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.activityCarbon}>
                      {activity.carbonKg.toFixed(1)} kg
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>No products scanned {isToday ? 'today' : 'this day'}</Text>
                </View>
              )}
            </View>

            {/* Food Category */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_INFO.food.color + '20' }]}>
                  <Ionicons name="restaurant-outline" size={20} color={CATEGORY_INFO.food.color} />
                </View>
                <Text style={styles.categoryTitle}>Food</Text>
                <Text style={styles.categoryTotal}>
                  {selectedDateLog.categoryTotals.food.toFixed(1)} kg
                </Text>
              </View>
              
              {activitiesByCategory.food.length > 0 ? (
                activitiesByCategory.food.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatTime(activity.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.activityCarbon}>
                      {activity.carbonKg.toFixed(1)} kg
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>No meals logged {isToday ? 'today' : 'this day'}</Text>
                  <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                    <Text style={styles.addButtonText}>Add Meal</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Transport Category */}
            <TouchableOpacity 
              style={styles.categorySection}
              onPress={() => setShowTransport(true)}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_INFO.transport.color + '20' }]}>
                  <Ionicons name="car-outline" size={20} color={CATEGORY_INFO.transport.color} />
                </View>
                <Text style={styles.categoryTitle}>Transport</Text>
                <Text style={styles.categoryTotal}>
                  {selectedDateLog.categoryTotals.transport.toFixed(1)} kg
                </Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              
              {activitiesByCategory.transport.length > 0 ? (
                activitiesByCategory.transport.slice(0, 3).map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatTime(activity.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.activityCarbon}>
                      {activity.carbonKg.toFixed(1)} kg
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>Track trips automatically</Text>
                  <View style={styles.addButton}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <Text style={styles.addButtonText}>Open Tracker</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Energy Category */}
            <TouchableOpacity 
              style={styles.categorySection}
              onPress={() => setShowEnergy(true)}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_INFO.energy.color + '20' }]}>
                  <Ionicons name="flash-outline" size={20} color={CATEGORY_INFO.energy.color} />
                </View>
                <Text style={styles.categoryTitle}>Energy</Text>
                <Text style={styles.categoryTotal}>
                  {selectedDateLog.categoryTotals.energy.toFixed(1)} kg
                </Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              
              {activitiesByCategory.energy.length > 0 ? (
                activitiesByCategory.energy.slice(0, 3).map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatTime(activity.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.activityCarbon}>
                      {activity.carbonKg.toFixed(1)} kg
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>Log home energy usage</Text>
                  <View style={styles.addButton}>
                    <Ionicons name="flash" size={16} color={Colors.primary} />
                    <Text style={styles.addButtonText}>Log Energy</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Empty state for week view with no data */}
        {viewMode === 'week' && weeklyTotal === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Activity This Week</Text>
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
  
  // Weekly breakdown
  weeklyBreakdown: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breakdownTitle: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  weekDayLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  weekDayBar: {
    width: 20,
    height: 60,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  weekDayBarFill: {
    width: '100%',
    borderRadius: 10,
  },
  weekDayValue: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    fontSize: 10,
  },
  
  // Category breakdown for week
  categoryBreakdownSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  categoryBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryBreakdownCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    alignItems: 'center',
  },
  categoryBreakdownIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBreakdownLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  categoryBreakdownValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  categoryBreakdownPercent: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
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
    marginRight: Spacing.sm,
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
