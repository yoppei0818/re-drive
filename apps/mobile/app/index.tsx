import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type LocationState, useCurrentLocation } from '../hooks/use-current-location';

const MAP_DELTA = 0.012;

export default function HomeScreen() {
  const { locationState, getCurrentLocation } = useCurrentLocation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PHASE 0 · STEP 2</Text>
          <Text style={styles.title}>練習ルート</Text>
        </View>
        <Pressable
          accessibilityLabel="現在地を更新"
          accessibilityRole="button"
          disabled={locationState.status === 'loading'}
          onPress={() => void getCurrentLocation()}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.buttonPressed,
            locationState.status === 'loading' && styles.buttonDisabled,
          ]}>
          <Text style={styles.refreshButtonText}>現在地を更新</Text>
        </Pressable>
      </View>

      <View style={styles.mapContainer}>
        <LocationMap state={locationState} onRetry={getCurrentLocation} />
      </View>

      <View style={styles.routeSummary}>
        <View style={styles.routeIndicator} />
        <View style={styles.routeText}>
          <Text style={styles.routeTitle}>仮の練習ルート</Text>
          <Text style={styles.routeDescription}>現在地の周辺に固定形状のルートを表示しています</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>描画テスト</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function LocationMap({ state, onRetry }: { state: LocationState; onRetry: () => Promise<void> }) {
  if (state.status === 'loading') {
    return (
      <MapPlaceholder>
        <ActivityIndicator color="#176B45" size="large" />
        <Text style={styles.placeholderTitle}>現在地を取得しています…</Text>
        <Text style={styles.placeholderDescription}>地図を準備しています</Text>
      </MapPlaceholder>
    );
  }

  if (state.status !== 'success') {
    const message =
      state.status === 'denied'
        ? state.canAskAgain
          ? '地図を表示するには位置情報の許可が必要です。'
          : '端末の設定からRe:Driveの位置情報を許可してください。'
        : state.message;

    return (
      <MapPlaceholder>
        <Text style={styles.errorTitle}>現在地を取得できませんでした</Text>
        <Text style={styles.placeholderDescription}>{message}</Text>
        <RetryButton onPress={onRetry} />
      </MapPlaceholder>
    );
  }

  const currentLocation: LatLng = {
    latitude: state.coordinates.latitude,
    longitude: state.coordinates.longitude,
  };
  const route = createPreviewRoute(currentLocation);

  return (
    <MapView
      initialRegion={{
        ...currentLocation,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      }}
      mapPadding={{ top: 24, right: 24, bottom: 24, left: 24 }}
      showsCompass
      showsMyLocationButton
      style={styles.map}>
      <Polyline
        coordinates={route}
        lineCap="round"
        lineJoin="round"
        strokeColor="#176B45"
        strokeWidth={6}
      />
      <Marker coordinate={currentLocation} title="現在地" description="練習ルートの出発地点" />
    </MapView>
  );
}

function createPreviewRoute(origin: LatLng): LatLng[] {
  return [
    origin,
    { latitude: origin.latitude + 0.0025, longitude: origin.longitude + 0.001 },
    { latitude: origin.latitude + 0.003, longitude: origin.longitude + 0.004 },
    { latitude: origin.latitude + 0.0005, longitude: origin.longitude + 0.005 },
    { latitude: origin.latitude - 0.002, longitude: origin.longitude + 0.0025 },
    origin,
  ];
}

function MapPlaceholder({ children }: { children: React.ReactNode }) {
  return <View style={styles.placeholder}>{children}</View>;
}

function RetryButton({ onPress }: { onPress: () => Promise<void> }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void onPress()}
      style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
      <Text style={styles.retryButtonText}>もう一度試す</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F7F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  eyebrow: { color: '#176B45', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { marginTop: 4, color: '#12372A', fontSize: 28, fontWeight: '800' },
  refreshButton: {
    borderRadius: 12,
    backgroundColor: '#DDEDE3',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshButtonText: { color: '#176B45', fontSize: 13, fontWeight: '700' },
  buttonPressed: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.5 },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#E4ECE7',
  },
  map: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  placeholderTitle: { marginTop: 16, color: '#12372A', fontSize: 17, fontWeight: '700' },
  errorTitle: { color: '#9C3D31', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  placeholderDescription: {
    marginTop: 8,
    color: '#66756F',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: '#176B45',
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#12372A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  routeIndicator: { height: 42, width: 5, borderRadius: 3, backgroundColor: '#176B45' },
  routeText: { flex: 1, marginLeft: 12 },
  routeTitle: { color: '#12372A', fontSize: 15, fontWeight: '700' },
  routeDescription: { marginTop: 3, color: '#66756F', fontSize: 12, lineHeight: 17 },
  statusBadge: {
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: '#F0F4F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: { color: '#66756F', fontSize: 10, fontWeight: '700' },
});
