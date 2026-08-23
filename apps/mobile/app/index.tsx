import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const steps = [
  '現在地を取得する',
  '地図と仮のルートを表示する',
  'FastAPIから周回ルートを取得する',
  'Google Mapsへ経路を引き渡す',
];

type LocationState =
  | { status: 'loading' }
  | { status: 'success'; coordinates: Location.LocationObjectCoords }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'error'; message: string };

export default function HomeScreen() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE 0</Text>
        </View>
        <Text style={styles.title}>Re:Drive</Text>
        <Text style={styles.tagline}>久しぶりの運転を、ちょうどいい練習から。</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>現在地の取得</Text>
          <LocationResult state={locationState} onRetry={getCurrentLocation} />

          <View style={styles.stepList}>
            {steps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepNumber, index === 0 && styles.activeStepNumber]}>
                  <Text style={[styles.stepNumberText, index === 0 && styles.activeStepNumberText]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepText, index === 0 && styles.activeStepText]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function LocationResult({
  state,
  onRetry,
}: {
  state: LocationState;
  onRetry: () => Promise<void>;
}) {
  if (state.status === 'loading') {
    return (
      <View style={styles.locationStatus}>
        <ActivityIndicator color="#176B45" />
        <Text style={styles.cardDescription}>現在地を取得しています…</Text>
      </View>
    );
  }

  if (state.status === 'success') {
    return (
      <View style={styles.locationResult}>
        <Text style={styles.successText}>現在地を取得しました</Text>
        <Text style={styles.coordinateText}>緯度: {state.coordinates.latitude.toFixed(6)}</Text>
        <Text style={styles.coordinateText}>経度: {state.coordinates.longitude.toFixed(6)}</Text>
        <RetryButton label="現在地を更新" onPress={onRetry} />
      </View>
    );
  }

  const message =
    state.status === 'denied'
      ? state.canAskAgain
        ? '現在地の取得には位置情報の許可が必要です。'
        : '位置情報が許可されていません。端末の設定からRe:Driveの位置情報を許可してください。'
      : state.message;

  return (
    <View style={styles.locationResult}>
      <Text style={styles.errorText}>{message}</Text>
      <RetryButton label="もう一度試す" onPress={onRetry} />
    </View>
  );
}

function RetryButton({ label, onPress }: { label: string; onPress: () => Promise<void> }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void onPress()}
      style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
      <Text style={styles.retryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F7F4' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: '#DDEDE3',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: '#176B45', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#12372A', fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  tagline: { marginTop: 8, color: '#4D625A', fontSize: 16, lineHeight: 24 },
  card: {
    marginTop: 36,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 24,
    shadowColor: '#12372A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  cardTitle: { color: '#12372A', fontSize: 20, fontWeight: '700' },
  cardDescription: { marginTop: 10, color: '#66756F', fontSize: 14, lineHeight: 22 },
  locationStatus: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationResult: { marginTop: 16, alignItems: 'flex-start' },
  successText: { marginBottom: 8, color: '#176B45', fontSize: 14, fontWeight: '700' },
  coordinateText: { color: '#4D625A', fontSize: 14, fontVariant: ['tabular-nums'], lineHeight: 22 },
  errorText: { color: '#9C3D31', fontSize: 14, lineHeight: 22 },
  retryButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#176B45',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonPressed: { opacity: 0.75 },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  stepList: { marginTop: 24, gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: {
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EDF1EF',
  },
  activeStepNumber: { backgroundColor: '#176B45' },
  stepNumberText: { color: '#75817C', fontSize: 13, fontWeight: '700' },
  activeStepNumberText: { color: '#FFFFFF' },
  stepText: { flex: 1, color: '#75817C', fontSize: 14 },
  activeStepText: { color: '#12372A', fontWeight: '600' },
});
