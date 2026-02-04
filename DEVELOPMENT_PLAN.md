# 🌍 Carbon Tracer AI - Development Plan

> Greenhouse Gas Tracker with Hybrid AI Architecture

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Carbon Tracer AI - System Architecture                       │
├─────────────────┬──────────────────────────┬────────────────────────────────┤
│  1. FRONTEND    │  2. MIDDLEWARE           │  3. BACKEND & DATA             │
│  (User Interface)│  (AI Orchestrator)       │  (The "Truth")                 │
├─────────────────┼──────────────────────────┼────────────────────────────────┤
│  📷 Input Layer │  🔍 Visual Analysis      │  🗄️ Carbon Databases          │
│  ├─ Product Photo│  ├─ Object Detection    │  ├─ EPA Carbon Factors        │
│  ├─ Food Photo  │  ├─ Brand Recognition    │  ├─ OpenFoodFacts (food)      │
│  ├─ Receipt Scan│  └─ Material Detection   │  ├─ Carbon Interface API      │
│  └─ Barcode Scan│                          │  └─ Custom Product DB         │
│                 │  📝 OCR Extraction       │                                │
│  🎤 Context     │  ├─ Nutrition Labels     │  👤 User Profile DB           │
│  ├─ Voice Input │  ├─ Product Labels       │  ├─ Daily Carbon Budget       │
│  └─ Text Input  │  └─ Receipt Data         │  ├─ History & Trends          │
│                 │                          │  ├─ Goals & Achievements      │
│  📊 Feedback    │  🧠 AI Reasoning Agent   │  └─ Preferences               │
│  ├─ AR Overlay  │  (Gemini 2.0 Flash)      │                                │
│  ├─ Daily Budget│  ├─ Carbon Estimation    │                                │
│  ├─ Weekly Stats│  ├─ Context Understanding│                                │
│  └─ Insights    │  └─ Recommendations      │                                │
│                 │                          │                                │
│                 │  🔗 Merging Logic        │                                │
│                 │  └─ Visual + OCR +       │                                │
│                 │    Context + DB Lookup   │                                │
└─────────────────┴──────────────────────────┴────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation ✅
- [x] 1.1 Update navigation to 5 tabs (Home, Scan, Journey, Stats, Profile) ✅
- [x] 1.2 Create new type definitions for activities and user settings ✅
- [x] 1.3 Create CarbonContext for daily budget state management ✅
- [x] 1.4 Implement Home dashboard with daily carbon budget card ✅
- [x] 1.5 Add category breakdown cards (Food, Transport, Products, Energy) ✅
- [x] 1.6 Implement week calendar date picker component ✅
- [x] 1.7 Add recent activity feed on Home screen ✅
- [x] 1.8 Create streak counter component ✅

### Phase 2: Enhanced Scanning ✅
- [x] 2.1 Add scan mode selector (Product/Food/Receipt/Barcode) ✅
- [x] 2.2 Update Gemini prompts for multi-mode analysis ✅
- [ ] 2.3 Add voice context input component (deferred)
- [x] 2.4 Implement text context input ✅
- [x] 2.5 Add quantity selector to scan results ✅
- [x] 2.6 Implement barcode scanning with Open Food Facts lookup ✅

### Phase 3: Item Detail Screen ✅
- [x] 3.1 Create ItemDetailScreen with full analysis view ✅
- [x] 3.2 Implement lifecycle breakdown (Manufacturing, Transport, Usage, Disposal) ✅
- [x] 3.3 Add Eco Score calculation and display ✅
- [x] 3.4 Create environmental impact warnings component ✅
- [x] 3.5 Implement greener alternatives suggestions ✅
- [x] 3.6 Add "Add to Log" functionality ✅

### Phase 4: Journey & Tracking ✅
- [x] 4.1 Create JourneyScreen with daily activity log ✅
- [x] 4.2 Group activities by category (Food, Transport, Products, Energy) ✅
- [x] 4.3 Implement weekly view toggle ✅
- [x] 4.4 Add streak tracking logic ✅
- [ ] 4.5 Implement daily budget alerts/notifications (deferred)
- [ ] 4.6 Add manual entry for transport/energy (deferred)

### Phase 5: Stats & Insights ✅
- [x] 5.1 Create StatsScreen with weekly chart ✅
- [x] 5.2 Implement category breakdown pie/bar chart ✅
- [x] 5.3 Add comparison vs previous week ✅
- [x] 5.4 Create achievement/badge system ✅
- [x] 5.5 Implement AI-generated weekly insights ✅
- [ ] 5.6 Add export data functionality (deferred)

### Phase 6: Polish & Launch
- [ ] 6.1 Update ProfileScreen with new settings
- [ ] 6.2 Add onboarding flow for new users
- [ ] 6.3 Implement daily budget configuration
- [ ] 6.4 Add transport/energy defaults setup
- [ ] 6.5 Performance optimization
- [ ] 6.6 App Store asset preparation
- [ ] 6.7 Final testing and bug fixes

---

## 📱 Screen Specifications

### Home Dashboard
- Daily carbon budget with circular progress (like MealScan calories)
- 4 category cards: Food, Transport, Products, Energy
- Week calendar for date navigation
- Streak counter (top right)
- Recent activity feed with thumbnails
- Offset suggestion card

### Scan Screen
- Camera view with AR overlay
- Mode selector: Product | Food | Receipt | Barcode
- Voice/text context input
- Scan button with loading state

### Item Detail Screen
- Product/food image at top
- Name with quantity adjuster (+/-)
- Total carbon footprint display
- Eco Score (0-100%)
- Lifecycle breakdown: Manufacturing, Transport, Usage, Disposal
- Environmental impact warnings
- Greener alternatives
- "Add to Log" and "Suggest Alternative" buttons

### Journey Screen
- Day/Week toggle
- Daily total with progress bar
- Activities grouped by category
- Each activity shows: icon, name, time, carbon value

### Stats Screen
- Weekly bar chart
- Category breakdown chart
- Week-over-week comparison
- Achievement badges
- AI-generated insights

### Profile Screen
- User avatar and stats
- Daily carbon budget setting
- Home energy setup
- Default transport mode
- Goals & notifications
- Export data
- About/Learn section

---

## 📊 Data Models

### Activity
```typescript
interface Activity {
  id: string;
  timestamp: string;
  category: 'food' | 'transport' | 'product' | 'energy';
  name: string;
  carbonKg: number;
  quantity: number;
  thumbnail?: string;
  details: {
    manufacturing?: number;
    transport?: number;
    usage?: number;
    disposal?: number;
  };
  ecoScore: number;
  alternatives?: Alternative[];
}
```

### DailyLog
```typescript
interface DailyLog {
  date: string; // YYYY-MM-DD
  activities: Activity[];
  totalCarbonKg: number;
  budgetKg: number;
  categoryTotals: {
    food: number;
    transport: number;
    product: number;
    energy: number;
  };
}
```

### UserSettings
```typescript
interface UserSettings {
  dailyBudgetKg: number;
  defaultTransport: 'car' | 'bus' | 'bike' | 'walk';
  homeEnergyKwh: number;
  notifications: boolean;
  streak: number;
  totalScans: number;
  totalCarbonTracked: number;
}
```

---

## 🎨 Design Tokens

### Colors (Dark Theme)
- Background: #0A0F14
- Surface: #1E2832
- Primary (Green): #0D9373
- Food: #3B82F6 (Blue)
- Transport: #F59E0B (Orange)
- Products: #8B5CF6 (Purple)
- Energy: #EAB308 (Yellow)

### Category Icons
- Food: 🍽️ (utensils)
- Transport: 🚗 (car)
- Products: 📦 (box)
- Energy: ⚡ (lightning)

---

## 📝 Notes

- Daily carbon budget default: 8 kg CO₂e (based on 3 tonnes/year target)
- Streak resets if no activity logged for a day
- Eco Score = 100 - (carbon percentile among similar items)
- Charts use react-native-chart-kit or victory-native

---

Last Updated: 2026-01-28

---

## ✅ Completed Items Summary

**Phase 1: Foundation**
- 5-tab navigation (Home, Scan, Journey, Stats, Profile)
- Type definitions for activities and user settings
- CarbonContext for daily budget state management
- Home dashboard with daily carbon budget card
- Category breakdown cards (Food, Transport, Products, Energy)
- Week calendar date picker
- Recent activity feed
- Streak counter

**Phase 2: Enhanced Scanning**
- Scan mode selector (Product/Food/Receipt/Barcode)
- Multi-mode Gemini prompts (Gemini 2.0 Flash)
- Text context input
- Quantity selector component
- Real barcode scanning with Open Food Facts lookup

**Phase 3: Item Detail Screen**
- Full analysis view with quantity adjuster
- Lifecycle breakdown visualization
- Eco Score calculation and display
- Environmental impact warnings
- Greener alternatives suggestions
- Add to Log functionality

**Phase 4: Journey & Tracking**
- Daily activity log with category grouping
- Weekly view toggle
- Streak tracking

**Phase 5: Stats & Insights**
- Weekly bar chart
- Category breakdown visualization
- Week-over-week comparison
- Achievement/badge system
- AI-generated insights

**NEW: Transport Tracking (Hybrid Auto-Detection)**
- GPS-based trip tracking with expo-location
- Automatic transport mode detection based on speed
- User confirmation with one-tap selection
- Carbon calculation per trip
- Trip history with confirmed/unconfirmed status
- Transport entry screen accessible from Journey tab

**NEW: Energy Tracking**
- Log electricity, natural gas, heating oil usage
- Daily/weekly/monthly period selection
- Carbon calculation with emission factors
- Energy log history
- Accessible from Journey tab

**NEW: Notifications**
- Budget warning notifications (80% and exceeded)
- Trip confirmation notifications
- Daily reminder scheduling
- Achievement unlock notifications
- Full expo-notifications integration

**NEW: Data Export**
- Export to CSV format
- Export to JSON format
- Includes scans, trips, and summary
- Share via system share sheet
- Accessible from Profile screen

