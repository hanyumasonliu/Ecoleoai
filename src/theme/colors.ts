/**
 * CarbonSense AR - Color Theme
 * 
 * A modern, eco-conscious color palette with nature-inspired tones.
 * Uses a dark theme with vibrant accents for a premium feel.
 */

export const Colors = {
  // Primary palette - Deep forest green tones
  primary: '#0D9373',      // Emerald green - main actions
  primaryLight: '#14B89C', // Lighter emerald for highlights
  primaryDark: '#087A5E',  // Darker shade for pressed states

  // Secondary palette - Ocean blues
  secondary: '#1E88E5',    // Ocean blue
  secondaryLight: '#42A5F5',
  secondaryDark: '#1565C0',

  // Background colors - Dark theme
  background: '#0A0F14',        // Deep dark background
  backgroundSecondary: '#141B22', // Slightly lighter for cards
  backgroundTertiary: '#1C2630',  // For elevated elements
  
  // Surface colors
  surface: '#1E2832',           // Card backgrounds
  surfaceLight: '#2A3642',      // Elevated surfaces
  
  // Carbon severity indicators
  carbonLow: '#22C55E',         // Bright green - good
  carbonMedium: '#F59E0B',      // Amber - caution
  carbonHigh: '#EF4444',        // Red - high impact
  
  // Severity backgrounds (with opacity)
  carbonLowBg: 'rgba(34, 197, 94, 0.15)',
  carbonMediumBg: 'rgba(245, 158, 11, 0.15)',
  carbonHighBg: 'rgba(239, 68, 68, 0.15)',

  // Text colors
  textPrimary: '#F8FAFC',       // Main text - almost white
  textSecondary: '#94A3B8',     // Muted text
  textTertiary: '#64748B',      // Even more muted
  textInverse: '#0A0F14',       // For light backgrounds

  // Border colors
  border: '#2A3642',
  borderLight: '#3D4D5C',

  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  // Special
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Camera UI
  cameraOverlay: 'rgba(10, 15, 20, 0.85)',
  cameraScanLine: '#0D9373',
};

/**
 * Gradient presets for backgrounds and cards
 */
export const Gradients = {
  primary: ['#0D9373', '#087A5E'],
  secondary: ['#1E88E5', '#1565C0'],
  dark: ['#141B22', '#0A0F14'],
  card: ['#1E2832', '#141B22'],
};

/**
 * Shadow presets
 */
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: '#0D9373',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default Colors;

