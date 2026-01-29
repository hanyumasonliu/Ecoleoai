/**
 * GreenSense AR - User Type Definitions
 * 
 * Types for user settings, profile, achievements, and goals.
 */

import { TransportMode } from './activity';

/**
 * User notification preferences
 */
export interface NotificationSettings {
  /** Daily reminder to log */
  dailyReminder: boolean;
  /** Time for daily reminder (HH:MM) */
  dailyReminderTime: string;
  /** Alert when approaching budget */
  budgetWarning: boolean;
  /** Weekly summary notification */
  weeklySummary: boolean;
  /** Achievement unlocked */
  achievements: boolean;
}

/**
 * User's home energy setup
 */
export interface HomeEnergySettings {
  /** Home size in square feet/meters */
  homeSize: number;
  /** Unit for home size */
  homeSizeUnit: 'sqft' | 'sqm';
  /** Number of occupants */
  occupants: number;
  /** Primary heating source */
  heatingSource: 'electricity' | 'natural_gas' | 'heating_oil' | 'heat_pump' | 'solar';
  /** Estimated monthly electricity (kWh) */
  monthlyElectricityKwh: number;
  /** Has solar panels */
  hasSolar: boolean;
  /** Region/grid for emission factors */
  gridRegion?: string;
}

/**
 * User's transport defaults
 */
export interface TransportSettings {
  /** Default commute mode */
  defaultCommuteMode: TransportMode;
  /** Daily commute distance (one way) in km */
  commuteDistanceKm: number;
  /** Car fuel type if applicable */
  carFuelType?: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  /** Car fuel efficiency (L/100km or kWh/100km) */
  carEfficiency?: number;
  /** Days per week commuting */
  commuteDaysPerWeek: number;
}

/**
 * User goals
 */
export interface UserGoals {
  /** Daily carbon budget in kg CO₂e */
  dailyBudgetKg: number;
  /** Weekly carbon target in kg CO₂e */
  weeklyTargetKg: number;
  /** Target reduction percentage from baseline */
  reductionTargetPercent: number;
  /** Target streak days */
  streakGoalDays: number;
}

/**
 * Achievement definition
 */
export interface Achievement {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Emoji icon */
  emoji: string;
  /** Whether unlocked */
  unlocked: boolean;
  /** Date unlocked (ISO string) */
  unlockedAt?: string;
  /** Progress toward unlocking (0-100) */
  progress: number;
  /** Requirement to unlock */
  requirement: string;
}

/**
 * Predefined achievements
 */
export const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first_scan',
    name: 'First Scan',
    description: 'Complete your first product scan',
    emoji: '🌱',
    requirement: 'Scan 1 item',
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Log activities for 7 consecutive days',
    emoji: '🔥',
    requirement: '7 day streak',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Log activities for 30 consecutive days',
    emoji: '🏆',
    requirement: '30 day streak',
  },
  {
    id: 'under_budget',
    name: 'Budget Boss',
    description: 'Stay under your daily budget',
    emoji: '💚',
    requirement: 'Under budget for 1 day',
  },
  {
    id: 'under_budget_week',
    name: 'Week Warrior',
    description: 'Stay under budget for an entire week',
    emoji: '🌟',
    requirement: 'Under budget for 7 days',
  },
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Reduce weekly emissions by 20%',
    emoji: '🦸',
    requirement: '20% reduction vs previous week',
  },
  {
    id: 'carbon_neutral',
    name: 'Carbon Neutral',
    description: 'Offset all your carbon for a day',
    emoji: '🌍',
    requirement: 'Offset 100% of daily carbon',
  },
  {
    id: 'scanner_pro',
    name: 'Scanner Pro',
    description: 'Scan 50 products',
    emoji: '📷',
    requirement: 'Scan 50 items',
  },
  {
    id: 'multi_tracker',
    name: 'Multi Tracker',
    description: 'Log activities in all 4 categories in one day',
    emoji: '🎯',
    requirement: 'Log food, transport, product, and energy in 1 day',
  },
  {
    id: 'green_commuter',
    name: 'Green Commuter',
    description: 'Use sustainable transport for a week',
    emoji: '🚴',
    requirement: 'No car use for 7 days',
  },
];

/**
 * User level based on activity
 */
export interface UserLevel {
  /** Level number */
  level: number;
  /** Level name */
  name: string;
  /** Emoji */
  emoji: string;
  /** Min scans for this level */
  minScans: number;
  /** Color theme */
  color: string;
}

/**
 * User levels progression
 */
export const USER_LEVELS: UserLevel[] = [
  { level: 1, name: 'Getting Started', emoji: '🌿', minScans: 0, color: '#64748B' },
  { level: 2, name: 'Green Explorer', emoji: '🍃', minScans: 5, color: '#0D9373' },
  { level: 3, name: 'Eco Warrior', emoji: '🌱', minScans: 20, color: '#22C55E' },
  { level: 4, name: 'Carbon Champion', emoji: '🌟', minScans: 50, color: '#F59E0B' },
  { level: 5, name: 'Planet Protector', emoji: '🌍', minScans: 100, color: '#3B82F6' },
];

/**
 * Complete user settings
 */
export interface UserSettings {
  /** User display name */
  name: string;
  /** Email (optional) */
  email?: string;
  /** Avatar URI (optional) */
  avatarUri?: string;
  /** Date joined (ISO string) */
  joinedDate: string;
  /** User goals */
  goals: UserGoals;
  /** Home energy settings */
  homeEnergy: HomeEnergySettings;
  /** Transport settings */
  transport: TransportSettings;
  /** Notification settings */
  notifications: NotificationSettings;
  /** Preferred units */
  units: {
    distance: 'km' | 'miles';
    weight: 'kg' | 'lbs';
  };
  /** Current streak */
  currentStreak: number;
  /** Longest streak */
  longestStreak: number;
  /** Total scans */
  totalScans: number;
  /** Total carbon tracked (lifetime) */
  totalCarbonTracked: number;
  /** Total carbon offset */
  totalCarbonOffset: number;
  /** Unlocked achievements */
  achievements: Achievement[];
}

/**
 * Default user settings for new users
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  name: 'Carbon Hero',
  joinedDate: new Date().toISOString(),
  goals: {
    dailyBudgetKg: 8, // ~3 tonnes/year target
    weeklyTargetKg: 56,
    reductionTargetPercent: 10,
    streakGoalDays: 7,
  },
  homeEnergy: {
    homeSize: 1000,
    homeSizeUnit: 'sqft',
    occupants: 2,
    heatingSource: 'natural_gas',
    monthlyElectricityKwh: 500,
    hasSolar: false,
  },
  transport: {
    defaultCommuteMode: 'car',
    commuteDistanceKm: 20,
    carFuelType: 'petrol',
    carEfficiency: 8, // L/100km
    commuteDaysPerWeek: 5,
  },
  notifications: {
    dailyReminder: true,
    dailyReminderTime: '20:00',
    budgetWarning: true,
    weeklySummary: true,
    achievements: true,
  },
  units: {
    distance: 'km',
    weight: 'kg',
  },
  currentStreak: 0,
  longestStreak: 0,
  totalScans: 0,
  totalCarbonTracked: 0,
  totalCarbonOffset: 0,
  achievements: ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: false,
    progress: 0,
  })),
};

