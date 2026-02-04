/**
 * Carbon Tracer AR - Services Index
 * 
 * Central export for all services.
 */

export * from './gemini';
export * from './storage';
export * from './location';
export * from './notifications';
export * from './export';
export * from './barcode';
export * from './travelImpact';

// Maps service - import specific functions to avoid naming conflicts
export { 
  getRoute, 
  calculateTrip, 
  searchPlaces, 
  getPlaceDetails, 
  formatDistance, 
  formatDuration, 
  getModeName, 
  getCarbonFactor 
} from './maps';

// Note: dataLayer is not re-exported due to conflicts with storage/location.
// Import directly from './dataLayer' when needed.
// Note: calculateTripCarbon is exported from location.ts, use that for carbon calculations.

