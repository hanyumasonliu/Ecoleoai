/**
 * GreenSense AR - Location & Transport Detection Service
 * 
 * Hybrid automatic transport detection using GPS location tracking.
 * Detects trips, calculates distance, and suggests transport mode based on speed.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransportMode } from '../types/activity';

// Task name for background location tracking
const LOCATION_TASK_NAME = 'greensense-location-tracking';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_TRIP: '@greensense_current_trip',
  TRIP_HISTORY: '@greensense_trip_history',
  TRACKING_ENABLED: '@greensense_tracking_enabled',
};

/**
 * Location point with timestamp
 */
export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null; // m/s
  timestamp: number;
}

/**
 * Trip data structure
 */
export interface Trip {
  id: string;
  startTime: string;
  endTime?: string;
  startLocation: LocationPoint;
  endLocation?: LocationPoint;
  points: LocationPoint[];
  distanceKm: number;
  durationMinutes: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  detectedMode: TransportMode;
  confirmedMode?: TransportMode;
  carbonKg: number;
  isConfirmed: boolean;
}

/**
 * Transport mode detection thresholds (km/h)
 */
const SPEED_THRESHOLDS = {
  walking: { min: 0, max: 6 },
  bike: { min: 6, max: 25 },
  bus: { min: 15, max: 50 },
  car: { min: 25, max: 130 },
  train: { min: 80, max: 350 },
  plane: { min: 200, max: 1000 },
};

/**
 * Carbon emission factors (kg CO2e per km)
 */
const EMISSION_FACTORS: Record<TransportMode, number> = {
  walk: 0,
  bike: 0,
  bus: 0.089,
  train: 0.041,
  subway: 0.031,
  car: 0.171,
  electric_car: 0.053,
  motorcycle: 0.103,
  uber: 0.171,
  plane: 0.255,
};

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect transport mode based on average speed
 */
export function detectTransportMode(averageSpeedKmh: number, maxSpeedKmh: number): TransportMode {
  // Use a combination of average and max speed for better detection
  const speed = (averageSpeedKmh + maxSpeedKmh) / 2;
  
  if (speed < SPEED_THRESHOLDS.walking.max) return 'walk';
  if (speed < SPEED_THRESHOLDS.bike.max) return 'bike';
  if (speed < SPEED_THRESHOLDS.bus.max) {
    // Could be bus or car - default to car (higher emissions = conservative)
    return 'car';
  }
  if (speed < SPEED_THRESHOLDS.car.max) return 'car';
  if (speed < SPEED_THRESHOLDS.train.max) return 'train';
  return 'plane';
}

/**
 * Calculate carbon emissions for a trip
 */
export function calculateTripCarbon(distanceKm: number, mode: TransportMode): number {
  const factor = EMISSION_FACTORS[mode] || 0;
  return Math.round(distanceKm * factor * 1000) / 1000;
}

/**
 * Generate unique trip ID
 */
function generateTripId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request location permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  
  if (foregroundStatus !== 'granted') {
    console.log('Foreground location permission denied');
    return false;
  }
  
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  
  if (backgroundStatus !== 'granted') {
    console.log('Background location permission denied');
    // Can still track in foreground
  }
  
  return true;
}

/**
 * Check if location permissions are granted
 */
export async function hasLocationPermissions(): Promise<{ foreground: boolean; background: boolean }> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  
  return {
    foreground: foreground.status === 'granted',
    background: background.status === 'granted',
  };
}

/**
 * Get current location
 */
export async function getCurrentLocation(): Promise<LocationPoint | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Current trip state
 */
let currentTrip: Trip | null = null;
let locationSubscription: Location.LocationSubscription | null = null;

/**
 * Start tracking a new trip
 */
export async function startTrip(): Promise<Trip | null> {
  const hasPerms = await hasLocationPermissions();
  if (!hasPerms.foreground) {
    const granted = await requestLocationPermissions();
    if (!granted) return null;
  }
  
  const startLocation = await getCurrentLocation();
  if (!startLocation) return null;
  
  currentTrip = {
    id: generateTripId(),
    startTime: new Date().toISOString(),
    startLocation,
    points: [startLocation],
    distanceKm: 0,
    durationMinutes: 0,
    averageSpeedKmh: 0,
    maxSpeedKmh: 0,
    detectedMode: 'car',
    carbonKg: 0,
    isConfirmed: false,
  };
  
  // Start location updates
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // Update every 5 seconds
      distanceInterval: 10, // Or every 10 meters
    },
    (location) => {
      if (currentTrip) {
        const point: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        };
        
        // Add point and update trip stats
        const lastPoint = currentTrip.points[currentTrip.points.length - 1];
        const segmentDistance = calculateDistance(
          lastPoint.latitude,
          lastPoint.longitude,
          point.latitude,
          point.longitude
        );
        
        currentTrip.points.push(point);
        currentTrip.distanceKm += segmentDistance;
        
        // Update max speed
        const speedKmh = (point.speed || 0) * 3.6; // m/s to km/h
        if (speedKmh > currentTrip.maxSpeedKmh) {
          currentTrip.maxSpeedKmh = speedKmh;
        }
      }
    }
  );
  
  // Save to storage
  await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TRIP, JSON.stringify(currentTrip));
  
  return currentTrip;
}

/**
 * Stop current trip and calculate final stats
 */
export async function stopTrip(): Promise<Trip | null> {
  if (!currentTrip) return null;
  
  // Stop location updates
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  
  const endLocation = await getCurrentLocation();
  const endTime = new Date();
  
  if (endLocation) {
    currentTrip.endLocation = endLocation;
    currentTrip.points.push(endLocation);
  }
  
  currentTrip.endTime = endTime.toISOString();
  
  // Calculate duration
  const startTime = new Date(currentTrip.startTime);
  currentTrip.durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
  
  // Calculate average speed
  if (currentTrip.durationMinutes > 0) {
    currentTrip.averageSpeedKmh = (currentTrip.distanceKm / currentTrip.durationMinutes) * 60;
  }
  
  // Detect transport mode
  currentTrip.detectedMode = detectTransportMode(
    currentTrip.averageSpeedKmh,
    currentTrip.maxSpeedKmh
  );
  
  // Calculate carbon
  currentTrip.carbonKg = calculateTripCarbon(
    currentTrip.distanceKm,
    currentTrip.detectedMode
  );
  
  // Save completed trip
  const completedTrip = { ...currentTrip };
  await saveTripToHistory(completedTrip);
  
  // Clear current trip
  currentTrip = null;
  await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_TRIP);
  
  return completedTrip;
}

/**
 * Get current trip in progress
 */
export function getCurrentTrip(): Trip | null {
  return currentTrip;
}

/**
 * Check if a trip is in progress
 */
export function isTripInProgress(): boolean {
  return currentTrip !== null;
}

/**
 * Save trip to history
 */
async function saveTripToHistory(trip: Trip): Promise<void> {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_HISTORY);
    const history: Trip[] = historyJson ? JSON.parse(historyJson) : [];
    history.unshift(trip);
    // Keep last 100 trips
    const trimmedHistory = history.slice(0, 100);
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_HISTORY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Error saving trip to history:', error);
  }
}

/**
 * Get trip history
 */
export async function getTripHistory(): Promise<Trip[]> {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.TRIP_HISTORY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error getting trip history:', error);
    return [];
  }
}

/**
 * Confirm/update a trip's transport mode
 */
export async function confirmTrip(tripId: string, mode: TransportMode): Promise<Trip | null> {
  try {
    const history = await getTripHistory();
    const tripIndex = history.findIndex(t => t.id === tripId);
    
    if (tripIndex === -1) return null;
    
    const trip = history[tripIndex];
    trip.confirmedMode = mode;
    trip.isConfirmed = true;
    trip.carbonKg = calculateTripCarbon(trip.distanceKm, mode);
    
    history[tripIndex] = trip;
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_HISTORY, JSON.stringify(history));
    
    return trip;
  } catch (error) {
    console.error('Error confirming trip:', error);
    return null;
  }
}

/**
 * Delete a trip from history
 */
export async function deleteTrip(tripId: string): Promise<boolean> {
  try {
    const history = await getTripHistory();
    const filteredHistory = history.filter(t => t.id !== tripId);
    await AsyncStorage.setItem(STORAGE_KEYS.TRIP_HISTORY, JSON.stringify(filteredHistory));
    return true;
  } catch (error) {
    console.error('Error deleting trip:', error);
    return false;
  }
}

/**
 * Get unconfirmed trips
 */
export async function getUnconfirmedTrips(): Promise<Trip[]> {
  const history = await getTripHistory();
  return history.filter(t => !t.isConfirmed);
}

export default {
  requestLocationPermissions,
  hasLocationPermissions,
  getCurrentLocation,
  startTrip,
  stopTrip,
  getCurrentTrip,
  isTripInProgress,
  getTripHistory,
  confirmTrip,
  deleteTrip,
  getUnconfirmedTrips,
  calculateDistance,
  calculateTripCarbon,
  detectTransportMode,
};

