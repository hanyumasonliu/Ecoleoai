/**
 * GreenSense AR - Scan Screen
 * 
 * Enhanced camera scanning interface with multiple scan modes,
 * AR-style overlay, and context input options.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { analyzeImageWithGemini } from '../services/gemini';
import { lookupBarcodeProduct } from '../services/barcode';
import { useHistory } from '../context/HistoryContext';
import { useCarbon } from '../context/CarbonContext';
import { ScanButton, ScanResultList } from '../components';
import { AnalyzedObject } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows, Layout } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Scan mode types
 */
type ScanMode = 'product' | 'food' | 'receipt' | 'barcode';

/**
 * Scan mode configuration
 */
const SCAN_MODES: { key: ScanMode; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'product', label: 'Product', icon: 'cube-outline', color: '#8B5CF6' },
  { key: 'food', label: 'Food', icon: 'restaurant-outline', color: '#3B82F6' },
  { key: 'receipt', label: 'Receipt', icon: 'receipt-outline', color: '#F59E0B' },
  { key: 'barcode', label: 'Barcode', icon: 'barcode-outline', color: '#10B981' },
];

/**
 * ScanScreen Component
 * 
 * Camera preview with multi-mode scan functionality and AR-style results overlay.
 */
export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<AnalyzedObject[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('product');
  const [contextInput, setContextInput] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const { addScan } = useHistory();
  const { addProductScan } = useCarbon();
  
  // Animation values
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Scan line animation
  useEffect(() => {
    if (isScanning) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isScanning, scanLineAnim]);
  
  // Show results overlay animation
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: showResults ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showResults, overlayOpacity]);
  
  /**
   * Get scan prompt based on mode
   */
  const getScanPrompt = (): string => {
    const contextNote = contextInput ? `\nAdditional context: ${contextInput}` : '';
    
    switch (scanMode) {
      case 'food':
        return `Analyze this food/meal image. Identify all food items visible and estimate their carbon footprint in kg CO₂e. Consider production, transport, and packaging.${contextNote}`;
      case 'receipt':
        return `Analyze this receipt image. Extract all purchased items and estimate their carbon footprint in kg CO₂e based on typical products.${contextNote}`;
      case 'barcode':
        return `Analyze this barcode/product label. Identify the product and estimate its lifetime carbon footprint in kg CO₂e.${contextNote}`;
      case 'product':
      default:
        return `Analyze this image and identify all visible products/objects. Estimate each item's lifetime carbon footprint in kg CO₂e.${contextNote}`;
    }
  };
  
  /**
   * Handle scan button press
   */
  const handleScan = async () => {
    if (!cameraRef.current || isScanning) return;
    
    setIsScanning(true);
    setScanResults(null);
    
    try {
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      
      if (photo?.base64) {
        // Analyze with Gemini (with mode-specific prompt)
        const response = await analyzeImageWithGemini(photo.base64, getScanPrompt());
        
        if (response.objects.length > 0) {
          setScanResults(response.objects);
          setShowResults(true);
          
          // Save to history (legacy)
          await addScan(response.objects);
          
          // Add to carbon tracking (new)
          await addProductScan(response.objects);
        } else {
          // No objects detected - show empty state
          setScanResults([]);
          setShowResults(true);
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      // Still show results modal with empty state
      setScanResults([]);
      setShowResults(true);
    } finally {
      setIsScanning(false);
      setContextInput(''); // Clear context after scan
      setShowContextInput(false);
    }
  };
  
  /**
   * Close results modal
   */
  const handleCloseResults = () => {
    setShowResults(false);
    setScanResults(null);
  };
  
  /**
   * Toggle camera facing
   */
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };
  
  /**
   * Handle barcode scan
   */
  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // Prevent multiple scans of the same barcode
    if (scannedBarcode === result.data || isScanning) return;
    
    setScannedBarcode(result.data);
    setIsScanning(true);
    
    try {
      console.log('Barcode detected:', result.data, result.type);
      
      // Look up product from barcode
      const products = await lookupBarcodeProduct(result.data);
      
      if (products.length > 0) {
        setScanResults(products);
        setShowResults(true);
        
        // Save to history
        await addScan(products);
        await addProductScan(products);
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert('Lookup Failed', 'Could not look up product. Please try again.');
    } finally {
      setIsScanning(false);
      // Reset scanned barcode after a delay to allow rescanning
      setTimeout(() => setScannedBarcode(null), 3000);
    }
  };
  
  /**
   * Get current mode info
   */
  const currentMode = SCAN_MODES.find(m => m.key === scanMode) || SCAN_MODES[0];
  
  // Permission request screen
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="camera-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.permissionTitle}>Loading Camera...</Text>
      </View>
    );
  }
  
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="camera" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            GreenSense AR needs camera access to scan objects and estimate their carbon footprint.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT * 0.4],
  });
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        barcodeScannerSettings={scanMode === 'barcode' ? {
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
        } : undefined}
        onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
      >
        {/* AR Overlay Frame - box-none allows touches to pass through empty areas */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Top bar */}
          <SafeAreaView style={styles.topBar}>
            <View style={styles.topBarContent}>
              <View style={styles.titleContainer}>
                <Ionicons name="leaf" size={24} color={Colors.primary} />
                <Text style={styles.title}>GreenSense</Text>
              </View>
              <View style={styles.topBarActions}>
                <TouchableOpacity 
                  style={styles.topBarButton}
                  onPress={() => setShowContextInput(!showContextInput)}
                >
                  <Ionicons 
                    name={showContextInput ? "chatbubble" : "chatbubble-outline"} 
                    size={22} 
                    color={showContextInput ? Colors.primary : Colors.white} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.topBarButton}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
          
          {/* Scan Mode Selector */}
          <View style={styles.modeSelectorContainer}>
            <View style={styles.modeSelector}>
              {SCAN_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.key}
                  style={[
                    styles.modeButton,
                    scanMode === mode.key && styles.modeButtonActive,
                    scanMode === mode.key && { borderColor: mode.color },
                  ]}
                  onPress={() => setScanMode(mode.key)}
                >
                  <Ionicons 
                    name={mode.icon} 
                    size={18} 
                    color={scanMode === mode.key ? mode.color : Colors.textSecondary} 
                  />
                  <Text 
                    style={[
                      styles.modeLabel,
                      scanMode === mode.key && { color: mode.color },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Context Input */}
          {showContextInput && (
            <View style={styles.contextInputContainer}>
              <TextInput
                style={styles.contextInput}
                placeholder="Add context (e.g., 'brand new MacBook', 'homemade salad')"
                placeholderTextColor={Colors.textTertiary}
                value={contextInput}
                onChangeText={setContextInput}
                multiline
                maxLength={200}
              />
            </View>
          )}
          
          {/* Scan frame corners - pointer events none so touches pass through */}
          <View style={styles.scanFrame} pointerEvents="none">
            <View style={[styles.corner, styles.cornerTL, { borderColor: currentMode.color }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: currentMode.color }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: currentMode.color }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: currentMode.color }]} />
            
            {/* Scanning line */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { 
                    transform: [{ translateY: scanLineTranslateY }],
                    backgroundColor: currentMode.color,
                  },
                ]}
              />
            )}
          </View>
          
          {/* Instructions - pointer events none so touches pass through */}
          {!isScanning && !showResults && (
            <View style={styles.instructions} pointerEvents="none">
              <Ionicons name="information-circle" size={18} color={Colors.textSecondary} />
              <Text style={styles.instructionText}>
                {scanMode === 'food' && 'Point camera at your meal or food items'}
                {scanMode === 'receipt' && 'Capture the entire receipt clearly'}
                {scanMode === 'barcode' && 'Align barcode within the frame'}
                {scanMode === 'product' && 'Frame products within the viewfinder'}
              </Text>
            </View>
          )}
        </View>
      </CameraView>
      
      {/* Bottom controls - OUTSIDE CameraView for reliable touch handling */}
      <View style={styles.bottomControls}>
        {/* Current mode indicator */}
        <View style={[styles.modeIndicator, { backgroundColor: currentMode.color + '30' }]}>
          <Ionicons name={currentMode.icon} size={16} color={currentMode.color} />
          <Text style={[styles.modeIndicatorText, { color: currentMode.color }]}>
            {currentMode.label} Mode
          </Text>
        </View>
        
        {/* Main scan button - using direct TouchableOpacity for reliable touch */}
        <TouchableOpacity
          style={[
            styles.mainScanButton,
            isScanning && styles.mainScanButtonLoading,
            !permission.granted && styles.mainScanButtonDisabled,
          ]}
          onPress={() => {
            console.log('Scan button pressed!');
            handleScan();
          }}
          disabled={!permission.granted || isScanning}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isScanning ? "sync" : "scan"} 
            size={36} 
            color={Colors.white} 
          />
          <Text style={styles.mainScanButtonText}>
            {isScanning ? 'Analyzing...' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Results Modal - Full Screen */}
      <Modal
        visible={showResults}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseResults}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <StatusBar barStyle="light-content" />
          
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalModeIcon, { backgroundColor: currentMode.color + '30' }]}>
                <Ionicons name={currentMode.icon} size={20} color={currentMode.color} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Scan Results</Text>
                <Text style={styles.modalSubtitle}>{currentMode.label} scan complete</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseResults}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* Results list - full screen scrollable */}
          <View style={styles.resultsContainer}>
            <ScanResultList
              objects={scanResults || []}
              showTotal
            />
          </View>
          
          {/* Action buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: currentMode.color }]}
              onPress={handleCloseResults}
            >
              <Ionicons name="scan" size={20} color={Colors.white} />
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingTop: Platform.OS === 'android' ? Spacing['2xl'] : Spacing.sm,
    backgroundColor: Colors.overlayLight,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...TextStyles.h4,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  
  // Mode selector
  modeSelectorContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 90 : 100,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.sm,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.overlayDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.base,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: Colors.overlay,
  },
  modeLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  
  // Context input
  contextInputContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 150 : 160,
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 10,
  },
  contextInput: {
    backgroundColor: Colors.overlayDark,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.white,
    ...TextStyles.body,
    maxHeight: 80,
  },
  
  // Scan frame - adjusted to account for tab bar
  scanFrame: {
    position: 'absolute',
    top: '22%',
    left: '8%',
    right: '8%',
    bottom: '35%', // Higher to make room for controls + tab bar
  },
  corner: {
    position: 'absolute',
    width: 35,
    height: 35,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    ...Shadows.glow,
  },
  
  // Instructions - positioned above bottom controls
  instructions: {
    position: 'absolute',
    bottom: Layout.bottomTabHeight + 140, // Above controls + tab bar
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  instructionText: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    textAlign: 'center',
  },
  
  // Bottom controls - positioned at the bottom of the screen, above tab bar
  bottomControls: {
    position: 'absolute',
    bottom: Layout.bottomTabHeight, // Above the tab bar
    left: 0,
    right: 0,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.overlayDark,
    zIndex: 100, // Ensure it's above other elements
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  modeIndicatorText: {
    ...TextStyles.caption,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  mainScanButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainScanButtonLoading: {
    backgroundColor: Colors.primaryDark,
  },
  mainScanButtonDisabled: {
    backgroundColor: Colors.backgroundTertiary,
  },
  mainScanButtonText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  
  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.carbonLowBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
  },
  permissionButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },
  
  // Modal - Full Screen
  modalFullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalModeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  modalTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  modalActions: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    width: '100%',
  },
  scanAgainText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
});

export default ScanScreen;
