/**
 * GreenSense AR - Activity Type Definitions
 * 
 * Types for carbon activities, daily logs, and category tracking.
 */

/**
 * Activity categories for carbon tracking
 */
export type ActivityCategory = 'food' | 'transport' | 'product' | 'energy';

/**
 * Transport modes with emission factors
 */
export type TransportMode = 
  | 'car' 
  | 'bus' 
  | 'train' 
  | 'plane' 
  | 'bike' 
  | 'walk' 
  | 'electric_car'
  | 'motorcycle'
  | 'uber'
  | 'subway'
  | 'scooter'
  | 'carpool'
  | 'taxi';

/**
 * Food categories for carbon estimation
 */
export type FoodCategory = 
  | 'beef' 
  | 'pork' 
  | 'chicken' 
  | 'fish' 
  | 'dairy' 
  | 'vegetables' 
  | 'fruits'
  | 'grains'
  | 'processed'
  | 'beverage';

/**
 * Lifecycle stages for carbon breakdown
 */
export interface LifecycleBreakdown {
  /** Manufacturing/production emissions */
  manufacturing: number;
  /** Transportation/shipping emissions */
  transport: number;
  /** Usage phase emissions (if applicable) */
  usage: number;
  /** End-of-life disposal emissions */
  disposal: number;
}

/**
 * Alternative suggestion for lower-carbon option
 */
export interface Alternative {
  /** Name of the alternative */
  name: string;
  /** Carbon footprint of alternative */
  carbonKg: number;
  /** Percentage reduction vs original */
  reductionPercent: number;
  /** Brief explanation */
  reason: string;
}

/**
 * Base activity interface (common fields)
 */
interface BaseActivity {
  /** Unique identifier */
  id: string;
  /** ISO timestamp when activity was logged */
  timestamp: string;
  /** Activity category */
  category: ActivityCategory;
  /** Display name */
  name: string;
  /** Total carbon footprint in kg CO₂e */
  carbonKg: number;
  /** Quantity (e.g., number of items, portions, miles) */
  quantity: number;
  /** Unit of quantity */
  unit: string;
  /** Optional thumbnail image URI */
  thumbnail?: string;
  /** Eco score (0-100, higher is better) */
  ecoScore: number;
  /** Optional lifecycle breakdown */
  lifecycle?: LifecycleBreakdown;
  /** Optional alternatives */
  alternatives?: Alternative[];
  /** Optional notes */
  notes?: string;
}

/**
 * Product activity (scanned items)
 */
export interface ProductActivity extends BaseActivity {
  category: 'product';
  /** Detected objects from scan */
  objects: {
    id: string;
    name: string;
    carbonKg: number;
    severity: 'low' | 'medium' | 'high';
    description?: string;
  }[];
  /** Material composition if detected */
  materials?: string[];
  /** Brand if detected */
  brand?: string;
}

/**
 * Food activity (meals, groceries)
 */
export interface FoodActivity extends BaseActivity {
  category: 'food';
  /** Food category */
  foodCategory: FoodCategory;
  /** Meal type */
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  /** Ingredients if detailed */
  ingredients?: {
    name: string;
    carbonKg: number;
    quantity: string;
  }[];
  /** Nutrition info if available */
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

/**
 * Transport activity (commute, travel)
 */
export interface TransportActivity extends BaseActivity {
  category: 'transport';
  /** Mode of transport */
  mode: TransportMode;
  /** Distance in km */
  distanceKm: number;
  /** Duration in minutes */
  durationMinutes?: number;
  /** Start location (optional) */
  startLocation?: string;
  /** End location (optional) */
  endLocation?: string;
  /** Is recurring (e.g., daily commute) */
  isRecurring?: boolean;
}

/**
 * Energy activity (home energy usage)
 */
export interface EnergyActivity extends BaseActivity {
  category: 'energy';
  /** Energy type */
  energyType: 'electricity' | 'natural_gas' | 'heating_oil' | 'solar';
  /** Energy amount in kWh */
  energyKwh: number;
  /** Period */
  period: 'daily' | 'weekly' | 'monthly';
  /** Is estimated or from actual meter reading */
  isEstimated: boolean;
}

/**
 * Union type for all activities
 */
export type Activity = ProductActivity | FoodActivity | TransportActivity | EnergyActivity;

/**
 * Daily carbon log
 */
export interface DailyLog {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** All activities for this day */
  activities: Activity[];
  /** Total carbon for the day */
  totalCarbonKg: number;
  /** Daily budget (from settings) */
  budgetKg: number;
  /** Whether user is under budget */
  isUnderBudget: boolean;
  /** Breakdown by category */
  categoryTotals: {
    food: number;
    transport: number;
    product: number;
    energy: number;
  };
}

/**
 * Weekly summary
 */
export interface WeeklySummary {
  /** Start date of week (YYYY-MM-DD) */
  weekStart: string;
  /** Daily totals for the week */
  dailyTotals: number[];
  /** Total for the week */
  weekTotal: number;
  /** Category breakdown for the week */
  categoryTotals: {
    food: number;
    transport: number;
    product: number;
    energy: number;
  };
  /** Comparison to previous week */
  vsLastWeek: {
    difference: number;
    percentChange: number;
    improved: boolean;
  };
  /** Days under budget */
  daysUnderBudget: number;
}

/**
 * Category metadata
 */
export interface CategoryInfo {
  key: ActivityCategory;
  name: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Predefined categories
 */
export const CATEGORIES: CategoryInfo[] = [
  {
    key: 'food',
    name: 'Food',
    icon: 'restaurant-outline',
    color: '#3B82F6',
    description: 'Meals, groceries, and beverages',
  },
  {
    key: 'transport',
    name: 'Transport',
    icon: 'car-outline',
    color: '#F59E0B',
    description: 'Commuting, travel, and deliveries',
  },
  {
    key: 'product',
    name: 'Products',
    icon: 'cube-outline',
    color: '#8B5CF6',
    description: 'Purchases and scanned items',
  },
  {
    key: 'energy',
    name: 'Energy',
    icon: 'flash-outline',
    color: '#EAB308',
    description: 'Home electricity and heating',
  },
];

