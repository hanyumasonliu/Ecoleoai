/**
 * CarbonSense AR - History Context
 * 
 * Provides global state management for scan history.
 * Makes history data available throughout the app without prop drilling.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  ScanRecord,
  HistorySummary,
  AnalyzedObject,
} from '../types/carbon';
import {
  getScanHistory,
  saveScanRecord,
  deleteScanRecord,
  clearScanHistory,
  getHistorySummary,
} from '../services/storage';

/**
 * Shape of the History Context
 */
interface HistoryContextType {
  /** All scan records, newest first */
  history: ScanRecord[];
  /** Aggregated summary of all scans */
  summary: HistorySummary;
  /** Loading state for initial data fetch */
  isLoading: boolean;
  /** Add a new scan to history */
  addScan: (objects: AnalyzedObject[]) => Promise<ScanRecord>;
  /** Remove a scan from history */
  removeScan: (scanId: string) => Promise<void>;
  /** Clear all history */
  clearAll: () => Promise<void>;
  /** Refresh history from storage */
  refresh: () => Promise<void>;
}

/**
 * Default context values
 */
const defaultContext: HistoryContextType = {
  history: [],
  summary: {
    totalScans: 0,
    totalObjects: 0,
    totalCarbonKg: 0,
    objectCategories: {},
    topObjectTypes: [],
    averageCarbonPerScan: 0,
  },
  isLoading: true,
  addScan: async () => {
    throw new Error('HistoryContext not initialized');
  },
  removeScan: async () => {
    throw new Error('HistoryContext not initialized');
  },
  clearAll: async () => {
    throw new Error('HistoryContext not initialized');
  },
  refresh: async () => {
    throw new Error('HistoryContext not initialized');
  },
};

/**
 * Create the context
 */
const HistoryContext = createContext<HistoryContextType>(defaultContext);

/**
 * Props for the HistoryProvider component
 */
interface HistoryProviderProps {
  children: ReactNode;
}

/**
 * Generate a unique scan ID
 */
const generateScanId = (): string => {
  return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * History Provider Component
 * 
 * Wraps the app and provides scan history state and actions to all children.
 */
export function HistoryProvider({ children }: HistoryProviderProps) {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [summary, setSummary] = useState<HistorySummary>(defaultContext.summary);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load history and summary from storage
   */
  const loadData = useCallback(async () => {
    try {
      const [historyData, summaryData] = await Promise.all([
        getScanHistory(),
        getHistorySummary(),
      ]);
      setHistory(historyData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial data load
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Add a new scan to history
   */
  const addScan = useCallback(async (objects: AnalyzedObject[]): Promise<ScanRecord> => {
    const totalCarbon = objects.reduce((sum, obj) => sum + obj.carbonKg, 0);
    
    const newScan: ScanRecord = {
      id: generateScanId(),
      timestamp: new Date().toISOString(),
      objects,
      totalCarbonKg: Math.round(totalCarbon * 100) / 100,
    };

    await saveScanRecord(newScan);
    
    // Update local state
    setHistory(prev => [newScan, ...prev]);
    
    // Update summary
    setSummary(prev => ({
      ...prev,
      totalScans: prev.totalScans + 1,
      totalObjects: prev.totalObjects + objects.length,
      totalCarbonKg: Math.round((prev.totalCarbonKg + totalCarbon) * 100) / 100,
      averageCarbonPerScan: Math.round(
        ((prev.totalCarbonKg + totalCarbon) / (prev.totalScans + 1)) * 100
      ) / 100,
    }));

    return newScan;
  }, []);

  /**
   * Remove a scan from history
   */
  const removeScan = useCallback(async (scanId: string): Promise<void> => {
    await deleteScanRecord(scanId);
    
    // Update local state
    setHistory(prev => prev.filter(scan => scan.id !== scanId));
    
    // Recalculate summary
    const newSummary = await getHistorySummary();
    setSummary(newSummary);
  }, []);

  /**
   * Clear all history
   */
  const clearAll = useCallback(async (): Promise<void> => {
    await clearScanHistory();
    setHistory([]);
    setSummary(defaultContext.summary);
  }, []);

  /**
   * Refresh data from storage
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  const value: HistoryContextType = {
    history,
    summary,
    isLoading,
    addScan,
    removeScan,
    clearAll,
    refresh,
  };

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
}

/**
 * Hook to access history context
 * 
 * @throws Error if used outside of HistoryProvider
 */
export function useHistory(): HistoryContextType {
  const context = useContext(HistoryContext);
  
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  
  return context;
}

export default HistoryContext;

