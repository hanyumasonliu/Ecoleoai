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
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHistory } from '../context/HistoryContext';
import { syncProfileWithHistory } from '../services/storage';
import { quickExport, exportAsCSV } from '../services/export';
import { UserProfile } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Carbon Pricing Data (2024-2025 rates)
 * Sources: EU ETS, World Bank Carbon Pricing Dashboard
 */
const CARBON_PRICING = {
  // EU Emissions Trading System - what companies actually pay
  euETS: 85, // €/tonne → ~$92 USD
  
  // US Social Cost of Carbon (EPA estimate for policy decisions)
  socialCost: 51, // $/tonne - what damage each tonne causes society
  
  // Voluntary carbon offset market (what you'd pay to offset)
  voluntaryOffset: 15, // $/tonne - average offset price
  
  // Sweden carbon tax - highest in world
  swedenTax: 130, // $/tonne
  
  // Canada carbon tax (2024)
  canadaTax: 65, // CAD/tonne → ~$48 USD
};

/**
 * Calculate impact equivalencies
 */
const calculateImpactEquivalencies = (carbonKg: number) => {
  const carbonTonnes = carbonKg / 1000;
  
  return {
    // Financial impacts
    euCarbonTax: carbonTonnes * CARBON_PRICING.euETS,
    socialCost: carbonTonnes * CARBON_PRICING.socialCost,
    offsetCost: carbonTonnes * CARBON_PRICING.voluntaryOffset,
    
    // If you emitted at corporate rate for a year
    annualCorporateCost: (carbonKg * 52) / 1000 * CARBON_PRICING.euETS,
    
    // Physical equivalencies
    carKm: carbonKg / 0.21, // Average car emits 0.21 kg/km
    flightHours: carbonKg / 90, // ~90 kg CO₂ per hour of flying
    smartphoneCharges: carbonKg / 0.005, // ~5g per charge
    beefMeals: carbonKg / 6.5, // ~6.5 kg CO₂ per beef meal
    treeMonths: carbonKg / 1.8, // A tree absorbs ~22kg/year = 1.8kg/month
  };
};

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
  const [isExporting, setIsExporting] = useState(false);
  
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
   * Handle data export
   */
  const handleExport = () => {
    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export as CSV',
          onPress: async () => {
            setIsExporting(true);
            const success = await exportAsCSV();
            setIsExporting(false);
            if (!success) {
              Alert.alert('Export Failed', 'Could not export data. Please try again.');
            }
          },
        },
        {
          text: 'Export as JSON',
          onPress: async () => {
            setIsExporting(true);
            const success = await quickExport();
            setIsExporting(false);
            if (!success) {
              Alert.alert('Export Failed', 'Could not export data. Please try again.');
            }
          },
        },
      ]
    );
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
  
  // Calculate impact equivalencies
  const impact = calculateImpactEquivalencies(summary.totalCarbonKg);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        
        {/* Carbon Cost Impact Card */}
        {summary.totalCarbonKg > 0 && (
          <View style={styles.impactCard}>
            <View style={styles.impactHeader}>
              <Ionicons name="cash-outline" size={22} color={Colors.primary} />
              <Text style={styles.impactTitle}>Your Carbon in Real Terms</Text>
            </View>
            
            {/* If You Were A Company Section */}
            <View style={styles.corporateSection}>
              <Text style={styles.sectionLabel}>💼 If you were a company...</Text>
              <View style={styles.mainCostRow}>
                <View style={styles.mainCostItem}>
                  <Text style={styles.mainCostValue}>
                    ${impact.euCarbonTax.toFixed(2)}
                  </Text>
                  <Text style={styles.mainCostNote}>
                    EU Carbon Tax
                  </Text>
                  <Text style={styles.mainCostExplain}>
                    Companies pay €85/tonne to EU
                  </Text>
                </View>
                <View style={styles.mainCostDivider} />
                <View style={styles.mainCostItem}>
                  <Text style={styles.mainCostValue}>
                    ${impact.socialCost.toFixed(2)}
                  </Text>
                  <Text style={styles.mainCostNote}>
                    Damage to Society
                  </Text>
                  <Text style={styles.mainCostExplain}>
                    US EPA: $51 damage/tonne
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Offset cost - clearer explanation */}
            <View style={styles.offsetSection}>
              <Text style={styles.sectionLabel}>🌱 Want to go carbon neutral?</Text>
              <View style={styles.offsetRow}>
                <View style={styles.offsetContent}>
                  <Text style={styles.offsetAmount}>${impact.offsetCost.toFixed(2)}</Text>
                  <Text style={styles.offsetExplain}>
                    Buy carbon credits at ~$15/tonne{'\n'}
                    (funds tree planting, renewable energy)
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.offsetButton}
                  onPress={() => Linking.openURL('https://www.goldstandard.org/')}
                >
                  <Text style={styles.offsetButtonText}>Learn More</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Equivalencies - CLEAR that these are alternatives */}
            <View style={styles.equivalenciesSection}>
              <Text style={styles.sectionLabel}>
                📊 Your {summary.totalCarbonKg.toFixed(0)} kg equals ANY ONE of:
              </Text>
              <Text style={styles.equivalenciesNote}>
                (not combined — each is equivalent to your total)
              </Text>
              
              <View style={styles.equivalencyCard}>
                <View style={styles.equivalencyRow}>
                  <Ionicons name="car" size={24} color={Colors.categoryTransport} />
                  <View style={styles.equivalencyInfo}>
                    <Text style={styles.equivalencyMainValue}>
                      {impact.carKm >= 1000 
                        ? `${(impact.carKm / 1000).toFixed(1)}k km` 
                        : `${impact.carKm.toFixed(0)} km`}
                    </Text>
                    <Text style={styles.equivalencyDescription}>
                      driving in an average car
                    </Text>
                  </View>
                  <Text style={styles.orBadge}>OR</Text>
                </View>
                
                <View style={styles.equivalencyRow}>
                  <Ionicons name="airplane" size={24} color={Colors.info} />
                  <View style={styles.equivalencyInfo}>
                    <Text style={styles.equivalencyMainValue}>
                      {impact.flightHours.toFixed(1)} hours
                    </Text>
                    <Text style={styles.equivalencyDescription}>
                      of flying (economy class)
                    </Text>
                  </View>
                  <Text style={styles.orBadge}>OR</Text>
                </View>
                
                <View style={styles.equivalencyRow}>
                  <Ionicons name="restaurant" size={24} color={Colors.carbonHigh} />
                  <View style={styles.equivalencyInfo}>
                    <Text style={styles.equivalencyMainValue}>
                      {impact.beefMeals.toFixed(0)} beef meals
                    </Text>
                    <Text style={styles.equivalencyDescription}>
                      (beef is high-emission food)
                    </Text>
                  </View>
                  <Text style={styles.orBadge}>OR</Text>
                </View>
                
                <View style={[styles.equivalencyRow, styles.equivalencyRowLast]}>
                  <Ionicons name="leaf" size={24} color={Colors.carbonLow} />
                  <View style={styles.equivalencyInfo}>
                    <Text style={styles.equivalencyMainValue}>
                      {impact.treeMonths.toFixed(0)} months
                    </Text>
                    <Text style={styles.equivalencyDescription}>
                      for 1 tree to absorb this CO₂
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Source note */}
            <Text style={styles.sourceNote}>
              💡 Data from: EU Emissions Trading System, US EPA, IPCC
            </Text>
          </View>
        )}
        
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
        
        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsSectionTitle}>Settings & Data</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={22} color={Colors.primary} />
            )}
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Export Data</Text>
              <Text style={styles.actionSubtitle}>Download as CSV or JSON</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
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
            <Text style={styles.appName}>Carbon Tracer AR</Text>
          </View>
          <Text style={styles.appVersion}>Version 2.0.0 • Gemini 3 Hackathon</Text>
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
  
  // Impact Card
  impactCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  impactTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  sectionLabel: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  corporateSection: {
    marginBottom: Spacing.md,
  },
  mainCostRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
  },
  mainCostItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainCostDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  mainCostValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  mainCostNote: {
    ...TextStyles.bodySmall,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  mainCostExplain: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  offsetSection: {
    marginBottom: Spacing.md,
  },
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonLowBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
  },
  offsetContent: {
    flex: 1,
  },
  offsetAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.carbonLow,
  },
  offsetExplain: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  offsetButton: {
    backgroundColor: Colors.carbonLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.base,
  },
  offsetButtonText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: '600',
  },
  equivalenciesSection: {
    marginBottom: Spacing.md,
  },
  equivalenciesNote: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  equivalencyCard: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
  },
  equivalencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  equivalencyRowLast: {
    borderBottomWidth: 0,
  },
  equivalencyInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  equivalencyMainValue: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  equivalencyDescription: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
  },
  orBadge: {
    ...TextStyles.caption,
    color: Colors.primary,
    fontWeight: '700',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  sourceNote: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
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
  
  // Actions section
  actionsSection: {
    marginBottom: Spacing.base,
  },
  actionsSectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  actionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  actionSubtitle: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
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
