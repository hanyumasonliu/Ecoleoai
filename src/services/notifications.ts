/**
 * GreenSense AR - Notifications Service
 * 
 * Handles push notifications for:
 * - Daily budget warnings
 * - Trip detection confirmations
 * - Daily reminders
 * - Achievement unlocks
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATION_TOKEN: '@greensense_notification_token',
  NOTIFICATION_SETTINGS: '@greensense_notification_settings',
};

// Notification channel IDs
const CHANNELS = {
  BUDGET: 'budget-alerts',
  TRIPS: 'trip-confirmations',
  REMINDERS: 'daily-reminders',
  ACHIEVEMENTS: 'achievements',
};

/**
 * Notification settings
 */
export interface NotificationPreferences {
  budgetWarnings: boolean;
  tripConfirmations: boolean;
  dailyReminders: boolean;
  reminderTime: string; // HH:MM format
  achievements: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  budgetWarnings: true,
  tripConfirmations: true,
  dailyReminders: true,
  reminderTime: '20:00',
  achievements: true,
};

/**
 * Configure notification handler
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission denied');
    return false;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  return true;
}

/**
 * Set up Android notification channels
 */
async function setupAndroidChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNELS.BUDGET, {
    name: 'Budget Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.TRIPS, {
    name: 'Trip Confirmations',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#3B82F6',
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.REMINDERS, {
    name: 'Daily Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  await Notifications.setNotificationChannelAsync(CHANNELS.ACHIEVEMENTS, {
    name: 'Achievements',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#22C55E',
  });
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const prefsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (prefsJson) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsJson) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save notification preferences
 */
export async function saveNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const current = await getNotificationPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
}

/**
 * Send a local notification immediately
 */
export async function sendNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId?: string
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
  return id;
}

/**
 * Send budget warning notification
 */
export async function sendBudgetWarning(
  currentCarbon: number,
  budgetCarbon: number,
  percentUsed: number
): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.budgetWarnings) return;

  let title: string;
  let body: string;

  if (percentUsed >= 100) {
    title = '⚠️ Daily Budget Exceeded!';
    body = `You've used ${currentCarbon.toFixed(1)} kg CO₂e today, exceeding your ${budgetCarbon} kg budget.`;
  } else if (percentUsed >= 80) {
    title = '🔔 Approaching Daily Budget';
    body = `You've used ${percentUsed.toFixed(0)}% of your daily carbon budget (${currentCarbon.toFixed(1)}/${budgetCarbon} kg).`;
  } else {
    return; // Don't send notification below 80%
  }

  await sendNotification(title, body, { type: 'budget_warning' }, CHANNELS.BUDGET);
}

/**
 * Send trip confirmation notification
 */
export async function sendTripConfirmation(
  tripId: string,
  distanceKm: number,
  detectedMode: string,
  carbonKg: number
): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.tripConfirmations) return;

  const modeEmojis: Record<string, string> = {
    walk: '🚶',
    bike: '🚴',
    car: '🚗',
    bus: '🚌',
    train: '🚄',
    plane: '✈️',
    subway: '🚇',
    motorcycle: '🏍️',
    uber: '🚕',
    electric_car: '🔋',
  };

  const emoji = modeEmojis[detectedMode] || '🚗';
  const title = `${emoji} Trip Detected`;
  const body = `${distanceKm.toFixed(1)} km ${detectedMode} trip = ${carbonKg.toFixed(2)} kg CO₂e. Tap to confirm.`;

  await sendNotification(
    title,
    body,
    { type: 'trip_confirmation', tripId },
    CHANNELS.TRIPS
  );
}

/**
 * Schedule daily reminder notification
 */
export async function scheduleDailyReminder(): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.dailyReminders) {
    // Cancel existing reminders
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  // Cancel existing reminders first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Parse reminder time
  const [hours, minutes] = prefs.reminderTime.split(':').map(Number);

  // Schedule daily reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌱 Daily Carbon Check-in',
      body: "Don't forget to log your activities today!",
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });
}

/**
 * Send achievement unlocked notification
 */
export async function sendAchievementNotification(
  achievementName: string,
  emoji: string
): Promise<void> {
  const prefs = await getNotificationPreferences();
  if (!prefs.achievements) return;

  await sendNotification(
    `${emoji} Achievement Unlocked!`,
    `Congratulations! You've earned the "${achievementName}" badge.`,
    { type: 'achievement' },
    CHANNELS.ACHIEVEMENTS
  );
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export default {
  requestNotificationPermissions,
  getNotificationPreferences,
  saveNotificationPreferences,
  sendNotification,
  sendBudgetWarning,
  sendTripConfirmation,
  scheduleDailyReminder,
  sendAchievementNotification,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  cancelAllNotifications,
};

