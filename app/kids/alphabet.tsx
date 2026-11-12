import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { KIDS_LETTERS } from '@/utils/kidsLearning';
import { kidsColor } from '@/utils/kidsContent';
import { useKidsStore } from '@/stores/kidsStore';
import { ArabicFonts, Spacing } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

const BG = '#FFF8EC';
const INK = '#2B2418';

export default function KidsAlphabet() {
  const insets = useSafeAreaInsets();
  const heard = useKidsStore((s) => s.lettersHeard);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Tap haptic onPress={() => router.back()} accessibilityLabel="Retour" style={[styles.round, { backgroundColor: '#F8E1A6' }]}>
          <Ionicons name="arrow-back" size={28} color="#5A3F06" />
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Les lettres</Text>
          <Text style={styles.sub}>Touche une lettre</Text>
        </View>
        <View style={styles.stars} accessibilityLabel={`${heard.length} lettres écoutées sur 28`}>
          <Ionicons name="star" size={18} color="#E2A400" />
          <Text style={styles.starsText}>{heard.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + Spacing.xxxl }]}>
        {KIDS_LETTERS.map((l, i) => {
          const c = kidsColor(i);
          const done = heard.includes(l.n);
          return (
            <Tap
              key={l.n}
              haptic
              onPress={() => router.push({ pathname: '/kids/lettre/[n]', params: { n: String(l.n) } })}
              accessibilityRole="button"
              accessibilityLabel={l.name}
              style={[styles.tile, { backgroundColor: c.bg }, done && styles.done]}
            >
              <Text style={[styles.letter, { color: c.ink }]}>{l.letter}</Text>
              <Text style={[styles.name, { color: c.ink }]}>{l.name}</Text>
            </Tap>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: INK },
  sub: { fontSize: 15, fontWeight: '600', color: '#6B5E48' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEFC2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  starsText: { fontSize: 17, fontWeight: '800', color: '#5A3F06' },
  // Ordre arabe : de droite à gauche
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  tile: { width: '22.8%', height: 92, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  done: { borderWidth: 3, borderColor: '#E2A400' },
  letter: { fontFamily: ArabicFonts.bold, fontSize: 40, lineHeight: 54 },
  name: { fontSize: 12, fontWeight: '800', marginTop: -4 },
});
