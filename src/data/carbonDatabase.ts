/**
 * GreenSense AR - Carbon Database
 * 
 * A collection of reference carbon footprint values to help the AI
 * make more accurate estimations.
 */

export interface DatabaseItem {
    name: string;
    carbonKg: number;
    unit: string; // e.g., "per unit", "per kg", "serving (500g)"
    category: string;
    source: 'CleverCarbon' | 'GeminiMock';
    notes?: string;
}

// Reference Data
export const CARBON_DATABASE: DatabaseItem[] = [
    // --- FOOD (MEAT & PROTEIN) ---
    { name: "Beef (High Usage)", carbonKg: 60, unit: "per kg", category: "Food", source: "GeminiMock" },
    { name: "Beef (Serving)", carbonKg: 7.7, unit: "per serving (75g)", category: "Food", source: "CleverCarbon" },
    { name: "Beef Burger", carbonKg: 4.5, unit: "per serving (150g patty)", category: "Food", source: "GeminiMock" },
    { name: "Pork", carbonKg: 1.8, unit: "per serving (75g)", category: "Food", source: "CleverCarbon" },
    { name: "Chicken", carbonKg: 1.36, unit: "per serving (75g)", category: "Food", source: "CleverCarbon" },
    { name: "Fish (Farmed)", carbonKg: 1.8, unit: "per serving (75g)", category: "Food", source: "CleverCarbon" },
    { name: "Salmon (Common)", carbonKg: 5.4, unit: "per kg", category: "Food", source: "GeminiMock", notes: "Farmed salmon average" },

    // --- FOOD (PRODUCE & GRAINS) ---
    { name: "Rice", carbonKg: 0.33, unit: "per serving (3 tbsp)", category: "Food", source: "CleverCarbon" },
    { name: "Pasta", carbonKg: 0.117, unit: "per serving (75g)", category: "Food", source: "CleverCarbon" },
    { name: "Potato", carbonKg: 0.04, unit: "per unit", category: "Food", source: "CleverCarbon" },
    { name: "Tomato", carbonKg: 0.16, unit: "per unit", category: "Food", source: "CleverCarbon" },
    { name: "Banana", carbonKg: 0.07, unit: "per unit (medium)", category: "Food", source: "CleverCarbon" },
    { name: "Apple", carbonKg: 0.04, unit: "per unit", category: "Food", source: "CleverCarbon" },
    { name: "Average Meal (600 cal)", carbonKg: 1.5, unit: "per meal", category: "Food", source: "CleverCarbon" },

    // --- DRINKS ---
    { name: "Tea", carbonKg: 0.04, unit: "per cup", category: "Drink", source: "CleverCarbon" },
    { name: "Coffee (Black)", carbonKg: 0.05, unit: "per cup", category: "Drink", source: "CleverCarbon" },
    { name: "Latte (Dairy)", carbonKg: 0.35, unit: "per cup", category: "Drink", source: "CleverCarbon" },
    { name: "Latte (Plant-based)", carbonKg: 0.14, unit: "per cup", category: "Drink", source: "CleverCarbon" },
    { name: "Beer", carbonKg: 0.665, unit: "per pint", category: "Drink", source: "CleverCarbon" },
    { name: "Wine", carbonKg: 0.3, unit: "per glass", category: "Drink", source: "CleverCarbon" },

    // --- ELECTRONICS ---
    { name: "MacBook Pro 16", carbonKg: 380, unit: "per device", category: "Electronics", source: "GeminiMock", notes: "Manufacturing only" },
    { name: "iPhone 15 Pro", carbonKg: 75, unit: "per device", category: "Electronics", source: "GeminiMock", notes: "Lifetime estimate" },
    { name: "AirPods Pro", carbonKg: 15, unit: "per pair", category: "Electronics", source: "GeminiMock" },
    { name: "Mobile Phone Use", carbonKg: 0.172, unit: "per hour", category: "Electronics", source: "CleverCarbon" },

    // --- HOUSEHOLD & COMMON ITEMS ---
    { name: "Plastic Water Bottle", carbonKg: 0.083, unit: "per unit", category: "Product", source: "CleverCarbon", notes: "Production & disposal" },
    { name: "Disposable Coffee Cup", carbonKg: 0.016, unit: "per cup", category: "Product", source: "CleverCarbon" },
    { name: "Plastic Bag", carbonKg: 0.033, unit: "per bag", category: "Product", source: "CleverCarbon" },
    { name: "Toilet Roll (2-ply)", carbonKg: 1.3, unit: "per roll", category: "Product", source: "CleverCarbon" },
    { name: "Flowers (Imported)", carbonKg: 32.0, unit: "per bouquet", category: "Product", source: "CleverCarbon" },
    { name: "Flowers (Local)", carbonKg: 2.5, unit: "per bouquet", category: "Product", source: "CleverCarbon" },
    { name: "Cotton T-Shirt", carbonKg: 7.0, unit: "per shirt", category: "Clothing", source: "GeminiMock" },
    { name: "Jeans", carbonKg: 33.0, unit: "per pair", category: "Clothing", source: "GeminiMock" },
    { name: "Clothing Spend ($50)", carbonKg: 0.187, unit: "per $50 spend", category: "Clothing", source: "CleverCarbon" },

    // --- ENERGY & APPLIANCES (Per Use) ---
    { name: "Microwave", carbonKg: 0.4, unit: "per use (0.945 kWh)", category: "Energy", source: "CleverCarbon" },
    { name: "Washing Machine", carbonKg: 0.275, unit: "per load (0.63 kWh)", category: "Energy", source: "CleverCarbon" },
    { name: "Tumble Dryer", carbonKg: 1.0, unit: "per load (2.5 kWh)", category: "Energy", source: "CleverCarbon" },
    { name: "Water Kettle", carbonKg: 0.05, unit: "per boil", category: "Energy", source: "CleverCarbon" },
    { name: "Electric Oven", carbonKg: 0.675, unit: "per hour", category: "Energy", source: "CleverCarbon" },
    { name: "Gas Oven", carbonKg: 0.28, unit: "per hour", category: "Energy", source: "CleverCarbon" },
    { name: "Hot Shower", carbonKg: 2.0, unit: "per 10 min", category: "Energy", source: "CleverCarbon" },
    { name: "Standard Light Bulb", carbonKg: 0.172, unit: "per 4 hours", category: "Energy", source: "CleverCarbon" },
    { name: "Eco Light Bulb", carbonKg: 0.03, unit: "per 4 hours", category: "Energy", source: "CleverCarbon" },
    { name: "Air Conditioning", carbonKg: 2.0, unit: "per hour", category: "Energy", source: "CleverCarbon" },
    { name: "Heating", carbonKg: 7.0, unit: "per day", category: "Energy", source: "CleverCarbon" },
];

/**
 * Formats the Carbon Database into a string for the LLM prompt
 */
export const getFormattedDatabase = (): string => {
    const header = "CARBON DATABASE (TRUTH VALUES):\nItem Name | Carbon Footprint | Unit/Portion | Notes\n--- | --- | --- | ---";

    const rows = CARBON_DATABASE.map(item =>
        `${item.name} | ${item.carbonKg} kg CO2e | ${item.unit} | ${item.notes || ''}`
    );

    return `${header}\n${rows.join('\n')}`;
};
