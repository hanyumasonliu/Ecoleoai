/**
 * GreenSense AR - Maps Service
 * 
 * Google Maps integration for:
 * - Route calculation (distance, time)
 * - Carbon footprint estimation based on transport mode
 * - Place search and autocomplete
 * 
 * SETUP: Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file
 */

import { TransportMode } from '../types/activity';

// Get API key from environment
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
  }[];
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

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      console.log('Google Maps API error:', data.status);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

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
 * Calculate trip with carbon comparison for multiple modes
 */
export async function calculateTrip(
  origin: string | Coordinates,
  destination: string | Coordinates,
  preferredMode: TransportMode = 'car'
): Promise<TripCalculation | null> {
  // Try to get route from Google Maps
  let route = await getRoute(origin, destination, 'driving');
  
  // If Google Maps fails, estimate based on straight-line distance
  if (!route) {
    // For demo/fallback: estimate distance
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

  // Calculate alternatives
  const alternativeModes: TransportMode[] = ['walk', 'bike', 'bus', 'train', 'car', 'electric_car'];
  const alternatives = alternativeModes
    .filter(m => m !== preferredMode)
    .map(mode => ({
      mode,
      carbonKg: calculateTripCarbon(route!.distanceKm, mode),
      durationMinutes: mode === preferredMode 
        ? route!.durationMinutes 
        : estimateDuration(route!.distanceKm, mode),
    }))
    .sort((a, b) => a.carbonKg - b.carbonKg);

  return {
    route,
    transportMode: preferredMode,
    carbonKg,
    alternativeModes: alternatives,
  };
}

/**
 * Search for places (autocomplete)
 * 
 * @param query - Search query
 * @param location - Optional center point for results
 */
export async function searchPlaces(
  query: string,
  location?: Coordinates
): Promise<Place[]> {
  if (!GOOGLE_MAPS_API_KEY || !query.trim()) {
    return [];
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (location) {
      url += `&location=${location.lat},${location.lng}&radius=50000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return [];
    }

    return data.predictions.map((p: any) => ({
      placeId: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      address: p.description,
      coordinates: { lat: 0, lng: 0 }, // Need geocoding to get coordinates
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

/**
 * Get place details including coordinates
 */
export async function getPlaceDetails(placeId: string): Promise<Place | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      return null;
    }

    const result = data.result;
    return {
      placeId,
      name: result.name,
      address: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
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

