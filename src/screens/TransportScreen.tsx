/**
 * Carbon Tracer AR - Transport Screen
 * 
 * GPS-based automatic transport tracking with live map.
 * - Real-time location tracking on map
 * - Automatic distance calculation
 * - Transport mode detection based on speed
 * - Trip history and carbon tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  AppState,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
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
  detectTransportMode,
  calculateDistance,
  LocationPoint,
} from '../services/location';
import { sendTripConfirmation } from '../services/notifications';
import { 
  calculateTrip, 
  TripCalculation, 
  formatDistance, 
  formatDuration as formatMapDuration,
  getModeName,
  searchPlaces,
  Place,
} from '../services/maps';
import {
  getFlightEmissions,
  getSeatClassImpact,
  SeatClass,
} from '../services/travelImpact';
import { useCarbon } from '../context/CarbonContext';
import { TransportMode } from '../types/activity';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualOrigin, setManualOrigin] = useState('');
  const [manualDestination, setManualDestination] = useState('');
  const [manualMode, setManualMode] = useState<TransportMode>('car');
  const [manualDistance, setManualDistance] = useState('');
  const [manualDuration, setManualDuration] = useState(''); // For flights
  const [tripCalculation, setTripCalculation] = useState<TripCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Flight-specific state (Travel Impact Model)
  const [seatClass, setSeatClass] = useState<SeatClass>('economy');
  const [flightEmissions, setFlightEmissions] = useState<{
    carbonKg: number;
    distanceKm: number;
    emissionsByClass: {
      economy: number;
      premiumEconomy: number;
      business: number;
      first: number;
    };
    source: 'travel_impact_model' | 'fallback';
    accuracy: 'high' | 'medium';
  } | null>(null);
  const [isCalculatingFlight, setIsCalculatingFlight] = useState(false);
  
  // Timer state for live tracking
  const [elapsedTime, setElapsedTime] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Map and location state
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number; longitude: number}[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [detectedMode, setDetectedMode] = useState<TransportMode>('walk');
  const mapRef = useRef<MapView | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  
  // Autocomplete state (for manual entry fallback)
  const [originSuggestions, setOriginSuggestions] = useState<Place[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<Place[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { addTransportActivity } = useCarbon();

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
   * Request permissions on mount if not granted
   */
  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      const perms = await hasLocationPermissions();
      if (!perms.foreground) {
        // Will show permission screen
        setHasPermissions(false);
      }
    };
    checkAndRequestPermissions();
  }, []);

  /**
   * Timer effect - updates every second when tracking
   */
  useEffect(() => {
    if (isTracking && currentTripData) {
      // Set start time reference
      startTimeRef.current = new Date(currentTripData.startTime).getTime();
      
      // Start the timer
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const elapsed = Math.floor((now - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
          
          // Update distance from current trip data
          const trip = getCurrentTrip();
          if (trip) {
            setLiveDistance(trip.distanceKm);
          }
        }
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      // Clear timer when not tracking
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
      setLiveDistance(0);
      startTimeRef.current = null;
    }
  }, [isTracking, currentTripData]);

  /**
   * Handle app state changes (background/foreground)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh tracking state
        const tracking = isTripInProgress();
        setIsTracking(tracking);
        if (tracking) {
          setCurrentTripData(getCurrentTrip());
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Get initial location and start watching position
   */
  useEffect(() => {
    let isMounted = true;
    
    const initLocation = async () => {
      const perms = await hasLocationPermissions();
      if (!perms.foreground) return;
      
      try {
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        if (isMounted) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log('Error getting initial location:', error);
      }
    };
    
    initLocation();
    
    return () => {
      isMounted = false;
    };
  }, [hasPermissions]);

  /**
   * Watch location when tracking - updates map and calculates distance
   */
  useEffect(() => {
    if (isTracking && hasPermissions) {
      let lastPoint: {latitude: number; longitude: number} | null = null;
      let totalDistance = 0;
      const routePoints: {latitude: number; longitude: number}[] = [];
      
      // Start watching position
      const startWatching = async () => {
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000, // Update every 2 seconds
            distanceInterval: 5, // Or every 5 meters
          },
          (location) => {
            const newPoint = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            
            // Update current location
            setCurrentLocation(newPoint);
            
            // Calculate speed (convert m/s to km/h)
            const speedKmh = (location.coords.speed || 0) * 3.6;
            setCurrentSpeed(speedKmh);
            
            // Detect transport mode based on speed
            const mode = detectTransportMode(speedKmh, speedKmh);
            setDetectedMode(mode);
            
            // Calculate distance from last point
            if (lastPoint) {
              const segmentDistance = calculateDistance(
                lastPoint.latitude,
                lastPoint.longitude,
                newPoint.latitude,
                newPoint.longitude
              );
              totalDistance += segmentDistance;
              setLiveDistance(totalDistance);
            }
            
            // Add to route
            routePoints.push(newPoint);
            setRouteCoordinates([...routePoints]);
            lastPoint = newPoint;
            
            // Center map on current location
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: newPoint.latitude,
                longitude: newPoint.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 500);
            }
          }
        );
      };
      
      startWatching();
      
      return () => {
        if (locationSubscriptionRef.current) {
          locationSubscriptionRef.current.remove();
          locationSubscriptionRef.current = null;
        }
      };
    } else {
      // Clear route when not tracking
      setRouteCoordinates([]);
    }
  }, [isTracking, hasPermissions]);

  /**
   * Format elapsed time as HH:MM:SS
   */
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    
    // Use the live distance we tracked in the UI (more accurate)
    const finalDistance = liveDistance > 0 ? liveDistance : 0;
    const finalDuration = elapsedTime / 60; // Convert seconds to minutes
    const finalMode = detectedMode;
    const finalCarbon = calculateTripCarbon(finalDistance, finalMode);
    
    const trip = await stopTrip();
    
    if (trip) {
      // Update trip with our tracked values
      trip.distanceKm = Math.max(trip.distanceKm, finalDistance);
      trip.durationMinutes = Math.max(trip.durationMinutes, finalDuration);
      trip.detectedMode = finalMode;
      trip.carbonKg = calculateTripCarbon(trip.distanceKm, finalMode);
      
      setIsTracking(false);
      setCurrentTripData(null);
      
      // Only show confirmation if trip has meaningful distance
      if (trip.distanceKm >= 0.01) { // At least 10 meters
        // Send notification for confirmation
        await sendTripConfirmation(
          trip.id,
          trip.distanceKm,
          trip.detectedMode,
          trip.carbonKg
        );
        
        // Show confirmation dialog
        setSelectedTrip(trip);
      } else {
        Alert.alert(
          'Trip Too Short',
          'This trip was too short to record. Try moving a longer distance.',
          [{ text: 'OK' }]
        );
      }
      
      // Refresh data
      await loadData();
    }
    setIsLoading(false);
  };

  /**
   * Confirm trip mode and save to Journey
   */
  const handleConfirmTrip = async (trip: Trip, mode: TransportMode) => {
    // Calculate carbon with confirmed mode
    const carbonKg = calculateTripCarbon(trip.distanceKm, mode);
    
    // Confirm in location service
    await confirmTrip(trip.id, mode);
    
    // Also add to Carbon Context so it shows in Journey screen
    try {
      await addTransportActivity({
        name: `${getModeName(mode)} trip`,
        carbonKg,
        mode,
        distanceKm: trip.distanceKm,
        durationMinutes: trip.durationMinutes,
        startLocation: 'GPS tracked',
        quantity: trip.distanceKm,
        unit: 'km',
        ecoScore: Math.max(0, 100 - Math.round(carbonKg * 10)),
      });
      
      Alert.alert(
        'Trip Saved! 🎉',
        `${trip.distanceKm.toFixed(2)} km by ${getModeName(mode)}\n${carbonKg.toFixed(2)} kg CO₂e`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving trip to journey:', error);
    }
    
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
   * Search for origin places (with debounce)
   */
  const handleOriginSearch = (text: string) => {
    setManualOrigin(text);
    setTripCalculation(null);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.length < 3) {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
      return;
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const places = await searchPlaces(text);
      setOriginSuggestions(places);
      setShowOriginSuggestions(places.length > 0);
      setIsSearching(false);
    }, 300);
  };

  /**
   * Search for destination places (with debounce)
   */
  const handleDestinationSearch = (text: string) => {
    setManualDestination(text);
    setTripCalculation(null);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.length < 3) {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      return;
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const places = await searchPlaces(text);
      setDestSuggestions(places);
      setShowDestSuggestions(places.length > 0);
      setIsSearching(false);
    }, 300);
  };

  /**
   * Select origin from suggestions
   */
  const handleSelectOrigin = (place: Place) => {
    setManualOrigin(place.address);
    setOriginSuggestions([]);
    setShowOriginSuggestions(false);
  };

  /**
   * Select destination from suggestions
   */
  const handleSelectDestination = (place: Place) => {
    setManualDestination(place.address);
    setDestSuggestions([]);
    setShowDestSuggestions(false);
  };

  /**
   * Calculate manual trip
   */
  const handleCalculateTrip = async () => {
    if (!manualOrigin.trim() || !manualDestination.trim()) {
      Alert.alert('Missing Information', 'Please enter both origin and destination.');
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateTrip(manualOrigin, manualDestination, manualMode);
      setTripCalculation(result);
    } catch (error) {
      console.error('Error calculating trip:', error);
      Alert.alert('Calculation Error', 'Could not calculate route. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Save manual trip
   */
  const handleSaveManualTrip = async () => {
    if (!tripCalculation) return;

    try {
      await addTransportActivity({
        name: `${tripCalculation.route.startAddress.split(',')[0]} → ${tripCalculation.route.endAddress.split(',')[0]}`,
        carbonKg: tripCalculation.carbonKg,
        mode: manualMode,
        distanceKm: tripCalculation.route.distanceKm,
        durationMinutes: tripCalculation.route.durationMinutes,
        startLocation: tripCalculation.route.startAddress,
        endLocation: tripCalculation.route.endAddress,
        quantity: tripCalculation.route.distanceKm,
        unit: 'km',
        ecoScore: Math.max(0, 100 - Math.round(tripCalculation.carbonKg * 10)),
      });

      Alert.alert('Trip Saved', `${tripCalculation.carbonKg.toFixed(2)} kg CO₂e added to your journey.`);
      
      // Reset manual entry
      setShowManualEntry(false);
      setManualOrigin('');
      setManualDestination('');
      setTripCalculation(null);
      
      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Error saving trip:', error);
      Alert.alert('Error', 'Could not save trip. Please try again.');
    }
  };

  /**
   * Save trip with custom distance
   */
  const handleSaveCustomTrip = async () => {
    const distance = parseFloat(manualDistance);
    if (isNaN(distance) || distance <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a valid distance in km.');
      return;
    }

    const carbonKg = calculateTripCarbon(distance, manualMode);
    const duration = (distance / 40) * 60; // Estimate duration

    try {
      await addTransportActivity({
        name: `${manualMode === 'car' ? 'Car' : getModeName(manualMode)} trip - ${distance} km`,
        carbonKg,
        mode: manualMode,
        distanceKm: distance,
        durationMinutes: duration,
        startLocation: manualOrigin || 'Custom trip',
        endLocation: manualDestination || undefined,
        quantity: distance,
        unit: 'km',
        ecoScore: Math.max(0, 100 - Math.round(carbonKg * 10)),
      });

      Alert.alert('Trip Saved', `${carbonKg.toFixed(2)} kg CO₂e added to your journey.`);
      
      // Reset
      setShowManualEntry(false);
      setManualOrigin('');
      setManualDestination('');
      setManualDistance('');
      setManualDuration('');
      setTripCalculation(null);
      
      await loadData();
    } catch (error) {
      console.error('Error saving trip:', error);
      Alert.alert('Error', 'Could not save trip. Please try again.');
    }
  };

  /**
   * Calculate flight emissions using Travel Impact Model API
   */
  const handleCalculateFlightEmissions = async () => {
    if (!manualOrigin.trim() || !manualDestination.trim()) {
      Alert.alert('Missing Information', 'Please enter both origin and destination airport codes (e.g., LAX, JFK).');
      return;
    }

    setIsCalculatingFlight(true);
    try {
      const result = await getFlightEmissions(
        manualOrigin.trim(),
        manualDestination.trim(),
        seatClass
      );
      setFlightEmissions(result);
    } catch (error) {
      console.error('Error calculating flight emissions:', error);
      Alert.alert('Calculation Error', 'Could not calculate flight emissions. Please try again.');
    } finally {
      setIsCalculatingFlight(false);
    }
  };

  /**
   * Save flight using Travel Impact Model data or fallback
   */
  const handleSaveFlight = async () => {
    // Use Travel Impact Model data if available
    if (flightEmissions) {
      const flightName = `${manualOrigin.toUpperCase()} → ${manualDestination.toUpperCase()}`;
      const seatClassLabel = seatClass === 'premium_economy' ? 'Premium Economy' 
        : seatClass.charAt(0).toUpperCase() + seatClass.slice(1);

      try {
        await addTransportActivity({
          name: flightName,
          carbonKg: flightEmissions.carbonKg,
          mode: 'plane',
          distanceKm: flightEmissions.distanceKm,
          durationMinutes: (flightEmissions.distanceKm / 850) * 60, // Estimate duration
          startLocation: manualOrigin.toUpperCase(),
          endLocation: manualDestination.toUpperCase(),
          quantity: flightEmissions.distanceKm,
          unit: 'km',
          ecoScore: Math.max(0, 100 - Math.round(flightEmissions.carbonKg / 20)),
        });

        const sourceInfo = flightEmissions.source === 'travel_impact_model' 
          ? '✅ Calculated using Google Travel Impact Model (high accuracy)'
          : '📊 Estimated using industry averages';

        Alert.alert(
          'Flight Saved', 
          `${flightEmissions.carbonKg.toFixed(1)} kg CO₂e (${seatClassLabel})\n\n` +
          `Distance: ${flightEmissions.distanceKm.toFixed(0)} km\n\n` +
          `${sourceInfo}\n\n` +
          `That's equivalent to ~${(flightEmissions.carbonKg / 0.171).toFixed(0)} km by car!`
        );
        
        // Reset
        setShowManualEntry(false);
        setManualOrigin('');
        setManualDestination('');
        setManualDistance('');
        setManualDuration('');
        setTripCalculation(null);
        setFlightEmissions(null);
        setSeatClass('economy');
        
        await loadData();
      } catch (error) {
        console.error('Error saving flight:', error);
        Alert.alert('Error', 'Could not save flight. Please try again.');
      }
      return;
    }

    // Fallback to duration-based calculation
    const hours = parseFloat(manualDuration);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Missing Information', 'Please calculate emissions using airport codes, or enter flight duration.');
      return;
    }

    // Average cruising speed ~850 km/h
    const distance = hours * 850;
    const carbonKg = calculateTripCarbon(distance, 'plane');
    const durationMinutes = hours * 60;

    const flightName = manualOrigin && manualDestination 
      ? `${manualOrigin.toUpperCase()} → ${manualDestination.toUpperCase()}`
      : `Flight - ${hours.toFixed(1)}h`;

    try {
      await addTransportActivity({
        name: flightName,
        carbonKg,
        mode: 'plane',
        distanceKm: distance,
        durationMinutes,
        startLocation: manualOrigin || undefined,
        endLocation: manualDestination || undefined,
        quantity: distance,
        unit: 'km',
        ecoScore: Math.max(0, 100 - Math.round(carbonKg / 10)),
      });

      Alert.alert(
        'Flight Saved', 
        `${carbonKg.toFixed(1)} kg CO₂e added.\n\nThat's equivalent to ~${(carbonKg / 0.171).toFixed(0)} km by car!`
      );
      
      // Reset
      setShowManualEntry(false);
      setManualOrigin('');
      setManualDestination('');
      setManualDistance('');
      setManualDuration('');
      setTripCalculation(null);
      setFlightEmissions(null);
      setSeatClass('economy');
      
      await loadData();
    } catch (error) {
      console.error('Error saving flight:', error);
      Alert.alert('Error', 'Could not save flight. Please try again.');
    }
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
            Carbon Tracer needs location access to automatically detect your trips
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

  // When tracking, show fullscreen map view
  if (isTracking) {
    return (
      <View style={styles.mapContainer}>
        <StatusBar barStyle="dark-content" />
        
        {/* Map View */}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={currentLocation ? {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : undefined}
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={true}
        >
          {/* Route Polyline */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
          )}
          
          {/* Start Marker */}
          {routeCoordinates.length > 0 && (
            <Marker
              coordinate={routeCoordinates[0]}
              title="Start"
            >
              <View style={styles.startMarker}>
                <Ionicons name="flag" size={20} color={Colors.white} />
              </View>
            </Marker>
          )}
        </MapView>
        
        {/* Stats Overlay - Top */}
        <SafeAreaView style={styles.mapOverlayTop}>
          <View style={styles.mapHeader}>
            <View style={styles.trackingBadge}>
              <View style={styles.pulsingDotSmall} />
              <Text style={styles.trackingBadgeText}>TRACKING</Text>
            </View>
            <Text style={styles.detectedModeText}>
              {getModeInfo(detectedMode).emoji} {getModeInfo(detectedMode).label}
            </Text>
          </View>
        </SafeAreaView>
        
        {/* Stats Overlay - Bottom */}
        <View style={styles.mapOverlayBottom}>
          <View style={styles.mapStatsCard}>
            {/* Timer */}
            <View style={styles.mapTimerRow}>
              <Text style={styles.mapTimerValue}>{formatElapsedTime(elapsedTime)}</Text>
            </View>
            
            {/* Stats Row */}
            <View style={styles.mapStatsRow}>
              <View style={styles.mapStat}>
                <Text style={styles.mapStatValue}>{liveDistance.toFixed(2)}</Text>
                <Text style={styles.mapStatLabel}>km</Text>
              </View>
              <View style={styles.mapStatDivider} />
              <View style={styles.mapStat}>
                <Text style={styles.mapStatValue}>{currentSpeed.toFixed(1)}</Text>
                <Text style={styles.mapStatLabel}>km/h</Text>
              </View>
              <View style={styles.mapStatDivider} />
              <View style={styles.mapStat}>
                <Text style={styles.mapStatValue}>
                  {calculateTripCarbon(liveDistance, detectedMode).toFixed(2)}
                </Text>
                <Text style={styles.mapStatLabel}>kg CO₂</Text>
              </View>
            </View>
            
            {/* Stop Button */}
            <TouchableOpacity
              style={styles.mapStopButton}
              onPress={handleStopTrip}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="stop" size={24} color={Colors.white} />
                  <Text style={styles.mapStopButtonText}>Stop Trip</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Normal view (not tracking)
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
        {/* Map Preview Card with Start Button */}
        <View style={styles.mapPreviewCard}>
          {currentLocation ? (
            <MapView
              style={styles.mapPreview}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              showsUserLocation={true}
              showsMyLocationButton={false}
            />
          ) : (
            <View style={styles.mapPreviewPlaceholder}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.mapPreviewPlaceholderText}>Getting your location...</Text>
            </View>
          )}
          
          {/* Overlay on map */}
          <View style={styles.mapPreviewOverlay}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.locationText}>
                {currentLocation 
                  ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                  : 'Locating...'
                }
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.bigStartButton}
              onPress={handleStartTrip}
              disabled={isLoading || !currentLocation}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} size="large" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={32} color={Colors.white} />
                  <Text style={styles.bigStartButtonText}>Start Tracking</Text>
                  <Text style={styles.bigStartButtonSubtext}>
                    Auto-detect walk, bike, car, transit
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Entry Button */}
        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => setShowManualEntry(true)}
        >
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
          <Text style={styles.manualEntryText}>Add Trip Manually</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

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

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <View style={styles.manualEntryModal}>
                <View style={styles.manualEntryHeader}>
                  <Text style={styles.modalTitle}>Add Trip</Text>
                  <TouchableOpacity onPress={() => {
                    setShowManualEntry(false);
                    setTripCalculation(null);
                    setManualOrigin('');
                    setManualDestination('');
                    setManualDistance('');
                    setManualDuration('');
                    Keyboard.dismiss();
                  }}>
                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.manualEntryContent} 
                  contentContainerStyle={styles.manualEntryScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled">
              {/* Transport Mode Selector */}
              <Text style={styles.inputLabel}>Transport Mode</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScrollView}>
                {TRANSPORT_MODES.map(({ mode, label, emoji }) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.manualModeButton,
                      manualMode === mode && styles.manualModeButtonActive,
                    ]}
                    onPress={() => setManualMode(mode)}
                  >
                    <Text style={styles.manualModeEmoji}>{emoji}</Text>
                    <Text style={[
                      styles.manualModeLabel,
                      manualMode === mode && styles.manualModeLabelActive,
                    ]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Flight-specific input with Travel Impact Model */}
              {manualMode === 'plane' && (
                <View style={styles.flightSection}>
                  <View style={styles.flightBanner}>
                    <Ionicons name="airplane" size={24} color={Colors.categoryTransport} />
                    <Text style={styles.flightBannerText}>Flight Entry</Text>
                    <View style={styles.accuracyBadge}>
                      <Text style={styles.accuracyBadgeText}>Google Travel Impact</Text>
                    </View>
                  </View>
                  <Text style={styles.flightHint}>
                    Enter airport codes for accurate emissions using Google's Travel Impact Model API.
                  </Text>
                  
                  {/* Airport Codes */}
                  <Text style={styles.inputLabel}>Airport Codes (IATA)</Text>
                  <View style={styles.airportInputRow}>
                    <View style={styles.airportInput}>
                      <TextInput
                        style={styles.airportInputField}
                        placeholder="LAX"
                        placeholderTextColor={Colors.textTertiary}
                        value={manualOrigin}
                        onChangeText={(text) => {
                          setManualOrigin(text.toUpperCase());
                          setFlightEmissions(null);
                        }}
                        maxLength={3}
                        autoCapitalize="characters"
                      />
                      <Text style={styles.airportInputLabel}>From</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={Colors.textTertiary} />
                    <View style={styles.airportInput}>
                      <TextInput
                        style={styles.airportInputField}
                        placeholder="JFK"
                        placeholderTextColor={Colors.textTertiary}
                        value={manualDestination}
                        onChangeText={(text) => {
                          setManualDestination(text.toUpperCase());
                          setFlightEmissions(null);
                        }}
                        maxLength={3}
                        autoCapitalize="characters"
                      />
                      <Text style={styles.airportInputLabel}>To</Text>
                    </View>
                  </View>
                  
                  {/* Seat Class Selector */}
                  <Text style={styles.inputLabel}>Seat Class</Text>
                  <View style={styles.seatClassRow}>
                    {([
                      { value: 'economy', label: 'Economy', icon: '💺' },
                      { value: 'premium_economy', label: 'Premium', icon: '🪑' },
                      { value: 'business', label: 'Business', icon: '💼' },
                      { value: 'first', label: 'First', icon: '👑' },
                    ] as { value: SeatClass; label: string; icon: string }[]).map(({ value, label, icon }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.seatClassButton,
                          seatClass === value && styles.seatClassButtonActive,
                        ]}
                        onPress={() => {
                          setSeatClass(value);
                          setFlightEmissions(null);
                        }}
                      >
                        <Text style={styles.seatClassIcon}>{icon}</Text>
                        <Text style={[
                          styles.seatClassLabel,
                          seatClass === value && styles.seatClassLabelActive,
                        ]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Calculate Button */}
                  {manualOrigin.length === 3 && manualDestination.length === 3 && !flightEmissions && (
                    <TouchableOpacity
                      style={styles.calculateFlightButton}
                      onPress={handleCalculateFlightEmissions}
                      disabled={isCalculatingFlight}
                    >
                      {isCalculatingFlight ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="calculator" size={20} color={Colors.white} />
                          <Text style={styles.calculateButtonText}>Calculate Emissions</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {/* Flight Calculation Result */}
                  {flightEmissions && (
                    <View style={styles.flightCalculation}>
                      {/* Accuracy indicator */}
                      <View style={[
                        styles.accuracyIndicator,
                        flightEmissions.accuracy === 'high' && styles.accuracyHigh,
                      ]}>
                        <Ionicons 
                          name={flightEmissions.accuracy === 'high' ? 'checkmark-circle' : 'information-circle'} 
                          size={16} 
                          color={flightEmissions.accuracy === 'high' ? Colors.carbonLow : Colors.carbonMedium} 
                        />
                        <Text style={[
                          styles.accuracyText,
                          flightEmissions.accuracy === 'high' && styles.accuracyTextHigh,
                        ]}>
                          {flightEmissions.accuracy === 'high' 
                            ? 'High accuracy (Travel Impact Model)' 
                            : 'Estimated (industry averages)'}
                        </Text>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>Route</Text>
                        <Text style={styles.calculationValue}>
                          {manualOrigin} → {manualDestination}
                        </Text>
                      </View>
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>Distance</Text>
                        <Text style={styles.calculationValue}>
                          {flightEmissions.distanceKm.toFixed(0)} km
                        </Text>
                      </View>
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>Seat Class</Text>
                        <Text style={styles.calculationValue}>
                          {seatClass === 'premium_economy' ? 'Premium Economy' 
                            : seatClass.charAt(0).toUpperCase() + seatClass.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.calculationRowHighlight}>
                        <Text style={styles.calculationLabelBold}>Carbon Footprint</Text>
                        <Text style={styles.calculationValueBold}>
                          {flightEmissions.carbonKg.toFixed(1)} kg CO₂e
                        </Text>
                      </View>
                      
                      {/* Seat class comparison */}
                      <Text style={styles.seatClassCompareTitle}>Emissions by Seat Class</Text>
                      <View style={styles.seatClassCompare}>
                        <View style={styles.seatClassCompareItem}>
                          <Text style={styles.seatClassCompareLabel}>Economy</Text>
                          <Text style={styles.seatClassCompareValue}>
                            {flightEmissions.emissionsByClass.economy.toFixed(0)} kg
                          </Text>
                        </View>
                        <View style={styles.seatClassCompareItem}>
                          <Text style={styles.seatClassCompareLabel}>Business</Text>
                          <Text style={styles.seatClassCompareValue}>
                            {flightEmissions.emissionsByClass.business.toFixed(0)} kg
                          </Text>
                          <Text style={styles.seatClassCompareMultiplier}>
                            {(flightEmissions.emissionsByClass.business / flightEmissions.emissionsByClass.economy).toFixed(1)}x
                          </Text>
                        </View>
                        <View style={styles.seatClassCompareItem}>
                          <Text style={styles.seatClassCompareLabel}>First</Text>
                          <Text style={styles.seatClassCompareValue}>
                            {flightEmissions.emissionsByClass.first.toFixed(0)} kg
                          </Text>
                          <Text style={styles.seatClassCompareMultiplier}>
                            {(flightEmissions.emissionsByClass.first / flightEmissions.emissionsByClass.economy).toFixed(1)}x
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.flightImpactNote}>
                        💡 This flight produces ~{(flightEmissions.carbonKg / 8.8).toFixed(1)}x a typical daily carbon budget
                      </Text>
                      
                      <TouchableOpacity
                        style={styles.saveFlightButton}
                        onPress={handleSaveFlight}
                      >
                        <Ionicons name="airplane" size={20} color={Colors.white} />
                        <Text style={styles.saveButtonText}>Save Flight</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Fallback: Duration-based entry */}
                  {!flightEmissions && (
                    <>
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR enter duration</Text>
                        <View style={styles.dividerLine} />
                      </View>
                      
                      <Text style={styles.inputLabel}>Flight Duration (hours)</Text>
                      <View style={styles.distanceInputRow}>
                        <TextInput
                          style={[styles.textInput, styles.distanceInput]}
                          placeholder="e.g., 2.5"
                          placeholderTextColor={Colors.textTertiary}
                          value={manualDuration}
                          onChangeText={setManualDuration}
                          keyboardType="numeric"
                        />
                        <Text style={styles.distanceUnit}>hours</Text>
                      </View>
                      
                      {manualDuration && parseFloat(manualDuration) > 0 && (
                        <View style={styles.flightCalculation}>
                          <View style={styles.accuracyIndicator}>
                            <Ionicons name="information-circle" size={16} color={Colors.carbonMedium} />
                            <Text style={styles.accuracyText}>Estimated (based on duration)</Text>
                          </View>
                          <View style={styles.calculationRow}>
                            <Text style={styles.calculationLabel}>Flight Time</Text>
                            <Text style={styles.calculationValue}>{parseFloat(manualDuration).toFixed(1)} hours</Text>
                          </View>
                          <View style={styles.calculationRow}>
                            <Text style={styles.calculationLabel}>Est. Distance</Text>
                            <Text style={styles.calculationValue}>
                              {(parseFloat(manualDuration) * 850).toFixed(0)} km
                            </Text>
                          </View>
                          <View style={styles.calculationRowHighlight}>
                            <Text style={styles.calculationLabelBold}>Carbon Footprint</Text>
                            <Text style={styles.calculationValueBold}>
                              {(parseFloat(manualDuration) * 850 * 0.255).toFixed(1)} kg CO₂e
                            </Text>
                          </View>
                          <Text style={styles.flightImpactNote}>
                            💡 Flying produces ~{(parseFloat(manualDuration) * 850 * 0.255 / 8.8).toFixed(1)}x a typical daily carbon budget
                          </Text>
                          
                          <TouchableOpacity
                            style={styles.saveFlightButton}
                            onPress={handleSaveFlight}
                          >
                            <Ionicons name="airplane" size={20} color={Colors.white} />
                            <Text style={styles.saveButtonText}>Save Flight</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Route Input with Autocomplete - hide for flights */}
              {manualMode !== 'plane' && (
                <>
                  <Text style={styles.inputLabel}>Route</Text>
                  
                  {/* Origin Input with Autocomplete */}
                  <View style={styles.autocompleteContainer}>
                    <View style={styles.inputWithIcon}>
                      <Ionicons name="location" size={20} color={Colors.primary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.autocompleteInput}
                        placeholder="Starting point (e.g., Home, 123 Main St)"
                        placeholderTextColor={Colors.textTertiary}
                        value={manualOrigin}
                        onChangeText={handleOriginSearch}
                        onFocus={() => originSuggestions.length > 0 && setShowOriginSuggestions(true)}
                      />
                      {isSearching && manualOrigin.length >= 3 && (
                        <ActivityIndicator size="small" color={Colors.primary} style={styles.searchingIndicator} />
                      )}
                    </View>
                    
                    {/* Origin Suggestions */}
                    {showOriginSuggestions && originSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {originSuggestions.slice(0, 4).map((place, index) => (
                          <TouchableOpacity
                            key={place.placeId || index}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectOrigin(place)}
                          >
                            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                            <View style={styles.suggestionTextContainer}>
                              <Text style={styles.suggestionName} numberOfLines={1}>{place.name}</Text>
                              <Text style={styles.suggestionAddress} numberOfLines={1}>{place.address}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  
                  {/* Destination Input with Autocomplete */}
                  <View style={styles.autocompleteContainer}>
                    <View style={styles.inputWithIcon}>
                      <Ionicons name="flag" size={20} color={Colors.carbonHigh} style={styles.inputIcon} />
                      <TextInput
                        style={styles.autocompleteInput}
                        placeholder="Destination (e.g., Office, Airport)"
                        placeholderTextColor={Colors.textTertiary}
                        value={manualDestination}
                        onChangeText={handleDestinationSearch}
                        onFocus={() => destSuggestions.length > 0 && setShowDestSuggestions(true)}
                      />
                      {isSearching && manualDestination.length >= 3 && (
                        <ActivityIndicator size="small" color={Colors.primary} style={styles.searchingIndicator} />
                      )}
                    </View>
                    
                    {/* Destination Suggestions */}
                    {showDestSuggestions && destSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {destSuggestions.slice(0, 4).map((place, index) => (
                          <TouchableOpacity
                            key={place.placeId || index}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectDestination(place)}
                          >
                            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                            <View style={styles.suggestionTextContainer}>
                              <Text style={styles.suggestionName} numberOfLines={1}>{place.name}</Text>
                              <Text style={styles.suggestionAddress} numberOfLines={1}>{place.address}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  
                  {/* Powered by Google badge */}
                  <View style={styles.poweredByGoogle}>
                    <Text style={styles.poweredByText}>Powered by Google Maps</Text>
                  </View>
                </>
              )}
              
              {/* Airport input for flights */}
              {manualMode === 'plane' && (
                <>
                  <Text style={styles.inputLabel}>Flight Route (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Departure airport (e.g., LAX, JFK)"
                    placeholderTextColor={Colors.textTertiary}
                    value={manualOrigin}
                    onChangeText={setManualOrigin}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Arrival airport (e.g., SFO, LHR)"
                    placeholderTextColor={Colors.textTertiary}
                    value={manualDestination}
                    onChangeText={setManualDestination}
                  />
                </>
              )}

              {/* Calculate Button */}
              {manualOrigin && manualDestination && (
                <TouchableOpacity
                  style={styles.calculateButton}
                  onPress={handleCalculateTrip}
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={20} color={Colors.white} />
                      <Text style={styles.calculateButtonText}>Calculate Route</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Trip Calculation Result */}
              {tripCalculation && (
                <View style={styles.calculationResult}>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>Distance</Text>
                    <Text style={styles.calculationValue}>{formatDistance(tripCalculation.route.distanceKm)}</Text>
                  </View>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>Duration</Text>
                    <Text style={styles.calculationValue}>{formatMapDuration(tripCalculation.route.durationMinutes)}</Text>
                  </View>
                  <View style={styles.calculationRowHighlight}>
                    <Text style={styles.calculationLabelBold}>Carbon Footprint</Text>
                    <Text style={styles.calculationValueBold}>{tripCalculation.carbonKg.toFixed(2)} kg CO₂e</Text>
                  </View>

                  {/* Alternatives */}
                  <Text style={styles.alternativesTitle}>Greener Alternatives</Text>
                  {tripCalculation.alternativeModes.slice(0, 3).map(alt => (
                    <View key={alt.mode} style={styles.alternativeRow}>
                      <Text style={styles.alternativeMode}>{getModeName(alt.mode)}</Text>
                      <Text style={styles.alternativeCarbon}>{alt.carbonKg.toFixed(2)} kg</Text>
                      <Text style={styles.alternativeDuration}>{formatMapDuration(alt.durationMinutes)}</Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveManualTrip}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.saveButtonText}>Save Trip</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Or enter distance manually */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.inputLabel}>Enter Distance Manually</Text>
              <View style={styles.distanceInputRow}>
                <TextInput
                  style={[styles.textInput, styles.distanceInput]}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textTertiary}
                  value={manualDistance}
                  onChangeText={setManualDistance}
                  keyboardType="numeric"
                />
                <Text style={styles.distanceUnit}>km</Text>
              </View>

              {manualDistance && parseFloat(manualDistance) > 0 && (
                <View style={styles.quickCalculation}>
                  <Text style={styles.quickCalculationText}>
                    Estimated: {calculateTripCarbon(parseFloat(manualDistance), manualMode).toFixed(2)} kg CO₂e
                  </Text>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveCustomTrip}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.saveButtonText}>Save Trip</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Add extra padding at bottom for keyboard */}
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
      )}

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
  
  // Map styles
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.carbonHigh + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  pulsingDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.carbonHigh,
    marginRight: Spacing.xs,
  },
  trackingBadgeText: {
    ...TextStyles.caption,
    color: Colors.carbonHigh,
    fontWeight: '700',
  },
  detectedModeText: {
    ...TextStyles.body,
    color: '#1F2937', // Dark text on white header
    fontWeight: '600',
  },
  mapOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  mapStatsCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mapTimerRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mapTimerValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937', // Dark gray for visibility on white background
    fontVariant: ['tabular-nums'],
  },
  mapStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mapStat: {
    alignItems: 'center',
    flex: 1,
  },
  mapStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937', // Dark gray for visibility on white background
  },
  mapStatLabel: {
    ...TextStyles.caption,
    color: '#6B7280', // Medium gray for labels
    marginTop: 2,
  },
  mapStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB', // Light gray divider
  },
  mapStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.carbonHigh,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
  },
  mapStopButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  startMarker: {
    backgroundColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  
  // Map Preview (not tracking)
  mapPreviewCard: {
    height: 300,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  mapPreview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapPreviewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundTertiary,
  },
  mapPreviewPlaceholderText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  mapPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  locationText: {
    ...TextStyles.caption,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bigStartButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  bigStartButtonText: {
    ...TextStyles.h4,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  bigStartButtonSubtext: {
    ...TextStyles.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
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
  
  // Timer
  timerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.categoryTransport,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  
  // Manual entry button
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  manualEntryText: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.md,
  },
  
  // Keyboard avoiding view for modal
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  // Manual entry modal
  manualEntryModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    width: '100%',
  },
  manualEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  manualEntryContent: {
    paddingHorizontal: Spacing.base,
    flexGrow: 1,
  },
  manualEntryScrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  inputLabel: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...TextStyles.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  
  // Autocomplete styles
  autocompleteContainer: {
    marginBottom: Spacing.sm,
    zIndex: 10,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  autocompleteInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    ...TextStyles.body,
    color: Colors.textPrimary,
  },
  searchingIndicator: {
    marginLeft: Spacing.sm,
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  suggestionName: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  suggestionAddress: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  poweredByGoogle: {
    alignItems: 'flex-end',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  poweredByText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    fontSize: 10,
  },
  
  modeScrollView: {
    marginBottom: Spacing.md,
  },
  manualModeButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.backgroundTertiary,
    minWidth: 70,
  },
  manualModeButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  manualModeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  manualModeLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  manualModeLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  calculateButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  calculationResult: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  calculationLabel: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  calculationValue: {
    ...TextStyles.body,
    color: Colors.textPrimary,
  },
  calculationRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.carbonLowBg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.sm,
  },
  calculationLabelBold: {
    ...TextStyles.body,
    color: Colors.carbonLow,
    fontWeight: '600',
  },
  calculationValueBold: {
    ...TextStyles.body,
    color: Colors.carbonLow,
    fontWeight: '700',
  },
  alternativesTitle: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alternativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  alternativeMode: {
    ...TextStyles.bodySmall,
    color: Colors.textPrimary,
    flex: 1,
  },
  alternativeCarbon: {
    ...TextStyles.bodySmall,
    color: Colors.carbonLow,
    marginRight: Spacing.md,
  },
  alternativeDuration: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    width: 60,
    textAlign: 'right',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  saveButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  
  // Flight-specific styles
  flightSection: {
    marginTop: Spacing.md,
  },
  flightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.categoryTransport + '20',
    padding: Spacing.base,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.md,
  },
  flightBannerText: {
    ...TextStyles.body,
    color: Colors.categoryTransport,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    flex: 1,
  },
  accuracyBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  accuracyBadgeText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontSize: 9,
    fontWeight: '600',
  },
  flightHint: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  
  // Airport input
  airportInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  airportInput: {
    flex: 1,
    alignItems: 'center',
  },
  airportInputField: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...TextStyles.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
    width: '90%',
  },
  airportInputLabel: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  
  // Seat class selector
  seatClassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  seatClassButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundTertiary,
  },
  seatClassButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  seatClassIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  seatClassLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    fontSize: 10,
  },
  seatClassLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Calculate flight button
  calculateFlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.categoryTransport,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  
  // Flight calculation result
  flightCalculation: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  accuracyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.carbonMediumBg,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  accuracyHigh: {
    backgroundColor: Colors.carbonLowBg,
  },
  accuracyText: {
    ...TextStyles.caption,
    color: Colors.carbonMedium,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  accuracyTextHigh: {
    color: Colors.carbonLow,
  },
  
  // Seat class comparison
  seatClassCompareTitle: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  seatClassCompare: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  seatClassCompareItem: {
    alignItems: 'center',
    flex: 1,
  },
  seatClassCompareLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    fontSize: 10,
  },
  seatClassCompareValue: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  seatClassCompareMultiplier: {
    ...TextStyles.caption,
    color: Colors.carbonMedium,
    fontSize: 9,
  },
  
  flightImpactNote: {
    ...TextStyles.bodySmall,
    color: Colors.carbonMedium,
    marginTop: Spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveFlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.categoryTransport,
    borderRadius: BorderRadius.base,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...TextStyles.caption,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
  },
  distanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceInput: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  distanceUnit: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    width: 30,
  },
  quickCalculation: {
    backgroundColor: Colors.carbonLowBg,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  quickCalculationText: {
    ...TextStyles.body,
    color: Colors.carbonLow,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});

export default TransportScreen;

