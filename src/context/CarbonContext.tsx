/**
 * GreenSense AR - Carbon Context
 * 
 * Global state management for daily carbon budget, activities, and tracking.
 * Uses dataLayer for persistence (designed for easy Supabase migration).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import {
  Activity,
  DailyLog,
  WeeklySummary,
  ActivityCategory,
  ProductActivity,
  TransportActivity,
  FoodActivity,
  EnergyActivity,
} from '../types/activity';
import {
  UserSettings,
  DEFAULT_USER_SETTINGS,
  EnergyBaselines,
  EnergyBaseline,
  DEFAULT_ENERGY_BASELINES,
} from '../types/user';
import { AnalyzedObject, ScanRecord } from '../types/carbon';
import {
  getAllDailyLogs,
  getDailyLog,
  saveDailyLog,
  addActivity as dataLayerAddActivity,
  removeActivity as dataLayerRemoveActivity,
  getUserSettings,
  saveUserSettings,
  getWeeklySummary,
  getDateString,
  generateId,
  getScanHistory,
  saveScanRecord,
  getScansForDate,
  DailyLogData,
} from '../services/dataLayer';

/**
 * Carbon Context Type
 */
interface CarbonContextType {
  // Daily data
  todayLog: DailyLog;
  selectedDate: Date;
  selectedDateLog: DailyLog;
  setSelectedDate: (date: Date) => void;
  
  // User settings
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  
  // Activities
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>, date?: string) => Promise<void>;
  addProductScan: (objects: AnalyzedObject[], date?: string) => Promise<void>;
  addTransportActivity: (trip: Omit<TransportActivity, 'id' | 'timestamp' | 'category'>) => Promise<void>;
  addFoodActivity: (food: Omit<FoodActivity, 'id' | 'timestamp' | 'category'>) => Promise<void>;
  addEnergyActivity: (energy: Omit<EnergyActivity, 'id' | 'timestamp' | 'category'>) => Promise<string>;
  removeActivity: (activityId: string, date?: string) => Promise<void>;
  
  // Scan history
  scanHistory: ScanRecord[];
  getScansForSelectedDate: () => ScanRecord[];
  
  // Computed values for today
  remainingBudget: number;
  isOverBudget: boolean;
  budgetProgress: number;
  categoryTotals: Record<ActivityCategory, number>;
  
  // Computed values for selected date
  selectedDateRemainingBudget: number;
  selectedDateIsOverBudget: boolean;
  selectedDateBudgetProgress: number;
  selectedDateCategoryTotals: Record<ActivityCategory, number>;
  
  // Weekly data
  weeklySummary: WeeklySummary | null;
  
  // Energy baseline (from utility bills)
  energyBaselines: EnergyBaselines;
  updateEnergyBaseline: (
    type: 'electricity' | 'naturalGas' | 'heatingOil',
    monthlyAmount: number,
    daysInPeriod?: number
  ) => Promise<void>;
  
  // Total daily carbon including baseline
  totalDailyWithBaseline: number;
  selectedDateTotalWithBaseline: number;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  refresh: () => Promise<void>;
}

/**
 * Convert DailyLogData to DailyLog
 */
const toDailyLog = (data: DailyLogData): DailyLog => ({
  date: data.date,
  activities: data.activities,
  totalCarbonKg: data.totalCarbonKg,
  budgetKg: data.budgetKg,
  isUnderBudget: data.totalCarbonKg <= data.budgetKg,
  categoryTotals: data.categoryTotals,
});

/**
 * Create empty daily log
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
  selectedDateLog: createEmptyDailyLog(getDateString(), 8),
  setSelectedDate: () => {},
  settings: DEFAULT_USER_SETTINGS,
  updateSettings: async () => {},
  addActivity: async () => {},
  addProductScan: async () => {},
  addTransportActivity: async () => {},
  addFoodActivity: async () => {},
  addEnergyActivity: async () => '',
  removeActivity: async () => {},
  scanHistory: [],
  getScansForSelectedDate: () => [],
  remainingBudget: 8,
  isOverBudget: false,
  budgetProgress: 0,
  categoryTotals: { food: 0, transport: 0, product: 0, energy: 0 },
  selectedDateRemainingBudget: 8,
  selectedDateIsOverBudget: false,
  selectedDateBudgetProgress: 0,
  selectedDateCategoryTotals: { food: 0, transport: 0, product: 0, energy: 0 },
  weeklySummary: null,
  energyBaselines: DEFAULT_ENERGY_BASELINES,
  updateEnergyBaseline: async () => {},
  totalDailyWithBaseline: 0,
  selectedDateTotalWithBaseline: 0,
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
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLogData>>({});
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayString = getDateString();
  const selectedDateString = getDateString(selectedDate);

  /**
   * Load data from storage
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [logsData, settingsData, scans] = await Promise.all([
        getAllDailyLogs(),
        getUserSettings(),
        getScanHistory(),
      ]);

      setDailyLogs(logsData);
      setSettings(settingsData);
      setScanHistory(scans);
    } catch (error) {
      console.error('Error loading carbon data:', error);
    } finally {
      setIsLoading(false);
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
  const getDailyLogForDate = useCallback((dateString: string): DailyLog => {
    if (dailyLogs[dateString]) {
      return toDailyLog(dailyLogs[dateString]);
    }
    return createEmptyDailyLog(dateString, settings.goals.dailyBudgetKg);
  }, [dailyLogs, settings.goals.dailyBudgetKg]);

  /**
   * Today's log
   */
  const todayLog = useMemo(() => getDailyLogForDate(todayString), [getDailyLogForDate, todayString]);

  /**
   * Selected date's log
   */
  const selectedDateLog = useMemo(() => getDailyLogForDate(selectedDateString), [getDailyLogForDate, selectedDateString]);

  /**
   * Get scans for selected date
   */
  const getScansForSelectedDate = useCallback(() => {
    return scanHistory.filter(scan => {
      const scanDate = new Date(scan.timestamp).toISOString().split('T')[0];
      return scanDate === selectedDateString;
    });
  }, [scanHistory, selectedDateString]);

  /**
   * Add an activity
   */
  const addActivity = useCallback(async (
    activityData: Omit<Activity, 'id' | 'timestamp'>,
    date: string = todayString
  ) => {
    try {
      const activity = await dataLayerAddActivity(
        activityData,
        date,
        settings.goals.dailyBudgetKg
      );

      // Update local state
      setDailyLogs(prev => {
        const currentLog = prev[date] || {
          date,
          activities: [],
          totalCarbonKg: 0,
          budgetKg: settings.goals.dailyBudgetKg,
          categoryTotals: { food: 0, transport: 0, product: 0, energy: 0 },
        };
        
        const newActivities = [activity, ...currentLog.activities];
        const totalCarbonKg = newActivities.reduce((sum, a) => sum + a.carbonKg, 0);
        
        return {
          ...prev,
          [date]: {
            ...currentLog,
            activities: newActivities,
            totalCarbonKg,
            categoryTotals: {
              food: newActivities.filter(a => a.category === 'food').reduce((sum, a) => sum + a.carbonKg, 0),
              transport: newActivities.filter(a => a.category === 'transport').reduce((sum, a) => sum + a.carbonKg, 0),
              product: newActivities.filter(a => a.category === 'product').reduce((sum, a) => sum + a.carbonKg, 0),
              energy: newActivities.filter(a => a.category === 'energy').reduce((sum, a) => sum + a.carbonKg, 0),
            },
          },
        };
      });

      // Update settings stats
      const newSettings = {
        ...settings,
        totalScans: settings.totalScans + 1,
        totalCarbonTracked: settings.totalCarbonTracked + activity.carbonKg,
      };
      setSettings(newSettings);
      await saveUserSettings(newSettings);
    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  }, [todayString, settings]);

  /**
   * Add product scan (from camera)
   */
  const addProductScan = useCallback(async (objects: AnalyzedObject[], date: string = todayString) => {
    const totalCarbon = objects.reduce((sum, obj) => sum + obj.carbonKg, 0);
    
    // Create scan record for history
    const scanRecord: ScanRecord = {
      id: generateId('scan'),
      timestamp: new Date().toISOString(),
      objects,
      totalCarbonKg: totalCarbon,
    };
    
    // Save scan record
    await saveScanRecord(scanRecord);
    setScanHistory(prev => [scanRecord, ...prev]);
    
    // Create activity
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

    await addActivity(activity, date);
  }, [addActivity, todayString]);

  /**
   * Add transport activity
   */
  const addTransportActivity = useCallback(async (
    trip: Omit<TransportActivity, 'id' | 'timestamp' | 'category'>
  ) => {
    const activity: Omit<TransportActivity, 'id' | 'timestamp'> = {
      ...trip,
      category: 'transport',
    };
    await addActivity(activity);
  }, [addActivity]);

  /**
   * Add food activity
   */
  const addFoodActivity = useCallback(async (
    food: Omit<FoodActivity, 'id' | 'timestamp' | 'category'>
  ) => {
    const activity: Omit<FoodActivity, 'id' | 'timestamp'> = {
      ...food,
      category: 'food',
    };
    await addActivity(activity);
  }, [addActivity]);

  /**
   * Add energy activity - returns the activity ID for tracking
   */
  const addEnergyActivity = useCallback(async (
    energy: Omit<EnergyActivity, 'id' | 'timestamp' | 'category'>
  ): Promise<string> => {
    const activity: Omit<EnergyActivity, 'id' | 'timestamp'> = {
      ...energy,
      category: 'energy',
    };
    const createdActivity = await dataLayerAddActivity(
      activity,
      todayString,
      settings.goals.dailyBudgetKg
    );
    
    // Update local state
    setDailyLogs(prev => {
      const currentLog = prev[todayString] || {
        date: todayString,
        activities: [],
        totalCarbonKg: 0,
        budgetKg: settings.goals.dailyBudgetKg,
        categoryTotals: { food: 0, transport: 0, product: 0, energy: 0 },
      };
      
      const newActivities = [createdActivity, ...currentLog.activities];
      const totalCarbonKg = newActivities.reduce((sum, a) => sum + a.carbonKg, 0);
      
      return {
        ...prev,
        [todayString]: {
          ...currentLog,
          activities: newActivities,
          totalCarbonKg,
          categoryTotals: {
            food: newActivities.filter(a => a.category === 'food').reduce((sum, a) => sum + a.carbonKg, 0),
            transport: newActivities.filter(a => a.category === 'transport').reduce((sum, a) => sum + a.carbonKg, 0),
            product: newActivities.filter(a => a.category === 'product').reduce((sum, a) => sum + a.carbonKg, 0),
            energy: newActivities.filter(a => a.category === 'energy').reduce((sum, a) => sum + a.carbonKg, 0),
          },
        },
      };
    });
    
    return createdActivity.id;
  }, [todayString, settings.goals.dailyBudgetKg]);

  /**
   * Remove an activity
   */
  const removeActivity = useCallback(async (activityId: string, date: string = todayString) => {
    try {
      const currentLog = dailyLogs[date];
      const activity = currentLog?.activities.find(a => a.id === activityId);
      
      await dataLayerRemoveActivity(activityId, date);
      
      // Update local state
      setDailyLogs(prev => {
        if (!prev[date]) return prev;
        
        const newActivities = prev[date].activities.filter(a => a.id !== activityId);
        const totalCarbonKg = newActivities.reduce((sum, a) => sum + a.carbonKg, 0);
        
        return {
          ...prev,
          [date]: {
            ...prev[date],
            activities: newActivities,
            totalCarbonKg,
            categoryTotals: {
              food: newActivities.filter(a => a.category === 'food').reduce((sum, a) => sum + a.carbonKg, 0),
              transport: newActivities.filter(a => a.category === 'transport').reduce((sum, a) => sum + a.carbonKg, 0),
              product: newActivities.filter(a => a.category === 'product').reduce((sum, a) => sum + a.carbonKg, 0),
              energy: newActivities.filter(a => a.category === 'energy').reduce((sum, a) => sum + a.carbonKg, 0),
            },
          },
        };
      });

      // Update settings stats
      if (activity) {
        const newSettings = {
          ...settings,
          totalCarbonTracked: Math.max(0, settings.totalCarbonTracked - activity.carbonKg),
        };
        setSettings(newSettings);
        await saveUserSettings(newSettings);
      }
    } catch (error) {
      console.error('Error removing activity:', error);
      throw error;
    }
  }, [todayString, dailyLogs, settings]);

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveUserSettings(newSettings);
  }, [settings]);

  /**
   * Calculate weekly summary
   */
  const weeklySummary = useMemo((): WeeklySummary | null => {
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
        categoryTotals.food += log.categoryTotals.food || 0;
        categoryTotals.transport += log.categoryTotals.transport || 0;
        categoryTotals.product += log.categoryTotals.product || 0;
        categoryTotals.energy += log.categoryTotals.energy || 0;
        if (log.totalCarbonKg <= log.budgetKg) daysUnderBudget++;
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
   * Computed values for today
   */
  const remainingBudget = Math.max(0, todayLog.budgetKg - todayLog.totalCarbonKg);
  const isOverBudget = todayLog.totalCarbonKg > todayLog.budgetKg;
  const budgetProgress = todayLog.budgetKg > 0 ? Math.min(todayLog.totalCarbonKg / todayLog.budgetKg, 1) : 0;

  /**
   * Computed values for selected date
   */
  const selectedDateRemainingBudget = Math.max(0, selectedDateLog.budgetKg - selectedDateLog.totalCarbonKg);
  const selectedDateIsOverBudget = selectedDateLog.totalCarbonKg > selectedDateLog.budgetKg;
  const selectedDateBudgetProgress = selectedDateLog.budgetKg > 0 ? Math.min(selectedDateLog.totalCarbonKg / selectedDateLog.budgetKg, 1) : 0;

  /**
   * Energy baselines from settings
   */
  const energyBaselines = settings.homeEnergy.baselines;

  /**
   * Total daily carbon including baseline
   */
  const totalDailyWithBaseline = todayLog.totalCarbonKg + energyBaselines.totalDailyCarbonKg;
  const selectedDateTotalWithBaseline = selectedDateLog.totalCarbonKg + energyBaselines.totalDailyCarbonKg;

  /**
   * Emission factors for baseline calculation
   */
  const BASELINE_EMISSION_FACTORS = {
    electricity: 0.4, // kg CO₂e per kWh
    naturalGas: 2.0, // kg CO₂e per m³
    heatingOil: 2.68, // kg CO₂e per liter
  };

  /**
   * Update energy baseline from utility bill
   */
  const updateEnergyBaseline = useCallback(async (
    type: 'electricity' | 'naturalGas' | 'heatingOil',
    monthlyAmount: number,
    daysInPeriod: number = 30
  ) => {
    const dailyAverage = monthlyAmount / daysInPeriod;
    const dailyCarbonKg = dailyAverage * BASELINE_EMISSION_FACTORS[type];

    const updatedBaseline: EnergyBaseline = {
      enabled: monthlyAmount > 0,
      monthlyAmount,
      unit: type === 'electricity' ? 'kWh' : type === 'naturalGas' ? 'm³' : 'liters',
      dailyAverage,
      dailyCarbonKg,
      lastUpdated: new Date().toISOString(),
    };

    const newBaselines: EnergyBaselines = {
      ...settings.homeEnergy.baselines,
      [type]: updatedBaseline,
      totalDailyCarbonKg: 0, // Will be recalculated
    };

    // Recalculate total
    newBaselines.totalDailyCarbonKg = 
      (newBaselines.electricity.enabled ? newBaselines.electricity.dailyCarbonKg : 0) +
      (newBaselines.naturalGas.enabled ? newBaselines.naturalGas.dailyCarbonKg : 0) +
      (newBaselines.heatingOil.enabled ? newBaselines.heatingOil.dailyCarbonKg : 0);

    const newSettings: UserSettings = {
      ...settings,
      homeEnergy: {
        ...settings.homeEnergy,
        baselines: newBaselines,
      },
    };

    setSettings(newSettings);
    await saveUserSettings(newSettings);
  }, [settings]);

  const value: CarbonContextType = {
    todayLog,
    selectedDate,
    selectedDateLog,
    setSelectedDate,
    settings,
    updateSettings,
    addActivity,
    addProductScan,
    addTransportActivity,
    addFoodActivity,
    addEnergyActivity,
    removeActivity,
    scanHistory,
    getScansForSelectedDate,
    remainingBudget,
    isOverBudget,
    budgetProgress,
    categoryTotals: todayLog.categoryTotals,
    selectedDateRemainingBudget,
    selectedDateIsOverBudget,
    selectedDateBudgetProgress,
    selectedDateCategoryTotals: selectedDateLog.categoryTotals,
    weeklySummary,
    energyBaselines,
    updateEnergyBaseline,
    totalDailyWithBaseline,
    selectedDateTotalWithBaseline,
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
