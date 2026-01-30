/**
 * GreenSense AR - Stats Screen
 * 
 * Advanced analytics dashboard with:
 * - Time series charts (weekly/monthly/yearly)
 * - Animated donut chart for category breakdown
 * - Week-over-week comparisons
 * - Pattern detection & predictions
 * - AI-generated insights
 * - Achievement system
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCarbon } from '../context/CarbonContext';
import { useHistory } from '../context/HistoryContext';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';
import { ActivityCategory } from '../types/activity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Time range options
type TimeRange = 'week' | 'month' | 'year';

// Category info with gradients
const CATEGORY_INFO: Record<ActivityCategory, { 
  name: string; 
  color: string; 
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  transport: { 
    name: 'Transport', 
    color: '#F59E0B', 
    gradient: ['#FCD34D', '#F59E0B'],
    icon: 'car-outline' 
  },
  food: { 
    name: 'Food', 
    color: '#3B82F6', 
    gradient: ['#60A5FA', '#3B82F6'],
    icon: 'restaurant-outline' 
  },
  product: { 
    name: 'Products', 
    color: '#8B5CF6', 
    gradient: ['#A78BFA', '#8B5CF6'],
    icon: 'cube-outline' 
  },
  energy: { 
    name: 'Energy', 
    color: '#10B981', 
    gradient: ['#34D399', '#10B981'],
    icon: 'flash-outline' 
  },
};

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_scan', name: 'First Scan', emoji: '🌱', description: 'Complete your first scan' },
  { id: 'week_streak', name: '7-Day Streak', emoji: '🔥', description: 'Stay under budget for 7 days' },
  { id: 'under_budget', name: 'Budget Master', emoji: '🎯', description: 'Stay under weekly budget' },
  { id: 'fifty_scans', name: 'Super Scanner', emoji: '🦸', description: 'Complete 50 scans' },
  { id: 'eco_warrior', name: 'Eco Warrior', emoji: '🌍', description: 'Reduce emissions 20% vs last week' },
  { id: 'green_week', name: 'Green Week', emoji: '💚', description: 'All days under budget' },
];

/**
 * Category Summary Card - replaces donut chart with accurate visualization
 * Shows total value and a stacked horizontal bar for accurate percentages
 */
const CategorySummaryCard = ({ 
  data, 
  totalValue = 0,
}: { 
  data: { color: string; percentage: number; name: string; value: number }[]; 
  totalValue?: number;
}) => {
  // Filter segments with value > 0, sorted by percentage
  const segments = data.filter(d => d.percentage > 0).sort((a, b) => b.percentage - a.percentage);
  
  return (
    <View style={styles.categorySummaryCard}>
      {/* Total value display */}
      <View style={styles.totalValueContainer}>
        <Text style={styles.totalValueNumber}>
          {totalValue >= 1000 ? (totalValue / 1000).toFixed(1) : totalValue >= 100 ? totalValue.toFixed(0) : totalValue.toFixed(1)}
        </Text>
        <Text style={styles.totalValueUnit}>
          {totalValue >= 1000 ? 't CO₂e' : 'kg CO₂e'}
        </Text>
        <Text style={styles.totalValueLabel}>Total This Period</Text>
      </View>
      
      {/* Stacked horizontal bar - accurate percentages */}
      <View style={styles.stackedBar}>
        {segments.map((segment, index) => (
          <View
            key={index}
            style={[
              styles.stackedBarSegment,
              {
                width: `${Math.max(segment.percentage, 1)}%`,
                backgroundColor: segment.color,
              },
              index === 0 && styles.stackedBarFirst,
              index === segments.length - 1 && styles.stackedBarLast,
            ]}
          />
        ))}
        {segments.length === 0 && (
          <View style={[styles.stackedBarSegment, styles.stackedBarEmpty, { width: '100%' }]} />
        )}
      </View>
    </View>
  );
};

/**
 * Time Series Bar Chart Component - Enhanced visualization
 */
const TimeSeriesChart = ({ 
  data, 
  labels, 
  budget, 
  onBarPress,
  selectedIndex,
  timeRange,
}: { 
  data: number[]; 
  labels: string[]; 
  budget: number;
  onBarPress?: (index: number) => void;
  selectedIndex?: number;
  timeRange: TimeRange;
}) => {
  // Calculate proper max value with padding
  const dataMax = Math.max(...data);
  const maxValue = Math.max(dataMax, budget) * 1.3;
  const chartHeight = 180;
  
  // Get current period index
  const getCurrentIndex = () => {
    if (timeRange === 'week') return new Date().getDay();
    if (timeRange === 'month') {
      // Calculate current week (0-3), cap at 3 for days 22+
      const dayOfMonth = new Date().getDate();
      return Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
    }
    return new Date().getMonth();
  };
  const currentIndex = getCurrentIndex();
  
  // Calculate budget line position
  const budgetPosition = maxValue > 0 ? (budget / maxValue) * chartHeight : 0;
  
  return (
    <View style={styles.timeSeriesChart}>
      {/* Y-axis labels */}
      <View style={styles.yAxisLabels}>
        <Text style={styles.yAxisLabel}>{maxValue.toFixed(0)}</Text>
        <Text style={styles.yAxisLabel}>{(maxValue / 2).toFixed(0)}</Text>
        <Text style={styles.yAxisLabel}>0</Text>
      </View>
      
      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Grid lines */}
        <View style={styles.gridLine} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { top: '100%' }]} />
        
        {/* Budget line */}
        {budget > 0 && maxValue > 0 && (
          <View style={[styles.budgetLineContainer, { bottom: budgetPosition }]}>
            <View style={styles.budgetLineDashed} />
            <View style={styles.budgetBadge}>
              <Text style={styles.budgetLineLabel}>{budget}kg</Text>
            </View>
          </View>
        )}
        
        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((value, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;
            const isSelected = index === selectedIndex;
            const isOverBudget = value > budget;
            
            // Calculate bar height as pixels
            const barHeight = maxValue > 0 && value > 0 
              ? Math.max((value / maxValue) * chartHeight, 8) 
              : 4;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.barWrapper}
                onPress={() => onBarPress?.(index)}
                activeOpacity={0.7}
              >
                {/* Value label above bar - fixed height container */}
                <View style={styles.barValueContainer}>
                  <Text style={[
                    styles.barValue,
                    isOverBudget && styles.barValueOver,
                    isCurrent && styles.barValueCurrent,
                  ]}>
                    {value > 0 ? (value >= 10 ? value.toFixed(0) : value.toFixed(1)) : '-'}
                  </Text>
                </View>
                
                {/* Bar */}
                <View style={[styles.barTrack, { height: chartHeight }]}>
                  <LinearGradient
                    colors={
                      isOverBudget 
                        ? ['#FCA5A5', '#EF4444'] 
                        : isCurrent 
                          ? ['#6EE7B7', '#10B981']
                          : isPast 
                            ? ['#34D399', '#059669']
                            : ['#4B5563', '#374151']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                      styles.bar,
                      { 
                        height: barHeight,
                        opacity: isPast || isCurrent ? 1 : 0.4,
                      },
                      isSelected && styles.barSelected,
                    ]}
                  />
                </View>
                
                {/* Label container - fixed height for consistency */}
                <View style={styles.barLabelContainer}>
                  <Text style={[
                    styles.barLabel,
                    isCurrent && styles.barLabelCurrent,
                    isSelected && styles.barLabelSelected,
                  ]}>
                    {labels[index]}
                  </Text>
                  
                  {/* Current indicator dot - inside label container */}
                  {isCurrent ? (
                    <View style={styles.currentIndicator} />
                  ) : (
                    <View style={styles.indicatorPlaceholder} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

/**
 * Comparison Card Component
 */
const ComparisonCard = ({ 
  title, 
  current, 
  previous, 
  unit = 'kg',
  icon,
}: { 
  title: string; 
  current: number; 
  previous: number; 
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isImproved = change < 0;
  
  return (
    <View style={styles.comparisonCard}>
      <View style={styles.comparisonIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.comparisonTitle}>{title}</Text>
      <Text style={styles.comparisonValue}>
        {current.toFixed(1)} {unit}
      </Text>
      {previous > 0 && (
        <View style={[
          styles.comparisonBadge,
          { backgroundColor: isImproved ? Colors.carbonLowBg : Colors.carbonHighBg }
        ]}>
          <Ionicons 
            name={isImproved ? 'trending-down' : 'trending-up'} 
            size={12} 
            color={isImproved ? Colors.carbonLow : Colors.carbonHigh} 
          />
          <Text style={[
            styles.comparisonChange,
            { color: isImproved ? Colors.carbonLow : Colors.carbonHigh }
          ]}>
            {Math.abs(change).toFixed(0)}%
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * Pattern Card Component
 */
const PatternCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  color 
}: { 
  title: string; 
  value: string; 
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) => (
  <View style={[styles.patternCard, { borderLeftColor: color }]}>
    <View style={[styles.patternIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={styles.patternContent}>
      <Text style={styles.patternTitle}>{title}</Text>
      <Text style={styles.patternValue}>{value}</Text>
      <Text style={styles.patternDescription}>{description}</Text>
    </View>
  </View>
);

/**
 * StatsScreen Component
 */
export function StatsScreen() {
  const { 
    weeklySummary, 
    settings,
    todayLog,
    energyBaselines,
  } = useCarbon();
  
  const { summary: scanSummary } = useHistory();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | undefined>(undefined);
  const [showDayDetail, setShowDayDetail] = useState(false);
  
  const dailyBudget = settings.goals.dailyBudgetKg;
  const dailyEnergyBaseline = energyBaselines.totalDailyCarbonKg || 0;
  
  // Labels based on time range
  const labels = useMemo(() => {
    switch (timeRange) {
      case 'week':
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      case 'month':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case 'year':
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      default:
        return [];
    }
  }, [timeRange]);
  
  // Get budget based on time range
  const currentBudget = useMemo(() => {
    switch (timeRange) {
      case 'week': return dailyBudget;
      case 'month': return dailyBudget * 7; // Weekly budget for month view
      case 'year': return dailyBudget * 30; // Monthly budget for year view
      default: return dailyBudget;
    }
  }, [timeRange, dailyBudget]);
  
  // Get data based on time range
  const chartData = useMemo(() => {
    const weeklyData = weeklySummary?.dailyTotals || [0, 0, 0, 0, 0, 0, 0];
    const weekTotal = weeklySummary?.weekTotal || 0;
    
    if (timeRange === 'week') {
      // Add daily energy baseline to each day's total
      return weeklyData.map(day => day + dailyEnergyBaseline);
    }
    
    if (timeRange === 'month') {
      // 4 weeks - only current week has real data, others are 0
      const weekWithBaseline = weekTotal + (dailyEnergyBaseline * 7);
      // Calculate current week (0-3), cap at 3 for days 22+
      const dayOfMonth = new Date().getDate();
      const currentWeek = Math.min(Math.floor((dayOfMonth - 1) / 7), 3); // Cap at week 4 (index 3)
      return Array(4).fill(0).map((_, i) => {
        if (i === currentWeek) return weekWithBaseline;
        return 0; // No historical data for other weeks yet
      });
    }
    
    // Year - 12 months - only current month has data
    const monthlyEstimate = (weekTotal + (dailyEnergyBaseline * 7)) * 4.33;
    const currentMonth = new Date().getMonth();
    return Array(12).fill(0).map((_, i) => {
      if (i === currentMonth) return monthlyEstimate;
      return 0; // No historical data for other months yet
    });
  }, [timeRange, weeklySummary, dailyEnergyBaseline]);
  
  // Calculate total for current time range - scales based on view
  const totalForRange = useMemo(() => {
    const weekTotal = weeklySummary?.weekTotal || 0;
    const weekWithBaseline = weekTotal + (dailyEnergyBaseline * 7);
    
    switch (timeRange) {
      case 'week':
        return weekWithBaseline;
      case 'month':
        // 4.33 weeks per month average
        return weekWithBaseline * 4.33;
      case 'year':
        // 52 weeks per year
        return weekWithBaseline * 52;
      default:
        return weekWithBaseline;
    }
  }, [weeklySummary, dailyEnergyBaseline, timeRange]);
  
  // Category data - updated for time range
  const categoryData = useMemo(() => {
    const multiplier = timeRange === 'week' ? 1 : timeRange === 'month' ? 4.33 : 52;
    
    // Base weekly values
    const weeklyCategories = {
      transport: weeklySummary?.categoryTotals.transport || 0,
      food: weeklySummary?.categoryTotals.food || 0,
      product: weeklySummary?.categoryTotals.product || 0,
      energy: (weeklySummary?.categoryTotals.energy || 0) + (dailyEnergyBaseline * 7),
    };
    
    // Calculate total
    const total = Object.values(weeklyCategories).reduce((a, b) => a + b, 0) * multiplier;
    
    if (total === 0) {
      return Object.entries(CATEGORY_INFO).map(([key, info]) => ({
        key: key as ActivityCategory,
        ...info,
        value: 0,
        percentage: 0,
      }));
    }
    
    return Object.entries(CATEGORY_INFO).map(([key, info]) => {
      const categoryKey = key as ActivityCategory;
      const value = (weeklyCategories[categoryKey] || 0) * multiplier;
      const percentage = total > 0 ? (value / total) * 100 : 0;
      return {
        key: categoryKey,
        ...info,
        value,
        percentage,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [weeklySummary, timeRange, dailyEnergyBaseline]);
  
  // Comparison with previous period
  const periodComparison = useMemo(() => {
    const previousEstimate = totalForRange * 0.9; // Simplified - would need actual historical data
    return {
      current: totalForRange,
      previous: previousEstimate,
      change: previousEstimate > 0 ? ((totalForRange - previousEstimate) / previousEstimate) * 100 : 0,
    };
  }, [totalForRange]);
  
  // Days under budget (for week view)
  const daysUnderBudget = useMemo(() => {
    const todayIndex = new Date().getDay();
    const dailyData = weeklySummary?.dailyTotals || [];
    return dailyData.filter((value, index) => {
      const dayTotal = value + dailyEnergyBaseline;
      return index <= todayIndex && dayTotal > 0 && dayTotal <= dailyBudget;
    }).length;
  }, [weeklySummary, dailyBudget, dailyEnergyBaseline]);
  
  // Pattern detection
  const patterns = useMemo(() => {
    const data = chartData;
    const results: { title: string; value: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [];
    
    if (timeRange === 'week') {
      // Peak day detection
      const maxDay = Math.max(...data);
      const maxDayIndex = data.indexOf(maxDay);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (maxDay > 0) {
        results.push({
          title: 'Peak Day',
          value: dayNames[maxDayIndex],
          description: `Highest emissions (${maxDay.toFixed(1)}kg) on ${dayNames[maxDayIndex]}`,
          icon: 'trending-up',
          color: Colors.carbonHigh,
        });
      }
      
      // Weekend vs weekday
      const weekdayData = data.slice(1, 6).filter(v => v > 0);
      const weekendData = [data[0], data[6]].filter(v => v > 0);
      const weekdayAvg = weekdayData.length > 0 ? weekdayData.reduce((a, b) => a + b, 0) / weekdayData.length : 0;
      const weekendAvg = weekendData.length > 0 ? weekendData.reduce((a, b) => a + b, 0) / weekendData.length : 0;
      
      if (weekdayAvg > 0 && weekendAvg > 0) {
        const diff = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;
        results.push({
          title: diff > 0 ? 'Weekend Pattern' : 'Weekday Pattern',
          value: `${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'higher' : 'lower'}`,
          description: diff > 0 
            ? 'Weekends have higher emissions'
            : 'Weekdays have higher emissions',
          icon: diff > 0 ? 'alert-circle' : 'checkmark-circle',
          color: diff > 0 ? Colors.carbonMedium : Colors.carbonLow,
        });
      }
    }
    
    // Top category insight
    const topCategory = categoryData[0];
    if (topCategory && topCategory.percentage > 35) {
      results.push({
        title: 'Main Source',
        value: `${topCategory.name} (${topCategory.percentage.toFixed(0)}%)`,
        description: `Focus on reducing ${topCategory.name.toLowerCase()} emissions`,
        icon: topCategory.icon,
        color: topCategory.color,
      });
    }
    
    return results;
  }, [chartData, categoryData, timeRange]);
  
  // Carbon prediction
  const prediction = useMemo(() => {
    const weeklyTotal = (weeklySummary?.weekTotal || 0) + (dailyEnergyBaseline * 7);
    const avgDaily = weeklyTotal / 7;
    const monthlyPrediction = avgDaily * 30;
    const yearlyPrediction = avgDaily * 365;
    return {
      monthly: monthlyPrediction,
      yearly: yearlyPrediction,
      yearlyTonnes: yearlyPrediction / 1000,
    };
  }, [weeklySummary, dailyEnergyBaseline]);
  
  // Budget for comparison
  const weeklyBudget = dailyBudget * 7;
  const monthlyBudget = dailyBudget * 30;
  const weeklyTotal = (weeklySummary?.weekTotal || 0) + (dailyEnergyBaseline * 7);
  
  // Achievement check
  const achievements = useMemo(() => {
    return ACHIEVEMENTS.map(ach => {
      let unlocked = false;
      switch (ach.id) {
        case 'first_scan':
          unlocked = scanSummary.totalScans > 0;
          break;
        case 'week_streak':
          unlocked = daysUnderBudget >= 7;
          break;
        case 'under_budget':
          unlocked = weeklyTotal < weeklyBudget && weeklyTotal > 0;
          break;
        case 'fifty_scans':
          unlocked = scanSummary.totalScans >= 50;
          break;
        case 'eco_warrior':
          unlocked = periodComparison.change < -20;
          break;
        case 'green_week':
          unlocked = daysUnderBudget === 7;
          break;
      }
      return { ...ach, unlocked };
    });
  }, [scanSummary, daysUnderBudget, weeklyTotal, weeklyBudget, periodComparison]);
  
  // Handle bar press for drilling
  const handleBarPress = (index: number) => {
    setSelectedDayIndex(index);
    setShowDayDetail(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with time range toggle */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        
        <View style={styles.timeRangeToggle}>
          {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>
              {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'This Year'}
            </Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Under budget</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.carbonHigh }]} />
                <Text style={styles.legendText}>Over budget</Text>
              </View>
            </View>
          </View>
          
          <TimeSeriesChart
            data={chartData}
            labels={labels}
            budget={currentBudget}
            onBarPress={handleBarPress}
            selectedIndex={selectedDayIndex}
            timeRange={timeRange}
          />
          
          {/* Summary Stats */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {totalForRange >= 1000 
                  ? `${(totalForRange / 1000).toFixed(2)}t`
                  : `${totalForRange.toFixed(1)}kg`
                }
              </Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <View style={styles.changeRow}>
                <Ionicons 
                  name={periodComparison.change <= 0 ? "trending-down" : "trending-up"} 
                  size={18} 
                  color={periodComparison.change <= 0 ? Colors.carbonLow : Colors.carbonHigh} 
                />
                <Text style={[
                  styles.summaryValue, 
                  { color: periodComparison.change <= 0 ? Colors.carbonLow : Colors.carbonHigh }
                ]}>
                  {Math.abs(periodComparison.change).toFixed(0)}%
                </Text>
              </View>
              <Text style={styles.summaryLabel}>vs Last {timeRange}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[
                styles.summaryValue,
                { color: daysUnderBudget >= 5 ? Colors.carbonLow : Colors.textPrimary }
              ]}>
                {daysUnderBudget}/7
              </Text>
              <Text style={styles.summaryLabel}>On Track</Text>
            </View>
          </View>
        </View>
        
        {/* Category Breakdown with Donut */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          
          {/* Summary with accurate bar */}
          <CategorySummaryCard 
            data={categoryData.map(c => ({
              color: c.color,
              percentage: c.percentage,
              name: c.name,
              value: c.value,
            }))} 
            totalValue={totalForRange}
          />
          
          {/* Legend */}
          <View style={styles.categoryLegendGrid}>
            {categoryData.map((category) => (
              <View 
                key={category.key} 
                style={styles.categoryLegendItem}
              >
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryPercent}>
                  {category.percentage.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
          
          {/* Category Bars */}
          <View style={styles.categoryBars}>
            {categoryData.map((category) => (
              <View key={category.key} style={styles.categoryBarRow}>
                <Ionicons name={category.icon} size={16} color={category.color} />
                <View style={styles.categoryBarTrack}>
                  <LinearGradient
                    colors={category.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.categoryBar,
                      { width: `${Math.max(category.percentage, 2)}%` }
                    ]}
                  />
                </View>
                <Text style={styles.categoryValue}>
                  {category.value > 0 
                    ? category.value >= 100 
                      ? `${category.value.toFixed(0)}kg`
                      : `${category.value.toFixed(1)}kg`
                    : '-'}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        
        {/* Pattern Detection */}
        {patterns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Patterns Detected</Text>
            <View style={styles.patternsContainer}>
              {patterns.map((pattern, index) => (
                <PatternCard key={index} {...pattern} />
              ))}
            </View>
          </>
        )}
        
        {/* Carbon Predictions */}
        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Ionicons name="analytics" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Projected Impact</Text>
          </View>
          
          <View style={styles.predictionContent}>
            <View style={styles.predictionItem}>
              <Text style={styles.predictionLabel}>Monthly Estimate</Text>
              <Text style={styles.predictionValue}>
                {prediction.monthly.toFixed(0)} kg CO₂e
              </Text>
              <View style={[
                styles.predictionStatus,
                { backgroundColor: prediction.monthly < monthlyBudget ? Colors.carbonLowBg : Colors.carbonHighBg }
              ]}>
                <Text style={[
                  styles.predictionStatusText,
                  { color: prediction.monthly < monthlyBudget ? Colors.carbonLow : Colors.carbonHigh }
                ]}>
                  {prediction.monthly < monthlyBudget ? 'On Track' : 'Over Budget'}
                </Text>
              </View>
            </View>
            
            <View style={styles.predictionDivider} />
            
            <View style={styles.predictionItem}>
              <Text style={styles.predictionLabel}>Yearly Estimate</Text>
              <Text style={styles.predictionValue}>
                {prediction.yearlyTonnes.toFixed(1)} tonnes CO₂e
              </Text>
              <Text style={styles.predictionContext}>
                {prediction.yearlyTonnes < 5 
                  ? '🎉 Below global average (4-5t)'
                  : prediction.yearlyTonnes < 10
                    ? '📊 Near developed nation average'
                    : '⚠️ Above average - room to improve'
                }
              </Text>
            </View>
          </View>
        </View>
        
        {/* Achievements */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement) => (
            <TouchableOpacity 
              key={achievement.id} 
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementLocked,
              ]}
              activeOpacity={0.7}
            >
              <View style={[
                styles.achievementIcon,
                achievement.unlocked && styles.achievementIconUnlocked,
              ]}>
                <Text style={styles.achievementEmoji}>
                  {achievement.unlocked ? achievement.emoji : '🔒'}
                </Text>
              </View>
              <Text style={[
                styles.achievementName,
                achievement.unlocked && styles.achievementNameUnlocked,
              ]}>
                {achievement.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* AI Insights */}
        <View style={styles.insightsCard}>
          <LinearGradient
            colors={['rgba(13, 147, 115, 0.1)', 'rgba(13, 147, 115, 0.05)']}
            style={styles.insightsGradient}
          >
            <View style={styles.insightsHeader}>
              <View style={styles.insightsIconContainer}>
                <Ionicons name="sparkles" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.insightsTitle}>AI Weekly Summary</Text>
            </View>
            
            <Text style={styles.insightText}>
              {generateAIInsight(categoryData, weeklyTotal, weeklyBudget, daysUnderBudget, patterns)}
            </Text>
            
            {categoryData[0]?.percentage > 40 && (
              <View style={styles.insightTip}>
                <Ionicons name="bulb" size={18} color={Colors.carbonMedium} />
                <Text style={styles.insightTipText}>
                  {getTip(categoryData[0]?.key)}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>
        
        {/* Quick Stats Footer */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Ionicons name="scan" size={20} color={Colors.primary} />
            <Text style={styles.quickStatValue}>{scanSummary.totalScans}</Text>
            <Text style={styles.quickStatLabel}>Scans</Text>
          </View>
          <View style={styles.quickStat}>
            <Ionicons name="flame" size={20} color={Colors.carbonMedium} />
            <Text style={styles.quickStatValue}>{daysUnderBudget}</Text>
            <Text style={styles.quickStatLabel}>Streak</Text>
          </View>
          <View style={styles.quickStat}>
            <Ionicons name="trophy" size={20} color="#F59E0B" />
            <Text style={styles.quickStatValue}>
              {achievements.filter(a => a.unlocked).length}
            </Text>
            <Text style={styles.quickStatLabel}>Badges</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Day Detail Modal */}
      <Modal
        visible={showDayDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dayDetailModal}>
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleBar} />
            </View>
            
            <Text style={styles.modalTitle}>
              {selectedDayIndex !== undefined 
                ? timeRange === 'week'
                  ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDayIndex]
                  : timeRange === 'month'
                    ? `Week ${selectedDayIndex + 1}`
                    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedDayIndex]
                : 'Detail'
              }
            </Text>
            
            {selectedDayIndex !== undefined && (
              <>
                <View style={styles.dayDetailStats}>
                  <View style={styles.dayDetailStat}>
                    <Text style={styles.dayDetailValue}>
                      {chartData[selectedDayIndex]?.toFixed(1) || '0'} kg
                    </Text>
                    <Text style={styles.dayDetailLabel}>Total Emissions</Text>
                  </View>
                  <View style={styles.dayDetailStat}>
                    <Text style={[
                      styles.dayDetailValue,
                      { color: (chartData[selectedDayIndex] || 0) <= dailyBudget ? Colors.carbonLow : Colors.carbonHigh }
                    ]}>
                      {(chartData[selectedDayIndex] || 0) <= dailyBudget ? '✓' : '✗'}
                    </Text>
                    <Text style={styles.dayDetailLabel}>Budget Status</Text>
                  </View>
                </View>
                
                <View style={styles.dayDetailBreakdown}>
                  <Text style={styles.dayDetailSectionTitle}>Category Breakdown</Text>
                  {timeRange === 'week' && selectedDayIndex === new Date().getDay() ? (
                    // Show actual category breakdown only for today
                    categoryData.map(cat => (
                      <View key={cat.key} style={styles.dayDetailCategory}>
                        <Ionicons name={cat.icon} size={18} color={cat.color} />
                        <Text style={styles.dayDetailCategoryName}>{cat.name}</Text>
                        <Text style={styles.dayDetailCategoryValue}>
                          {cat.value > 0 ? `${(cat.value / 7).toFixed(1)} kg` : '0 kg'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    // For other days, show a message
                    <View style={styles.dayDetailNoData}>
                      <Ionicons name="information-circle-outline" size={24} color={Colors.textTertiary} />
                      <Text style={styles.dayDetailNoDataText}>
                        Detailed category breakdown is available for today only. 
                        Total emissions for this day: {(chartData[selectedDayIndex || 0] || 0).toFixed(1)} kg
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowDayDetail(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Generate AI insight text
 */
function generateAIInsight(
  categoryData: any[], 
  total: number, 
  budget: number,
  daysUnderBudget: number,
  patterns: any[]
): string {
  if (total === 0) {
    return "Start logging your activities to receive personalized insights about your carbon footprint and actionable ways to reduce your environmental impact.";
  }
  
  const topCategory = categoryData[0];
  const budgetStatus = total <= budget ? 'under' : 'over';
  const budgetDiff = Math.abs(total - budget);
  
  let insight = `📊 This week you've tracked ${total.toFixed(1)} kg CO₂e, `;
  
  if (budgetStatus === 'under') {
    insight += `which is ${budgetDiff.toFixed(1)} kg under your weekly budget. Great job! `;
  } else {
    insight += `which is ${budgetDiff.toFixed(1)} kg over your weekly budget. `;
  }
  
  if (topCategory && topCategory.percentage > 40) {
    insight += `\n\n🎯 ${topCategory.name} accounts for ${topCategory.percentage.toFixed(0)}% of your emissions - this is your biggest opportunity for reduction. `;
  }
  
  if (daysUnderBudget >= 5) {
    insight += `\n\n🌟 You've stayed on track ${daysUnderBudget} days this week - keep up the momentum!`;
  } else if (daysUnderBudget >= 3) {
    insight += `\n\n💪 ${daysUnderBudget} days under budget so far. A few more mindful days can make a big difference!`;
  }
  
  return insight;
}

/**
 * Get tip based on category
 */
function getTip(category: ActivityCategory | undefined): string {
  switch (category) {
    case 'transport':
      return "Try combining trips, using public transit, or cycling for short distances. Even one car-free day per week can reduce transport emissions by 15%.";
    case 'food':
      return "Plant-based meals have 50% lower emissions on average. Start with Meatless Mondays and gradually increase plant-forward eating.";
    case 'product':
      return "Before buying new, consider borrowing, renting, or buying second-hand. Extending product lifespan by 50% cuts emissions nearly in half.";
    case 'energy':
      return "LED bulbs, smart power strips, and adjusting your thermostat by 1-2 degrees can reduce home energy emissions by 10-20%.";
    default:
      return "Small daily choices add up. Focus on your highest-impact category first for maximum reduction.";
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
  timeRangeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: 4,
  },
  timeRangeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeRangeText: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
  },
  timeRangeTextActive: {
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
  cardTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  
  // Chart Card
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartLegend: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  
  // Time Series Chart
  timeSeriesChart: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  yAxisLabels: {
    width: 35,
    height: 180,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
    paddingBottom: 24,
  },
  yAxisLabel: {
    ...TextStyles.caption,
    fontSize: 10,
    color: Colors.textTertiary,
  },
  chartArea: {
    flex: 1,
    height: 220,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.3,
  },
  budgetLineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  budgetLineDashed: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.carbonMedium,
    opacity: 0.6,
  },
  budgetBadge: {
    backgroundColor: Colors.carbonMediumBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  budgetLineLabel: {
    ...TextStyles.caption,
    color: Colors.carbonMedium,
    fontSize: 10,
    fontWeight: '600',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 0,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValueContainer: {
    height: 16,
    justifyContent: 'center',
    marginBottom: 4,
  },
  barValue: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  barValueOver: {
    color: Colors.carbonHigh,
  },
  barValueCurrent: {
    color: Colors.primary,
    fontWeight: '700',
  },
  barTrack: {
    width: '100%',
    maxWidth: 28,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  bar: {
    width: '80%',
    borderRadius: 6,
    minHeight: 4,
  },
  barSelected: {
    borderWidth: 2,
    borderColor: Colors.white,
  },
  barLabelContainer: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  barLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  barLabelCurrent: {
    color: Colors.primary,
    fontWeight: '700',
  },
  barLabelSelected: {
    color: Colors.white,
  },
  currentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  indicatorPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 2,
  },
  
  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  summaryValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Breakdown Card
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  breakdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  donutContainer: {
    marginRight: Spacing.base,
  },
  // Category Summary Card
  categorySummaryCard: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  totalValueContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalValueNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalValueUnit: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  totalValueLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  stackedBar: {
    flexDirection: 'row',
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundTertiary,
  },
  stackedBarSegment: {
    height: '100%',
  },
  stackedBarFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  stackedBarLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  stackedBarEmpty: {
    backgroundColor: Colors.backgroundTertiary,
  },
  categoryLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
  },
  categoryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  categoryName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryPercent: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoryBars: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  categoryBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBarTrack: {
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
  categoryValue: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    width: 50,
    textAlign: 'right',
  },
  
  // Comparison Cards
  comparisonScroll: {
    marginHorizontal: -Spacing.base,
  },
  comparisonScrollContent: {
    paddingHorizontal: Spacing.base,
  },
  comparisonCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginRight: Spacing.sm,
    width: 130,
    alignItems: 'center',
  },
  comparisonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  comparisonTitle: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  comparisonValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  comparisonChange: {
    ...TextStyles.caption,
    fontWeight: '600',
    marginLeft: 2,
  },
  
  // Patterns
  patternsContainer: {
    gap: Spacing.sm,
  },
  patternCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  patternIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  patternContent: {
    flex: 1,
  },
  patternTitle: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  patternValue: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  patternDescription: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  // Predictions
  predictionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginTop: Spacing.base,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  predictionContent: {
    flexDirection: 'row',
  },
  predictionItem: {
    flex: 1,
    alignItems: 'center',
  },
  predictionDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  predictionLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  predictionValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  predictionStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  predictionStatusText: {
    ...TextStyles.caption,
    fontWeight: '600',
  },
  predictionContext: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  
  // Achievements
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  achievementCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.xs * 4) / 3,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.sm,
    alignItems: 'center',
    margin: Spacing.xs,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  achievementIconUnlocked: {
    backgroundColor: Colors.carbonLowBg,
  },
  achievementEmoji: {
    fontSize: 22,
  },
  achievementName: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  achievementNameUnlocked: {
    color: Colors.textPrimary,
  },
  
  // AI Insights
  insightsCard: {
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.base,
    overflow: 'hidden',
  },
  insightsGradient: {
    padding: Spacing.base,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  insightsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  insightsTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
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
    lineHeight: 20,
  },
  
  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  quickStatLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  dayDetailModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '70%',
  },
  modalHandle: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  modalTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  dayDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  dayDetailStat: {
    alignItems: 'center',
  },
  dayDetailValue: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  dayDetailLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  dayDetailBreakdown: {
    marginBottom: Spacing.xl,
  },
  dayDetailSectionTitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  dayDetailCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayDetailCategoryName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  dayDetailCategoryValue: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  dayDetailNoData: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
  },
  dayDetailNoDataText: {
    ...TextStyles.bodySmall,
    color: Colors.textTertiary,
    flex: 1,
    marginLeft: Spacing.sm,
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    alignItems: 'center',
  },
  modalCloseText: {
    ...TextStyles.button,
    color: Colors.white,
  },
});

export default StatsScreen;
