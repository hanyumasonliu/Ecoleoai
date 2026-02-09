# Carbon Tracer AI - Gemini 3 Hackathon Submission

## Inspiration

We track our steps, our calories, and our spending every day. But one of the most important metrics for our future remains invisible: **our carbon footprint**. 

Carbon data exists everywhere — in our food choices, our commutes, the products we buy — but it's fragmented, abstract, and nearly impossible to track manually. Most people don't ignore climate impact because they don't care; they ignore it because **it's too hard to see**.

We asked ourselves: *What if we could make carbon tracking as easy as taking a photo?* What if AI could understand the environmental impact of everyday objects just by looking at them? That's when we realized Gemini's multimodal capabilities could transform how individuals understand and reduce their carbon footprint.

## What it does

**Carbon Tracer AI** is your personal carbon footprint tracker powered by Gemini Vision. It turns everyday life into actionable climate data through:

### 📸 Smart Scanning (4 Modes)
- **Product Mode** — Point your camera at electronics, clothing, or household items. Gemini analyzes the image and estimates the full lifecycle carbon footprint.
- **Food Mode** — Scan meals or groceries. Gemini identifies ingredients and calculates emissions from farm to table.
- **Receipt Mode** — Photograph shopping receipts. Gemini extracts multiple items and their environmental impact in seconds.
- **Barcode Mode** — Instant lookup enriched with Open Food Facts database, combined with Gemini's visual reasoning.

### 🚗 Intelligent Transport Tracking
- **GPS-based auto-detection** that recognizes walking, cycling, driving, or transit based on speed patterns
- **Manual trip entry** with Google Places API autocomplete for precise locations
- **Multi-mode comparison** showing carbon impact across all transport options (walk, bike, car, bus, train)
- **Flight emissions calculator** using Google's Travel Impact Model API — even auto-discovers flights when you don't have a flight number!

### ⚡ Energy Monitoring
- Log electricity, natural gas, and heating oil usage
- Converts to carbon using EPA emission factors
- Divides by household size for personal daily footprint

### 📊 Insights & Gamification
- Daily carbon budget (8 kg CO₂e goal based on sustainable 3 tonnes/year)
- Weekly stats with category breakdowns
- Streak tracking and achievement badges
- AI-generated personalized coaching

## How we built it

**Core Stack:**
- **Expo SDK 54** for cross-platform React Native development
- **TypeScript** for type safety across 15,000+ lines of code
- **React Navigation** for seamless multi-screen experience

**AI & APIs:**
- **Gemini 3 Flash** (`gemini-3-flash-preview`) as primary visual intelligence engine with automatic fallback to Gemini 2.5/2.0
- **Google Maps Directions API** for real-time route calculation
- **Google Maps Places API (New)** for location search (migrated from legacy API)
- **Travel Impact Model API** for accurate flight emissions with custom auto-discovery algorithm
- **Open Food Facts API** for barcode product enrichment

**Key Features We Built:**
1. **Gemini Vision Pipeline** — Structured prompts that extract JSON arrays of objects with carbon estimates, lifecycle analysis, and Eco Scores
2. **GPS Trip Tracking** — Real-time location monitoring with speed-based transport mode detection (6 speed thresholds from walking to flying)
3. **Flight Auto-Discovery** — When users don't provide a flight number, we batch-scan 7+ carriers with 15+ common flight numbers to find real emissions data
4. **Places API Integration** — Text search endpoint with coordinates embedded, eliminating need for separate Geocoding API calls
5. **Local Carbon Database** — 50+ items with emission factors from EPA, DEFRA, and academic sources as intelligent fallback
6. **AsyncStorage Persistence** — Complete trip history, scan logs, and user preferences stored locally

**Architecture Highlights:**
- Service layer separation (`/services`) for clean API boundaries
- React Context for global carbon budget state
- Type-safe interfaces (`/types`) for Trip, Activity, AnalyzedObject
- Graceful degradation when APIs are unavailable

## Challenges we ran into

### 1. **Gemini JSON Parsing Inconsistency**
**Problem:** Gemini sometimes returned valid JSON, sometimes markdown code blocks, sometimes text with JSON embedded.

**Solution:** Built a multi-stage parser:
- Try direct JSON.parse()
- Extract from markdown code blocks (````json`)
- Regex extraction of individual objects
- Fallback to local carbon database

### 2. **Travel Impact Model API Returns No Emissions**
**Problem:** API would respond with flight data but `emissionsGramsPerPax: null` unless you provided an exact flight number. And it only works for **future scheduled flights**, not past trips.

**Solution:** 
- Implemented batch auto-discovery: try 7 carriers × 15 flight numbers in parallel
- Added ICAO methodology fallback (0.255 kg CO₂/km for economy) when API fails
- Clear documentation in UI that flight number enables more accurate results

### 3. **Places API Legacy Deprecation**
**Problem:** Midway through development, got `REQUEST_DENIED` errors. Discovered the legacy Autocomplete API was being shut down.

**Solution:** Migrated to Places API (New) with `searchText` endpoint. Bonus: coordinates included in response, removing need for Geocoding API entirely.

### 4. **Negative GPS Speeds**
**Problem:** iOS/Android GPS sensors can report negative speeds when stationary or with poor signal, showing "-3.6 km/h" during tracking.

**Solution:** Added `Math.max(0, speed)` clamping in both real-time display and trip history calculation.

### 5. **Duplicate Flight Input UI**
**Problem:** Had two separate flight input sections in TransportScreen — one showed but the button called the wrong handler.

**Solution:** Consolidated to single section, fixed routing so "Calculate Emissions" actually calls `handleCalculateFlightEmissions` instead of ground transport handler.

## Accomplishments that we're proud of

🎯 **Fully Functional Gemini 3 Integration** — Not just a concept. Real camera scanning with real AI analysis working end-to-end.

🚀 **Smart API Orchestration** — Built an intelligent system that:
- Auto-discovers flights when users don't have flight numbers
- Falls back gracefully across 3 Gemini models
- Uses Places API (New) Text Search to eliminate extra geocoding calls
- Provides EPA-sourced estimates when APIs are unavailable

📊 **Production-Ready Code Quality** — 
- 100% TypeScript coverage
- No linter errors
- Secure API key handling (.env, .gitignore)
- Comprehensive error handling

🌍 **Real Environmental Impact** —
- Based on scientific emission factors (EPA, DEFRA, ICAO)
- Lifecycle analysis covering raw materials → disposal
- Accurate flight emissions from Google's aircraft database
- Daily budget aligned with 3 tonnes/year sustainable target

🎨 **Polished User Experience** —
- Beautiful map-based GPS tracking
- Multi-mode transport comparison
- Streaks, achievements, and gamification
- AR-style camera overlay for scanning

## What we learned

### About Gemini
- **Multimodal reasoning is powerful but unpredictable** — We learned to build robust parsers that handle any output format
- **Prompt engineering matters** — Asking for "JSON array with specific keys" dramatically improved consistency vs. open-ended prompts
- **Vision models see differently than humans** — Sometimes Gemini identifies objects we didn't notice in photos, sometimes it misses obvious ones

### About Google Cloud APIs
- **Read the migration guides** — Places API (New) is fundamentally different from legacy API, not just a version bump
- **Travel Impact Model is incredibly specific** — Needs exact flight numbers and future dates, but when it works, the data is impressively accurate
- **API design philosophy** — New APIs (Places, Travel Impact) prefer POST with JSON bodies vs. GET with query params

### About Mobile Development
- **GPS is messy** — Negative speeds, missing altitudes, 10-second gaps. Always validate sensor data.
- **AsyncStorage is powerful** — Storing trip history, scan logs, and preferences locally gives instant app responsiveness
- **Background location is complex** — iOS/Android permission models, battery concerns, and UX around "always tracking"

### About Climate Data
- **Carbon footprints are shockingly variable** — A beef burger: 2.5 kg CO₂. A lentil curry: 0.4 kg CO₂. One business class flight can equal months of daily carbon budgets.
- **Lifecycle analysis is hard** — Estimating extraction, manufacturing, transport, usage, and disposal for arbitrary products requires both databases and AI reasoning
- **Individuals want to act** — The barrier isn't motivation, it's **visibility**

## What's next for Carbon Tracer AI

### Near-Term (Post-Hackathon)
1. **Gemini-Powered Coaching** — Currently uses mock data. Connect to Gemini API for personalized sustainability recommendations based on user's actual scan history.

2. **Social Features** — Compare carbon footprints with friends, create challenges ("Who can lower their food emissions 20% this month?")

3. **Bill Scanning** — Add computer vision for utility bills. Point camera at electricity bill → auto-extract kWh and date range.

4. **Carbon Offset Integration** — Partner with verified offset programs (tree planting, renewable energy credits) to let users neutralize their footprint.

### Long-Term Vision
5. **Company Carbon Accounts** — Enterprise version where employees track business travel, office energy, and supply chain emissions. Aggregates to company-level ESG reporting.

6. **API for E-commerce** — Provide carbon estimates to online stores. Show "2.5 kg CO₂" next to every product at checkout, like we show calories on food.

7. **Government Data Integration** — Pull real-time grid carbon intensity (coal vs. solar) to show when to charge EVs or run appliances for lowest emissions.

8. **Gemini Grounding with Real-Time Data** — Connect Gemini to live databases:
   - EPA emission factor updates
   - USDA food composition data
   - Product lifecycle assessments from manufacturers

9. **Hardware Integration** — Smart home devices (thermostats, EV chargers) auto-log to Carbon Tracer AI without manual entry.

10. **Global Localization** — Emission factors vary by country (grid mix, transportation infrastructure). Adapt app for EU, Asia, Global South with region-specific data.

---

**The ultimate goal:** Make carbon tracking as ubiquitous as calorie counting. When individuals can **see** their impact, they can **change** it. And with Gemini's multimodal intelligence, that vision is finally possible.

---

*Built with 💚 for a greener future*  
*Powered by Gemini 3 Flash*

