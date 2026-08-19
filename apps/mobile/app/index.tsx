import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

const steps = [
  '現在地を取得する',
  '地図と仮のルートを表示する',
  'FastAPIから周回ルートを取得する',
  'Google Mapsへ経路を引き渡す',
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE 0</Text>
        </View>
        <Text style={styles.title}>Re:Drive</Text>
        <Text style={styles.tagline}>久しぶりの運転を、ちょうどいい練習から。</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>技術検証を開始します</Text>
          <Text style={styles.cardDescription}>
            モバイルアプリの初期構築が完了しました。次は実機での位置情報取得に進みます。
          </Text>

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
