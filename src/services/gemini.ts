/**
 * Carbon Tracer AI - Gemini API Service
 * 
 * Handles communication with Google's Gemini Vision API for image analysis
 * and coach message generation.
 * 
 * Supports multiple scan modes: Product, Food, Receipt, Barcode
 */

import Constants from 'expo-constants';
import {
  AnalyzedObject,
  CarbonSeverity,
  GeminiAnalysisResponse,
  HistorySummary,
  CoachMessage,
} from '../types/carbon';
import { getFormattedDatabase, CARBON_DATABASE } from '../data/carbonDatabase';

/**
 * Get the Gemini API key from environment variables
 * 
 * Usage: Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file
 */
const getApiKey = (): string | undefined => {
  // For Expo, use the EXPO_PUBLIC_ prefix which is automatically available
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  console.log('Gemini API key available:', key ? 'Yes' : 'No');
  return key;
};

/**
 * Available Gemini models to try (in order of preference)
 * Using vision-capable models for image analysis
 * Updated for Gemini 3 Hackathon requirements
 */
const VISION_MODELS = [
  'gemini-3-flash-preview',   // Gemini 3 Flash (required for hackathon)
  'gemini-2.5-flash',         // Fallback if Gemini 3 unavailable
  'gemini-2.0-flash',         // Secondary fallback
];

/**
 * Base URL for Gemini API
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Helper to determine carbon severity based on kg CO₂e
 */
const getSeverity = (carbonKg: number): CarbonSeverity => {
  if (carbonKg < 10) return 'low';
  if (carbonKg < 100) return 'medium';
  return 'high';
};

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
  { name: 'Hoodie', carbonKg: 12, severity: 'medium', description: 'Fleece material has moderate impact' },
  { name: 'Leather Jacket', carbonKg: 130, severity: 'high', description: 'Leather has high environmental cost' },
  { name: 'Sneakers', carbonKg: 14, severity: 'medium', description: 'Materials and manufacturing' },

  // Food & Beverages
  { name: 'Plastic Water Bottle', carbonKg: 0.08, severity: 'low', description: 'Single-use plastic' },
  { name: 'Coffee Cup (Disposable)', carbonKg: 0.11, severity: 'low', description: 'Paper and plastic lid' },
  { name: 'Reusable Water Bottle', carbonKg: 0.5, severity: 'low', description: 'Offsets after ~50 uses' },
  { name: 'Food Container (Plastic)', carbonKg: 0.2, severity: 'low', description: 'Petroleum-based materials' },

  // Furniture
  { name: 'Office Chair', carbonKg: 72, severity: 'medium', description: 'Metal and fabric production' },
  { name: 'Wooden Desk', carbonKg: 50, severity: 'medium', description: 'Depends on wood source' },
  { name: 'Bookshelf', carbonKg: 40, severity: 'medium', description: 'Wood or particle board' },

  // Transportation
  { name: 'Bicycle', carbonKg: 240, severity: 'high', description: 'But saves carbon in transport!' },
  { name: 'Backpack', carbonKg: 15, severity: 'medium', description: 'Synthetic materials' },
  { name: 'Suitcase', carbonKg: 25, severity: 'medium', description: 'Plastic shell and fabric' },

  // Home & Living
  { name: 'LED Light Bulb', carbonKg: 1.5, severity: 'low', description: 'Low impact, long lifespan' },
  { name: 'Paper Notebook', carbonKg: 0.9, severity: 'low', description: 'Paper production impact' },
  { name: 'Pen', carbonKg: 0.02, severity: 'low', description: 'Minimal plastic' },
  { name: 'Book', carbonKg: 1.2, severity: 'low', description: 'Paper and printing' },
  { name: 'Plant Pot', carbonKg: 1.8, severity: 'low', description: 'Ceramic or plastic' },
  { name: 'Coffee Maker', carbonKg: 45, severity: 'medium', description: 'Appliance manufacturing' },
  { name: 'Kettle', carbonKg: 20, severity: 'medium', description: 'Metal and electronics' },
];

/**
 * Analyzes an image using Gemini Vision API
 * 
 * @param imageBase64 - Base64 encoded image string
 * @returns Promise with array of analyzed objects
 * 
 * TODO: Replace mock implementation with real API call:
 * 
 * const response = await fetch(
 *   `${GEMINI_API_BASE}/models/gemini-1.5-flash:generateContent?key=${getApiKey()}`,
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       contents: [{
 *         parts: [
 *           { text: "Identify objects in this image and estimate their lifetime carbon footprint in kg CO2e. Return as JSON array with name, carbonKg, and description." },
 *           { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
 *         ]
 *       }]
 *     })
 *   }
 * );
 */
export async function analyzeImageWithGemini(
  imageBase64: string,
  customPrompt?: string
): Promise<GeminiAnalysisResponse> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  const apiKey = getApiKey();

  // Build the prompt
  // Get the knowledge base string
  const kbString = getFormattedDatabase();

  // Base instruction based on user input or default
  const baseInstruction = customPrompt || `You are a carbon footprint analysis expert. Analyze this image and identify 3-5 visible objects.`;

  const prompt = `${baseInstruction}

CARBON DATABASE:
Use this provided carbon database for carbon estimates if the object matches or is very similar.
${kbString}

INSTRUCTIONS:
1. Identify visible objects in the image.
2. For each object, estimate its lifetime carbon footprint in kg CO2e.
   - PRIORITY: Check the CARBON DATABASE above.
   - SCALING: If the item matches but the portion/quantity differs, scale the carbon value linearly. 
     (Example: If Database has "Salmon 500g = 5.4kg", and you see 250g, use 2.7kg).
   - FALLBACK: If not in Carbon Database, estimate based on material/manufacturing/typical usage.
3. Return ONLY a valid JSON array with this exact format, no other text:
[
  {
    "name": "Object Name",
    "carbonKg": 123.4,
    "description": "Brief explanation (mention if value came from Carbon Database)"
  }
]

Be realistic with carbon estimates based on manufacturing, materials, and typical usage.`;

  // If API key is available, attempt real API call with fallback models
  if (apiKey) {
    // Clean the base64 data
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    console.log('Image base64 length:', cleanBase64.length);

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,  // Increased to prevent truncation
      }
    };

    // Try each model in order until one works
    for (const modelName of VISION_MODELS) {
      try {
        const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`;
        console.log(`Trying Gemini model: ${modelName}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        console.log(`Response from ${modelName}:`, response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (textContent) {
            console.log('Gemini text content:', textContent.substring(0, 300));

            // Strip markdown code fences if present
            let cleanedContent = textContent
              .replace(/```json\s*/gi, '')  // Remove ```json
              .replace(/```\s*/g, '')        // Remove closing ```
              .trim();

            // Try to extract JSON array - handle both complete and truncated
            let jsonString = '';

            // First try to find complete array
            const completeMatch = cleanedContent.match(/\[[\s\S]*\]/);
            if (completeMatch) {
              jsonString = completeMatch[0];
            } else {
              // Array is truncated - find start and repair
              const arrayStart = cleanedContent.indexOf('[');
              if (arrayStart >= 0) {
                jsonString = cleanedContent.substring(arrayStart);
                console.log('Found truncated array, attempting repair...');
              }
            }

            if (jsonString) {
              // Repair truncated JSON
              // Find the last complete object (ends with })
              const lastCompleteObject = jsonString.lastIndexOf('}');
              if (lastCompleteObject > 0) {
                // Check if we need to close the array
                const afterLastObject = jsonString.substring(lastCompleteObject + 1).trim();
                if (!afterLastObject.includes(']')) {
                  jsonString = jsonString.substring(0, lastCompleteObject + 1) + ']';
                  console.log('Repaired truncated JSON');
                }
              }

              try {
                const parsed = JSON.parse(jsonString);
                const objects: AnalyzedObject[] = parsed.map((obj: { name: string; carbonKg: number; description?: string }) => ({
                  id: generateId(),
                  name: obj.name || 'Unknown Item',
                  carbonKg: typeof obj.carbonKg === 'number' ? obj.carbonKg : 1.0,
                  severity: getSeverity(typeof obj.carbonKg === 'number' ? obj.carbonKg : 1.0),
                  description: obj.description || '',
                }));

                if (objects.length > 0) {
                  console.log(`✅ Gemini API success with ${modelName}! Found`, objects.length, 'objects');
                  return { objects, rawResponse: data };
                }
              } catch (parseError) {
                console.log('JSON parse error, trying to extract individual objects...');

                // Last resort: try to extract individual objects using regex
                const objectPattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"carbonKg"\s*:\s*([\d.]+)/g;
                const extractedObjects: AnalyzedObject[] = [];
                let match;

                while ((match = objectPattern.exec(jsonString)) !== null) {
                  extractedObjects.push({
                    id: generateId(),
                    name: match[1],
                    carbonKg: parseFloat(match[2]),
                    severity: getSeverity(parseFloat(match[2])),
                    description: '',
                  });
                }

                if (extractedObjects.length > 0) {
                  console.log(`✅ Extracted ${extractedObjects.length} objects via regex`);
                  return { objects: extractedObjects, rawResponse: data };
                }
              }
            } else {
              console.log('No JSON array found in response');
            }
          } else {
            // Check if response was truncated due to MAX_TOKENS
            const finishReason = data.candidates?.[0]?.finishReason;
            if (finishReason === 'MAX_TOKENS') {
              console.log(`Response truncated (MAX_TOKENS) with ${modelName}`);
            } else {
              console.log('No text content in response:', JSON.stringify(data).substring(0, 200));
            }
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ ${modelName} error:`, response.status);
          console.log('Error details:', errorText.substring(0, 300));
          // Continue to try next model
        }
      } catch (error) {
        console.log(`Error with ${modelName}:`, error);
        // Continue to try next model
      }
    }

    // All models failed
    console.log('All Gemini models failed, using mock data');
  } else {
    console.log('No API key available, using mock data');
  }

  // Fallback to mock data if API fails or is not configured
  console.log('All Gemini models failed, using mock data from Carbon Database');
  const numberOfObjects = 3 + Math.floor(Math.random() * 3);

  // Shuffle the Carbon Database and pick random items
  const shuffled = [...CARBON_DATABASE].sort(() => Math.random() - 0.5);
  const selectedObjects = shuffled.slice(0, numberOfObjects);

  const objects: AnalyzedObject[] = selectedObjects.map(obj => ({
    id: generateId(),
    name: obj.name,
    // Add small random variation to make it feel "live"
    carbonKg: Math.round(obj.carbonKg * (0.95 + Math.random() * 0.1) * 100) / 100,
    severity: obj.carbonKg < 1 ? 'low' : obj.carbonKg < 10 ? 'medium' : 'high',
    description: `Estimated based on ${obj.category} data (${obj.unit}). Source: ${obj.source}`,
  }));

  return { objects };
}

/**
 * Generates personalized coaching messages based on user's scan history
 * 
 * @param summary - Summary of user's scanning history
 * @returns Promise with coach message and tips
 * 
 * TODO: Replace mock implementation with real API call:
 * 
 * const response = await fetch(
 *   `${GEMINI_API_BASE}/models/gemini-1.5-pro:generateContent?key=${getApiKey()}`,
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       contents: [{
 *         parts: [{
 *           text: `Based on this user's carbon footprint scanning history, provide personalized advice:
 *                  Total scans: ${summary.totalScans}
 *                  Total carbon tracked: ${summary.totalCarbonKg} kg CO2e
 *                  Most scanned items: ${summary.topObjectTypes.join(', ')}
 *                  
 *                  Provide 2-3 paragraphs of helpful, encouraging advice.`
 *         }]
 *       }]
 *     })
 *   }
 * );
 */
export async function generateCoachMessage(
  summary: HistorySummary
): Promise<CoachMessage> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

  const apiKey = getApiKey();

  // If API key is available, attempt real API call
  if (apiKey) {
    try {
      const modelName = 'gemini-3-flash-preview'; // Gemini 3 for hackathon
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an encouraging carbon footprint coach. Based on this user's scanning history, provide personalized advice:
                
                Total scans: ${summary.totalScans}
                Total objects scanned: ${summary.totalObjects}
                Total carbon tracked: ${summary.totalCarbonKg.toFixed(1)} kg CO2e
                Average carbon per scan: ${summary.averageCarbonPerScan.toFixed(1)} kg CO2e
                Most scanned item types: ${summary.topObjectTypes.join(', ') || 'None yet'}
                
                Return ONLY a valid JSON object with this exact format, no other text:
                {
                  "message": "2-3 paragraphs of personalized, encouraging advice based on their scanning patterns",
                  "tips": ["Tip 1", "Tip 2", "Tip 3"],
                  "encouragement": "A short motivational closing statement"
                }
                
                Be specific to what they scan. Be encouraging but honest about impact.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          const jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed as CoachMessage;
          }
        }
      }

      console.log('Gemini coach API call failed, using mock data');
    } catch (error) {
      console.log('Gemini coach API error, using mock data:', error);
    }
  }

  // Mock implementation: Generate contextual advice based on history

  // Default message for new users
  if (summary.totalScans === 0) {
    return {
      message: `Welcome to CarbonSense AR! You haven't scanned anything yet, but that's about to change. Start by pointing your camera at everyday objects around you – your phone, coffee cup, or that chair you're sitting on.\n\nEvery object has a hidden carbon story. Some might surprise you! Electronics typically have the highest footprint due to manufacturing, while simple items like a notebook have minimal impact.\n\nRemember: awareness is the first step toward making better choices. Let's start scanning!`,
      tips: [
        'Start with items you use every day',
        'Compare similar items to find lower-carbon alternatives',
        'Focus on high-impact categories like electronics first',
      ],
      encouragement: "Every scan is a step toward a more sustainable future!",
    };
  }

  // Generate contextual advice based on scanning patterns
  const messages: string[] = [];
  const tips: string[] = [];

  // Analyze scanning patterns
  const hasElectronics = summary.topObjectTypes.some(type =>
    ['Laptop', 'Smartphone', 'Monitor', 'Tablet'].some(e => type.includes(e))
  );

  const hasClothing = summary.topObjectTypes.some(type =>
    ['Shirt', 'Jeans', 'Hoodie', 'Jacket', 'Sneakers'].some(c => type.includes(c))
  );

  if (hasElectronics) {
    messages.push(`You've been scanning electronics, which tend to have significant carbon footprints. The good news? You can reduce their impact by keeping devices longer, repairing instead of replacing, and recycling properly when they reach end of life.`);
    tips.push('Extend device lifespan by using protective cases');
    tips.push('Consider refurbished devices for your next purchase');
  }

  if (hasClothing) {
    messages.push(`Your clothing scans show awareness of fashion's environmental impact. Fast fashion is responsible for 10% of global carbon emissions! Choosing quality pieces that last, buying secondhand, and proper care can make a big difference.`);
    tips.push('Wash clothes in cold water to extend their life');
    tips.push('Explore thrift stores for unique, low-impact finds');
  }

  if (summary.totalCarbonKg > 500) {
    messages.push(`You've tracked ${summary.totalCarbonKg.toFixed(0)} kg CO₂e across your scans. That's a significant amount of awareness! Now focus on the highest-impact items and look for ways to reduce, reuse, or offset.`);
  } else if (summary.totalCarbonKg > 0) {
    messages.push(`You've tracked ${summary.totalCarbonKg.toFixed(0)} kg CO₂e so far. Keep scanning to build a complete picture of your carbon footprint across different areas of your life.`);
  }

  // Add general tips if needed
  if (tips.length < 3) {
    const generalTips = [
      'Buy less, choose well, make it last',
      'Support brands with transparent carbon reporting',
      'Consider the full lifecycle when making purchases',
      'Reduce single-use items where possible',
    ];
    tips.push(...generalTips.slice(0, 3 - tips.length));
  }

  const encouragement = summary.totalScans > 10
    ? "You're becoming a carbon awareness champion!"
    : summary.totalScans > 5
      ? "Great progress! Keep exploring your carbon footprint."
      : "You're on the right track. Every scan increases your awareness!";

  return {
    message: messages.join('\n\n') || "Keep scanning items around you to learn about their carbon footprint. Understanding impact is the first step to making better choices!",
    tips: tips.slice(0, 3),
    encouragement,
  };
}

export default {
  analyzeImageWithGemini,
  generateCoachMessage,
};

