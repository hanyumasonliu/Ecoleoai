/**
 * CarbonSense AR - Coach Screen
 * 
 * AI-powered carbon coach providing personalized insights and tips
 * based on the user's scanning history.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateCoachMessage } from '../services/gemini';
import { useHistory } from '../context/HistoryContext';
import { CoachMessage } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

/**
 * CoachScreen Component
 * 
 * Displays personalized carbon coaching based on scan history.
 */
export function CoachScreen() {
  const { summary, isLoading: historyLoading } = useHistory();
  const [coachMessage, setCoachMessage] = useState<CoachMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  /**
   * Fetch coach message
   */
  const fetchCoachMessage = useCallback(async () => {
    try {
      setError(null);
      const message = await generateCoachMessage(summary);
      setCoachMessage(message);
      
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Error fetching coach message:', err);
      setError('Unable to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [summary, fadeAnim]);
  
  /**
   * Initial load
   */
  useEffect(() => {
    if (!historyLoading) {
      fetchCoachMessage();
    }
  }, [historyLoading, fetchCoachMessage]);
  
  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    await fetchCoachMessage();
  }, [fetchCoachMessage, fadeAnim]);
  
  /**
   * Render loading state
   */
  if (isLoading || historyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <View style={styles.coachAvatarLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
          <Text style={styles.loadingText}>Generating insights...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Screen title */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>Carbon Coach</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Coach avatar */}
        <Animated.View 
          style={[
            styles.coachHeader,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.coachAvatar}>
            <Ionicons name="sparkles" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.coachName}>Your Carbon Coach</Text>
          <Text style={styles.coachSubtitle}>
            Powered by AI insights
          </Text>
        </Animated.View>
        
        {/* Error state */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Coach message */}
        {coachMessage && !error && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Main message */}
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                {coachMessage.message}
              </Text>
            </View>
            
            {/* Tips section */}
            {coachMessage.tips && coachMessage.tips.length > 0 && (
              <View style={styles.tipsSection}>
                <View style={styles.tipsSectionHeader}>
                  <Ionicons name="bulb" size={20} color={Colors.carbonMedium} />
                  <Text style={styles.tipsSectionTitle}>Quick Tips</Text>
                </View>
                
                {coachMessage.tips.map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <View style={styles.tipNumber}>
                      <Text style={styles.tipNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Encouragement */}
            {coachMessage.encouragement && (
              <View style={styles.encouragementCard}>
                <Ionicons name="heart" size={20} color={Colors.carbonLow} />
                <Text style={styles.encouragementText}>
                  {coachMessage.encouragement}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
        
        {/* Quick stats reminder */}
        <View style={styles.statsReminder}>
          <Text style={styles.statsReminderTitle}>Your Journey</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.totalScans}</Text>
              <Text style={styles.statLabel}>Scans</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.totalObjects}</Text>
              <Text style={styles.statLabel}>Objects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {summary.totalCarbonKg >= 1000
                  ? `${(summary.totalCarbonKg / 1000).toFixed(1)}t`
                  : `${summary.totalCarbonKg.toFixed(0)}kg`
                }
              </Text>
              <Text style={styles.statLabel}>CO₂e</Text>
            </View>
          </View>
        </View>
        
        {/* Refresh button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
          <Text style={styles.refreshButtonText}>Refresh Advice</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  titleBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
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
  
  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarLoading: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  
  // Coach header
  coachHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  coachAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.carbonLowBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.glow,
  },
  coachName: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  coachSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  
  // Error state
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.carbonHighBg,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.xl,
  },
  errorText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.base,
  },
  retryText: {
    ...TextStyles.button,
    color: Colors.textPrimary,
  },
  
  // Message card
  messageCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.small,
  },
  messageText: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  
  // Tips section
  tipsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  tipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tipsSectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tipNumberText: {
    ...TextStyles.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  tipText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  
  // Encouragement
  encouragementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonLowBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  encouragementText: {
    ...TextStyles.body,
    color: Colors.carbonLow,
    marginLeft: Spacing.md,
    flex: 1,
    fontWeight: '500',
  },
  
  // Stats reminder
  statsReminder: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  statsReminderTitle: {
    ...TextStyles.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  
  // Refresh button
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refreshButtonText: {
    ...TextStyles.button,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});

export default CoachScreen;

