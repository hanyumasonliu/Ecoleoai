/**
 * CarbonSense AR - Scan Screen
 * 
 * Main camera scanning interface with AR-style overlay.
 * Captures images and sends them for carbon analysis.
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
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { analyzeImageWithGemini } from '../services/gemini';
import { useHistory } from '../context/HistoryContext';
import { ScanButton, ScanResultList } from '../components';
import { AnalyzedObject } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * ScanScreen Component
 * 
 * Camera preview with scan functionality and AR-style results overlay.
 */
export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<AnalyzedObject[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const { addScan } = useHistory();
  
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
        // Analyze with Gemini
        const response = await analyzeImageWithGemini(photo.base64);
        
        if (response.objects.length > 0) {
          setScanResults(response.objects);
          setShowResults(true);
          
          // Save to history
          await addScan(response.objects);
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
            CarbonSense AR needs camera access to scan objects and estimate their carbon footprint.
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
    outputRange: [0, SCREEN_HEIGHT * 0.5],
  });
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* AR Overlay Frame */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <SafeAreaView style={styles.topBar}>
            <View style={styles.topBarContent}>
              <View style={styles.titleContainer}>
                <Ionicons name="leaf" size={24} color={Colors.primary} />
                <Text style={styles.title}>CarbonSense AR</Text>
              </View>
              <TouchableOpacity 
                style={styles.flipButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          
          {/* Scan frame corners */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            
            {/* Scanning line */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineTranslateY }] },
                ]}
              />
            )}
          </View>
          
          {/* Instructions */}
          {!isScanning && !showResults && (
            <View style={styles.instructions}>
              <Ionicons name="information-circle" size={20} color={Colors.textSecondary} />
              <Text style={styles.instructionText}>
                Frame objects within the viewfinder for best results
              </Text>
            </View>
          )}
          
          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <ScanButton
              onPress={handleScan}
              isLoading={isScanning}
              disabled={!permission.granted}
            />
          </View>
        </View>
      </CameraView>
      
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
            <Text style={styles.modalTitle}>Scan Results</Text>
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
              style={styles.scanAgainButton}
              onPress={handleCloseResults}
            >
              <Ionicons name="scan" size={20} color={Colors.primary} />
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
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing['2xl'] : Spacing.md,
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
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Scan frame
  scanFrame: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '30%',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.cameraScanLine,
    ...Shadows.glow,
  },
  
  // Instructions
  instructions: {
    position: 'absolute',
    bottom: '28%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  instructionText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    textAlign: 'center',
  },
  
  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing['3xl'],
    alignItems: 'center',
    backgroundColor: Colors.overlayLight,
    paddingTop: Spacing.xl,
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
  modalTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
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
    backgroundColor: Colors.primary,
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

