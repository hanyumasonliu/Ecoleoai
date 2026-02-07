/**
 * Carbon Tracer AI - Travel Impact Model API Service
 * 
 * Google's Travel Impact Model API provides accurate carbon emission
 * estimates for flights based on real-world data including:
 * - Aircraft type and model
 * - Route distance and efficiency
 * - Seat class (economy, premium economy, business, first)
 * - Load factor and fuel consumption
 * 
 * API Docs: https://developers.google.com/travel/impact-model
 */

// Get API key from environment
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * Seat class types
 */
export type SeatClass = 'economy' | 'premium_economy' | 'business' | 'first';

/**
 * Flight leg information
 */
export interface FlightLeg {
  origin: string; // IATA airport code (e.g., "LAX")
  destination: string; // IATA airport code (e.g., "JFK")
  operatingCarrierCode?: string; // Airline code (e.g., "AA")
  flightNumber?: number;
  departureDate?: {
    year: number;
    month: number;
    day: number;
  };
}

/**
 * Flight emissions request
 */
export interface FlightEmissionsRequest {
  flights: {
    origin: string;
    destination: string;
    operatingCarrierCode?: string;
    flightNumber?: number;
    departureDate?: {
      year: number;
      month: number;
      day: number;
    };
  }[];
}

/**
 * Emission result for a flight
 */
export interface FlightEmissionResult {
  flight: {
    origin: string;
    destination: string;
    operatingCarrierCode?: string;
    flightNumber?: number;
  };
  emissionsGramsPerPax: {
    economy?: number;
    premiumEconomy?: number;
    business?: number;
    first?: number;
  };
  distanceKm?: number;
  durationMinutes?: number;
  // Model info
  modelVersion?: string;
  // Typical emissions for comparison
  typicalEmissionsGramsPerPax?: number;
}

/**
 * Computed flight emissions response
 */
export interface FlightEmissionsResponse {
  flightEmissions: FlightEmissionResult[];
  modelVersion?: {
    major: number;
    minor: number;
    patch: number;
    dated: string;
  };
}

/**
 * Helper: Extract emissions from API response into our format
 */
function extractEmissions(
  data: any,
  seatClass: SeatClass
): {
  carbonKg: number;
  distanceKm: number;
  emissionsByClass: {
    economy: number;
    premiumEconomy: number;
    business: number;
    first: number;
  };
  source: 'travel_impact_model';
} | null {
  const emissions = data?.flightEmissions?.[0]?.emissionsGramsPerPax;
  if (!emissions || (!emissions.economy && !emissions.business)) return null;

  const emissionsByClass = {
    economy: (emissions.economy || 0) / 1000,
    premiumEconomy: (emissions.premiumEconomy || emissions.economy || 0) / 1000,
    business: (emissions.business || 0) / 1000,
    first: (emissions.first || emissions.business || 0) / 1000,
  };

  let carbonKg = emissionsByClass.economy;
  if (seatClass === 'premium_economy') carbonKg = emissionsByClass.premiumEconomy;
  else if (seatClass === 'business') carbonKg = emissionsByClass.business;
  else if (seatClass === 'first') carbonKg = emissionsByClass.first;

  return {
    carbonKg,
    distanceKm: data.flightEmissions[0].distanceKm || carbonKg / 0.255,
    emissionsByClass,
    source: 'travel_impact_model',
  };
}

/**
 * Helper: Try a single flight API call
 */
async function tryFlightEmissions(
  url: string,
  originCode: string,
  destCode: string,
  carrier: string,
  flightNum: number,
  departureDate: { year: number; month: number; day: number }
): Promise<any | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flights: [{
          origin: originCode,
          destination: destCode,
          operatingCarrierCode: carrier,
          flightNumber: flightNum,
          departureDate,
        }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data?.flightEmissions?.[0]?.emissionsGramsPerPax) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate flight emissions using Google's Travel Impact Model API
 * 
 * IMPORTANT: Only works for FUTURE scheduled flights. Past flights are NOT supported.
 * The API requires a flight number - without it, no emissions are returned.
 * 
 * Strategy:
 * 1. If flight number provided → try that specific flight on upcoming dates
 * 2. If no flight number → auto-discover by scanning common flight numbers
 *    on major carriers for this route (stops at first hit)
 * 
 * @param origin - Origin airport IATA code (e.g., "LAX")
 * @param destination - Destination airport IATA code (e.g., "JFK")
 * @param seatClass - Seat class for per-passenger calculation
 * @param flightNumber - Optional flight number (e.g., 274 for AA274)
 * @param carrierCode - Optional carrier code (e.g., "AA")
 */
export async function calculateFlightEmissions(
  origin: string,
  destination: string,
  seatClass: SeatClass = 'economy',
  flightNumber?: number,
  carrierCode?: string
): Promise<{
  carbonKg: number;
  distanceKm: number;
  emissionsByClass: {
    economy: number;
    premiumEconomy: number;
    business: number;
    first: number;
  };
  comparisonToTypical?: number;
  source: 'travel_impact_model' | 'fallback';
} | null> {
  if (!GOOGLE_API_KEY) {
    console.log('Google API key not configured, using fallback');
    return null;
  }

  const originCode = origin.toUpperCase().trim();
  const destCode = destination.toUpperCase().trim();

  if (!/^[A-Z]{3}$/.test(originCode) || !/^[A-Z]{3}$/.test(destCode)) {
    console.log('❌ Invalid airport codes:', { origin: originCode, destination: destCode });
    return null;
  }

  const url = `https://travelimpactmodel.googleapis.com/v1/flights:computeFlightEmissions?key=${GOOGLE_API_KEY}`;
  
  // Get a near-future date (3 days from now — likely to have scheduled flights)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const departureDate = {
    year: futureDate.getFullYear(),
    month: futureDate.getMonth() + 1,
    day: futureDate.getDate(),
  };

  try {
    // === STRATEGY 1: User provided a specific flight number ===
    if (flightNumber && carrierCode) {
      console.log(`✈️ Looking up ${carrierCode}${flightNumber} (${originCode}→${destCode})...`);
      
      // Try multiple near-future dates (flight may not run every day)
      for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        const depDate = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
        };

        const data = await tryFlightEmissions(url, originCode, destCode, carrierCode.toUpperCase(), flightNumber, depDate);
        if (data) {
          const result = extractEmissions(data, seatClass);
          if (result) {
            console.log(`✅ Got emissions for ${carrierCode}${flightNumber}: ${result.carbonKg.toFixed(1)} kg CO₂e (economy)`);
            return result;
          }
        }
      }
      console.log(`⚠️ ${carrierCode}${flightNumber} not found in schedule, will auto-discover...`);
    }

    // === STRATEGY 2: Auto-discover a flight on this route ===
    // Send batched requests (multiple flights per API call) for speed
    console.log(`🔍 Auto-discovering flights for ${originCode}→${destCode}...`);
    
    const carriers = ['AA', 'UA', 'DL', 'B6', 'WN', 'AS', 'NK'];
    // Low flight numbers are often major trunk routes
    const flightNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 50, 100];
    
    // Try each carrier with a batch of flight numbers (one API call per carrier)
    for (const carrier of carriers) {
      try {
        const batchFlights = flightNumbers.map(fn => ({
          origin: originCode,
          destination: destCode,
          operatingCarrierCode: carrier,
          flightNumber: fn,
          departureDate,
        }));
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flights: batchFlights }),
        });
        
        if (!response.ok) continue;
        const data = await response.json();
        
        if (data.flightEmissions) {
          for (let i = 0; i < data.flightEmissions.length; i++) {
            const emissions = data.flightEmissions[i]?.emissionsGramsPerPax;
            if (emissions && (emissions.economy || emissions.business)) {
              const fn = flightNumbers[i];
              console.log(`✅ Found ${carrier}${fn} on ${originCode}→${destCode}`);
              
              const emissionsByClass = {
                economy: (emissions.economy || 0) / 1000,
                premiumEconomy: (emissions.premiumEconomy || emissions.economy || 0) / 1000,
                business: (emissions.business || 0) / 1000,
                first: (emissions.first || emissions.business || 0) / 1000,
              };
              
              let carbonKg = emissionsByClass.economy;
              if (seatClass === 'premium_economy') carbonKg = emissionsByClass.premiumEconomy;
              else if (seatClass === 'business') carbonKg = emissionsByClass.business;
              else if (seatClass === 'first') carbonKg = emissionsByClass.first;
              
              console.log(`✅ ${carbonKg.toFixed(1)} kg CO₂e (${seatClass})`);
              
              return {
                carbonKg,
                distanceKm: data.flightEmissions[i].distanceKm || carbonKg / 0.255,
                emissionsByClass,
                source: 'travel_impact_model' as const,
              };
            }
          }
        }
      } catch {
        continue;
      }
    }

    console.log('⚠️ Could not find any scheduled flight for this route via API');
    return null;
  } catch (error) {
    console.error('Error calling Travel Impact Model API:', error);
    return null;
  }
}

/**
 * Calculate emissions for a multi-leg flight (connecting flights)
 */
export async function calculateMultiLegFlightEmissions(
  legs: FlightLeg[],
  seatClass: SeatClass = 'economy'
): Promise<{
  totalCarbonKg: number;
  totalDistanceKm: number;
  legs: {
    origin: string;
    destination: string;
    carbonKg: number;
    distanceKm: number;
  }[];
  source: 'travel_impact_model' | 'fallback';
} | null> {
  if (!GOOGLE_API_KEY || legs.length === 0) {
    return null;
  }

  try {
    const url = `https://travelimpactmodel.googleapis.com/v1/flights:computeFlightEmissions?key=${GOOGLE_API_KEY}`;

    const requestBody = {
      flights: legs.map((leg) => ({
        origin: leg.origin.toUpperCase().trim(),
        destination: leg.destination.toUpperCase().trim(),
        ...(leg.operatingCarrierCode && { operatingCarrierCode: leg.operatingCarrierCode }),
        ...(leg.flightNumber && { flightNumber: leg.flightNumber }),
        ...(leg.departureDate && { departureDate: leg.departureDate }),
      })),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return null;
    }

    const data: FlightEmissionsResponse = await response.json();

    if (!data.flightEmissions) {
      return null;
    }

    let totalCarbonKg = 0;
    let totalDistanceKm = 0;
    const processedLegs: {
      origin: string;
      destination: string;
      carbonKg: number;
      distanceKm: number;
    }[] = [];

    for (const emission of data.flightEmissions) {
      const emissions = emission.emissionsGramsPerPax;
      let carbonKg: number;

      switch (seatClass) {
        case 'premium_economy':
          carbonKg = (emissions.premiumEconomy || emissions.economy || 0) / 1000;
          break;
        case 'business':
          carbonKg = (emissions.business || 0) / 1000;
          break;
        case 'first':
          carbonKg = (emissions.first || emissions.business || 0) / 1000;
          break;
        default:
          carbonKg = (emissions.economy || 0) / 1000;
      }

      const distanceKm = emission.distanceKm || carbonKg / 0.255;

      totalCarbonKg += carbonKg;
      totalDistanceKm += distanceKm;

      processedLegs.push({
        origin: emission.flight.origin,
        destination: emission.flight.destination,
        carbonKg,
        distanceKm,
      });
    }

    return {
      totalCarbonKg,
      totalDistanceKm,
      legs: processedLegs,
      source: 'travel_impact_model',
    };
  } catch (error) {
    console.error('Error calculating multi-leg flight emissions:', error);
    return null;
  }
}

/**
 * Fallback calculation when API is unavailable
 * Uses industry-standard emission factors
 */
export function calculateFlightEmissionsFallback(
  distanceKm: number,
  seatClass: SeatClass = 'economy'
): {
  carbonKg: number;
  emissionsByClass: {
    economy: number;
    premiumEconomy: number;
    business: number;
    first: number;
  };
  source: 'fallback';
} {
  // Base emission factor: 0.255 kg CO2 per km (economy)
  // These multipliers are based on ICAO methodology
  const baseEmission = distanceKm * 0.255;

  // Seat class multipliers based on space/weight allocation
  const emissionsByClass = {
    economy: baseEmission,
    premiumEconomy: baseEmission * 1.5,
    business: baseEmission * 3.0,
    first: baseEmission * 4.0,
  };

  let carbonKg: number;
  switch (seatClass) {
    case 'premium_economy':
      carbonKg = emissionsByClass.premiumEconomy;
      break;
    case 'business':
      carbonKg = emissionsByClass.business;
      break;
    case 'first':
      carbonKg = emissionsByClass.first;
      break;
    default:
      carbonKg = emissionsByClass.economy;
  }

  return {
    carbonKg,
    emissionsByClass,
    source: 'fallback',
  };
}

/**
 * Get flight emission estimate - uses API if available, falls back to calculation
 */
export async function getFlightEmissions(
  origin: string,
  destination: string,
  seatClass: SeatClass = 'economy',
  estimatedDistanceKm?: number,
  flightNumber?: number,
  carrierCode?: string
): Promise<{
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
}> {
  // Try the Travel Impact Model API first (requires flight number for emissions)
  const apiResult = await calculateFlightEmissions(origin, destination, seatClass, flightNumber, carrierCode);

  if (apiResult) {
    return {
      ...apiResult,
      accuracy: 'high',
    };
  }

  // Fallback to manual calculation
  const distance = estimatedDistanceKm || estimateFlightDistance(origin, destination);
  const fallbackResult = calculateFlightEmissionsFallback(distance, seatClass);

  return {
    ...fallbackResult,
    distanceKm: distance,
    accuracy: 'medium',
  };
}

/**
 * Estimate flight distance between airports
 * This is a rough estimate when we don't have actual route data
 */
function estimateFlightDistance(origin: string, destination: string): number {
  // Common route distances (approximate great circle distances in km)
  const commonRoutes: Record<string, number> = {
    'LAX-JFK': 3974,
    'JFK-LAX': 3974,
    'LAX-SFO': 544,
    'SFO-LAX': 544,
    'JFK-LHR': 5555,
    'LHR-JFK': 5555,
    'LAX-LHR': 8780,
    'LHR-LAX': 8780,
    'SFO-JFK': 4139,
    'JFK-SFO': 4139,
    'ORD-LAX': 2805,
    'LAX-ORD': 2805,
    'ATL-LAX': 3107,
    'LAX-ATL': 3107,
    'DFW-LAX': 1988,
    'LAX-DFW': 1988,
    'SEA-LAX': 1544,
    'LAX-SEA': 1544,
    'DEN-LAX': 1387,
    'LAX-DEN': 1387,
    'MIA-LAX': 3756,
    'LAX-MIA': 3756,
    'BOS-LAX': 4172,
    'LAX-BOS': 4172,
    // International
    'LAX-NRT': 8816,
    'NRT-LAX': 8816,
    'JFK-CDG': 5837,
    'CDG-JFK': 5837,
    'SFO-HKG': 11101,
    'HKG-SFO': 11101,
    'LAX-SYD': 12074,
    'SYD-LAX': 12074,
  };

  const routeKey = `${origin.toUpperCase()}-${destination.toUpperCase()}`;
  if (commonRoutes[routeKey]) {
    return commonRoutes[routeKey];
  }

  // Default estimate for unknown routes (average domestic flight ~1500km)
  return 1500;
}

/**
 * Compare flight emissions between direct and connecting flights
 */
export async function compareFlightOptions(
  origin: string,
  destination: string,
  connectionAirport?: string,
  seatClass: SeatClass = 'economy'
): Promise<{
  direct: {
    carbonKg: number;
    distanceKm: number;
  } | null;
  connecting: {
    carbonKg: number;
    distanceKm: number;
    via: string;
  } | null;
  recommendation: string;
}> {
  // Get direct flight emissions
  const directResult = await getFlightEmissions(origin, destination, seatClass);

  let connectingResult = null;

  if (connectionAirport) {
    // Get connecting flight emissions
    const multiLegResult = await calculateMultiLegFlightEmissions(
      [
        { origin, destination: connectionAirport },
        { origin: connectionAirport, destination },
      ],
      seatClass
    );

    if (multiLegResult) {
      connectingResult = {
        carbonKg: multiLegResult.totalCarbonKg,
        distanceKm: multiLegResult.totalDistanceKm,
        via: connectionAirport,
      };
    }
  }

  // Generate recommendation
  let recommendation = '';
  if (directResult && connectingResult) {
    const savings = connectingResult.carbonKg - directResult.carbonKg;
    const savingsPercent = (savings / connectingResult.carbonKg) * 100;

    if (savings > 0) {
      recommendation = `Direct flight saves ${savings.toFixed(1)} kg CO₂ (${savingsPercent.toFixed(0)}% less emissions)`;
    } else {
      recommendation = `Connecting flight via ${connectionAirport} has similar emissions`;
    }
  } else if (directResult) {
    recommendation = 'Direct flight is your best option';
  }

  return {
    direct: directResult
      ? { carbonKg: directResult.carbonKg, distanceKm: directResult.distanceKm }
      : null,
    connecting: connectingResult,
    recommendation,
  };
}

/**
 * Get seat class impact explanation
 */
export function getSeatClassImpact(
  emissionsByClass: {
    economy: number;
    premiumEconomy: number;
    business: number;
    first: number;
  }
): {
  economy: { kg: number; multiplier: number };
  premiumEconomy: { kg: number; multiplier: number };
  business: { kg: number; multiplier: number };
  first: { kg: number; multiplier: number };
} {
  const base = emissionsByClass.economy || 1;

  return {
    economy: {
      kg: emissionsByClass.economy,
      multiplier: 1,
    },
    premiumEconomy: {
      kg: emissionsByClass.premiumEconomy,
      multiplier: Math.round((emissionsByClass.premiumEconomy / base) * 10) / 10,
    },
    business: {
      kg: emissionsByClass.business,
      multiplier: Math.round((emissionsByClass.business / base) * 10) / 10,
    },
    first: {
      kg: emissionsByClass.first,
      multiplier: Math.round((emissionsByClass.first / base) * 10) / 10,
    },
  };
}

export default {
  calculateFlightEmissions,
  calculateMultiLegFlightEmissions,
  calculateFlightEmissionsFallback,
  getFlightEmissions,
  compareFlightOptions,
  getSeatClassImpact,
};

