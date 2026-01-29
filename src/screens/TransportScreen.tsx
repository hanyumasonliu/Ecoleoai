/**
 * GreenSense AR - Transport Screen
 * 
 * Hybrid automatic transport detection interface.
 * - Start/stop trip tracking
 * - View detected trips
 * - Confirm transport mode
 * - View trip history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Trip,
  startTrip,
  stopTrip,
  getCurrentTrip,
  isTripInProgress,
  getTripHistory,
  confirmTrip,
  deleteTrip,
  getUnconfirmedTrips,
  requestLocationPermissions,
  hasLocationPermissions,
  calculateTripCarbon,
} from '../services/location';
import { sendTripConfirmation } from '../services/notifications';
import { TransportMode } from '../types/activity';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

/**
 * Transport mode options for selection
 */
const TRANSPORT_MODES: { mode: TransportMode; label: string; icon: string; emoji: string }[] = [
  { mode: 'walk', label: 'Walking', icon: 'walk-outline', emoji: '🚶' },
  { mode: 'bike', label: 'Cycling', icon: 'bicycle-outline', emoji: '🚴' },
  { mode: 'bus', label: 'Bus', icon: 'bus-outline', emoji: '🚌' },
  { mode: 'train', label: 'Train', icon: 'train-outline', emoji: '🚄' },
  { mode: 'subway', label: 'Subway', icon: 'subway-outline', emoji: '🚇' },
  { mode: 'car', label: 'Car', icon: 'car-outline', emoji: '🚗' },
  { mode: 'electric_car', label: 'Electric Car', icon: 'car-sport-outline', emoji: '🔋' },
  { mode: 'uber', label: 'Rideshare', icon: 'car-outline', emoji: '🚕' },
  { mode: 'plane', label: 'Airplane', icon: 'airplane-outline', emoji: '✈️' },
];

/**
 * TransportScreen Component
 */
export function TransportScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTripData, setCurrentTripData] = useState<Trip | null>(null);
  const [unconfirmedTrips, setUnconfirmedTrips] = useState<Trip[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  /**
   * Load data
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    // Check permissions
    const perms = await hasLocationPermissions();
    setHasPermissions(perms.foreground);
    
    // Check if tracking
    const tracking = isTripInProgress();
    setIsTracking(tracking);
    if (tracking) {
      setCurrentTripData(getCurrentTrip());
    }
    
    // Load trips
    const unconfirmed = await getUnconfirmedTrips();
    setUnconfirmedTrips(unconfirmed);
    
    const history = await getTripHistory();
    setRecentTrips(history.slice(0, 10)); // Last 10 trips
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Refresh data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Request permissions
   */
  const handleRequestPermissions = async () => {
    const granted = await requestLocationPermissions();
    setHasPermissions(granted);
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Location permission is needed to track trips automatically.'
      );
    }
  };

  /**
   * Start tracking
   */
  const handleStartTrip = async () => {
    if (!hasPermissions) {
      await handleRequestPermissions();
      return;
    }

    setIsLoading(true);
    const trip = await startTrip();
    
    if (trip) {
      setIsTracking(true);
      setCurrentTripData(trip);
    } else {
      Alert.alert('Error', 'Failed to start trip tracking');
    }
    setIsLoading(false);
  };

  /**
   * Stop tracking
   */
  const handleStopTrip = async () => {
    setIsLoading(true);
    const trip = await stopTrip();
    
    if (trip) {
      setIsTracking(false);
      setCurrentTripData(null);
      
      // Send notification for confirmation
      await sendTripConfirmation(
        trip.id,
        trip.distanceKm,
        trip.detectedMode,
        trip.carbonKg
      );
      
      // Refresh data
      await loadData();
      
      // Show confirmation dialog
      setSelectedTrip(trip);
    }
    setIsLoading(false);
  };

  /**
   * Confirm trip mode
   */
  const handleConfirmTrip = async (trip: Trip, mode: TransportMode) => {
    await confirmTrip(trip.id, mode);
    setSelectedTrip(null);
    await loadData();
  };

  /**
   * Delete trip
   */
  const handleDeleteTrip = async (tripId: string) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTrip(tripId);
            setSelectedTrip(null);
            await loadData();
          },
        },
      ]
    );
  };

  /**
   * Format duration
   */
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  /**
   * Get mode info
   */
  const getModeInfo = (mode: TransportMode) => {
    return TRANSPORT_MODES.find(m => m.mode === mode) || TRANSPORT_MODES[5]; // Default to car
  };

  // Permission request screen
  if (!hasPermissions && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="location" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Enable Location</Text>
          <Text style={styles.permissionText}>
            GreenSense needs location access to automatically detect your trips
            and calculate transport emissions.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transport</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tracking Card */}
        <View style={styles.trackingCard}>
          {isTracking ? (
            <>
              <View style={styles.trackingActive}>
                <View style={styles.pulsingDot} />
                <Text style={styles.trackingTitle}>Trip in Progress</Text>
              </View>
              {currentTripData && (
                <View style={styles.trackingStats}>
                  <View style={styles.trackingStat}>
                    <Text style={styles.trackingStatValue}>
                      {currentTripData.distanceKm.toFixed(2)}
                    </Text>
                    <Text style={styles.trackingStatLabel}>km</Text>
                  </View>
                  <View style={styles.trackingStatDivider} />
                  <View style={styles.trackingStat}>
                    <Text style={styles.trackingStatValue}>
                      {formatDuration(currentTripData.durationMinutes)}
                    </Text>
                    <Text style={styles.trackingStatLabel}>duration</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopTrip}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="stop" size={24} color={Colors.white} />
                    <Text style={styles.stopButtonText}>Stop Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="car" size={48} color={Colors.categoryTransport} />
              <Text style={styles.trackingTitle}>Track Your Trip</Text>
              <Text style={styles.trackingSubtitle}>
                Start tracking to auto-detect your transport mode
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartTrip}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="play" size={24} color={Colors.white} />
                    <Text style={styles.startButtonText}>Start Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Unconfirmed Trips */}
        {unconfirmedTrips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confirm Trips</Text>
            {unconfirmedTrips.map(trip => {
              const modeInfo = getModeInfo(trip.detectedMode);
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  onPress={() => setSelectedTrip(trip)}
                >
                  <View style={styles.tripIcon}>
                    <Text style={styles.tripEmoji}>{modeInfo.emoji}</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>
                      {trip.distanceKm.toFixed(1)} km • {formatDuration(trip.durationMinutes)}
                    </Text>
                    <Text style={styles.tripSubtitle}>
                      Detected: {modeInfo.label} • {trip.carbonKg.toFixed(2)} kg CO₂e
                    </Text>
                    <Text style={styles.tripTime}>
                      {new Date(trip.startTime).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.confirmBadge}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent Trips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          {recentTrips.length > 0 ? (
            recentTrips.filter(t => t.isConfirmed).map(trip => {
              const modeInfo = getModeInfo(trip.confirmedMode || trip.detectedMode);
              return (
                <View key={trip.id} style={styles.tripCardConfirmed}>
                  <View style={styles.tripIcon}>
                    <Text style={styles.tripEmoji}>{modeInfo.emoji}</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripTitle}>
                      {modeInfo.label} • {trip.distanceKm.toFixed(1)} km
                    </Text>
                    <Text style={styles.tripSubtitle}>
                      {trip.carbonKg.toFixed(2)} kg CO₂e
                    </Text>
                    <Text style={styles.tripTime}>
                      {new Date(trip.startTime).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No trips recorded yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Trip Confirmation Modal */}
      {selectedTrip && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirm Transport Mode</Text>
            <Text style={styles.modalSubtitle}>
              {selectedTrip.distanceKm.toFixed(1)} km • {formatDuration(selectedTrip.durationMinutes)}
            </Text>
            
            <ScrollView 
              style={styles.modeList}
              showsVerticalScrollIndicator={false}
            >
              {TRANSPORT_MODES.map(({ mode, label, emoji }) => {
                const carbon = calculateTripCarbon(selectedTrip.distanceKm, mode);
                const isDetected = mode === selectedTrip.detectedMode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeOption, isDetected && styles.modeOptionDetected]}
                    onPress={() => handleConfirmTrip(selectedTrip, mode)}
                  >
                    <Text style={styles.modeEmoji}>{emoji}</Text>
                    <View style={styles.modeInfo}>
                      <Text style={styles.modeLabel}>{label}</Text>
                      <Text style={styles.modeCarbon}>{carbon.toFixed(2)} kg CO₂e</Text>
                    </View>
                    {isDetected && (
                      <View style={styles.detectedBadge}>
                        <Text style={styles.detectedText}>Detected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteTrip(selectedTrip.id)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.carbonHigh} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelectedTrip(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
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
  
  // Tracking card
  trackingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  trackingActive: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.carbonHigh,
    marginRight: Spacing.sm,
  },
  trackingTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  trackingSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  trackingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  trackingStat: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  trackingStatValue: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  trackingStatLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  trackingStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.categoryTransport,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
  },
  startButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonHigh,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
  },
  stopButtonText: {
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
  
  // Trip card
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonMediumBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  tripCardConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tripEmoji: {
    fontSize: 24,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  tripSubtitle: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tripTime: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  confirmBadge: {
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
  
  // Permission screen
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.carbonLowBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  permissionText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
  },
  permissionButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  
  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  modeList: {
    maxHeight: 350,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  modeOptionDetected: {
    backgroundColor: Colors.carbonLowBg,
    borderWidth: 1,
    borderColor: Colors.carbonLow,
  },
  modeEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  modeCarbon: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  detectedBadge: {
    backgroundColor: Colors.carbonLow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  detectedText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.carbonHigh,
    marginRight: Spacing.md,
  },
  deleteButtonText: {
    ...TextStyles.button,
    color: Colors.carbonHigh,
    marginLeft: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
  },
  cancelButtonText: {
    ...TextStyles.button,
    color: Colors.textSecondary,
  },
});

export default TransportScreen;

