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
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCarbon } from '../context/CarbonContext';
import { TransportScreen } from './TransportScreen';
import { EnergyScreen } from './EnergyScreen';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';
import { getDateString } from '../services/dataLayer';
import { Activity, ActivityCategory, ProductActivity, FoodActivity, TransportActivity, EnergyActivity } from '../types/activity';

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
/**
 * Get week dates centered on today
 */
const getWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOfWeek + i);
    dates.push(date);
  }
  
  return dates;
};

export function JourneyScreen() {
  const navigation = useNavigation<any>();
  const { 
    selectedDate,
    setSelectedDate,
    selectedDateLog,
    weeklySummary,
    settings,
    removeActivity,
    energyBaselines,
  } = useCarbon();
  
  // Get the daily baseline carbon (with fallback to 0 if undefined or NaN)
  const homeEnergyBaselineCarbonKg = 
    energyBaselines?.totalDailyCarbonKg && !isNaN(energyBaselines.totalDailyCarbonKg) 
      ? energyBaselines.totalDailyCarbonKg 
      : 0;
  
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showTransport, setShowTransport] = useState(false);
  const [showEnergy, setShowEnergy] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [categoryBreakdownMode, setCategoryBreakdownMode] = useState<'daily' | 'weekly'>('daily');
  
  const todayString = getDateString();
  const selectedDateString = getDateString(selectedDate);
  const isToday = selectedDateString === todayString;
  
  // Get week dates for the calendar
  const weekDates = getWeekDates();
  const today = new Date();
  
  // Navigate to scan screen with food mode
  const handleAddMeal = () => {
    navigation.navigate('Scan', { scanMode: 'food' });
  };
  
  // Navigate to scan screen with product mode
  const handleAddProduct = () => {
    navigation.navigate('Scan', { scanMode: 'product' });
  };
  
  // Handle activity tap to show details
  const handleActivityPress = (activity: Activity) => {
    setSelectedActivity(activity);
  };
  
  // Delete activity
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

  // Calculate totals (including baseline energy) with NaN protection
  const dailyTotalRaw = selectedDateLog?.totalCarbonKg || 0;
  const dailyTotal = (isNaN(dailyTotalRaw) ? 0 : dailyTotalRaw) + homeEnergyBaselineCarbonKg;
  const dailyBudget = settings?.goals?.dailyBudgetKg || 20;
  const weeklyTotalRaw = weeklySummary?.weekTotal || 0;
  const weeklyTotal = (isNaN(weeklyTotalRaw) ? 0 : weeklyTotalRaw) + (homeEnergyBaselineCarbonKg * 7);
  const weeklyBudget = dailyBudget * 7;
  
  // Safe category totals for selected date
  const safeCategoryTotals = {
    product: selectedDateLog?.categoryTotals?.product || 0,
    food: selectedDateLog?.categoryTotals?.food || 0,
    transport: selectedDateLog?.categoryTotals?.transport || 0,
    energy: selectedDateLog?.categoryTotals?.energy || 0,
  };

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          
          {/* Week Calendar - Clickable days */}
          {viewMode === 'week' && (
            <View style={styles.weekCalendarSection}>
              <Text style={styles.breakdownTitle}>Select Day</Text>
              <View style={styles.weekCalendar}>
                {weekDates.map((date, index) => {
                  const dateStr = getDateString(date);
                  const isSelected = dateStr === selectedDateString;
                  const isTodayDate = dateStr === todayString;
                  const dayTotal = weeklySummary?.dailyTotals?.[index] || 0;
                  const safeDayTotal = isNaN(dayTotal) ? 0 : dayTotal;
                  const totalWithBaseline = safeDayTotal + homeEnergyBaselineCarbonKg;
                  const isUnderBudget = totalWithBaseline <= dailyBudget;
                  
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[
                        styles.weekCalendarDay,
                        isSelected && styles.weekCalendarDaySelected,
                        isTodayDate && styles.weekCalendarDayToday,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[
                        styles.weekCalendarDayLabel,
                        isSelected && styles.weekCalendarDayLabelSelected,
                      ]}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                      </Text>
                      <Text style={[
                        styles.weekCalendarDayNumber,
                        isSelected && styles.weekCalendarDayNumberSelected,
                      ]}>
                        {date.getDate()}
                      </Text>
                      {/* Carbon indicator bar */}
                      <View style={styles.weekCalendarDayIndicator}>
                        <View 
                          style={[
                            styles.weekCalendarDayIndicatorFill,
                            { 
                              height: `${Math.min((totalWithBaseline / dailyBudget) * 100, 100)}%`,
                              backgroundColor: isUnderBudget ? Colors.primary : Colors.carbonHigh,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[
                        styles.weekCalendarDayCarbon,
                        isSelected && styles.weekCalendarDayCarbonSelected,
                      ]}>
                        {totalWithBaseline.toFixed(0)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Category breakdown for week view with Daily/Weekly toggle */}
        {viewMode === 'week' && (
          <View style={styles.categoryBreakdownSection}>
            {/* Header with toggle */}
            <View style={styles.categoryBreakdownHeader}>
              <Text style={styles.sectionTitle}>Category Breakdown</Text>
              <View style={styles.breakdownToggle}>
                <TouchableOpacity
                  style={[
                    styles.breakdownToggleButton,
                    categoryBreakdownMode === 'daily' && styles.breakdownToggleActive,
                  ]}
                  onPress={() => setCategoryBreakdownMode('daily')}
                >
                  <Text style={[
                    styles.breakdownToggleText,
                    categoryBreakdownMode === 'daily' && styles.breakdownToggleTextActive,
                  ]}>Daily</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.breakdownToggleButton,
                    categoryBreakdownMode === 'weekly' && styles.breakdownToggleActive,
                  ]}
                  onPress={() => setCategoryBreakdownMode('weekly')}
                >
                  <Text style={[
                    styles.breakdownToggleText,
                    categoryBreakdownMode === 'weekly' && styles.breakdownToggleTextActive,
                  ]}>Weekly</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Breakdown label */}
            <Text style={styles.breakdownSubtitle}>
              {categoryBreakdownMode === 'daily' 
                ? (isToday ? "Today" : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
                : "This Week"
              }
            </Text>
            
            {/* Calculate grand total first for accurate percentages */}
            {(() => {
              // Calculate the grand total (sum of all categories including baseline)
              // Use dailyTotal/weeklyTotal which already include baseline
              const grandTotal = categoryBreakdownMode === 'daily' ? dailyTotal : weeklyTotal;
              
              return (
                <View style={styles.categoryBreakdownGrid}>
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                    const categoryKey = key as ActivityCategory;
                    let total: number = 0;
                    
                    if (categoryBreakdownMode === 'daily') {
                      // Use selected day's data with safe fallback
                      total = safeCategoryTotals[categoryKey] || 0;
                      
                      // For energy, add the baseline
                      if (categoryKey === 'energy') {
                        total = total + homeEnergyBaselineCarbonKg;
                      }
                    } else {
                      // Use weekly data with safe fallback
                      total = weeklySummary?.categoryTotals?.[categoryKey] || 0;
                      
                      // For energy, add the baseline (7 days worth)
                      if (categoryKey === 'energy') {
                        total = total + (homeEnergyBaselineCarbonKg * 7);
                      }
                    }
                    
                    // Ensure total is not NaN
                    if (isNaN(total)) total = 0;
                    
                    const percentage = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                    
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
              );
            })()}
          </View>
        )}
        
        {/* Show selected day's activities in week view */}
        {viewMode === 'week' && (
          <View style={styles.selectedDaySection}>
            <Text style={styles.sectionTitle}>
              {isToday ? "Today's Activities" : `Activities on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
            
            {selectedDateLog.activities.length > 0 || homeEnergyBaselineCarbonKg > 0 ? (
              <>
                {/* Energy Baseline indicator */}
                {homeEnergyBaselineCarbonKg > 0 && (
                  <View style={styles.baselineIndicator}>
                    <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_INFO.energy.color + '20' }]}>
                      <Ionicons name="flash" size={16} color={CATEGORY_INFO.energy.color} />
                    </View>
                    <View style={styles.baselineInfo}>
                      <Text style={styles.baselineName}>Home Energy Baseline</Text>
                      <Text style={styles.baselineSubtext}>Daily average from utilities</Text>
                    </View>
                    <Text style={styles.baselineCarbon}>
                      {homeEnergyBaselineCarbonKg.toFixed(1)} kg
                    </Text>
                  </View>
                )}
                
                {/* Activities list */}
                {selectedDateLog.activities.slice(0, 5).map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.weekActivityItem}
                    onPress={() => handleActivityPress(activity)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_INFO[activity.category].color + '20' }]}>
                      <Ionicons 
                        name={CATEGORY_INFO[activity.category].icon as any} 
                        size={16} 
                        color={CATEGORY_INFO[activity.category].color} 
                      />
                    </View>
                    <View style={styles.weekActivityInfo}>
                      <Text style={styles.weekActivityName} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text style={styles.weekActivityTime}>
                        {formatTime(activity.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.weekActivityCarbon}>
                      {activity.carbonKg.toFixed(1)} kg
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
                
                {selectedDateLog.activities.length > 5 && (
                  <Text style={styles.moreActivitiesText}>
                    +{selectedDateLog.activities.length - 5} more activities
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.noActivitiesDay}>
                <Text style={styles.noActivitiesDayText}>No activities logged</Text>
              </View>
            )}
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
                  {safeCategoryTotals.product.toFixed(1)} kg
                </Text>
              </View>
              
              {activitiesByCategory.product.length > 0 ? (
                activitiesByCategory.product.map((activity) => (
                  <TouchableOpacity 
                    key={activity.id} 
                    style={styles.activityItem}
                    onPress={() => handleActivityPress(activity)}
                  >
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
                    <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>No products scanned {isToday ? 'today' : 'this day'}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
                    <Ionicons name="scan" size={16} color={Colors.primary} />
                    <Text style={styles.addButtonText}>Scan Product</Text>
                  </TouchableOpacity>
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
                  {safeCategoryTotals.food.toFixed(1)} kg
                </Text>
              </View>
              
              {activitiesByCategory.food.length > 0 ? (
                activitiesByCategory.food.map((activity) => (
                  <TouchableOpacity 
                    key={activity.id} 
                    style={styles.activityItem}
                    onPress={() => handleActivityPress(activity)}
                  >
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
                    <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>No meals logged {isToday ? 'today' : 'this day'}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddMeal}>
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
                  {safeCategoryTotals.transport.toFixed(1)} kg
                </Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              
              {activitiesByCategory.transport.length > 0 ? (
                activitiesByCategory.transport.slice(0, 3).map((activity) => (
                  <TouchableOpacity 
                    key={activity.id} 
                    style={styles.activityItem}
                    onPress={() => handleActivityPress(activity)}
                  >
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
                  </TouchableOpacity>
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
                  {(safeCategoryTotals.energy + homeEnergyBaselineCarbonKg).toFixed(1)} kg
                </Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </View>
              
              {/* Always show baseline if set */}
              {homeEnergyBaselineCarbonKg > 0 && (
                <View style={styles.baselineRow}>
                  <View style={styles.baselineRowInfo}>
                    <Ionicons name="home" size={14} color={Colors.textSecondary} />
                    <Text style={styles.baselineRowName}>Home Baseline (daily)</Text>
                  </View>
                  <Text style={styles.baselineRowCarbon}>
                    {homeEnergyBaselineCarbonKg.toFixed(1)} kg
                  </Text>
                </View>
              )}
              
              {activitiesByCategory.energy.length > 0 ? (
                activitiesByCategory.energy.slice(0, 3).map((activity) => (
                  <TouchableOpacity 
                    key={activity.id} 
                    style={styles.activityItem}
                    onPress={() => handleActivityPress(activity)}
                  >
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
                  </TouchableOpacity>
                ))
              ) : homeEnergyBaselineCarbonKg === 0 ? (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyCategoryText}>Log home energy usage</Text>
                  <View style={styles.addButton}>
                    <Ionicons name="flash" size={16} color={Colors.primary} />
                    <Text style={styles.addButtonText}>Setup Baseline</Text>
                  </View>
                </View>
              ) : null}
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
      
      {/* Activity Detail Modal */}
      <Modal
        visible={!!selectedActivity}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedActivity(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModal}>
            {/* Drag handle */}
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleBar} />
            </View>
            <ScrollView 
              style={styles.detailModalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailModalScrollContent}
            >
            {selectedActivity && (
              <>
                <View style={styles.detailModalHeader}>
                  <View style={[
                    styles.detailCategoryIcon,
                    { backgroundColor: CATEGORY_INFO[selectedActivity.category].color + '20' }
                  ]}>
                    <Ionicons 
                      name={CATEGORY_INFO[selectedActivity.category].icon as any} 
                      size={32} 
                      color={CATEGORY_INFO[selectedActivity.category].color} 
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
                  {CATEGORY_INFO[selectedActivity.category].label}
                </Text>
                
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>
                      {selectedActivity.carbonKg < 0.01 
                        ? selectedActivity.carbonKg.toFixed(4) 
                        : selectedActivity.carbonKg.toFixed(2)}
                    </Text>
                    <Text style={styles.detailStatLabel}>kg CO₂e Total</Text>
                  </View>
                  {'distanceKm' in selectedActivity && (selectedActivity as TransportActivity).distanceKm > 0 && (
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>
                        {(selectedActivity as TransportActivity).distanceKm.toFixed(2)}
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

                {/* Individual Items for Product Scans */}
                {selectedActivity.category === 'product' && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsSectionTitle}>
                      Scanned Items {(selectedActivity as ProductActivity).objects?.length 
                        ? `(${(selectedActivity as ProductActivity).objects.length})`
                        : ''}
                    </Text>
                    {(selectedActivity as ProductActivity).objects && 
                     (selectedActivity as ProductActivity).objects.length > 0 ? (
                      (selectedActivity as ProductActivity).objects.map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
                          <View style={styles.itemLeft}>
                            <View style={[
                              styles.itemSeverityDot,
                              { backgroundColor: getSeverityColor(item.severity) }
                            ]} />
                            <View style={styles.itemInfo}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              {item.description && (
                                <Text style={styles.itemDescription} numberOfLines={2}>
                                  {item.description}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.itemRight}>
                            <Text style={[
                              styles.itemCarbon,
                              { color: getSeverityColor(item.severity) }
                            ]}>
                              {item.carbonKg < 0.01 
                                ? item.carbonKg.toFixed(4) 
                                : item.carbonKg.toFixed(2)} kg
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.itemDescription}>
                        Item details not available for this scan.
                      </Text>
                    )}
                  </View>
                )}

                {/* Ingredients for Food Scans */}
                {selectedActivity.category === 'food' && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsSectionTitle}>
                      Food Details {(selectedActivity as FoodActivity).ingredients?.length 
                        ? `(${(selectedActivity as FoodActivity).ingredients!.length} ingredients)`
                        : ''}
                    </Text>
                    {(selectedActivity as FoodActivity).foodCategory && (
                      <View style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <View style={[styles.itemSeverityDot, { backgroundColor: Colors.categoryFood }]} />
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>Category</Text>
                            <Text style={styles.itemDescription}>
                              {(selectedActivity as FoodActivity).foodCategory.charAt(0).toUpperCase() + 
                               (selectedActivity as FoodActivity).foodCategory.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    {(selectedActivity as FoodActivity).mealType && (
                      <View style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <View style={[styles.itemSeverityDot, { backgroundColor: Colors.categoryFood }]} />
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>Meal Type</Text>
                            <Text style={styles.itemDescription}>
                              {(selectedActivity as FoodActivity).mealType!.charAt(0).toUpperCase() + 
                               (selectedActivity as FoodActivity).mealType!.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    {(selectedActivity as FoodActivity).ingredients && 
                     (selectedActivity as FoodActivity).ingredients!.length > 0 ? (
                      (selectedActivity as FoodActivity).ingredients!.map((ingredient, index) => (
                        <View key={index} style={styles.itemRow}>
                          <View style={styles.itemLeft}>
                            <View style={[styles.itemSeverityDot, { backgroundColor: Colors.categoryFood }]} />
                            <View style={styles.itemInfo}>
                              <Text style={styles.itemName}>{ingredient.name}</Text>
                              <Text style={styles.itemDescription}>{ingredient.quantity}</Text>
                            </View>
                          </View>
                          <View style={styles.itemRight}>
                            <Text style={[styles.itemCarbon, { color: Colors.categoryFood }]}>
                              {ingredient.carbonKg.toFixed(2)} kg
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      !(selectedActivity as FoodActivity).foodCategory && !(selectedActivity as FoodActivity).mealType && (
                        <Text style={styles.itemDescription}>
                          Detailed ingredient breakdown not available for this entry.
                        </Text>
                      )
                    )}
                  </View>
                )}

                {/* Transport Details */}
                {selectedActivity.category === 'transport' && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsSectionTitle}>Trip Details</Text>
                    <View style={styles.tripDetailsGrid}>
                      {(selectedActivity as TransportActivity).startLocation && (
                        <View style={styles.tripDetailRow}>
                          <Ionicons name="location" size={16} color={Colors.carbonLow} />
                          <Text style={styles.tripDetailLabel}>From:</Text>
                          <Text style={styles.tripDetailValue} numberOfLines={1}>
                            {(selectedActivity as TransportActivity).startLocation}
                          </Text>
                        </View>
                      )}
                      {(selectedActivity as TransportActivity).endLocation && (
                        <View style={styles.tripDetailRow}>
                          <Ionicons name="flag" size={16} color={Colors.carbonHigh} />
                          <Text style={styles.tripDetailLabel}>To:</Text>
                          <Text style={styles.tripDetailValue} numberOfLines={1}>
                            {(selectedActivity as TransportActivity).endLocation}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Energy Details */}
                {selectedActivity.category === 'energy' && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsSectionTitle}>Energy Details</Text>
                    <View style={styles.tripDetailsGrid}>
                      <View style={styles.tripDetailRow}>
                        <Ionicons name="flash" size={16} color={Colors.categoryEnergy} />
                        <Text style={styles.tripDetailLabel}>Type:</Text>
                        <Text style={styles.tripDetailValue}>
                          {(selectedActivity as EnergyActivity).energyType.replace('_', ' ')}
                        </Text>
                      </View>
                      <View style={styles.tripDetailRow}>
                        <Ionicons name="speedometer" size={16} color={Colors.categoryEnergy} />
                        <Text style={styles.tripDetailLabel}>Amount:</Text>
                        <Text style={styles.tripDetailValue}>
                          {(selectedActivity as EnergyActivity).energyKwh.toFixed(1)} kWh
                        </Text>
                      </View>
                      <View style={styles.tripDetailRow}>
                        <Ionicons name="calendar" size={16} color={Colors.categoryEnergy} />
                        <Text style={styles.tripDetailLabel}>Period:</Text>
                        <Text style={styles.tripDetailValue}>
                          {(selectedActivity as EnergyActivity).period}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                
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
                        Mode: {(selectedActivity as TransportActivity).mode}
                      </Text>
                    </View>
                  )}
                  
                  {'durationMinutes' in selectedActivity && (selectedActivity as TransportActivity).durationMinutes && (selectedActivity as TransportActivity).durationMinutes! > 0 && (
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="timer-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailInfoText}>
                        Duration: {Math.round((selectedActivity as TransportActivity).durationMinutes!)} min
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
            </ScrollView>
          </View>
        </View>
      </Modal>

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

// Helper function for severity colors
function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'low': return Colors.carbonLow;
    case 'medium': return Colors.carbonMedium;
    case 'high': return Colors.carbonHigh;
    default: return Colors.textSecondary;
  }
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
    paddingBottom: Spacing.xl,
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
  
  // Week Calendar (clickable)
  weekCalendarSection: {
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
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekCalendarDay: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    borderRadius: BorderRadius.sm,
    marginHorizontal: 2,
  },
  weekCalendarDaySelected: {
    backgroundColor: Colors.primary + '20',
  },
  weekCalendarDayToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  weekCalendarDayLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  weekCalendarDayLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  weekCalendarDayNumber: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  weekCalendarDayNumberSelected: {
    color: Colors.primary,
  },
  weekCalendarDayIndicator: {
    width: 16,
    height: 40,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 4,
  },
  weekCalendarDayIndicatorFill: {
    width: '100%',
    borderRadius: 8,
  },
  weekCalendarDayCarbon: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    fontSize: 9,
  },
  weekCalendarDayCarbonSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Selected day section in week view
  selectedDaySection: {
    marginTop: Spacing.xl,
  },
  weekActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  weekActivityInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  weekActivityName: {
    ...TextStyles.bodySmall,
    color: Colors.textPrimary,
  },
  weekActivityTime: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
  },
  weekActivityCarbon: {
    ...TextStyles.bodySmall,
    color: Colors.carbonMedium,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  moreActivitiesText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  noActivitiesDay: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  noActivitiesDayText: {
    ...TextStyles.body,
    color: Colors.textTertiary,
  },
  
  // Baseline indicator
  baselineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: CATEGORY_INFO.energy.color,
  },
  baselineInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  baselineName: {
    ...TextStyles.bodySmall,
    color: Colors.textPrimary,
  },
  baselineSubtext: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
  },
  baselineCarbon: {
    ...TextStyles.bodySmall,
    color: CATEGORY_INFO.energy.color,
    fontWeight: '600',
  },
  
  // Baseline row in day view
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.carbonMediumBg + '30',
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.xs,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  baselineRowInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  baselineRowName: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  baselineRowCarbon: {
    ...TextStyles.body,
    color: CATEGORY_INFO.energy.color,
    fontWeight: '600',
  },
  
  // Category breakdown for week
  categoryBreakdownSection: {
    marginBottom: Spacing.xl,
  },
  categoryBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  breakdownToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  breakdownToggleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  breakdownToggleActive: {
    backgroundColor: Colors.primary,
  },
  breakdownToggleText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  breakdownToggleTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  breakdownSubtitle: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
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
  
  // Activity Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  detailModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    width: '100%',
    maxHeight: '85%',
    minHeight: 300,
  },
  detailModalScroll: {
    flexGrow: 1,
  },
  detailModalScrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
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
  
  // Items section for showing individual scanned products/ingredients
  itemsSection: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
  },
  itemsSectionTitle: {
    ...TextStyles.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemSeverityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemDescription: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    marginLeft: Spacing.sm,
    alignItems: 'flex-end',
  },
  itemCarbon: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  
  // Trip/Energy details grid
  tripDetailsGrid: {
    gap: Spacing.sm,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  tripDetailLabel: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    marginRight: Spacing.xs,
    minWidth: 45,
  },
  tripDetailValue: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
  },
});

export default JourneyScreen;
