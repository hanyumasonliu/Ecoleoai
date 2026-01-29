/**
 * GreenSense AR - Home Screen
 * 
 * Main dashboard showing daily carbon budget, category breakdown,
 * and recent activity. Shows data for the selected date.
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
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCarbon } from '../context/CarbonContext';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';
import { getDateString } from '../services/dataLayer';
import { Activity, ActivityCategory } from '../types/activity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category definitions
const CATEGORIES = [
  { key: 'food', name: 'Food', icon: 'restaurant-outline' as const, color: '#3B82F6' },
  { key: 'transport', name: 'Transport', icon: 'car-outline' as const, color: '#F59E0B' },
  { key: 'product', name: 'Products', icon: 'cube-outline' as const, color: '#8B5CF6' },
  { key: 'energy', name: 'Energy', icon: 'flash-outline' as const, color: '#EAB308' },
];

/**
 * Get dates for current week
 */
const getWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);
    dates.push(date);
  }
  
  return dates;
};

/**
 * HomeScreen Component
 * 
 * Main dashboard with carbon budget and activity overview.
 */
export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { 
    selectedDate,
    setSelectedDate,
    selectedDateLog,
    selectedDateRemainingBudget,
    selectedDateIsOverBudget,
    selectedDateBudgetProgress,
    selectedDateCategoryTotals,
    getScansForSelectedDate,
    settings,
    weeklySummary,
    removeActivity,
  } = useCarbon();
  
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  const weekDates = getWeekDates();
  const today = new Date();
  const todayString = getDateString(today);
  const selectedDateString = getDateString(selectedDate);
  const isToday = selectedDateString === todayString;
  
  // Handle activity tap
  const handleActivityPress = (activity: Activity) => {
    setSelectedActivity(activity);
  };
  
  // Handle delete activity
  const handleDeleteActivity = async (activityId: string) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeActivity(activityId, getDateString(selectedDate));
            setSelectedActivity(null);
          },
        },
      ]
    );
  };
  
  const dailyBudget = settings.goals.dailyBudgetKg;
  const usedCarbon = selectedDateLog.totalCarbonKg;
  const remainingCarbon = selectedDateRemainingBudget;
  const isOverBudget = selectedDateIsOverBudget;
  const budgetProgress = selectedDateBudgetProgress;
  
  // Get activities for selected date
  const selectedDateActivities = selectedDateLog.activities;
  const selectedDateScans = getScansForSelectedDate();
  
  // Calculate streak from weekly summary
  const streak = weeklySummary?.daysUnderBudget || 0;

  // Format carbon for display
  const formatCarbon = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg.toFixed(1)}kg`;
  };

  // Format date for display
  const formatDateHeader = () => {
    if (isToday) return 'Today';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return selectedDate.toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="leaf" size={24} color={Colors.primary} />
          <Text style={styles.appName}>GreenSense</Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color="#F59E0B" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week Calendar */}
        <View style={styles.weekCalendar}>
          {weekDates.map((date, index) => {
            const dateStr = getDateString(date);
            const isDateToday = dateStr === todayString;
            const isSelected = dateStr === selectedDateString;
            const isFuture = date > today;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isFuture && styles.dayButtonFuture,
                ]}
                onPress={() => !isFuture && setSelectedDate(date)}
                disabled={isFuture}
              >
                <Text style={[
                  styles.dayNumber, 
                  isSelected && styles.dayNumberSelected,
                  isFuture && styles.dayNumberFuture,
                ]}>
                  {date.getDate()}
                </Text>
                {isDateToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date Header */}
        <Text style={styles.dateHeader}>{formatDateHeader()}</Text>

        {/* Main Carbon Budget Card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetContent}>
            <View style={styles.budgetText}>
              <Text style={[styles.budgetValue, isOverBudget && styles.budgetOverValue]}>
                {isOverBudget ? usedCarbon.toFixed(0) : remainingCarbon.toFixed(1)}
              </Text>
              <Text style={[styles.budgetLabel, isOverBudget && styles.budgetOverLabel]}>
                {isOverBudget ? 'kg over budget' : 'kg CO₂e left'}
              </Text>
            </View>
            
            {/* Progress Ring */}
            <View style={styles.progressRing}>
              <View style={styles.progressRingOuter}>
                <View 
                  style={[
                    styles.progressRingFill,
                    { 
                      transform: [{ rotate: `${budgetProgress * 360}deg` }],
                      borderColor: isOverBudget ? Colors.carbonHigh : Colors.primary,
                    }
                  ]} 
                />
                <View style={styles.progressRingInner}>
                  <Ionicons 
                    name="flame" 
                    size={28} 
                    color={isOverBudget ? Colors.carbonHigh : Colors.textSecondary} 
                  />
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.budgetMeta}>
            <Ionicons name="earth" size={14} color={Colors.textTertiary} />
            <Text style={styles.budgetMetaText}>
              Daily budget: {dailyBudget} kg CO₂e
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => {
            const categoryKey = category.key as keyof typeof selectedDateCategoryTotals;
            const categoryCarbon = selectedDateCategoryTotals[categoryKey] || 0;
            const categoryProgress = Math.min(categoryCarbon / (dailyBudget / 4), 1);
            
            return (
              <View key={category.key} style={styles.categoryCard}>
                <Text style={styles.categoryValue}>
                  {formatCarbon(categoryCarbon)}
                </Text>
                <Text style={styles.categoryName}>{category.name}</Text>
                
                {/* Mini progress ring */}
                <View style={styles.categoryRing}>
                  <View 
                    style={[
                      styles.categoryRingProgress,
                      { 
                        borderColor: category.color,
                        borderRightColor: 'transparent',
                        borderBottomColor: categoryProgress > 0.5 ? category.color : 'transparent',
                        transform: [{ rotate: `${categoryProgress * 180}deg` }],
                      }
                    ]} 
                  />
                  <View style={styles.categoryRingCenter}>
                    <Ionicons name={category.icon} size={20} color={category.color} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Offset Suggestion */}
        {usedCarbon > 0 && (
          <TouchableOpacity style={styles.offsetCard}>
            <Ionicons name="add-circle" size={20} color={Colors.carbonLow} />
            <Text style={styles.offsetText}>
              Offset {isToday ? 'today' : 'this day'}: Plant {Math.ceil(usedCarbon / 20)} trees
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isToday ? 'Recent Activity' : `Activity on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
            <TouchableOpacity>
              <Ionicons name="bookmark-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {selectedDateActivities.length > 0 ? (
            selectedDateActivities.slice(0, 5).map((activity) => (
              <TouchableOpacity 
                key={activity.id} 
                style={styles.activityCard}
                onPress={() => handleActivityPress(activity)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.activityThumbnail,
                  { backgroundColor: getCategoryColor(activity.category) + '20' }
                ]}>
                  <Ionicons 
                    name={getCategoryIcon(activity.category)} 
                    size={24} 
                    color={getCategoryColor(activity.category)} 
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {activity.name}
                  </Text>
                  <View style={styles.activityMeta}>
                    <Ionicons name="leaf" size={12} color={Colors.carbonMedium} />
                    <Text style={styles.activityCarbon}>
                      {activity.carbonKg.toFixed(1)} kg CO₂e
                    </Text>
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityDetail}>
                      {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.activityRight}>
                  <Text style={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="scan-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyActivityText}>
                {isToday ? 'No activity yet. Start scanning!' : 'No activity recorded for this day.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Activity Detail Modal */}
      <Modal
        visible={!!selectedActivity}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedActivity(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModal}>
            {selectedActivity && (
              <>
                <View style={styles.detailModalHeader}>
                  <View style={[
                    styles.detailCategoryIcon,
                    { backgroundColor: getCategoryColor(selectedActivity.category) + '20' }
                  ]}>
                    <Ionicons 
                      name={getCategoryIcon(selectedActivity.category)} 
                      size={32} 
                      color={getCategoryColor(selectedActivity.category)} 
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.detailCloseButton}
                    onPress={() => setSelectedActivity(null)}
                  >
                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.detailTitle}>{selectedActivity.name}</Text>
                <Text style={styles.detailCategory}>
                  {selectedActivity.category.charAt(0).toUpperCase() + selectedActivity.category.slice(1)}
                </Text>
                
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>
                      {selectedActivity.carbonKg < 0.01 
                        ? selectedActivity.carbonKg.toFixed(4) 
                        : selectedActivity.carbonKg.toFixed(2)}
                    </Text>
                    <Text style={styles.detailStatLabel}>kg CO₂e</Text>
                  </View>
                  {'distanceKm' in selectedActivity && (selectedActivity as any).distanceKm > 0 && (
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>
                        {((selectedActivity as any).distanceKm as number).toFixed(2)}
                      </Text>
                      <Text style={styles.detailStatLabel}>km</Text>
                    </View>
                  )}
                  {selectedActivity.ecoScore !== undefined && selectedActivity.ecoScore > 0 && (
                    <View style={styles.detailStat}>
                      <Text style={[
                        styles.detailStatValue,
                        { color: selectedActivity.ecoScore >= 70 ? Colors.carbonLow : 
                                 selectedActivity.ecoScore >= 40 ? Colors.carbonMedium : Colors.carbonHigh }
                      ]}>
                        {Math.round(selectedActivity.ecoScore)}
                      </Text>
                      <Text style={styles.detailStatLabel}>Eco Score</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailInfo}>
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailInfoText}>
                      {new Date(selectedActivity.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  
                  {'mode' in selectedActivity && (
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="car-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailInfoText}>
                        Mode: {(selectedActivity as any).mode}
                      </Text>
                    </View>
                  )}
                  
                  {'durationMinutes' in selectedActivity && (selectedActivity as any).durationMinutes > 0 && (
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="timer-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailInfoText}>
                        Duration: {Math.round((selectedActivity as any).durationMinutes)} min
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailActions}>
                  <TouchableOpacity 
                    style={styles.detailDeleteButton}
                    onPress={() => handleDeleteActivity(selectedActivity.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.carbonHigh} />
                    <Text style={styles.detailDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper functions for category styling
function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'food': return 'restaurant-outline';
    case 'transport': return 'car-outline';
    case 'product': return 'cube-outline';
    case 'energy': return 'flash-outline';
    default: return 'ellipse-outline';
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'food': return '#3B82F6';
    case 'transport': return '#F59E0B';
    case 'product': return '#8B5CF6';
    case 'energy': return '#EAB308';
    default: return Colors.textSecondary;
  }
}

const CATEGORY_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm * 3) / 4;

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  streakText: {
    ...TextStyles.body,
    color: '#F59E0B',
    fontWeight: '700',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  
  // Week calendar
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dayButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base,
  },
  dayButtonSelected: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dayButtonFuture: {
    opacity: 0.4,
  },
  dayNumber: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNumberSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  dayNumberFuture: {
    color: Colors.textTertiary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  
  // Date header
  dateHeader: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  
  // Budget card
  budgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  budgetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetText: {},
  budgetValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  budgetOverValue: {
    color: Colors.carbonHigh,
  },
  budgetLabel: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  budgetOverLabel: {
    color: Colors.carbonHigh,
  },
  progressRing: {
    width: 80,
    height: 80,
  },
  progressRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingFill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  budgetMetaText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  
  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  categoryValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryName: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  categoryRing: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRingProgress: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
  },
  categoryRingCenter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Offset card
  offsetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonLowBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  offsetText: {
    ...TextStyles.body,
    color: Colors.carbonLow,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  
  // Activity section
  activitySection: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activityThumbnail: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityCarbon: {
    ...TextStyles.bodySmall,
    color: Colors.carbonMedium,
    marginLeft: 4,
    fontWeight: '600',
  },
  activityDetails: {
    flexDirection: 'row',
    marginTop: 4,
  },
  activityDetail: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  activityTime: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyActivityText: {
    ...TextStyles.body,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  
  // Activity Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  detailModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  detailCategoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseButton: {
    padding: Spacing.xs,
  },
  detailTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  detailCategory: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  detailStatLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailInfo: {
    marginBottom: Spacing.xl,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailInfoText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  detailDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.carbonHigh,
  },
  detailDeleteText: {
    ...TextStyles.button,
    color: Colors.carbonHigh,
    marginLeft: Spacing.xs,
  },
});

export default HomeScreen;
