/**
 * Carbon Tracer AI - Maps Service
 * 
 * Google Maps integration for:
 * - Route calculation (distance, time)
 * - Carbon footprint estimation based on transport mode
 * - Place search and autocomplete
 * 
 * SETUP: Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file
 */

import Constants from 'expo-constants';
import { TransportMode } from '../types/activity';

// Get API key from environment (Expo way)
const getApiKey = (): string => {
  // Try expo-constants first (recommended for Expo)
  const expoKey = Constants.expoConfig?.extra?.googleMapsApiKey;
  if (expoKey) return expoKey;
  
  // Fallback to process.env
  const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (envKey) return envKey;
  
  // No API key found - return empty (will fail gracefully)
  console.warn('Google Maps API key not found. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env');
  return '';
};

const GOOGLE_MAPS_API_KEY = getApiKey();

// Log API key status for debugging
console.log('Google Maps API key available:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');

/**
 * Location coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Place result from search
 */
export interface Place {
  placeId: string;
  name: string;
  address: string;
  coordinates: Coordinates;
}

/**
 * Route information
 */
export interface RouteInfo {
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
  startAddress: string;
  endAddress: string;
  polyline?: string;
}

/**
 * Trip calculation result
 */
export interface TripCalculation {
  route: RouteInfo;
  transportMode: TransportMode;
  carbonKg: number;
  alternativeModes: {
    mode: TransportMode;
    carbonKg: number;
    durationMinutes: number;
    distanceKm: number;
    isRealRoute: boolean; // True if from Google Maps, false if estimated
  }[];
}

/**
 * Multi-mode route result for comparison
 */
export interface MultiModeRouteResult {
  mode: TransportMode;
  route: RouteInfo | null;
  carbonKg: number;
  isRealRoute: boolean;
}

/**
 * Carbon emission factors (kg CO₂e per km)
 */
const CARBON_FACTORS: Record<TransportMode, number> = {
  walk: 0,
  bike: 0,
  scooter: 0.02, // Electric scooter
  bus: 0.089,
  train: 0.041,
  subway: 0.03,
  car: 0.192, // Average car
  electric_car: 0.053,
  carpool: 0.096, // Assuming 2 people
  uber: 0.21, // Slightly higher due to deadheading
  taxi: 0.21,
  motorcycle: 0.103,
  plane: 0.255, // Per km (short haul)
};

/**
 * Mode display names
 */
const MODE_NAMES: Record<TransportMode, string> = {
  walk: 'Walking',
  bike: 'Cycling',
  scooter: 'E-Scooter',
  bus: 'Bus',
  train: 'Train',
  subway: 'Subway/Metro',
  car: 'Car',
  electric_car: 'Electric Car',
  carpool: 'Carpool',
  uber: 'Rideshare',
  taxi: 'Taxi',
  motorcycle: 'Motorcycle',
  plane: 'Airplane',
};

/**
 * Average speeds (km/h) for duration estimation
 */
const AVERAGE_SPEEDS: Record<TransportMode, number> = {
  walk: 5,
  bike: 15,
  scooter: 20,
  bus: 25,
  train: 80,
  subway: 35,
  car: 40,
  electric_car: 40,
  carpool: 40,
  uber: 35,
  taxi: 35,
  motorcycle: 45,
  plane: 800,
};

/**
 * Calculate carbon emissions for a trip
 */
export function calculateTripCarbon(distanceKm: number, mode: TransportMode): number {
  const factor = CARBON_FACTORS[mode] || CARBON_FACTORS.car;
  return distanceKm * factor;
}

/**
 * Estimate trip duration
 */
export function estimateDuration(distanceKm: number, mode: TransportMode): number {
  const speed = AVERAGE_SPEEDS[mode] || AVERAGE_SPEEDS.car;
  return (distanceKm / speed) * 60; // Convert to minutes
}

/**
 * Get route from Google Maps Directions API
 * 
 * @param origin - Starting point (coordinates or address)
 * @param destination - End point (coordinates or address)
 * @param mode - Transport mode for Google API ('driving', 'walking', 'bicycling', 'transit')
 */
export async function getRoute(
  origin: string | Coordinates,
  destination: string | Coordinates,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<RouteInfo | null> {
  // If no API key, use fallback calculation
  if (!GOOGLE_MAPS_API_KEY) {
    console.log('Google Maps API key not configured, using fallback');
    return null;
  }

  try {
    const originStr = typeof origin === 'string' 
      ? encodeURIComponent(origin)
      : `${origin.lat},${origin.lng}`;
    
    const destinationStr = typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.lat},${destination.lng}`;

    console.log('📍 Fetching route:', { 
      origin: typeof origin === 'string' ? origin : 'coords', 
      destination: typeof destination === 'string' ? destination : 'coords',
      mode 
    });

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('📍 Google Maps response status:', data.status);

    if (data.status !== 'OK' || !data.routes?.[0]) {
      console.log('Google Maps API error:', data.status, data.error_message || '');
      
      // Provide user-friendly error info
      if (data.status === 'NOT_FOUND') {
        console.log('❌ Route not found - origin or destination could not be geocoded');
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('❌ No route found between these locations');
      } else if (data.status === 'REQUEST_DENIED') {
        console.log('❌ API key issue - check Directions API is enabled');
      }
      
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    console.log('✅ Route found:', leg.distance.text, leg.duration.text);

    return {
      distanceKm: leg.distance.value / 1000,
      distanceText: leg.distance.text,
      durationMinutes: leg.duration.value / 60,
      durationText: leg.duration.text,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      polyline: route.overview_polyline?.points,
    };
  } catch (error) {
    console.error('Error getting route:', error);
    return null;
  }
}

/**
 * Map our TransportMode to Google Maps travel mode
 */
function getGoogleTravelMode(mode: TransportMode): 'driving' | 'walking' | 'bicycling' | 'transit' | null {
  switch (mode) {
    case 'walk':
      return 'walking';
    case 'bike':
    case 'scooter':
      return 'bicycling';
    case 'bus':
    case 'train':
    case 'subway':
      return 'transit';
    case 'car':
    case 'electric_car':
    case 'carpool':
    case 'uber':
    case 'taxi':
    case 'motorcycle':
      return 'driving';
    case 'plane':
      return null; // Planes don't use road routing
    default:
      return 'driving';
  }
}

/**
 * Calculate trip with real routes for multiple modes
 * Fetches actual distances/durations from Google Maps for each applicable mode
 */
export async function calculateTrip(
  origin: string | Coordinates,
  destination: string | Coordinates,
  preferredMode: TransportMode = 'car',
  fetchAllModes: boolean = true
): Promise<TripCalculation | null> {
  // Define the modes we want to compare
  const modesToCompare: TransportMode[] = ['walk', 'bike', 'bus', 'train', 'car', 'electric_car', 'carpool', 'uber'];
  
  // Map each transport mode to Google travel mode
  const googleModes = new Map<'driving' | 'walking' | 'bicycling' | 'transit', TransportMode[]>();
  
  for (const mode of modesToCompare) {
    const googleMode = getGoogleTravelMode(mode);
    if (googleMode) {
      if (!googleModes.has(googleMode)) {
        googleModes.set(googleMode, []);
      }
      googleModes.get(googleMode)!.push(mode);
    }
  }

  // Fetch routes for each unique Google travel mode (to minimize API calls)
  const routesByGoogleMode = new Map<string, RouteInfo | null>();
  
  if (fetchAllModes) {
    console.log('🗺️ Fetching routes for all transport modes...');
    
    // Fetch all routes in parallel
    const fetchPromises = Array.from(googleModes.keys()).map(async (googleMode) => {
      const route = await getRoute(origin, destination, googleMode);
      return { googleMode, route };
    });
    
    const results = await Promise.all(fetchPromises);
    for (const { googleMode, route } of results) {
      routesByGoogleMode.set(googleMode, route);
      if (route) {
        console.log(`✅ ${googleMode}: ${route.distanceText}, ${route.durationText}`);
      }
    }
  } else {
    // Just fetch the preferred mode
    const googleMode = getGoogleTravelMode(preferredMode) || 'driving';
    const route = await getRoute(origin, destination, googleMode);
    routesByGoogleMode.set(googleMode, route);
  }

  // Get the route for the preferred mode
  const preferredGoogleMode = getGoogleTravelMode(preferredMode) || 'driving';
  let route = routesByGoogleMode.get(preferredGoogleMode) || null;
  
  // Fallback: try driving if preferred mode failed
  if (!route && preferredGoogleMode !== 'driving') {
    route = routesByGoogleMode.get('driving') || null;
  }
  
  // If all routes fail, create an estimated fallback
  if (!route) {
    const estimatedDistanceKm = 10; // Default 10km for demo
    route = {
      distanceKm: estimatedDistanceKm,
      distanceText: `~${estimatedDistanceKm} km`,
      durationMinutes: estimateDuration(estimatedDistanceKm, preferredMode),
      durationText: `~${Math.round(estimateDuration(estimatedDistanceKm, preferredMode))} min`,
      startAddress: typeof origin === 'string' ? origin : 'Start Location',
      endAddress: typeof destination === 'string' ? destination : 'End Location',
    };
  }

  const carbonKg = calculateTripCarbon(route.distanceKm, preferredMode);

  // Build alternatives with real route data where available
  const alternatives: TripCalculation['alternativeModes'] = [];
  
  for (const mode of modesToCompare) {
    if (mode === preferredMode) continue;
    
    const googleMode = getGoogleTravelMode(mode);
    const modeRoute = googleMode ? routesByGoogleMode.get(googleMode) : null;
    
    if (modeRoute) {
      // Use real route data
      alternatives.push({
        mode,
        distanceKm: modeRoute.distanceKm,
        carbonKg: calculateTripCarbon(modeRoute.distanceKm, mode),
        durationMinutes: modeRoute.durationMinutes,
        isRealRoute: true,
      });
    } else {
      // Estimate based on driving distance
      const baseDistance = route.distanceKm;
      alternatives.push({
        mode,
        distanceKm: baseDistance,
        carbonKg: calculateTripCarbon(baseDistance, mode),
        durationMinutes: estimateDuration(baseDistance, mode),
        isRealRoute: false,
      });
    }
  }
  
  // Sort by carbon (lowest first)
  alternatives.sort((a, b) => a.carbonKg - b.carbonKg);

  return {
    route,
    transportMode: preferredMode,
    carbonKg,
    alternativeModes: alternatives,
  };
}

/**
 * Search for places using Google Places API (New)
 * 
 * Uses the new Places API format which replaced the legacy autocomplete API
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 * 
 * @param query - Search query
 * @param location - Optional center point for results
 */
export async function searchPlaces(
  query: string,
  location?: Coordinates
): Promise<Place[]> {
  console.log('🔍 searchPlaces called with query:', query);
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.log('❌ No Google Maps API key configured');
    return [];
  }
  
  if (!query.trim()) {
    console.log('❌ Empty query');
    return [];
  }

  try {
    // Use Places API (New) - Text Search endpoint
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const requestBody: any = {
      textQuery: query,
      maxResultCount: 5,
    };
    
    // Add location bias if provided
    if (location) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: 50000.0, // 50km radius
        },
      };
    }

    console.log('🌐 Fetching Places API (New)...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Places API error:', response.status, data.error?.message || JSON.stringify(data));
      if (response.status === 403) {
        console.log('💡 Tip: Enable "Places API (New)" in Google Cloud Console');
      }
      return [];
    }

    if (!data.places || data.places.length === 0) {
      console.log('💡 No places found for this query');
      return [];
    }

    const places = data.places.map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text || p.formattedAddress,
      address: p.formattedAddress,
      coordinates: p.location ? {
        lat: p.location.latitude,
        lng: p.location.longitude,
      } : { lat: 0, lng: 0 },
    }));
    
    console.log(`✅ Found ${places.length} places`);
    return places;
  } catch (error) {
    console.error('❌ Error searching places:', error);
    return [];
  }
}

/**
 * Get place details including coordinates using Places API (New)
 */
export async function getPlaceDetails(placeId: string): Promise<Place | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    // Places API (New) - Get Place Details
    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ Place details error:', data.error?.message || JSON.stringify(data));
      return null;
    }

    return {
      placeId,
      name: data.displayName?.text || data.formattedAddress,
      address: data.formattedAddress,
      coordinates: data.location ? {
        lat: data.location.latitude,
        lng: data.location.longitude,
      } : { lat: 0, lng: 0 },
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get mode display name
 */
export function getModeName(mode: TransportMode): string {
  return MODE_NAMES[mode] || mode;
}

/**
 * Get carbon factor for a mode
 */
export function getCarbonFactor(mode: TransportMode): number {
  return CARBON_FACTORS[mode] || CARBON_FACTORS.car;
}

export default {
  calculateTripCarbon,
  estimateDuration,
  getRoute,
  calculateTrip,
  searchPlaces,
  getPlaceDetails,
  formatDistance,
  formatDuration,
  getModeName,
  getCarbonFactor,
};

