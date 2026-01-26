/**
 * CarbonSense AR - Camera Hook
 * 
 * Custom hook for managing camera permissions and capture.
 */

import { useState, useCallback } from 'react';
import { useCameraPermissions } from 'expo-camera';

/**
 * Camera hook return type
 */
interface UseCameraReturn {
  /** Whether camera permissions are granted */
  hasPermission: boolean | null;
  /** Whether we're currently loading permission status */
  isLoading: boolean;
  /** Request camera permissions */
  requestPermission: () => Promise<boolean>;
  /** Error message if any */
  error: string | null;
}

/**
 * useCamera hook
 * 
 * Manages camera permissions with proper error handling.
 */
export function useCamera(): UseCameraReturn {
  const [permission, requestCameraPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const result = await requestCameraPermission();
      
      if (!result.granted) {
        setError('Camera permission was denied. Please enable it in settings.');
        return false;
      }
      
      return true;
    } catch (err) {
      setError('Failed to request camera permission.');
      console.error('Camera permission error:', err);
      return false;
    }
  }, [requestCameraPermission]);
  
  return {
    hasPermission: permission?.granted ?? null,
    isLoading: !permission,
    requestPermission,
    error,
  };
}

export default useCamera;

