import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { KIDS_DUAS, duaAudio, DuaLang } from '@/utils/kidsLearning';
import { useKidsStore } from '@/stores/kidsStore';
import { useKidsSound } from '@/hooks/useKidsSound';
import { ArabicFonts, Spacing } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

const BG = '#FFF8EC';
const INK = '#2B2418';
const SOFT = '#DDD3F2';
const DEEP = '#33215E';

const LANGS: { id: DuaLang; label: string }[] = [
  { id: 'ar', label: 'Arabe' },
  { id: 'fr', label: 'Français' },
  { id: 'wo', label: 'Wolof' },
];

export default function KidsInvocations() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const d = KIDS_DUAS[index];
  const heard = useKidsStore((s) => s.duasHeard);
  const markDua = useKidsStore((s) => s.markDua);
  const sound = useKidsSound((key) => {
    // L'étoile se gagne en écoutant l'invocation en arabe jusqu'au bout
    const [n, lang] = key.split('-');
    if (lang === 'ar') markDua(Number(n));
  });
  const chips = useRef<ScrollView>(null);

  useEffect(() => {
    chips.current?.scrollTo({ x: Math.max(0, index * 84 - 120), animated: true });
  }, [index]);

  const select = (i: number) => {
    sound.stop();
    setIndex(i);
  };
  const play = (lang: DuaLang) => sound.play(`${d.n}-${lang}`, duaAudio(d, lang));
  const isPlaying = (lang: DuaLang) => sound.playing === `${d.n}-${lang}`;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Tap haptic onPress={() => router.back()} accessibilityLabel="Retour" style={[styles.round, { backgroundColor: SOFT }]}>
          <Ionicons name="arrow-back" size={28} color={DEEP} />
        </Tap>
        <Text style={styles.title}>Mes invocations</Text>
        <View style={styles.stars} accessibilityLabel={`${heard.length} invocations apprises sur ${KIDS_DUAS.length}`}>
          <Ionicons name="star" size={18} color="#E2A400" />
          <Text style={styles.starsText}>{heard.length}</Text>
        </View>
      </View>

      {/* Les moments de la journée */}
      <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
        {KIDS_DUAS.map((x, i) => {
          const active = i === index;
          return (
            <Tap
              key={x.n}
              haptic
              onPress={() => select(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={x.moment}
              style={[styles.chip, { backgroundColor: active ? DEEP : '#FFFFFF' }]}
            >
              <Ionicons name={x.icon} size={26} color={active ? '#FFFFFF' : DEEP} />
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : DEEP }]} numberOfLines={1}>
                {x.short}
              </Text>
              {heard.includes(x.n) && <Ionicons name="star" size={12} color="#E2A400" style={styles.chipStar} />}
            </Tap>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>
        <Tap haptic onPress={() => play('ar')} accessibilityLabel={`Écouter : ${d.moment}`} style={[styles.card, isPlaying('ar') && { transform: [{ scale: 1.02 }] }]}>
          <View style={styles.cardIcon}>
            <Ionicons name={d.icon} size={42} color={DEEP} />
          </View>
          <Text style={styles.moment}>{d.moment}</Text>
          <Text style={styles.ar}>{d.ar}</Text>
          <Text style={styles.tr}>{d.tr}</Text>
          <Text style={styles.fr}>« {d.fr} »</Text>
          {d.extra && (
            <View style={styles.extra}>
              <Text style={styles.extraLabel}>{d.extra.label}</Text>
              <Text style={[styles.ar, { fontSize: 26, lineHeight: 46 }]}>{d.extra.ar}</Text>
              <Text style={[styles.tr, { fontSize: 15 }]}>{d.extra.tr}</Text>
              <Text style={[styles.fr, { fontSize: 14 }]}>« {d.extra.fr} »</Text>
            </View>
          )}
        </Tap>

        <Text style={styles.label}>ÉCOUTER EN</Text>
        <View style={styles.langs}>
          {LANGS.map((lang) => {
            const available = !!duaAudio(d, lang.id);
            const on = isPlaying(lang.id);
            return (
              <Tap
                key={lang.id}
                haptic
                onPress={() => play(lang.id)}
                accessibilityLabel={`Écouter en ${lang.label}${available ? '' : ' (bientôt)'}`}
                style={[styles.lang, { backgroundColor: on ? DEEP : 'transparent', opacity: available ? 1 : 0.4 }]}
              >
                <Ionicons name={on ? 'pause' : available ? 'volume-high' : 'volume-mute'} size={18} color={on ? '#FFFFFF' : DEEP} />
                <Text style={[styles.langText, { color: on ? '#FFFFFF' : DEEP }]}>{lang.label}</Text>
              </Tap>
            );
          })}
        </View>
        <Text style={styles.src}>{d.src}</Text>
      </ScrollView>

      <View style={[styles.nav, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Tap haptic onPress={() => select(index - 1)} disabled={index === 0} accessibilityLabel="Invocation précédente" style={[styles.navBtn, { backgroundColor: SOFT, opacity: index === 0 ? 0.4 : 1 }]}>
          <Ionicons name="chevron-back" size={32} color={DEEP} />
        </Tap>
        <Tap haptic onPress={() => play('ar')} accessibilityLabel="Écouter en arabe" style={styles.playBtn}>
          <Ionicons name={isPlaying('ar') ? 'pause' : 'play'} size={48} color={SOFT} style={!isPlaying('ar') && { marginLeft: 6 }} />
        </Tap>
        <Tap
          haptic
          onPress={() => select(index + 1)}
          disabled={index === KIDS_DUAS.length - 1}
          accessibilityLabel="Invocation suivante"
          style={[styles.navBtn, { backgroundColor: SOFT, opacity: index === KIDS_DUAS.length - 1 ? 0.4 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={32} color={DEEP} />
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '800', color: INK },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEFC2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  starsText: { fontSize: 17, fontWeight: '800', color: '#5A3F06' },
  chips: { gap: 10, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 4 },
  chip: {
    width: 74,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#3A2E12',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  chipText: { fontSize: 12, fontWeight: '800' },
  chipStar: { position: 'absolute', top: 6, right: 6 },
  card: { backgroundColor: SOFT, borderRadius: 36, padding: Spacing.xl, alignItems: 'center' },
  cardIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  moment: { fontSize: 22, fontWeight: '800', color: DEEP, marginTop: Spacing.md, textAlign: 'center' },
  ar: { fontFamily: ArabicFonts.bold, fontSize: 34, lineHeight: 60, color: DEEP, textAlign: 'center', writingDirection: 'rtl', marginTop: Spacing.md },
  tr: { fontSize: 17, fontWeight: '700', fontStyle: 'italic', color: DEEP, textAlign: 'center', marginTop: 4 },
  fr: { fontSize: 15, fontWeight: '600', color: DEEP, opacity: 0.85, textAlign: 'center', marginTop: 6 },
  extra: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: 'rgba(51,33,94,0.2)', marginTop: Spacing.lg, paddingTop: Spacing.md, alignItems: 'center' },
  extraLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: DEEP, opacity: 0.8, textTransform: 'uppercase' },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#6B5E48', marginBottom: -6 },
  langs: { flexDirection: 'row', gap: 10 },
  lang: { flex: 1, height: 56, borderRadius: 28, borderWidth: 2, borderColor: DEEP, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  langText: { fontSize: 16, fontWeight: '800' },
  src: { textAlign: 'center', fontSize: 12, color: '#6B5E48' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: Spacing.md },
  navBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 104, height: 104, borderRadius: 52, backgroundColor: DEEP, alignItems: 'center', justifyContent: 'center' },
});
