/**
 * GreenSense AR - Stats Screen
 * 
 * Analytics and insights showing weekly charts, category breakdown,
 * achievements, and AI-generated recommendations.
 */

import React from 'react';
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
import { useHistory } from '../context/HistoryContext';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

// Category colors
const CATEGORY_COLORS = {
  transport: '#F59E0B',
  food: '#3B82F6',
  products: '#8B5CF6',
  energy: '#EAB308',
};

/**
 * StatsScreen Component
 * 
 * Shows analytics, charts, and insights.
 */
export function StatsScreen() {
  const { summary, history } = useHistory();
  
  // Mock weekly data for chart (will be replaced with real data)
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekData = [4.2, 6.1, 5.3, 7.8, 3.2, 4.5, summary.totalCarbonKg || 2.1];
  const maxValue = Math.max(...weekData, 8);
  
  // Calculate week total
  const weekTotal = weekData.reduce((sum, val) => sum + val, 0);
  
  // Mock category breakdown (will be calculated from real data)
  const categories = [
    { name: 'Transport', value: 52, color: CATEGORY_COLORS.transport, icon: 'car-outline' as const },
    { name: 'Food', value: 28, color: CATEGORY_COLORS.food, icon: 'restaurant-outline' as const },
    { name: 'Products', value: 15, color: CATEGORY_COLORS.products, icon: 'cube-outline' as const },
    { name: 'Energy', value: 5, color: CATEGORY_COLORS.energy, icon: 'flash-outline' as const },
  ];

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
            {weekData.map((value, index) => (
              <View key={index} style={styles.chartColumn}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar,
                      { 
                        height: `${(value / maxValue) * 100}%`,
                        backgroundColor: index === 6 ? Colors.primary : Colors.primaryDark,
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.chartLabel}>{weekDays[index]}</Text>
              </View>
            ))}
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
                <Ionicons name="arrow-down" size={16} color={Colors.carbonLow} />
                <Text style={[styles.weekStatValue, { color: Colors.carbonLow }]}>12%</Text>
              </View>
              <Text style={styles.weekStatLabel}>vs Last Week</Text>
            </View>
          </View>
        </View>
        
        {/* Category Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          
          {categories.map((category, index) => (
            <View key={index} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Ionicons name={category.icon} size={18} color={category.color} />
              <Text style={styles.categoryName}>{category.name}</Text>
              <View style={styles.categoryBarContainer}>
                <View 
                  style={[
                    styles.categoryBar,
                    { width: `${category.value}%`, backgroundColor: category.color }
                  ]} 
                />
              </View>
              <Text style={styles.categoryPercent}>{category.value}%</Text>
            </View>
          ))}
        </View>
        
        {/* Achievements */}
        <View style={styles.achievementsCard}>
          <Text style={styles.cardTitle}>Achievements</Text>
          
          <View style={styles.achievementsGrid}>
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, { backgroundColor: Colors.carbonLowBg }]}>
                <Text style={styles.achievementEmoji}>🌱</Text>
              </View>
              <Text style={styles.achievementName}>First Scan</Text>
            </View>
            
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, { backgroundColor: summary.totalScans >= 7 ? Colors.carbonLowBg : Colors.surface }]}>
                <Text style={styles.achievementEmoji}>{summary.totalScans >= 7 ? '🔥' : '🔒'}</Text>
              </View>
              <Text style={styles.achievementName}>7-Day Streak</Text>
            </View>
            
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, { backgroundColor: Colors.surface }]}>
                <Text style={styles.achievementEmoji}>🔒</Text>
              </View>
              <Text style={styles.achievementName}>Under Budget</Text>
            </View>
            
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, { backgroundColor: Colors.surface }]}>
                <Text style={styles.achievementEmoji}>🔒</Text>
              </View>
              <Text style={styles.achievementName}>Eco Warrior</Text>
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
            {summary.totalScans > 0 
              ? `You've scanned ${summary.totalObjects} items tracking ${summary.totalCarbonKg.toFixed(1)} kg CO₂e. Your most scanned category is products. Consider tracking your transport and food to get a complete picture of your carbon footprint.`
              : "Start scanning products to receive personalized insights about your carbon footprint and ways to reduce it."
            }
          </Text>
          
          {summary.totalScans > 0 && (
            <View style={styles.insightTip}>
              <Ionicons name="bulb-outline" size={18} color={Colors.carbonMedium} />
              <Text style={styles.insightTipText}>
                Tip: Switching to reusable products could reduce your product emissions by up to 80%.
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <Ionicons name="scan-outline" size={24} color={Colors.primary} />
            <Text style={styles.quickStatValue}>{summary.totalScans}</Text>
            <Text style={styles.quickStatLabel}>Total Scans</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Ionicons name="leaf" size={24} color={Colors.carbonLow} />
            <Text style={styles.quickStatValue}>
              {summary.totalCarbonKg >= 1000 
                ? `${(summary.totalCarbonKg / 1000).toFixed(1)}t`
                : `${summary.totalCarbonKg.toFixed(0)}kg`
              }
            </Text>
            <Text style={styles.quickStatLabel}>CO₂e Tracked</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Ionicons name="trending-down" size={24} color={Colors.carbonLow} />
            <Text style={styles.quickStatValue}>
              {summary.averageCarbonPerScan.toFixed(1)}kg
            </Text>
            <Text style={styles.quickStatLabel}>Avg / Scan</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    height: 120,
    marginBottom: Spacing.md,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: 24,
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
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
    ...TextStyles.h4,
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
    width: 36,
    textAlign: 'right',
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

