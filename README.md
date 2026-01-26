# CarbonSense AR 🌱

> Point your camera at everyday objects and see an AR overlay of their estimated lifetime carbon footprint.

An AI-powered carbon footprint AR scanner built for the **Gemini 3 Hackathon**.

![CarbonSense AR](./assets/icon.png)

## 🚀 Features

- **📸 AR Scanner** - Point your camera at objects to analyze their carbon footprint
- **🤖 AI-Powered Analysis** - Uses Google Gemini Vision API for intelligent object detection
- **📊 History Tracking** - View all your past scans with detailed carbon breakdowns
- **💡 Carbon Coach** - Get personalized tips and insights based on your scanning patterns
- **📚 Learn** - Educational content about carbon footprints and sustainability

## 🛠 Tech Stack

- **Expo** (Managed Workflow) with TypeScript
- **React Navigation** (Bottom Tabs)
- **expo-camera** for camera functionality
- **AsyncStorage** for local data persistence
- **Google Gemini API** for AI-powered analysis

## 📱 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo Go app on your iOS/Android device
- (Optional) Gemini API key for real AI analysis

### Installation

1. **Clone the repository**
   ```bash
   cd Ecoleoai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the project root:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Get your API key from: https://makersuite.google.com/app/apikey

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your device**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `i` for iOS simulator, `a` for Android emulator

## 📂 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── CarbonBadge.tsx
│   ├── ScanButton.tsx
│   ├── ScanResultList.tsx
│   └── HistoryItem.tsx
│
├── screens/          # Main app screens
│   ├── ScanScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── CoachScreen.tsx
│   └── ProfileScreen.tsx
│
├── navigation/       # Navigation configuration
│   └── RootNavigator.tsx
│
├── services/         # API and storage services
│   ├── gemini.ts     # Gemini API integration
│   └── storage.ts    # AsyncStorage wrappers
│
├── context/          # React Context providers
│   └── HistoryContext.tsx
│
├── types/            # TypeScript type definitions
│   └── carbon.ts
│
└── theme/            # Design system
    ├── colors.ts
    ├── typography.ts
    └── index.ts
```

## 🎯 Usage

### Scanning Objects

1. Open the app and navigate to the **Scan** tab
2. Point your camera at objects you want to analyze
3. Tap the **Scan Scene** button
4. View the detected objects with their carbon footprints
5. Results are automatically saved to your history

### Viewing History

- Navigate to the **History** tab
- See all your past scans with timestamps
- Tap any scan to view detailed results
- Swipe to delete individual scans

### Getting Coaching

- Navigate to the **Coach** tab
- Get personalized insights based on your scanning patterns
- Tap "Refresh Advice" for new recommendations

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API key | No (falls back to mock data) |

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🌍 Carbon Footprint Data

Carbon estimates are based on lifecycle analysis data including:
- Raw material extraction
- Manufacturing processes
- Transportation
- Usage phase
- End-of-life disposal

Severity levels:
- 🟢 **Low** (< 10 kg CO₂e) - Relatively eco-friendly
- 🟡 **Medium** (10-100 kg CO₂e) - Moderate impact
- 🔴 **High** (> 100 kg CO₂e) - Significant carbon footprint

## 🤝 Contributing

This is a hackathon project. Feel free to fork and extend!

## 📄 License

MIT License - feel free to use this for your own projects.

## 🏆 Hackathon

Built for the **Gemini 3 Hackathon** - showcasing the power of Google's Gemini Vision API for environmental awareness.

---

Made with 💚 for a greener future

