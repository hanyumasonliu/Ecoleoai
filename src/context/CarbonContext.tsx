/**
 * GreenSense AR - Carbon Context
 * 
 * Global state management for daily carbon budget, activities, and tracking.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Activity,
  DailyLog,
  WeeklySummary,
  ActivityCategory,
  ProductActivity,
} from '../types/activity';
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
} from '../types/user';
import { AnalyzedObject } from '../types/carbon';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  DAILY_LOGS: '@greensense_daily_logs',
  USER_SETTINGS: '@greensense_user_settings',
  CURRENT_DATE: '@greensense_current_date',
};

/**
 * Get date string in YYYY-MM-DD format
 */
const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Generate unique ID
 */
const generateId = (): string => {
  return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Carbon Context Type
 */
interface CarbonContextType {
  // Daily data
  todayLog: DailyLog;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  
  // User settings
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  
  // Activities
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>;
  addProductScan: (objects: AnalyzedObject[]) => Promise<void>;
  removeActivity: (activityId: string) => Promise<void>;
  
  // Computed values
  remainingBudget: number;
  isOverBudget: boolean;
  budgetProgress: number;
  categoryTotals: Record<ActivityCategory, number>;
  
  // Weekly data
  weeklySummary: WeeklySummary | null;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  refresh: () => Promise<void>;
}

/**
 * Default daily log
 */
const createEmptyDailyLog = (date: string, budgetKg: number): DailyLog => ({
  date,
  activities: [],
  totalCarbonKg: 0,
  budgetKg,
  isUnderBudget: true,
  categoryTotals: {
    food: 0,
    transport: 0,
    product: 0,
    energy: 0,
  },
});

/**
 * Default context value
 */
const defaultContext: CarbonContextType = {
  todayLog: createEmptyDailyLog(getDateString(), 8),
  selectedDate: new Date(),
  setSelectedDate: () => {},
  settings: DEFAULT_USER_SETTINGS,
  updateSettings: async () => {},
  addActivity: async () => {},
  addProductScan: async () => {},
  removeActivity: async () => {},
  remainingBudget: 8,
  isOverBudget: false,
  budgetProgress: 0,
  categoryTotals: { food: 0, transport: 0, product: 0, energy: 0 },
  weeklySummary: null,
  isLoading: true,
  refresh: async () => {},
};

/**
 * Create context
 */
const CarbonContext = createContext<CarbonContextType>(defaultContext);

/**
 * Provider props
 */
interface CarbonProviderProps {
  children: ReactNode;
}

/**
 * Carbon Provider Component
 */
export function CarbonProvider({ children }: CarbonProviderProps) {
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const todayString = getDateString();
  const selectedDateString = getDateString(selectedDate);

  /**
   * Load data from storage
   */
  const loadData = useCallback(async () => {
    try {
      const [logsData, settingsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS),
      ]);

      if (logsData) {
        setDailyLogs(JSON.parse(logsData));
      }

      if (settingsData) {
        setSettings({ ...DEFAULT_USER_SETTINGS, ...JSON.parse(settingsData) });
      }
    } catch (error) {
      console.error('Error loading carbon data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save daily logs to storage
   */
  const saveDailyLogs = useCallback(async (logs: Record<string, DailyLog>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving daily logs:', error);
    }
  }, []);

  /**
   * Save settings to storage
   */
  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Get or create daily log for a date
   */
  const getDailyLog = useCallback((dateString: string): DailyLog => {
    if (dailyLogs[dateString]) {
      return dailyLogs[dateString];
    }
    return createEmptyDailyLog(dateString, settings.goals.dailyBudgetKg);
  }, [dailyLogs, settings.goals.dailyBudgetKg]);

  /**
   * Today's log
   */
  const todayLog = getDailyLog(todayString);

  /**
   * Recalculate daily log totals
   */
  const recalculateLog = (log: DailyLog): DailyLog => {
    const categoryTotals = { food: 0, transport: 0, product: 0, energy: 0 };
    let totalCarbonKg = 0;

    for (const activity of log.activities) {
      categoryTotals[activity.category] += activity.carbonKg;
      totalCarbonKg += activity.carbonKg;
    }

    return {
      ...log,
      totalCarbonKg,
      categoryTotals,
      isUnderBudget: totalCarbonKg <= log.budgetKg,
    };
  };

  /**
   * Add an activity
   */
  const addActivity = useCallback(async (
    activityData: Omit<Activity, 'id' | 'timestamp'>
  ) => {
    const activity = {
      ...activityData,
      id: generateId(),
      timestamp: new Date().toISOString(),
    } as Activity;

    const dateString = getDateString();
    const currentLog = getDailyLog(dateString);
    const updatedLog = recalculateLog({
      ...currentLog,
      activities: [activity, ...currentLog.activities],
    });

    const newLogs = {
      ...dailyLogs,
      [dateString]: updatedLog,
    };

    setDailyLogs(newLogs);
    await saveDailyLogs(newLogs);

    // Update settings stats
    const newSettings = {
      ...settings,
      totalScans: settings.totalScans + 1,
      totalCarbonTracked: settings.totalCarbonTracked + activity.carbonKg,
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [dailyLogs, settings, getDailyLog, saveDailyLogs, saveSettings]);

  /**
   * Add product scan (from camera)
   */
  const addProductScan = useCallback(async (objects: AnalyzedObject[]) => {
    const totalCarbon = objects.reduce((sum, obj) => sum + obj.carbonKg, 0);
    
    const activity: Omit<ProductActivity, 'id' | 'timestamp'> = {
      category: 'product',
      name: objects.map(o => o.name).slice(0, 2).join(', ') + 
            (objects.length > 2 ? ` +${objects.length - 2} more` : ''),
      carbonKg: totalCarbon,
      quantity: objects.length,
      unit: 'items',
      ecoScore: Math.max(0, 100 - Math.round(totalCarbon / 3)),
      objects: objects.map(o => ({
        id: o.id,
        name: o.name,
        carbonKg: o.carbonKg,
        severity: o.severity,
        description: o.description,
      })),
    };

    await addActivity(activity);
  }, [addActivity]);

  /**
   * Remove an activity
   */
  const removeActivity = useCallback(async (activityId: string) => {
    const dateString = getDateString();
    const currentLog = getDailyLog(dateString);
    const activity = currentLog.activities.find(a => a.id === activityId);
    
    const updatedLog = recalculateLog({
      ...currentLog,
      activities: currentLog.activities.filter(a => a.id !== activityId),
    });

    const newLogs = {
      ...dailyLogs,
      [dateString]: updatedLog,
    };

    setDailyLogs(newLogs);
    await saveDailyLogs(newLogs);

    // Update settings stats
    if (activity) {
      const newSettings = {
        ...settings,
        totalCarbonTracked: Math.max(0, settings.totalCarbonTracked - activity.carbonKg),
      };
      setSettings(newSettings);
      await saveSettings(newSettings);
    }
  }, [dailyLogs, settings, getDailyLog, saveDailyLogs, saveSettings]);

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  /**
   * Calculate weekly summary
   */
  const weeklySummary = React.useMemo((): WeeklySummary | null => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekStartString = getDateString(weekStart);

    const dailyTotals: number[] = [];
    let weekTotal = 0;
    const categoryTotals = { food: 0, transport: 0, product: 0, energy: 0 };
    let daysUnderBudget = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateString = getDateString(date);
      const log = dailyLogs[dateString];

      if (log) {
        dailyTotals.push(log.totalCarbonKg);
        weekTotal += log.totalCarbonKg;
        categoryTotals.food += log.categoryTotals.food;
        categoryTotals.transport += log.categoryTotals.transport;
        categoryTotals.product += log.categoryTotals.product;
        categoryTotals.energy += log.categoryTotals.energy;
        if (log.isUnderBudget) daysUnderBudget++;
      } else {
        dailyTotals.push(0);
      }
    }

    return {
      weekStart: weekStartString,
      dailyTotals,
      weekTotal,
      categoryTotals,
      vsLastWeek: {
        difference: 0, // TODO: Calculate from previous week
        percentChange: 0,
        improved: false,
      },
      daysUnderBudget,
    };
  }, [dailyLogs]);

  /**
   * Computed values
   */
  const remainingBudget = Math.max(0, todayLog.budgetKg - todayLog.totalCarbonKg);
  const isOverBudget = todayLog.totalCarbonKg > todayLog.budgetKg;
  const budgetProgress = Math.min(todayLog.totalCarbonKg / todayLog.budgetKg, 1);

  const value: CarbonContextType = {
    todayLog,
    selectedDate,
    setSelectedDate,
    settings,
    updateSettings,
    addActivity,
    addProductScan,
    removeActivity,
    remainingBudget,
    isOverBudget,
    budgetProgress,
    categoryTotals: todayLog.categoryTotals,
    weeklySummary,
    isLoading,
    refresh: loadData,
  };

  return (
    <CarbonContext.Provider value={value}>
      {children}
    </CarbonContext.Provider>
  );
}

/**
 * Hook to access carbon context
 */
export function useCarbon(): CarbonContextType {
  const context = useContext(CarbonContext);
  if (!context) {
    throw new Error('useCarbon must be used within a CarbonProvider');
  }
  return context;
}

export default CarbonContext;

