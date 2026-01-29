/**
 * GreenSense AR - Stats Screen
 * 
 * Analytics and insights showing weekly charts, category breakdown,
 * achievements, and AI-generated recommendations.
 * Connected to CarbonContext for real-time data.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCarbon } from '../context/CarbonContext';
import { useHistory } from '../context/HistoryContext';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';
import { ActivityCategory } from '../types/activity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

// Category info
const CATEGORY_INFO: Record<ActivityCategory, { name: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  transport: { name: 'Transport', color: '#F59E0B', icon: 'car-outline' },
  food: { name: 'Food', color: '#3B82F6', icon: 'restaurant-outline' },
  product: { name: 'Products', color: '#8B5CF6', icon: 'cube-outline' },
  energy: { name: 'Energy', color: '#EAB308', icon: 'flash-outline' },
};

/**
 * StatsScreen Component
 * 
 * Shows analytics, charts, and insights using real data.
 */
export function StatsScreen() {
  const { 
    weeklySummary, 
    settings,
    todayLog,
  } = useCarbon();
  
  const { summary: scanSummary } = useHistory();
  
  // Get weekly data for chart
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekData = useMemo(() => {
    if (!weeklySummary) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
    return weeklySummary.dailyTotals;
  }, [weeklySummary]);
  
  const maxValue = Math.max(...weekData, settings.goals.dailyBudgetKg);
  const weekTotal = weeklySummary?.weekTotal || 0;
  const dailyBudget = settings.goals.dailyBudgetKg;
  const weeklyBudget = dailyBudget * 7;
  
  // Calculate category percentages
  const categoryData = useMemo(() => {
    if (!weeklySummary || weekTotal === 0) {
      return Object.keys(CATEGORY_INFO).map(key => ({
        key: key as ActivityCategory,
        ...CATEGORY_INFO[key as ActivityCategory],
        value: 0,
        percentage: 0,
      }));
    }
    
    return Object.entries(CATEGORY_INFO).map(([key, info]) => {
      const categoryKey = key as ActivityCategory;
      const value = weeklySummary.categoryTotals[categoryKey] || 0;
      const percentage = weekTotal > 0 ? Math.round((value / weekTotal) * 100) : 0;
      return {
        key: categoryKey,
        ...info,
        value,
        percentage,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [weeklySummary, weekTotal]);
  
  // Calculate week over week change
  const weekChange = useMemo(() => {
    // For now, show change based on today's position in the week
    const todayIndex = new Date().getDay();
    const daysPassedData = weekData.slice(0, todayIndex + 1);
    const avg = daysPassedData.length > 0 
      ? daysPassedData.reduce((a, b) => a + b, 0) / daysPassedData.length 
      : 0;
    
    // Compare to daily budget
    if (avg === 0) return 0;
    return Math.round(((dailyBudget - avg) / dailyBudget) * 100);
  }, [weekData, dailyBudget]);
  
  // Calculate days under budget
  const daysUnderBudget = useMemo(() => {
    return weekData.filter((value, index) => {
      // Only count days that have passed
      const todayIndex = new Date().getDay();
      return index <= todayIndex && value > 0 && value <= dailyBudget;
    }).length;
  }, [weekData, dailyBudget]);
  
  // Total activities count
  const totalActivities = useMemo(() => {
    if (!weeklySummary) return 0;
    return Object.values(weeklySummary.categoryTotals).reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0) * 7;
  }, [weeklySummary]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>This Week</Text>
          
          {/* Simple bar chart */}
          <View style={styles.chart}>
            {weekData.map((value, index) => {
              const todayIndex = new Date().getDay();
              const isToday = index === todayIndex;
              const isPast = index < todayIndex;
              const isOverBudget = value > dailyBudget;
              
              return (
                <View key={index} style={styles.chartColumn}>
                  <Text style={styles.chartValue}>
                    {value > 0 ? value.toFixed(1) : '-'}
                  </Text>
                  <View style={styles.barContainer}>
                    {/* Budget line indicator */}
                    <View 
                      style={[
                        styles.budgetLine,
                        { bottom: `${(dailyBudget / maxValue) * 100}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.bar,
                        { 
                          height: value > 0 ? `${Math.min((value / maxValue) * 100, 100)}%` : 2,
                          backgroundColor: isOverBudget 
                            ? Colors.carbonHigh 
                            : isToday 
                              ? Colors.primary 
                              : isPast 
                                ? Colors.primaryDark 
                                : Colors.backgroundTertiary,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[
                    styles.chartLabel,
                    isToday && styles.chartLabelToday
                  ]}>
                    {weekDays[index]}
                  </Text>
                </View>
              );
            })}
          </View>
          
          {/* Week summary */}
          <View style={styles.weekSummary}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{weekTotal.toFixed(1)} kg</Text>
              <Text style={styles.weekStatLabel}>Weekly Total</Text>
            </View>
            <View style={styles.weekStatDivider} />
            <View style={styles.weekStat}>
              <View style={styles.changeIndicator}>
                <Ionicons 
                  name={weekChange >= 0 ? "arrow-down" : "arrow-up"} 
                  size={16} 
                  color={weekChange >= 0 ? Colors.carbonLow : Colors.carbonHigh} 
                />
                <Text style={[
                  styles.weekStatValue, 
                  { color: weekChange >= 0 ? Colors.carbonLow : Colors.carbonHigh }
                ]}>
                  {Math.abs(weekChange)}%
                </Text>
              </View>
              <Text style={styles.weekStatLabel}>vs Budget</Text>
            </View>
            <View style={styles.weekStatDivider} />
            <View style={styles.weekStat}>
              <Text style={[
                styles.weekStatValue,
                { color: daysUnderBudget >= 5 ? Colors.carbonLow : Colors.textPrimary }
              ]}>
                {daysUnderBudget}/7
              </Text>
              <Text style={styles.weekStatLabel}>Days On Track</Text>
            </View>
          </View>
        </View>
        
        {/* Category Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          
          {categoryData.map((category) => (
            <View key={category.key} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Ionicons name={category.icon} size={18} color={category.color} />
              <Text style={styles.categoryName}>{category.name}</Text>
              <View style={styles.categoryBarContainer}>
                <View 
                  style={[
                    styles.categoryBar,
                    { 
                      width: `${Math.max(category.percentage, 2)}%`, 
                      backgroundColor: category.color 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.categoryPercent}>
                {category.value > 0 ? `${category.value.toFixed(1)}kg` : '-'}
              </Text>
            </View>
          ))}
          
          {weekTotal === 0 && (
            <View style={styles.noDataMessage}>
              <Ionicons name="analytics-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.noDataText}>
                Start logging activities to see your breakdown
              </Text>
            </View>
          )}
        </View>
        
        {/* Achievements */}
        <View style={styles.achievementsCard}>
          <Text style={styles.cardTitle}>Achievements</Text>
          
          <View style={styles.achievementsGrid}>
            <View style={styles.achievement}>
              <View style={[
                styles.achievementIcon, 
                { backgroundColor: scanSummary.totalScans > 0 ? Colors.carbonLowBg : Colors.surface }
              ]}>
                <Text style={styles.achievementEmoji}>
                  {scanSummary.totalScans > 0 ? '🌱' : '🔒'}
                </Text>
              </View>
              <Text style={styles.achievementName}>First Scan</Text>
            </View>
            
            <View style={styles.achievement}>
              <View style={[
                styles.achievementIcon, 
                { backgroundColor: daysUnderBudget >= 7 ? Colors.carbonLowBg : Colors.surface }
              ]}>
                <Text style={styles.achievementEmoji}>
                  {daysUnderBudget >= 7 ? '🔥' : '🔒'}
                </Text>
              </View>
              <Text style={styles.achievementName}>7-Day Streak</Text>
            </View>
            
            <View style={styles.achievement}>
              <View style={[
                styles.achievementIcon, 
                { backgroundColor: weekTotal < weeklyBudget && weekTotal > 0 ? Colors.carbonLowBg : Colors.surface }
              ]}>
                <Text style={styles.achievementEmoji}>
                  {weekTotal < weeklyBudget && weekTotal > 0 ? '🎯' : '🔒'}
                </Text>
              </View>
              <Text style={styles.achievementName}>Under Budget</Text>
            </View>
            
            <View style={styles.achievement}>
              <View style={[
                styles.achievementIcon, 
                { backgroundColor: scanSummary.totalScans >= 50 ? Colors.carbonLowBg : Colors.surface }
              ]}>
                <Text style={styles.achievementEmoji}>
                  {scanSummary.totalScans >= 50 ? '🦸' : '🔒'}
                </Text>
              </View>
              <Text style={styles.achievementName}>50 Scans</Text>
            </View>
          </View>
        </View>
        
        {/* AI Insights */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="sparkles" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>AI Insights</Text>
          </View>
          
          <Text style={styles.insightText}>
            {weekTotal > 0 
              ? generateInsight(categoryData, weekTotal, weeklyBudget, daysUnderBudget)
              : "Start logging your activities to receive personalized insights about your carbon footprint and ways to reduce it."
            }
          </Text>
          
          {weekTotal > 0 && categoryData[0]?.percentage > 40 && (
            <View style={styles.insightTip}>
              <Ionicons name="bulb-outline" size={18} color={Colors.carbonMedium} />
              <Text style={styles.insightTipText}>
                {getTip(categoryData[0]?.key)}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <Ionicons name="scan-outline" size={24} color={Colors.primary} />
            <Text style={styles.quickStatValue}>{scanSummary.totalScans}</Text>
            <Text style={styles.quickStatLabel}>Total Scans</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Ionicons name="leaf" size={24} color={Colors.carbonLow} />
            <Text style={styles.quickStatValue}>
              {weekTotal >= 1000 
                ? `${(weekTotal / 1000).toFixed(1)}t`
                : `${weekTotal.toFixed(0)}kg`
              }
            </Text>
            <Text style={styles.quickStatLabel}>This Week</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Ionicons name="today-outline" size={24} color={Colors.categoryTransport} />
            <Text style={styles.quickStatValue}>
              {todayLog.totalCarbonKg.toFixed(1)}kg
            </Text>
            <Text style={styles.quickStatLabel}>Today</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Generate insight text based on data
 */
function generateInsight(
  categoryData: any[], 
  weekTotal: number, 
  weeklyBudget: number,
  daysUnderBudget: number
): string {
  const topCategory = categoryData[0];
  const budgetStatus = weekTotal <= weeklyBudget ? 'on track' : 'over budget';
  
  if (!topCategory || topCategory.percentage === 0) {
    return "Keep logging your activities to build a complete picture of your carbon footprint.";
  }
  
  let insight = `This week you've tracked ${weekTotal.toFixed(1)} kg CO₂e. `;
  
  if (topCategory.percentage > 50) {
    insight += `${topCategory.name} makes up ${topCategory.percentage}% of your emissions. `;
  }
  
  if (daysUnderBudget >= 5) {
    insight += `Great job staying under budget ${daysUnderBudget} days this week! 🎉`;
  } else if (weekTotal > weeklyBudget) {
    insight += `You're ${(weekTotal - weeklyBudget).toFixed(1)} kg over your weekly budget. Try to reduce ${topCategory.name.toLowerCase()} emissions.`;
  } else {
    insight += `You're currently ${budgetStatus} for the week.`;
  }
  
  return insight;
}

/**
 * Get tip based on top category
 */
function getTip(category: ActivityCategory | undefined): string {
  switch (category) {
    case 'transport':
      return "Consider walking, biking, or using public transit for short trips to reduce transport emissions by up to 90%.";
    case 'food':
      return "Choosing plant-based meals even once a week can significantly reduce your food-related carbon footprint.";
    case 'product':
      return "Opting for second-hand items or repairing instead of replacing can cut product emissions by up to 80%.";
    case 'energy':
      return "Switching to renewable energy and reducing standby power can lower your home energy emissions significantly.";
    default:
      return "Small changes in daily habits can lead to big reductions in your carbon footprint over time.";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  cardTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm,
  },
  
  // Chart card
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: Spacing.md,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartValue: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
    marginBottom: 4,
  },
  barContainer: {
    flex: 1,
    width: 28,
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  budgetLine: {
    position: 'absolute',
    left: -4,
    right: -4,
    height: 1,
    backgroundColor: Colors.carbonMedium,
    opacity: 0.5,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  chartLabelToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  weekSummary: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  weekStat: {
    flex: 1,
    alignItems: 'center',
  },
  weekStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  weekStatValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  weekStatLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Category breakdown
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  categoryName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    width: 80,
    marginLeft: Spacing.sm,
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercent: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    width: 50,
    textAlign: 'right',
  },
  noDataMessage: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noDataText: {
    ...TextStyles.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  
  // Achievements
  achievementsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  achievement: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementName: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // Insights
  insightsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  insightText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  insightTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.carbonMediumBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  insightTipText: {
    ...TextStyles.bodySmall,
    color: Colors.carbonMedium,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  
  // Quick stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  quickStatValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  quickStatLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default StatsScreen;
