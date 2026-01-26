/**
 * CarbonSense AR - Profile Screen
 * 
 * User profile with stats summary and educational content about carbon footprints.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistory } from '../context/HistoryContext';
import { syncProfileWithHistory } from '../services/storage';
import { UserProfile } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Educational content about carbon footprints
 */
const LEARN_CONTENT = [
  {
    id: '1',
    icon: 'help-circle' as const,
    title: 'What is kg CO₂e?',
    content: 'CO₂e stands for "carbon dioxide equivalent." It\'s a standard unit for measuring the total greenhouse gas emissions of a product or activity, converting all gases (like methane and nitrous oxide) into their CO₂ equivalent impact on global warming.',
  },
  {
    id: '2',
    icon: 'trending-up' as const,
    title: 'Why are electronics high impact?',
    content: 'Electronics require rare earth minerals, complex manufacturing processes, and global shipping. A single smartphone can generate 50-80 kg CO₂e, with 70-80% coming from manufacturing alone. Extending device lifespan is one of the best ways to reduce this impact.',
  },
  {
    id: '3',
    icon: 'shirt' as const,
    title: 'Fashion\'s hidden footprint',
    content: 'The fashion industry accounts for ~10% of global carbon emissions. A pair of jeans can require 3,000+ liters of water to produce. Choosing quality over quantity, buying secondhand, and proper care can significantly reduce your clothing\'s carbon footprint.',
  },
  {
    id: '4',
    icon: 'leaf' as const,
    title: 'Low-impact choices',
    content: 'Items made from sustainable materials, locally produced goods, and products designed for longevity typically have lower carbon footprints. Repairing, reusing, and recycling can also significantly reduce environmental impact.',
  },
];

/**
 * ProfileScreen Component
 * 
 * Shows user profile, stats, and educational carbon content.
 */
export function ProfileScreen() {
  const { summary } = useHistory();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expandedLearn, setExpandedLearn] = useState<string | null>(null);
  
  /**
   * Load user profile
   */
  useEffect(() => {
    const loadProfile = async () => {
      const updatedProfile = await syncProfileWithHistory();
      setProfile(updatedProfile);
    };
    loadProfile();
  }, [summary]);
  
  /**
   * Format join date
   */
  const formatJoinDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };
  
  /**
   * Toggle learn section expansion
   */
  const toggleLearnSection = (id: string) => {
    setExpandedLearn(current => current === id ? null : id);
  };
  
  /**
   * Handle link press
   */
  const handleLearnMore = () => {
    Linking.openURL('https://www.carbonfootprint.com/');
  };

  /**
   * Get user level info
   */
  const getLevelInfo = () => {
    if (summary.totalScans >= 50) return { emoji: '🌟', title: 'Carbon Champion', color: Colors.carbonMedium };
    if (summary.totalScans >= 20) return { emoji: '🌱', title: 'Eco Warrior', color: Colors.carbonLow };
    if (summary.totalScans >= 5) return { emoji: '🍃', title: 'Green Explorer', color: Colors.primary };
    return { emoji: '🌿', title: 'Getting Started', color: Colors.textSecondary };
  };

  const levelInfo = getLevelInfo();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Screen title */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>Profile</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          {/* Avatar and Info Row */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={Colors.primary} />
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelEmoji}>{levelInfo.emoji}</Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.name || 'Carbon Hero'}
              </Text>
              {profile && (
                <Text style={styles.joinDate}>
                  Scanning since {formatJoinDate(profile.joinedDate)}
                </Text>
              )}
              <View style={[styles.levelBadgeInline, { backgroundColor: levelInfo.color + '20' }]}>
                <Text style={[styles.levelTitle, { color: levelInfo.color }]}>
                  {levelInfo.title}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Carbon Stat - Featured */}
        <View style={styles.featuredStatCard}>
          <View style={styles.featuredStatIcon}>
            <Ionicons name="leaf" size={32} color={Colors.carbonLow} />
          </View>
          <View style={styles.featuredStatContent}>
            <Text style={styles.featuredStatValue}>
              {summary.totalCarbonKg >= 1000
                ? `${(summary.totalCarbonKg / 1000).toFixed(2)}`
                : summary.totalCarbonKg.toFixed(1)
              }
            </Text>
            <Text style={styles.featuredStatUnit}>
              {summary.totalCarbonKg >= 1000 ? 'tonnes' : 'kg'} CO₂e
            </Text>
          </View>
          <Text style={styles.featuredStatLabel}>Total Carbon Tracked</Text>
        </View>
        
        {/* Stats Grid - 2x2 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="scan-outline" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{summary.totalScans}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={24} color={Colors.secondary} />
            <Text style={styles.statValue}>{summary.totalObjects}</Text>
            <Text style={styles.statLabel}>Objects</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="analytics-outline" size={24} color={Colors.info} />
            <Text style={styles.statValue}>
              {summary.averageCarbonPerScan.toFixed(0)}
              <Text style={styles.statValueUnit}> kg</Text>
            </Text>
            <Text style={styles.statLabel}>Avg per Scan</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="trophy-outline" size={24} color={Colors.carbonMedium} />
            <Text style={styles.statValue} numberOfLines={1}>
              {summary.topObjectTypes[0] || '—'}
            </Text>
            <Text style={styles.statLabel}>Top Item</Text>
          </View>
        </View>
        
        {/* Learn section */}
        <View style={styles.learnSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={22} color={Colors.textPrimary} />
            <Text style={styles.sectionTitle}>Learn About Carbon</Text>
          </View>
          
          {LEARN_CONTENT.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.learnCard}
              onPress={() => toggleLearnSection(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.learnCardHeader}>
                <View style={styles.learnIconContainer}>
                  <Ionicons name={item.icon} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.learnTitle} numberOfLines={1}>{item.title}</Text>
                <Ionicons 
                  name={expandedLearn === item.id ? 'chevron-up' : 'chevron-down'} 
                  size={18} 
                  color={Colors.textTertiary} 
                />
              </View>
              
              {expandedLearn === item.id && (
                <Text style={styles.learnContent}>{item.content}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Links */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleLearnMore}
        >
          <Ionicons name="globe-outline" size={20} color={Colors.primary} />
          <Text style={styles.linkText}>Learn more about carbon footprints</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        
        {/* App info */}
        <View style={styles.appInfo}>
          <View style={styles.appLogoRow}>
            <Ionicons name="leaf" size={20} color={Colors.primary} />
            <Text style={styles.appName}>CarbonSense AR</Text>
          </View>
          <Text style={styles.appVersion}>Version 1.0.0 • Gemini 3 Hackathon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  titleBar: {
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
  
  // Profile card - Horizontal layout
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.carbonLowBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  levelEmoji: {
    fontSize: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  joinDate: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  levelBadgeInline: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  levelTitle: {
    ...TextStyles.caption,
    fontWeight: '600',
  },

  // Featured stat card
  featuredStatCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.carbonLow + '30',
  },
  featuredStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.carbonLowBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  featuredStatContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  featuredStatValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  featuredStatUnit: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  featuredStatLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  
  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    alignItems: 'center',
  },
  statValue: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statValueUnit: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  statLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Learn section
  learnSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  learnCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  learnCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.carbonLowBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  learnTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  learnContent: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    lineHeight: 22,
  },
  
  // Link button
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.xl,
  },
  linkText: {
    ...TextStyles.bodySmall,
    color: Colors.primary,
    flex: 1,
    marginLeft: Spacing.md,
  },
  
  // App info
  appInfo: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  appLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  appName: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  appVersion: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
});

export default ProfileScreen;
