/**
 * CarbonSense AR - Type Definitions
 * 
 * Core types for carbon footprint analysis and history tracking.
 */

/**
 * Severity levels for carbon footprint
 * - low: green indicator, relatively eco-friendly
 * - medium: yellow indicator, moderate impact
 * - high: red indicator, significant carbon footprint
 */
export type CarbonSeverity = 'low' | 'medium' | 'high';

/**
 * Represents a single object detected in a scan
 */
export interface AnalyzedObject {
  /** Unique identifier for this object */
  id: string;
  /** Name of the detected object (e.g., "Laptop", "Plastic Bottle") */
  name: string;
  /** Estimated carbon footprint in kg CO₂ equivalent */
  carbonKg: number;
  /** Severity classification based on carbon footprint */
  severity: CarbonSeverity;
  /** Optional description or context about the carbon footprint */
  description?: string;
}

/**
 * Represents a single scan session with all detected objects
 */
export interface ScanRecord {
  /** Unique identifier for this scan */
  id: string;
  /** ISO timestamp of when the scan was performed */
  timestamp: string;
  /** List of objects detected in this scan */
  objects: AnalyzedObject[];
  /** Total carbon footprint for all objects in this scan */
  totalCarbonKg: number;
  /** Optional base64 thumbnail of the scanned image */
  thumbnail?: string;
}

/**
 * Summary of user's scanning history for coach insights
 */
export interface HistorySummary {
  /** Total number of scans performed */
  totalScans: number;
  /** Total number of objects detected across all scans */
  totalObjects: number;
  /** Total carbon footprint across all scans */
  totalCarbonKg: number;
  /** Count of objects by category/type */
  objectCategories: Record<string, number>;
  /** Most frequently scanned object types */
  topObjectTypes: string[];
  /** Average carbon per scan */
  averageCarbonPerScan: number;
}

/**
 * Response structure from Gemini Vision API
 */
export interface GeminiAnalysisResponse {
  objects: AnalyzedObject[];
  /** Optional raw response for debugging */
  rawResponse?: unknown;
}

/**
 * Coach message response from Gemini
 */
export interface CoachMessage {
  /** Main advice/insight text */
  message: string;
  /** Optional list of actionable tips */
  tips?: string[];
  /** Encouragement or motivational note */
  encouragement?: string;
}

/**
 * User profile data
 */
export interface UserProfile {
  /** Display name */
  name: string;
  /** Date when user started using the app */
  joinedDate: string;
  /** Total lifetime scans */
  totalScans: number;
  /** Total lifetime carbon tracked */
  totalCarbonTracked: number;
}

