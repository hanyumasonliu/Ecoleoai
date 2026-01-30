/**
 * GreenSense AR - Barcode Lookup Service
 * 
 * Looks up product information from barcodes using Open Food Facts
 * and other product databases to estimate carbon footprint.
 */

import { AnalyzedObject, CarbonSeverity } from '../types/carbon';

/**
 * Product data from barcode lookup
 */
interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  found: boolean;
}

/**
 * Carbon estimates by product category
 * Based on lifecycle analysis data (kg CO2e)
 */
const CATEGORY_CARBON_ESTIMATES: Record<string, number> = {
  // Food & Beverages
  'beverages': 0.5,
  'water': 0.1,
  'sodas': 0.4,
  'juices': 0.8,
  'dairy': 3.2,
  'milk': 3.2,
  'cheese': 13.5,
  'yogurt': 2.5,
  'meat': 27,
  'beef': 60,
  'pork': 12,
  'chicken': 6.9,
  'fish': 5.4,
  'seafood': 5.4,
  'vegetables': 2,
  'fruits': 1.1,
  'bread': 1.6,
  'cereals': 2.5,
  'snacks': 3,
  'chocolate': 19,
  'coffee': 17,
  'tea': 0.5,
  
  // Household
  'cleaning': 1.5,
  'detergent': 2,
  'soap': 0.5,
  'cosmetics': 8,
  'personal-care': 3,
  'shampoo': 0.5,
  
  // Other
  'electronics': 50,
  'clothing': 10,
  'packaging': 0.3,
  'default': 2,
};

/**
 * Get carbon severity based on kg value
 */
function getSeverity(carbonKg: number): CarbonSeverity {
  if (carbonKg < 5) return 'low';
  if (carbonKg < 20) return 'medium';
  return 'high';
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `barcode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estimate carbon from product category
 */
function estimateCarbonFromCategory(category: string): number {
  const lowerCategory = category.toLowerCase();
  
  for (const [key, value] of Object.entries(CATEGORY_CARBON_ESTIMATES)) {
    if (lowerCategory.includes(key)) {
      return value;
    }
  }
  
  return CATEGORY_CARBON_ESTIMATES.default;
}

/**
 * Cache for barcode lookups to ensure consistent results
 */
const barcodeCache: Map<string, BarcodeProduct | null> = new Map();

/**
 * Look up product from Open Food Facts API with caching
 */
async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  // Check cache first for consistent results
  if (barcodeCache.has(barcode)) {
    console.log('Using cached barcode result for:', barcode);
    return barcodeCache.get(barcode) || null;
  }
  
  try {
    console.log('Fetching from Open Food Facts:', barcode);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'GreenSense AR - Carbon Tracker/2.0',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('Open Food Facts response not OK:', response.status);
      barcodeCache.set(barcode, null);
      return null;
    }
    
    const data = await response.json();
    console.log('Open Food Facts status:', data.status);
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      const result: BarcodeProduct = {
        barcode,
        name: product.product_name || product.generic_name || 'Unknown Product',
        brand: product.brands,
        category: product.categories_tags?.[0] || product.main_category || product.categories,
        imageUrl: product.image_url,
        found: true,
      };
      
      console.log('✅ Product found:', result.name, 'Category:', result.category);
      barcodeCache.set(barcode, result);
      return result;
    }
    
    console.log('Product not in database');
    barcodeCache.set(barcode, null);
    return null;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Open Food Facts request timed out');
    } else {
      console.error('Open Food Facts lookup error:', error);
    }
    return null;
  }
}

/**
 * Look up product information from barcode
 * Tries multiple databases and falls back to Gemini analysis
 */
export async function lookupBarcodeProduct(barcode: string): Promise<AnalyzedObject[]> {
  console.log('Looking up barcode:', barcode);
  
  // Try Open Food Facts first (food products)
  const offProduct = await lookupOpenFoodFacts(barcode);
  
  if (offProduct?.found) {
    const carbonKg = estimateCarbonFromCategory(offProduct.category || 'food');
    
    return [{
      id: generateId(),
      name: offProduct.brand 
        ? `${offProduct.brand} ${offProduct.name}`.trim()
        : offProduct.name,
      carbonKg,
      severity: getSeverity(carbonKg),
      description: `Barcode: ${barcode}${offProduct.category ? ` • Category: ${offProduct.category}` : ''}`,
    }];
  }
  
  // If not found, create a generic entry that can be refined
  return [{
    id: generateId(),
    name: `Product (${barcode})`,
    carbonKg: CATEGORY_CARBON_ESTIMATES.default,
    severity: 'low',
    description: `Barcode: ${barcode} - Product not found in database. Carbon estimate based on average consumer product.`,
  }];
}

/**
 * Parse barcode type for display
 */
export function getBarcodeTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    'org.gs1.EAN-13': 'EAN-13',
    'org.gs1.EAN-8': 'EAN-8',
    'org.gs1.UPC-A': 'UPC-A',
    'org.gs1.UPC-E': 'UPC-E',
    'org.iso.QRCode': 'QR Code',
    'org.iso.Code128': 'Code 128',
    'org.iso.Code39': 'Code 39',
    'org.iso.PDF417': 'PDF417',
    'org.iso.Aztec': 'Aztec',
    'org.iso.DataMatrix': 'Data Matrix',
  };
  
  return typeNames[type] || type;
}

export default {
  lookupBarcodeProduct,
  getBarcodeTypeName,
};

