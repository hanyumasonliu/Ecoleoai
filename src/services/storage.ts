/**
 * CarbonSense AR - Storage Service
 * 
 * Handles local data persistence using AsyncStorage.
 * Provides wrappers for saving and retrieving scan history.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanRecord, HistorySummary, UserProfile } from '../types/carbon';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  SCAN_HISTORY: '@carbonsense_scan_history',
  USER_PROFILE: '@carbonsense_user_profile',
  ONBOARDING_COMPLETE: '@carbonsense_onboarding_complete',
};

/**
 * Save a new scan record to history
 * 
 * @param scan - The scan record to save
 */
export async function saveScanRecord(scan: ScanRecord): Promise<void> {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    const history: ScanRecord[] = existingData ? JSON.parse(existingData) : [];
    
    // Add new scan at the beginning (newest first)
    history.unshift(scan);
    
    // Keep only the last 100 scans to prevent storage bloat
    const trimmedHistory = history.slice(0, 100);
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCAN_HISTORY,
      JSON.stringify(trimmedHistory)
    );
  } catch (error) {
    console.error('Error saving scan record:', error);
    throw error;
  }
}

/**
 * Get all scan records from history
 * 
 * @returns Array of scan records, newest first
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
 * Get a single scan record by ID
 * 
 * @param scanId - The ID of the scan to retrieve
 * @returns The scan record or null if not found
 */
export async function getScanById(scanId: string): Promise<ScanRecord | null> {
  try {
    const history = await getScanHistory();
    return history.find(scan => scan.id === scanId) || null;
  } catch (error) {
    console.error('Error getting scan by ID:', error);
    return null;
  }
}

/**
 * Delete a scan record from history
 * 
 * @param scanId - The ID of the scan to delete
 */
export async function deleteScanRecord(scanId: string): Promise<void> {
  try {
    const history = await getScanHistory();
    const filteredHistory = history.filter(scan => scan.id !== scanId);
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCAN_HISTORY,
      JSON.stringify(filteredHistory)
    );
  } catch (error) {
    console.error('Error deleting scan record:', error);
    throw error;
  }
}

/**
 * Clear all scan history
 */
export async function clearScanHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
  } catch (error) {
    console.error('Error clearing scan history:', error);
    throw error;
  }
}

/**
 * Generate a summary of the user's scan history for coach insights
 * 
 * @returns HistorySummary object with aggregated data
 */
export async function getHistorySummary(): Promise<HistorySummary> {
  try {
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
    
    // Aggregate data
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
    
    // Get top 5 most scanned object types
    const sortedObjects = Object.entries(objectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);
    
    return {
      totalScans: history.length,
      totalObjects,
      totalCarbonKg: Math.round(totalCarbonKg * 100) / 100,
      objectCategories: objectCounts,
      topObjectTypes: sortedObjects,
      averageCarbonPerScan: history.length > 0 
        ? Math.round((totalCarbonKg / history.length) * 100) / 100 
        : 0,
    };
  } catch (error) {
    console.error('Error generating history summary:', error);
    return {
      totalScans: 0,
      totalObjects: 0,
      totalCarbonKg: 0,
      objectCategories: {},
      topObjectTypes: [],
      averageCarbonPerScan: 0,
    };
  }
}

/**
 * Save user profile data
 * 
 * @param profile - User profile data to save
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(profile)
    );
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

/**
 * Get user profile data
 * 
 * @returns User profile or default values if not set
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    
    if (data) {
      return JSON.parse(data);
    }
    
    // Return default profile for new users
    const defaultProfile: UserProfile = {
      name: 'Carbon Hero',
      joinedDate: new Date().toISOString(),
      totalScans: 0,
      totalCarbonTracked: 0,
    };
    
    return defaultProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      name: 'Carbon Hero',
      joinedDate: new Date().toISOString(),
      totalScans: 0,
      totalCarbonTracked: 0,
    };
  }
}

/**
 * Update user profile with latest stats from history
 */
export async function syncProfileWithHistory(): Promise<UserProfile> {
  try {
    const [profile, summary] = await Promise.all([
      getUserProfile(),
      getHistorySummary(),
    ]);
    
    const updatedProfile: UserProfile = {
      ...profile,
      totalScans: summary.totalScans,
      totalCarbonTracked: summary.totalCarbonKg,
    };
    
    await saveUserProfile(updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('Error syncing profile with history:', error);
    throw error;
  }
}

/**
 * Check if onboarding has been completed
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as complete
 */
export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  } catch (error) {
    console.error('Error setting onboarding complete:', error);
  }
}

export default {
  saveScanRecord,
  getScanHistory,
  getScanById,
  deleteScanRecord,
  clearScanHistory,
  getHistorySummary,
  saveUserProfile,
  getUserProfile,
  syncProfileWithHistory,
  isOnboardingComplete,
  setOnboardingComplete,
};

