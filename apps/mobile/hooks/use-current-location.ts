import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type LocationState =
  | { status: 'loading' }
  | { status: 'success'; coordinates: Location.LocationObjectCoords }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'error'; message: string };

export function useCurrentLocation() {
  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });

  const getCurrentLocation = useCallback(async () => {
    setLocationState({ status: 'loading' });

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationState({ status: 'denied', canAskAgain: permission.canAskAgain });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationState({ status: 'success', coordinates: location.coords });
    } catch {
      setLocationState({
        status: 'error',
        message: '現在地を取得できませんでした。位置情報サービスを確認して、もう一度お試しください。',
      });
    }
  }, []);

  useEffect(() => {
    void getCurrentLocation();
  }, [getCurrentLocation]);

  return { locationState, getCurrentLocation };
}
