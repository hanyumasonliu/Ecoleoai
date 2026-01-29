/**
 * GreenSense AR - Energy Screen
 * 
 * Log home energy usage:
 * - Electricity
 * - Natural gas
 * - Heating
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';
import { useCarbon } from '../context/CarbonContext';

// Storage key
const STORAGE_KEY = '@greensense_energy_logs';

/**
 * Energy log entry
 */
interface EnergyLog {
  id: string;
  activityId?: string; // ID in CarbonContext for deletion sync
  date: string;
  type: 'electricity' | 'natural_gas' | 'heating_oil';
  amount: number; // kWh for electricity, m³ for gas, liters for oil
  unit: string;
  carbonKg: number;
  period: 'daily' | 'weekly' | 'monthly';
  notes?: string;
}

/**
 * Carbon emission factors
 */
const EMISSION_FACTORS = {
  electricity: 0.4, // kg CO2e per kWh (US average)
  natural_gas: 2.0, // kg CO2e per m³
  heating_oil: 2.68, // kg CO2e per liter
};

/**
 * Average daily usage benchmarks (for eco score calculation)
 * Based on US household averages
 */
const DAILY_BENCHMARKS = {
  electricity: 30, // kWh/day average US household
  natural_gas: 3.5, // m³/day average
  heating_oil: 3.3, // liters/day average (heating season)
};

/**
 * Calculate eco score based on usage vs benchmark
 * Score: 100 = excellent (50% of average), 0 = very high (200%+ of average)
 */
const calculateEcoScore = (
  type: keyof typeof DAILY_BENCHMARKS,
  dailyUsage: number
): number => {
  const benchmark = DAILY_BENCHMARKS[type];
  const ratio = dailyUsage / benchmark;
  
  // Score decreases as usage increases
  // 50% of average = 100 score
  // 100% of average = 75 score
  // 150% of average = 50 score
  // 200% of average = 25 score
  // 250%+ of average = 0 score
  const score = Math.round(100 - (ratio - 0.5) * 50);
  return Math.max(0, Math.min(100, score));
};

/**
 * Energy types for selection
 */
const ENERGY_TYPES = [
  { 
    type: 'electricity' as const, 
    label: 'Electricity', 
    icon: 'flash', 
    color: '#EAB308',
    unit: 'kWh',
    placeholder: 'e.g., 500',
  },
  { 
    type: 'natural_gas' as const, 
    label: 'Natural Gas', 
    icon: 'flame', 
    color: '#3B82F6',
    unit: 'm³',
    placeholder: 'e.g., 50',
  },
  { 
    type: 'heating_oil' as const, 
    label: 'Heating Oil', 
    icon: 'water', 
    color: '#8B5CF6',
    unit: 'liters',
    placeholder: 'e.g., 100',
  },
];

const PERIODS = [
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'monthly' as const, label: 'Monthly' },
];

/**
 * EnergyScreen Component
 */
export function EnergyScreen() {
  const { addEnergyActivity, removeActivity } = useCarbon();
  const [selectedType, setSelectedType] = useState<'electricity' | 'natural_gas' | 'heating_oil'>('electricity');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [logs, setLogs] = useState<EnergyLog[]>([]);
  const [showForm, setShowForm] = useState(false);

  /**
   * Load logs from storage
   */
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const logsJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (logsJson) {
        setLogs(JSON.parse(logsJson));
      }
    } catch (error) {
      console.error('Error loading energy logs:', error);
    }
  };

  const saveLogs = async (newLogs: EnergyLog[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
      setLogs(newLogs);
    } catch (error) {
      console.error('Error saving energy logs:', error);
    }
  };

  /**
   * Calculate carbon for energy usage
   */
  const calculateCarbon = (type: keyof typeof EMISSION_FACTORS, amountValue: number): number => {
    return Math.round(amountValue * EMISSION_FACTORS[type] * 100) / 100;
  };

  /**
   * Get daily carbon from log
   */
  const getDailyCarbon = (log: EnergyLog): number => {
    switch (log.period) {
      case 'daily': return log.carbonKg;
      case 'weekly': return log.carbonKg / 7;
      case 'monthly': return log.carbonKg / 30;
    }
  };

  /**
   * Add new energy log
   */
  const handleAddLog = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number');
      return;
    }

    const carbonKg = calculateCarbon(selectedType, amountNum);
    const typeInfo = ENERGY_TYPES.find(t => t.type === selectedType)!;
    
    // Calculate daily equivalents
    const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const dailyCarbonKg = carbonKg / periodDays;
    const dailyUsage = amountNum / periodDays;
    
    // Calculate eco score based on daily usage vs benchmark
    const ecoScore = calculateEcoScore(selectedType, dailyUsage);
    
    // Get benchmark comparison text
    const benchmark = DAILY_BENCHMARKS[selectedType];
    const percentOfBenchmark = Math.round((dailyUsage / benchmark) * 100);
    const comparisonText = percentOfBenchmark <= 50 
      ? 'Excellent! Well below average'
      : percentOfBenchmark <= 100 
        ? 'Good - below or at average'
        : percentOfBenchmark <= 150
          ? 'Above average'
          : 'High usage - consider reducing';

    // Save to CarbonContext for Journey display first to get the activity ID
    // Note: Monthly/weekly entries add their DAILY AVERAGE to today's log
    // This represents the daily share of ongoing energy consumption
    let activityId: string | undefined;
    try {
      activityId = await addEnergyActivity({
        name: period === 'daily' 
          ? `${typeInfo.label}` 
          : `${typeInfo.label} (${period} avg)`,
        carbonKg: dailyCarbonKg, // Daily equivalent added to today
        energyType: selectedType,
        energyKwh: selectedType === 'electricity' ? dailyUsage : dailyUsage * 10,
        quantity: dailyUsage, // Daily equivalent usage
        unit: `${typeInfo.unit}/day`,
        period: period,
        isEstimated: period !== 'daily', // Mark as estimated if from monthly/weekly
        ecoScore: ecoScore,
        notes: period !== 'daily' 
          ? `Based on ${amountNum} ${typeInfo.unit} ${period}` 
          : undefined,
      });
    } catch (error) {
      console.error('Error adding to carbon context:', error);
    }

    // Save to local energy logs (with reference to CarbonContext activity)
    const newLog: EnergyLog = {
      id: `energy_${Date.now()}`,
      activityId: activityId, // Link to CarbonContext for deletion
      date: new Date().toISOString(),
      type: selectedType,
      amount: amountNum,
      unit: typeInfo.unit,
      carbonKg,
      period,
    };

    const newLogs = [newLog, ...logs];
    saveLogs(newLogs);
    
    setAmount('');
    setShowForm(false);
    
    Alert.alert(
      '✅ Energy Logged',
      `📊 ${period.charAt(0).toUpperCase() + period.slice(1)} Total: ${amountNum} ${typeInfo.unit}\n` +
      `🌍 Total CO₂e: ${carbonKg.toFixed(2)} kg\n\n` +
      `📅 Daily Average: ${dailyUsage.toFixed(1)} ${typeInfo.unit}/day\n` +
      `🌍 Daily CO₂e: ${dailyCarbonKg.toFixed(2)} kg/day\n\n` +
      `📈 Eco Score: ${ecoScore}/100\n` +
      `${comparisonText} (${percentOfBenchmark}% of avg household)`
    );
  };

  /**
   * Delete log - removes from both local storage and CarbonContext
   */
  const handleDeleteLog = (log: EnergyLog) => {
    Alert.alert(
      'Delete Energy Log',
      `Delete ${log.amount} ${log.unit} ${ENERGY_TYPES.find(t => t.type === log.type)?.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Remove from local energy logs
            const newLogs = logs.filter(l => l.id !== log.id);
            saveLogs(newLogs);
            
            // Also remove from CarbonContext (Journey) if we have the activity ID
            if (log.activityId) {
              try {
                const logDate = new Date(log.date).toISOString().split('T')[0];
                await removeActivity(log.activityId, logDate);
              } catch (error) {
                console.error('Error removing from carbon context:', error);
              }
            }
            
            Alert.alert('Deleted', 'Energy log has been removed.');
          },
        },
      ]
    );
  };

  /**
   * Calculate total daily carbon from all logs
   */
  const totalDailyCarbon = logs.reduce((sum, log) => sum + getDailyCarbon(log), 0);

  const currentTypeInfo = ENERGY_TYPES.find(t => t.type === selectedType)!;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Energy</Text>
        {!showForm && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="flash" size={32} color={Colors.categoryEnergy} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryValue}>
                {totalDailyCarbon.toFixed(2)} kg
              </Text>
              <Text style={styles.summaryLabel}>CO₂e per day (home energy)</Text>
            </View>
          </View>

          {/* Add Form */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Log Energy Usage</Text>
              
              {/* Energy Type Selection */}
              <Text style={styles.formLabel}>Energy Type</Text>
              <View style={styles.typeSelector}>
                {ENERGY_TYPES.map(({ type, label, icon, color }) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      selectedType === type && { borderColor: color, backgroundColor: color + '20' },
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={24} 
                      color={selectedType === type ? color : Colors.textSecondary} 
                    />
                    <Text 
                      style={[
                        styles.typeLabel,
                        selectedType === type && { color },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Amount Input */}
              <Text style={styles.formLabel}>Amount ({currentTypeInfo.unit})</Text>
              <TextInput
                style={styles.input}
                placeholder={currentTypeInfo.placeholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              
              {/* Period Selection */}
              <Text style={styles.formLabel}>Period</Text>
              <View style={styles.periodSelector}>
                {PERIODS.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.periodOption,
                      period === value && styles.periodOptionActive,
                    ]}
                    onPress={() => setPeriod(value)}
                  >
                    <Text 
                      style={[
                        styles.periodLabel,
                        period === value && styles.periodLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Preview */}
              {amount && !isNaN(parseFloat(amount)) && (
                <View style={styles.preview}>
                  <Ionicons name="leaf" size={20} color={Colors.carbonMedium} />
                  <Text style={styles.previewText}>
                    ≈ {calculateCarbon(selectedType, parseFloat(amount)).toFixed(2)} kg CO₂e
                  </Text>
                </View>
              )}
              
              {/* Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelFormButton}
                  onPress={() => {
                    setShowForm(false);
                    setAmount('');
                  }}
                >
                  <Text style={styles.cancelFormText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddLog}
                >
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                  <Text style={styles.submitText}>Add Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Energy Logs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Energy Logs</Text>
            {logs.length > 0 ? (
              logs.map(log => {
                const typeInfo = ENERGY_TYPES.find(t => t.type === log.type)!;
                const dailyCarbon = getDailyCarbon(log);
                return (
                  <View key={log.id} style={styles.logCard}>
                    <View style={[styles.logIcon, { backgroundColor: typeInfo.color + '20' }]}>
                      <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={styles.logTitle}>
                        {log.amount} {log.unit} • {typeInfo.label}
                      </Text>
                      <Text style={styles.logSubtitle}>
                        {log.carbonKg.toFixed(2)} kg CO₂e total ({log.period})
                      </Text>
                      <Text style={styles.logSubtitle}>
                        {dailyCarbon.toFixed(2)} kg CO₂e/day
                      </Text>
                      <Text style={styles.logDate}>
                        {new Date(log.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteLog(log)}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.carbonHigh} />
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="flash-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No energy logs yet</Text>
                <Text style={styles.emptySubtext}>
                  Add your electricity or gas usage to track home emissions
                </Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Emission Factors Used</Text>
              <Text style={styles.infoText}>
                • Electricity: 0.4 kg CO₂e/kWh (US average){'\n'}
                • Natural Gas: 2.0 kg CO₂e/m³{'\n'}
                • Heating Oil: 2.68 kg CO₂e/liter
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  
  // Summary card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.categoryEnergy + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryValue: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  
  // Form
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  formLabel: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.base,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    ...TextStyles.body,
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.backgroundTertiary,
  },
  periodOptionActive: {
    backgroundColor: Colors.primary,
  },
  periodLabel: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  periodLabelActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.carbonMediumBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  previewText: {
    ...TextStyles.body,
    color: Colors.carbonMedium,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
  },
  cancelFormButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.base,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.backgroundTertiary,
  },
  cancelFormText: {
    ...TextStyles.button,
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.primary,
  },
  submitText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  
  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  
  // Log card
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  logSubtitle: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logDate: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  deleteButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  
  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoTitle: {
    ...TextStyles.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  infoText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
});

export default EnergyScreen;

