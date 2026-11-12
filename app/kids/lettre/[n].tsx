import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { KIDS_LETTERS, letterAudio, LetterPart } from '@/utils/kidsLearning';
import { kidsColor } from '@/utils/kidsContent';
import { useKidsStore } from '@/stores/kidsStore';
import { useKidsSound } from '@/hooks/useKidsSound';
import { ArabicFonts, Spacing } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

const BG = '#FFF8EC';
const INK = '#2B2418';

export default function KidsLetter() {
  const { n } = useLocalSearchParams<{ n: string }>();
  const index = Math.min(KIDS_LETTERS.length - 1, Math.max(0, (Number(n) || 1) - 1));
  const l = KIDS_LETTERS[index];
  const c = kidsColor(index);
  const insets = useSafeAreaInsets();
  const heard = useKidsStore((s) => s.lettersHeard.includes(l.n));
  const markLetter = useKidsStore((s) => s.markLetter);
  const sound = useKidsSound((key) => {
    if (key === `${l.n}-nom`) markLetter(l.n);
  });

  const play = (part: LetterPart) => sound.play(`${l.n}-${part}`, letterAudio(l, part));
  const hasAudio = (part: LetterPart) => !!letterAudio(l, part);

  // La lettre se fait entendre dès l'ouverture
  useEffect(() => {
    const t = setTimeout(() => {
      const src = letterAudio(l, 'nom');
      if (src) sound.play(`${l.n}-nom`, src);
    }, 350);
    return () => clearTimeout(t);
  }, [l.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (delta: number) => {
    const next = KIDS_LETTERS[index + delta];
    if (!next) return;
    sound.stop();
    router.setParams({ n: String(next.n) });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Tap haptic onPress={() => router.back()} accessibilityLabel="Retour aux lettres" style={[styles.round, { backgroundColor: c.bg }]}>
          <Ionicons name="arrow-back" size={28} color={c.ink} />
        </Tap>
        <Text style={styles.title}>{l.name}</Text>
        <View style={{ width: 56, alignItems: 'center' }}>
          <Ionicons name={heard ? 'star' : 'star-outline'} size={30} color={heard ? '#E2A400' : '#C9BCA0'} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>
        {/* La lettre, en très grand */}
        <Tap
          haptic
          onPress={() => play('nom')}
          accessibilityLabel={`Écouter la lettre ${l.name}`}
          style={[styles.big, { backgroundColor: c.bg }, sound.playing === `${l.n}-nom` && styles.playing]}
        >
          <Text style={[styles.bigLetter, { color: c.ink }]}>{l.letter}</Text>
          <View style={[styles.speaker, { backgroundColor: c.ink, opacity: hasAudio('nom') ? 1 : 0.35 }]}>
            <Ionicons name={hasAudio('nom') ? 'volume-high' : 'volume-mute'} size={24} color={c.bg} />
          </View>
        </Tap>

        {/* Les trois voyelles : un seul enregistrement « ba, bi, bou » */}
        <Text style={styles.label}>AVEC LES VOYELLES</Text>
        <Tap
          haptic
          onPress={() => play('voyelles')}
          accessibilityLabel={`Écouter ${l.vowelsTr.join(', ')}`}
          style={[styles.vowels, sound.playing === `${l.n}-voyelles` && styles.playing]}
        >
          {[0, 1, 2].map((k) => (
            <View key={k} style={styles.vowel}>
              <Text style={styles.vowelAr}>{l.vowels[k]}</Text>
              <Text style={styles.vowelTr}>{l.vowelsTr[k]}</Text>
            </View>
          ))}
        </Tap>

        {/* Un mot */}
        <Text style={styles.label}>UN MOT</Text>
        <Tap
          haptic
          onPress={() => play('mot')}
          accessibilityLabel={`Écouter ${l.wordTr}, ${l.wordFr}`}
          style={[styles.word, sound.playing === `${l.n}-mot` && styles.playing]}
        >
          <View style={styles.wordIcon}>
            <Ionicons name={l.icon} size={36} color="#5A3F06" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.wordTr}>{l.wordTr}</Text>
            <Text style={styles.wordFr}>{l.wordFr}</Text>
          </View>
          <Text style={styles.wordAr}>{l.word}</Text>
        </Tap>

        {!hasAudio('nom') && (
          <Text style={styles.pending}>Le son de cette lettre arrive bientôt.</Text>
        )}
      </ScrollView>

      {/* Sens de lecture arabe : la lettre suivante est à gauche */}
      <View style={[styles.nav, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Tap
          haptic
          onPress={() => go(1)}
          disabled={index === KIDS_LETTERS.length - 1}
          accessibilityLabel="Lettre suivante"
          style={[styles.navBtn, { backgroundColor: c.ink, opacity: index === KIDS_LETTERS.length - 1 ? 0.4 : 1 }]}
        >
          <Ionicons name="chevron-back" size={32} color={c.bg} />
        </Tap>
        <Text style={styles.count}>
          {l.n} / {KIDS_LETTERS.length}
        </Text>
        <Tap haptic onPress={() => go(-1)} disabled={index === 0} accessibilityLabel="Lettre précédente" style={[styles.navBtn, { backgroundColor: c.bg, opacity: index === 0 ? 0.4 : 1 }]}>
          <Ionicons name="chevron-forward" size={32} color={c.ink} />
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '800', color: INK },
  big: { height: 250, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  bigLetter: { fontFamily: ArabicFonts.bold, fontSize: 150, lineHeight: 200 },
  speaker: { position: 'absolute', right: 18, bottom: 18, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  playing: { transform: [{ scale: 1.03 }] },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#6B5E48', marginBottom: -6 },
  vowels: { flexDirection: 'row-reverse', gap: 10 },
  vowel: { flex: 1, height: 100, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#3A2E12', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  vowelAr: { fontFamily: ArabicFonts.bold, fontSize: 44, lineHeight: 64, color: INK },
  vowelTr: { fontSize: 15, fontWeight: '800', color: '#6B5E48', marginTop: -6 },
  word: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 14, elevation: 2, shadowColor: '#3A2E12', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  wordIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#F8E1A6', alignItems: 'center', justifyContent: 'center' },
  wordTr: { fontSize: 20, fontWeight: '800', color: INK },
  wordFr: { fontSize: 15, fontWeight: '600', color: '#6B5E48' },
  wordAr: { fontFamily: ArabicFonts.regular, fontSize: 36, lineHeight: 56, color: INK },
  pending: { textAlign: 'center', fontSize: 14, color: '#6B5E48' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  navBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 17, fontWeight: '800', color: '#6B5E48', fontVariant: ['tabular-nums'] },
});
