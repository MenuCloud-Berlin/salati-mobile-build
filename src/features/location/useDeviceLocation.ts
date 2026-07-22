import * as Location from 'expo-location';
import { useState } from 'react';

export interface DeviceLocationResult {
  lat: number;
  lon: number;
}

interface UseDeviceLocationState {
  loading: boolean;
  error: string | null;
}

/**
 * Fragt Standort-Berechtigung an und liest die aktuelle Position.
 * Gibt null zurück (mit gesetztem `error`) wenn Berechtigung verweigert wird
 * oder die Ortung fehlschlägt — der Aufrufer entscheidet über den Fallback
 * (z.B. manuelle Stadtsuche via Nominatim).
 */
export function useDeviceLocation() {
  const [state, setState] = useState<UseDeviceLocationState>({ loading: false, error: null });

  async function requestLocation(): Promise<DeviceLocationResult | null> {
    setState({ loading: true, error: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({ loading: false, error: 'permission_denied' });
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setState({ loading: false, error: null });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      setState({ loading: false, error: 'location_failed' });
      return null;
    }
  }

  return { ...state, requestLocation };
}
