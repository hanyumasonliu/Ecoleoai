/**
 * GreenSense AR - Data Layer
 * 
 * Unified data access layer designed for easy migration to Supabase.
 * Currently uses AsyncStorage for local persistence.
 * 
 * MIGRATION NOTE: To switch to Supabase:
 * 1. Replace AsyncStorage calls with Supabase client queries
 * 2. Update the DataProvider type to use Supabase types
 * 3. Keep the same function signatures for compatibility
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanRecord, HistorySummary, AnalyzedObject } from '../types/carbon';
import { Activity, DailyLog, ActivityCategory, TransportMode } from '../types/activity';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../types/user';

// ============================================================================
// STORAGE KEYS - Will be replaced by Supabase table names
// ============================================================================
const STORAGE_KEYS = {
  // Core data
  DAILY_LOGS: '@greensense_daily_logs',
  SCAN_HISTORY: '@greensense_scan_history',
  TRIP_HISTORY: '@greensense_trip_history',
  USER_SETTINGS: '@greensense_user_settings',
  USER_PROFILE: '@greensense_user_profile',
  
  // Meta
  LAST_SYNC: '@greensense_last_sync',
  DATA_VERSION: '@greensense_data_version',
};

// Current data version for migrations
const DATA_VERSION = 1;

// ============================================================================
// TYPES
// ============================================================================

export interface DailyLogData {
  date: string; // YYYY-MM-DD format
  activities: Activity[];
  totalCarbonKg: number;
  budgetKg: number;
  categoryTotals: Record<ActivityCategory, number>;
}

export interface TripData {
  id: string;
  startTime: string;
  endTime?: string;
  distanceKm: number;
  durationMinutes: number;
  detectedMode: TransportMode;
  confirmedMode?: TransportMode;
  carbonKg: number;
  isConfirmed: boolean;
  route?: {
    origin: { lat: number; lng: number; address?: string };
    destination: { lat: number; lng: number; address?: string };
  };
}

export interface UserProfileData {
  id?: string;
  name: string;
  email?: string;
  joinedDate: string;
  totalScans: number;
  totalCarbonTracked: number;
  streakDays: number;
  lastActiveDate: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get date string in YYYY-MM-DD format
 */
export const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Generate unique ID
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get start of week date
 */
export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get dates for a week starting from a date
 */
export const getWeekDates = (startDate: Date): string[] => {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(getDateString(d));
  }
  return dates;
};

// ============================================================================
// DAILY LOGS - Activities grouped by date
// ============================================================================

/**
 * Get all daily logs
 * SUPABASE: SELECT * FROM daily_logs WHERE user_id = ?
 */
export async function getAllDailyLogs(): Promise<Record<string, DailyLogData>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting daily logs:', error);
    return {};
  }
}

/**
 * Get daily log for a specific date
 * SUPABASE: SELECT * FROM daily_logs WHERE user_id = ? AND date = ?
 */
export async function getDailyLog(date: string, budgetKg: number = 8): Promise<DailyLogData> {
  const logs = await getAllDailyLogs();
  if (logs[date]) {
    return logs[date];
  }
  
  // Return empty log for this date
  return {
    date,
    activities: [],
    totalCarbonKg: 0,
    budgetKg,
    categoryTotals: { food: 0, transport: 0, product: 0, energy: 0 },
  };
}

/**
 * Get daily logs for a date range
 * SUPABASE: SELECT * FROM daily_logs WHERE user_id = ? AND date BETWEEN ? AND ?
 */
export async function getDailyLogsForRange(
  startDate: string,
  endDate: string
): Promise<DailyLogData[]> {
  const logs = await getAllDailyLogs();
  const result: DailyLogData[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = getDateString(d);
    if (logs[dateStr]) {
      result.push(logs[dateStr]);
    }
  }
  
  return result;
}

/**
 * Get weekly summary
 * SUPABASE: Aggregate query on daily_logs
 */
export async function getWeeklySummary(weekStart?: Date): Promise<{
  dailyTotals: number[];
  weekTotal: number;
  categoryTotals: Record<ActivityCategory, number>;
  daysUnderBudget: number;
  dates: string[];
}> {
  const start = weekStart || getWeekStart();
  const dates = getWeekDates(start);
  const logs = await getAllDailyLogs();
  
  const dailyTotals: number[] = [];
  let weekTotal = 0;
  const categoryTotals = { food: 0, transport: 0, product: 0, energy: 0 };
  let daysUnderBudget = 0;
  
  for (const dateStr of dates) {
    const log = logs[dateStr];
    if (log) {
      dailyTotals.push(log.totalCarbonKg);
      weekTotal += log.totalCarbonKg;
      categoryTotals.food += log.categoryTotals.food || 0;
      categoryTotals.transport += log.categoryTotals.transport || 0;
      categoryTotals.product += log.categoryTotals.product || 0;
      categoryTotals.energy += log.categoryTotals.energy || 0;
      if (log.totalCarbonKg <= log.budgetKg) daysUnderBudget++;
    } else {
      dailyTotals.push(0);
    }
  }
  
  return { dailyTotals, weekTotal, categoryTotals, daysUnderBudget, dates };
}

/**
 * Save daily log
 * SUPABASE: UPSERT INTO daily_logs
 */
export async function saveDailyLog(log: DailyLogData): Promise<void> {
  try {
    const logs = await getAllDailyLogs();
    logs[log.date] = log;
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving daily log:', error);
    throw error;
  }
}

/**
 * Add activity to a date
 * SUPABASE: INSERT INTO activities, then update daily_logs aggregate
 */
export async function addActivity(
  activity: Omit<Activity, 'id' | 'timestamp'>,
  date: string = getDateString(),
  budgetKg: number = 8
): Promise<Activity> {
  const fullActivity = {
    ...activity,
    id: generateId('act'),
    timestamp: new Date().toISOString(),
  } as Activity;
  
  const log = await getDailyLog(date, budgetKg);
  log.activities.unshift(fullActivity);
  
  // Recalculate totals
  log.totalCarbonKg = log.activities.reduce((sum, a) => sum + a.carbonKg, 0);
  log.categoryTotals = {
    food: log.activities.filter(a => a.category === 'food').reduce((sum, a) => sum + a.carbonKg, 0),
    transport: log.activities.filter(a => a.category === 'transport').reduce((sum, a) => sum + a.carbonKg, 0),
    product: log.activities.filter(a => a.category === 'product').reduce((sum, a) => sum + a.carbonKg, 0),
    energy: log.activities.filter(a => a.category === 'energy').reduce((sum, a) => sum + a.carbonKg, 0),
  };
  
  await saveDailyLog(log);
  return fullActivity;
}

/**
 * Remove activity from a date
 * SUPABASE: DELETE FROM activities WHERE id = ?
 */
export async function removeActivity(activityId: string, date: string): Promise<void> {
  const log = await getDailyLog(date);
  log.activities = log.activities.filter(a => a.id !== activityId);
  
  // Recalculate totals
  log.totalCarbonKg = log.activities.reduce((sum, a) => sum + a.carbonKg, 0);
  log.categoryTotals = {
    food: log.activities.filter(a => a.category === 'food').reduce((sum, a) => sum + a.carbonKg, 0),
    transport: log.activities.filter(a => a.category === 'transport').reduce((sum, a) => sum + a.carbonKg, 0),
    product: log.activities.filter(a => a.category === 'product').reduce((sum, a) => sum + a.carbonKg, 0),
    energy: log.activities.filter(a => a.category === 'energy').reduce((sum, a) => sum + a.carbonKg, 0),
  };
  
  await saveDailyLog(log);
}

// ============================================================================
// SCAN HISTORY - Legacy scan records for backward compatibility
// ============================================================================

/**
 * Get all scan history
 * SUPABASE: SELECT * FROM scans WHERE user_id = ? ORDER BY timestamp DESC
 */
export async function getScanHistory(): Promise<ScanRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting scan history:', error);
    return [];
  }
}

/**
 * Get scans for a specific date
 * SUPABASE: SELECT * FROM scans WHERE user_id = ? AND DATE(timestamp) = ?
 */
export async function getScansForDate(date: string): Promise<ScanRecord[]> {
  const history = await getScanHistory();
  return history.filter(scan => {
    const scanDate = new Date(scan.timestamp).toISOString().split('T')[0];
    return scanDate === date;
  });
}

/**
 * Save scan record
 * SUPABASE: INSERT INTO scans
 */
export async function saveScanRecord(scan: ScanRecord): Promise<void> {
  try {
    const history = await getScanHistory();
    history.unshift(scan);
    
    // Keep last 500 scans
    const trimmed = history.slice(0, 500);
    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving scan record:', error);
    throw error;
  }
}

/**
 * Delete scan record
 * SUPABASE: DELETE FROM scans WHERE id = ?
 */
export async function deleteScanRecord(scanId: string): Promise<void> {
  try {
    const history = await getScanHistory();
    const filtered = history.filter(s => s.id !== scanId);
    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting scan record:', error);
    throw error;
  }
}

/**
 * Get history summary
 * SUPABASE: Aggregate query on scans
 */
export async function getHistorySummary(): Promise<HistorySummary> {
  const history = await getScanHistory();
  
  if (history.length === 0) {
    return {
      totalScans: 0,
      totalObjects: 0,
      totalCarbonKg: 0,
      objectCategories: {},
      topObjectTypes: [],
      averageCarbonPerScan: 0,
    };
  }
  
  let totalObjects = 0;
  let totalCarbonKg = 0;
  const objectCounts: Record<string, number> = {};
  
  for (const scan of history) {
    totalObjects += scan.objects.length;
    totalCarbonKg += scan.totalCarbonKg;
    
    for (const obj of scan.objects) {
      objectCounts[obj.name] = (objectCounts[obj.name] || 0) + 1;
    }
  }
  
  const topObjectTypes = Object.entries(objectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name);
  
  return {
    totalScans: history.length,
    totalObjects,
    totalCarbonKg: Math.round(totalCarbonKg * 100) / 100,
    objectCategories: objectCounts,
    topObjectTypes,
    averageCarbonPerScan: history.length > 0 
      ? Math.round((totalCarbonKg / history.length) * 100) / 100 
      : 0,
  };
}

// ============================================================================
// TRIP HISTORY
// ============================================================================

/**
 * Get all trips
 * SUPABASE: SELECT * FROM trips WHERE user_id = ? ORDER BY start_time DESC
 */
export async function getTripHistory(): Promise<TripData[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting trip history:', error);
    return [];
  }
}

/**
 * Get trips for a specific date
 * SUPABASE: SELECT * FROM trips WHERE user_id = ? AND DATE(start_time) = ?
 */
export async function getTripsForDate(date: string): Promise<TripData[]> {
  const trips = await getTripHistory();
  return trips.filter(trip => {
    const tripDate = new Date(trip.startTime).toISOString().split('T')[0];
    return tripDate === date;
  });
}

/**
 * Save trip
 * SUPABASE: INSERT INTO trips
 */
export async function saveTrip(trip: TripData): Promise<void> {
  try {
    const trips = await getTripHistory();
    const existingIndex = trips.findIndex(t => t.id === trip.id);
    
    if (existingIndex >= 0) {
      trips[existingIndex] = trip;
    } else {
      trips.unshift(trip);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_HISTORY, JSON.stringify(trips));
  } catch (error) {
    console.error('Error saving trip:', error);
    throw error;
  }
}

/**
 * Delete trip
 * SUPABASE: DELETE FROM trips WHERE id = ?
 */
export async function deleteTrip(tripId: string): Promise<void> {
  try {
    const trips = await getTripHistory();
    const filtered = trips.filter(t => t.id !== tripId);
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_HISTORY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
}

// ============================================================================
// USER SETTINGS & PROFILE
// ============================================================================

/**
 * Get user settings
 * SUPABASE: SELECT * FROM user_settings WHERE user_id = ?
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (data) {
      return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_USER_SETTINGS;
  } catch (error) {
    console.error('Error getting user settings:', error);
    return DEFAULT_USER_SETTINGS;
  }
}

/**
 * Save user settings
 * SUPABASE: UPSERT INTO user_settings
 */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
}

/**
 * Get user profile
 * SUPABASE: SELECT * FROM profiles WHERE id = ?
 */
export async function getUserProfile(): Promise<UserProfileData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (data) {
      return JSON.parse(data);
    }
    
    // Default profile
    return {
      name: 'Carbon Hero',
      joinedDate: new Date().toISOString(),
      totalScans: 0,
      totalCarbonTracked: 0,
      streakDays: 0,
      lastActiveDate: getDateString(),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      name: 'Carbon Hero',
      joinedDate: new Date().toISOString(),
      totalScans: 0,
      totalCarbonTracked: 0,
      streakDays: 0,
      lastActiveDate: getDateString(),
    };
  }
}

/**
 * Save user profile
 * SUPABASE: UPSERT INTO profiles
 */
export async function saveUserProfile(profile: UserProfileData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

/**
 * Update profile stats from activity data
 * SUPABASE: Use database triggers or computed columns
 */
export async function syncProfileStats(): Promise<UserProfileData> {
  const [profile, summary, logs] = await Promise.all([
    getUserProfile(),
    getHistorySummary(),
    getAllDailyLogs(),
  ]);
  
  // Calculate streak
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getDateString(d);
    if (logs[dateStr] && logs[dateStr].activities.length > 0) {
      streakDays++;
    } else if (i > 0) {
      break;
    }
  }
  
  const totalCarbonFromLogs = Object.values(logs).reduce(
    (sum, log) => sum + log.totalCarbonKg, 0
  );
  
  const updatedProfile: UserProfileData = {
    ...profile,
    totalScans: summary.totalScans,
    totalCarbonTracked: totalCarbonFromLogs,
    streakDays,
    lastActiveDate: getDateString(),
  };
  
  await saveUserProfile(updatedProfile);
  return updatedProfile;
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

/**
 * Clear all data
 * SUPABASE: DELETE FROM all tables WHERE user_id = ?
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
}

/**
 * Export all data as JSON
 * SUPABASE: SELECT * FROM all tables WHERE user_id = ?
 */
export async function exportAllData(): Promise<{
  dailyLogs: Record<string, DailyLogData>;
  scanHistory: ScanRecord[];
  tripHistory: TripData[];
  settings: UserSettings;
  profile: UserProfileData;
  exportDate: string;
  version: number;
}> {
  const [dailyLogs, scanHistory, tripHistory, settings, profile] = await Promise.all([
    getAllDailyLogs(),
    getScanHistory(),
    getTripHistory(),
    getUserSettings(),
    getUserProfile(),
  ]);
  
  return {
    dailyLogs,
    scanHistory,
    tripHistory,
    settings,
    profile,
    exportDate: new Date().toISOString(),
    version: DATA_VERSION,
  };
}

/**
 * Import data from JSON
 * SUPABASE: Bulk insert operations
 */
export async function importData(data: ReturnType<typeof exportAllData> extends Promise<infer T> ? T : never): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(data.dailyLogs)),
      AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(data.scanHistory)),
      AsyncStorage.setItem(STORAGE_KEYS.TRIP_HISTORY, JSON.stringify(data.tripHistory)),
      AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(data.settings)),
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.profile)),
    ]);
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

export default {
  // Daily logs
  getAllDailyLogs,
  getDailyLog,
  getDailyLogsForRange,
  getWeeklySummary,
  saveDailyLog,
  addActivity,
  removeActivity,
  
  // Scans
  getScanHistory,
  getScansForDate,
  saveScanRecord,
  deleteScanRecord,
  getHistorySummary,
  
  // Trips
  getTripHistory,
  getTripsForDate,
  saveTrip,
  deleteTrip,
  
  // Settings & Profile
  getUserSettings,
  saveUserSettings,
  getUserProfile,
  saveUserProfile,
  syncProfileStats,
  
  // Data management
  clearAllData,
  exportAllData,
  importData,
  
  // Utils
  getDateString,
  generateId,
  getWeekStart,
  getWeekDates,
};

