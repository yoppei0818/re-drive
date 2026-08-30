import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type LocationState, useCurrentLocation } from '../hooks/use-current-location';
import { useLoopRoute } from '../hooks/use-loop-route';
import {
  DEFAULT_ROUTE_CONDITIONS,
  type RouteConditions,
  type RouteDifficulty,
  type RouteDuration,
  validateRouteConditions,
} from '../services/route-conditions';

const MAP_DELTA = 0.012;
const DURATION_OPTIONS: { value: RouteDuration; label: string }[] = [
  { value: 30, label: '30分' }, { value: 45, label: '45分' }, { value: 60, label: '60分' },
];
const DIFFICULTY_OPTIONS: { value: RouteDifficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'やさしい', description: '落ち着いて練習' },
  { value: 'standard', label: '標準', description: '基本操作を練習' },
  { value: 'challenge', label: 'チャレンジ', description: '幅広い操作を練習' },
];

export default function HomeScreen() {
  const { locationState, getCurrentLocation } = useCurrentLocation();
  const [draft, setDraft] = useState(DEFAULT_ROUTE_CONDITIONS);
  const [submitted, setSubmitted] = useState<RouteConditions | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function generateRoute() {
    setFormError(null);
    if (!validateRouteConditions(draft)) {
      setFormError('入力条件を確認してください。');
    } else if (locationState.status !== 'success') {
      setFormError('ルート生成には現在地が必要です。位置情報を確認してください。');
    } else {
      setSubmitted({ ...draft });
    }
  }

  if (!submitted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.eyebrow}>PHASE 1 · STEP 1</Text>
          <Text style={styles.title}>どんな練習にしますか？</Text>
          <Text style={styles.intro}>希望に近い周回ルートを現在地から探します。</Text>

          <ConditionSection title="希望走行時間" description="まずは練習しやすい時間を選びます">
            <View style={styles.segmentRow}>
              {DURATION_OPTIONS.map((option) => (
                <ChoiceButton key={option.value} label={option.label}
                  selected={draft.targetDurationMinutes === option.value}
                  onPress={() => setDraft((current) => ({ ...current, targetDurationMinutes: option.value }))} />
              ))}
            </View>
          </ConditionSection>

          <ConditionSection title="練習したい難易度"
            description="このStepでは選択内容を保存し、経路への反映は後から追加します">
            <View style={styles.difficultyList}>
              {DIFFICULTY_OPTIONS.map((option) => {
                const selected = draft.difficulty === option.value;
                return (
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }}
                    key={option.value} onPress={() => setDraft((current) => ({ ...current, difficulty: option.value }))}
                    style={({ pressed }) => [styles.difficultyButton, selected && styles.choiceSelected, pressed && styles.buttonPressed]}>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
                      <Text style={styles.choiceDescription}>{option.description}</Text></View>
                  </Pressable>
                );
              })}
            </View>
          </ConditionSection>

          <ConditionSection title="避けたい道路" description="選択した道路をできるだけ避けて検索します">
            <AvoidanceRow label="有料道路を避ける" value={draft.avoidTolls}
              onValueChange={(value) => setDraft((current) => ({ ...current, avoidTolls: value }))} />
            <AvoidanceRow label="高速道路を避ける" value={draft.avoidHighways}
              onValueChange={(value) => setDraft((current) => ({ ...current, avoidHighways: value }))} />
          </ConditionSection>

          <LocationStatus state={locationState} onRetry={getCurrentLocation} />
          {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}
          <Pressable accessibilityRole="button" disabled={locationState.status === 'loading'} onPress={generateRoute}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, locationState.status === 'loading' && styles.buttonDisabled]}>
            {locationState.status === 'loading' ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.primaryButtonText}>この条件でルートを作る</Text>}
          </Pressable>
          <Text style={styles.safetyNotice}>安全な場所に停車して操作してください。</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>PHASE 1 · STEP 1</Text><Text style={styles.resultTitle}>練習ルート</Text></View>
        <Pressable accessibilityRole="button" onPress={() => setSubmitted(null)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.secondaryButtonText}>条件を変更</Text>
        </Pressable>
      </View>
      <LocationContent state={locationState} conditions={submitted} onRetry={getCurrentLocation} />
    </SafeAreaView>
  );
}

function ConditionSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <View style={styles.conditionCard}><Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionDescription}>{description}</Text>{children}</View>;
}

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
    style={({ pressed }) => [styles.segmentButton, selected && styles.choiceSelected, pressed && styles.buttonPressed]}>
    <Text style={[styles.segmentText, selected && styles.choiceTextSelected]}>{label}</Text>
    {selected ? <Text style={styles.selectedMark}>✓</Text> : null}
  </Pressable>;
}

function AvoidanceRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.avoidanceRow}><View><Text style={styles.avoidanceLabel}>{label}</Text>
    <Text style={styles.avoidanceState}>{value ? '避ける' : '許可する'}</Text></View>
    <Switch accessibilityLabel={label} onValueChange={onValueChange} thumbColor="#FFFFFF"
      trackColor={{ false: '#BCC7C1', true: '#176B45' }} value={value} /></View>;
}

function LocationStatus({ state, onRetry }: { state: LocationState; onRetry: () => Promise<void> }) {
  if (state.status === 'success') return <Text style={styles.locationReady}>✓ 現在地を取得しました</Text>;
  if (state.status === 'loading') return <Text style={styles.locationPending}>現在地を確認しています…</Text>;
  return <View style={styles.locationErrorBox}><Text style={styles.formError}>現在地を取得できませんでした。</Text>
    <RetryButton onPress={onRetry} /></View>;
}

function LocationContent({ state, conditions, onRetry }: { state: LocationState; conditions: RouteConditions; onRetry: () => Promise<void> }) {
  if (state.status !== 'success') return <View style={styles.mapContainer}><MapPlaceholder>
    <Text style={styles.errorTitle}>現在地を取得できませんでした</Text><RetryButton onPress={onRetry} />
  </MapPlaceholder></View>;
  return <RouteContent conditions={conditions} currentLocation={{ latitude: state.coordinates.latitude, longitude: state.coordinates.longitude }} />;
}

function RouteContent({ currentLocation, conditions }: { currentLocation: LatLng; conditions: RouteConditions }) {
  const { routeState, retry } = useLoopRoute(currentLocation, conditions);
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  async function openGoogleMaps(url: string) {
    setIsOpeningMaps(true); setMapsError(null);
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error('この端末ではGoogle Mapsを開けません。');
      await Linking.openURL(url);
    } catch (error) {
      setMapsError(error instanceof Error ? error.message : 'Google Mapsを開けませんでした。');
    } finally { setIsOpeningMaps(false); }
  }

  if (routeState.status !== 'success') return <><View style={styles.mapContainer}><MapPlaceholder>
    {routeState.status === 'loading' ? <><ActivityIndicator color="#176B45" size="large" />
      <Text style={styles.placeholderTitle}>周回ルートを取得しています…</Text>
      <Text style={styles.placeholderDescription}>選択した条件をFastAPIへ送信しています</Text></>
      : <><Text style={styles.errorTitle}>周回ルートを取得できませんでした</Text>
        <Text style={styles.placeholderDescription}>{routeState.message}</Text><RetryButton onPress={retry} /></>}
  </MapPlaceholder></View><RouteSummary conditions={conditions} /></>;

  return <><View style={styles.mapContainer}><MapView
    initialRegion={{ ...currentLocation, latitudeDelta: MAP_DELTA, longitudeDelta: MAP_DELTA }}
    mapPadding={{ top: 24, right: 24, bottom: 24, left: 24 }} showsCompass showsMyLocationButton style={styles.map}>
    <Polyline coordinates={routeState.coordinates} strokeColor="#176B45" strokeWidth={6} />
    <Marker coordinate={currentLocation} title="現在地" description="練習ルートの出発地点" />
  </MapView></View><RouteSummary conditions={conditions} googleMapsUrl={routeState.googleMapsUrl}
    isOpening={isOpeningMaps} mapsError={mapsError} onOpenMaps={openGoogleMaps} /></>;
}

function RouteSummary({ conditions, googleMapsUrl, isOpening = false, mapsError, onOpenMaps }: {
  conditions: RouteConditions; googleMapsUrl?: string; isOpening?: boolean; mapsError?: string | null;
  onOpenMaps?: (url: string) => Promise<void>;
}) {
  const difficulty = DIFFICULTY_OPTIONS.find((option) => option.value === conditions.difficulty)?.label;
  const disabled = !googleMapsUrl || !onOpenMaps || isOpening;
  return <View style={styles.routeSummary}><Text style={styles.routeTitle}>{conditions.targetDurationMinutes}分 · {difficulty}</Text>
    <Text style={styles.routeDescription}>有料道路 {conditions.avoidTolls ? '回避' : '許可'} ／ 高速道路 {conditions.avoidHighways ? '回避' : '許可'}</Text>
    <Pressable accessibilityRole="button" disabled={disabled}
      onPress={() => googleMapsUrl && onOpenMaps && void onOpenMaps(googleMapsUrl)}
      style={({ pressed }) => [styles.mapsButton, pressed && styles.buttonPressed, disabled && styles.buttonDisabled]}>
      {isOpening ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mapsButtonText}>Google Mapsで開く</Text>}
    </Pressable>{mapsError ? <Text style={styles.formError}>{mapsError}</Text> : null}</View>;
}

function MapPlaceholder({ children }: { children: React.ReactNode }) { return <View style={styles.placeholder}>{children}</View>; }
function RetryButton({ onPress }: { onPress: () => void | Promise<void> }) {
  return <Pressable accessibilityRole="button" onPress={() => void onPress()} style={styles.retryButton}>
    <Text style={styles.retryButtonText}>もう一度試す</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAF7EF' }, formContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  eyebrow: { color: '#176B45', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { marginTop: 6, color: '#183029', fontSize: 28, fontWeight: '800' }, resultTitle: { marginTop: 4, color: '#183029', fontSize: 26, fontWeight: '800' },
  intro: { marginTop: 8, marginBottom: 10, color: '#607069', fontSize: 15, lineHeight: 22 },
  conditionCard: { marginTop: 14, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16 },
  sectionTitle: { color: '#183029', fontSize: 17, fontWeight: '700' }, sectionDescription: { marginTop: 4, color: '#607069', fontSize: 12, lineHeight: 18 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  segmentButton: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: '#D7DFDA', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: '#44564F', fontSize: 16, fontWeight: '700' }, selectedMark: { position: 'absolute', right: 7, top: 5, color: '#176B45', fontSize: 12, fontWeight: '800' },
  choiceSelected: { borderColor: '#176B45', borderWidth: 2, backgroundColor: '#E8F2EC' }, choiceTextSelected: { color: '#176B45' },
  difficultyList: { gap: 8, marginTop: 14 }, difficultyButton: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D7DFDA', borderRadius: 12, paddingHorizontal: 14 },
  radio: { width: 20, height: 20, marginRight: 12, borderRadius: 10, borderWidth: 2, borderColor: '#9BA9A2', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#176B45' }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#176B45' },
  choiceText: { color: '#183029', fontSize: 15, fontWeight: '700' }, choiceDescription: { marginTop: 2, color: '#607069', fontSize: 12 },
  avoidanceRow: { minHeight: 62, marginTop: 10, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEF1EF' },
  avoidanceLabel: { color: '#183029', fontSize: 15, fontWeight: '600' }, avoidanceState: { marginTop: 3, color: '#607069', fontSize: 12 },
  locationReady: { marginTop: 16, color: '#176B45', fontSize: 14, fontWeight: '700', textAlign: 'center' }, locationPending: { marginTop: 16, color: '#607069', fontSize: 14, textAlign: 'center' },
  locationErrorBox: { alignItems: 'center', marginTop: 14 }, formError: { marginTop: 10, color: '#9C3D31', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  primaryButton: { minHeight: 54, marginTop: 14, borderRadius: 14, backgroundColor: '#176B45', alignItems: 'center', justifyContent: 'center' }, primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, safetyNotice: { marginTop: 10, color: '#607069', fontSize: 11, textAlign: 'center' },
  buttonPressed: { opacity: 0.7 }, buttonDisabled: { opacity: 0.5 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  secondaryButton: { borderRadius: 12, backgroundColor: '#DDEDE3', paddingHorizontal: 14, paddingVertical: 10 }, secondaryButtonText: { color: '#176B45', fontSize: 13, fontWeight: '700' },
  mapContainer: { flex: 1, marginHorizontal: 16, overflow: 'hidden', borderRadius: 24, backgroundColor: '#E4ECE7' }, map: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }, placeholderTitle: { marginTop: 16, color: '#183029', fontSize: 17, fontWeight: '700' },
  placeholderDescription: { marginTop: 8, color: '#607069', fontSize: 14, lineHeight: 21, textAlign: 'center' }, errorTitle: { color: '#9C3D31', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  retryButton: { marginTop: 14, borderRadius: 12, backgroundColor: '#176B45', paddingHorizontal: 18, paddingVertical: 11 }, retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  routeSummary: { margin: 16, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16 }, routeTitle: { color: '#183029', fontSize: 17, fontWeight: '800' }, routeDescription: { marginTop: 4, color: '#607069', fontSize: 12, lineHeight: 18 },
  mapsButton: { minHeight: 46, marginTop: 14, borderRadius: 12, backgroundColor: '#176B45', alignItems: 'center', justifyContent: 'center' }, mapsButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
