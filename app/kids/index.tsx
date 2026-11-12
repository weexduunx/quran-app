import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { KIDS_RECITER_ID, KIDS_SURAHS, kidsColor } from '@/utils/kidsContent';
import { useKidsStore } from '@/stores/kidsStore';
import { popularReciters } from '@/stores/reciterStore';
import { downloadKey, useOfflineStore } from '@/stores/offlineStore';
import { downloadSurahs } from '@/hooks/useOffline';
import { useSurahs } from '@/hooks/useSurahs';
import { surahFrenchTitle, surahTransliteration } from '@/utils/surahNames';
import { repairArabicText } from '@/utils/textUtils';
import { ArabicFonts, Radius, Spacing } from '@/constants/theme';
import { BrandMark } from '@/components/BrandMark';
import { Tap } from '@/components/ui/kit';
import { ParentGate } from '@/components/kids/ParentGate';

const BG = '#FFF8EC';
const INK = '#2B2418';

export default function KidsHome() {
  const insets = useSafeAreaInsets();
  const { surahs } = useSurahs();
  const stars = useKidsStore((s) => s.stars);
  const setLocked = useKidsStore((s) => s.setLocked);
  const [parentPanel, setParentPanel] = useState(false);

  // L'app reste dans l'espace enfants jusqu'à la sortie parent
  useEffect(() => {
    setLocked(true);
  }, [setLocked]);

  // Bouton retour Android : bloqué sur l'accueil enfants
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [])
  );

  const exit = () => {
    setLocked(false);
    router.replace('/(tabs)');
  };

  const totalStars = KIDS_SURAHS.reduce((sum, n) => sum + (stars[n] ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxxl }}>
        <View style={styles.top}>
          <ParentGate label="Sortir" icon="exit-outline" onUnlock={exit} />
          <ParentGate label="Parents" icon="settings-outline" onUnlock={() => setParentPanel(true)} />
        </View>

        <View style={styles.hello}>
          <BrandMark size={72} tone="light" />
          <View style={{ flex: 1 }}>
            <Text style={styles.helloTitle}>As-salâmou ‘alaykoum !</Text>
            <Text style={styles.helloSub}>Choisis ta sourate</Text>
          </View>
        </View>

        <View style={styles.starsBar} accessibilityLabel={`${totalStars} étoiles gagnées`}>
          <Ionicons name="star" size={22} color="#E2A400" />
          <Text style={styles.starsText}>{totalStars}</Text>
        </View>

        <View style={styles.grid}>
          {KIDS_SURAHS.map((n, i) => {
            const color = kidsColor(i);
            const info = surahs.find((s) => s.number === n);
            const got = stars[n] ?? 0;
            return (
              <Tap
                key={n}
                haptic
                onPress={() => router.push({ pathname: '/kids/[surah]', params: { surah: String(n) } })}
                accessibilityRole="button"
                accessibilityLabel={`${surahTransliteration(n)}, ${got} étoile${got > 1 ? 's' : ''} sur 3`}
                style={[styles.card, { backgroundColor: color.bg }]}
              >
                {info && (
                  <Text style={[styles.cardArabic, { color: color.ink }]} numberOfLines={1}>
                    {repairArabicText(info.name_arabic).replace(/^سُورَةُ\s*/, '')}
                  </Text>
                )}
                <Text style={[styles.cardTitle, { color: color.ink }]} numberOfLines={1}>
                  {surahTransliteration(n)}
                </Text>
                <View style={styles.cardStars}>
                  {[0, 1, 2].map((k) => (
                    <Ionicons key={k} name={k < got ? 'star' : 'star-outline'} size={22} color={k < got ? '#E2A400' : color.ink} style={{ opacity: k < got ? 1 : 0.35 }} />
                  ))}
                </View>
                <View style={[styles.playBadge, { backgroundColor: color.ink }]}>
                  <Ionicons name="play" size={20} color={color.bg} style={{ marginLeft: 2 }} />
                </View>
              </Tap>
            );
          })}
        </View>
      </ScrollView>

      <ParentPanel visible={parentPanel} onClose={() => setParentPanel(false)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Panneau parents : mode d'écoute, hors ligne, progrès
// ---------------------------------------------------------------------------
function ParentPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const mode = useKidsStore((s) => s.mode);
  const setMode = useKidsStore((s) => s.setMode);
  const stars = useKidsStore((s) => s.stars);
  const sessions = useKidsStore((s) => s.sessions);
  const resetProgress = useKidsStore((s) => s.resetProgress);
  const downloads = useOfflineStore((s) => s.downloads);
  const reciter = popularReciters.find((r) => r.id === KIDS_RECITER_ID)!;

  const offline = KIDS_SURAHS.filter((n) => downloads[downloadKey(KIDS_RECITER_ID, n)]?.status === 'done').length;
  const downloading = KIDS_SURAHS.some((n) => downloads[downloadKey(KIDS_RECITER_ID, n)]?.status === 'downloading');

  const option = (value: typeof mode, title: string, sub: string) => (
    <Tap
      onPress={() => setMode(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: mode === value }}
      style={[styles.option, { borderColor: mode === value ? '#12664B' : '#E6DFCF', backgroundColor: mode === value ? '#E3F0EA' : '#fff' }]}
    >
      <Ionicons name={mode === value ? 'radio-button-on' : 'radio-button-off'} size={22} color={mode === value ? '#12664B' : '#8C948F'} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
    </Tap>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: '#F8F5EE' }} contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.panelTitle, { flex: 1 }]}>Espace parents</Text>
          <Tap onPress={onClose} accessibilityLabel="Fermer" style={styles.close}>
            <Ionicons name="close" size={22} color={INK} />
          </Tap>
        </View>

        <Text style={styles.section}>MODE D’ÉCOUTE</Text>
        {option('repeat', 'Écoute et répète', 'Chaque verset est récité 3 fois, avec un silence pour que l’enfant répète.')}
        {option('listen', 'Écoute seule', 'Chaque verset est récité 3 fois, sans pause.')}

        <Text style={styles.section}>HORS LIGNE</Text>
        <Tap
          onPress={() => downloadSurahs(reciter, KIDS_SURAHS)}
          disabled={downloading || offline === KIDS_SURAHS.length}
          style={[styles.option, { borderColor: '#E6DFCF', backgroundColor: '#fff' }]}
        >
          <Ionicons
            name={offline === KIDS_SURAHS.length ? 'cloud-done' : 'cloud-download-outline'}
            size={22}
            color={offline === KIDS_SURAHS.length ? '#B08A3E' : '#12664B'}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>
              {offline === KIDS_SURAHS.length ? 'Tout est disponible hors ligne' : downloading ? 'Téléchargement en cours…' : 'Télécharger les sourates des enfants'}
            </Text>
            <Text style={styles.optionSub}>
              {offline}/{KIDS_SURAHS.length} sourates · voix d’Al-Husary (Enseignement)
            </Text>
          </View>
        </Tap>

        <Text style={styles.section}>PROGRÈS</Text>
        <View style={[styles.option, { borderColor: '#E6DFCF', backgroundColor: '#fff', flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
          {KIDS_SURAHS.map((n) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.optionTitle, { flex: 1 }]}>
                {surahTransliteration(n)} <Text style={styles.optionSub}>{surahFrenchTitle(n)}</Text>
              </Text>
              <Text style={styles.optionSub}>
                {sessions[n] ?? 0} séance(s) · {stars[n] ?? 0}★
              </Text>
            </View>
          ))}
        </View>
        <Tap onPress={resetProgress} style={{ alignSelf: 'center', padding: Spacing.md, marginTop: Spacing.sm }}>
          <Text style={{ color: '#B3261E', fontWeight: '600' }}>Remettre les étoiles à zéro</Text>
        </Tap>

        <Text style={[styles.optionSub, { marginTop: Spacing.lg }]}>
          L’espace enfants ne contient ni publicité ni lien externe. L’app y reste, même après redémarrage, jusqu’à ce
          qu’un adulte maintienne « Sortir » pendant 3 secondes.
        </Text>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl },
  hello: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  helloTitle: { fontSize: 28, fontWeight: '800', color: INK, letterSpacing: -0.4 },
  helloSub: { fontSize: 18, fontWeight: '600', color: '#6B5E48', marginTop: 2 },
  starsBar: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEFC2',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: Spacing.xl,
    marginTop: Spacing.lg,
  },
  starsText: { fontSize: 20, fontWeight: '800', color: '#5A3F06' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  card: { width: '47.5%', minHeight: 176, borderRadius: 28, padding: 16, justifyContent: 'space-between' },
  cardArabic: { fontFamily: ArabicFonts.bold, fontSize: 30, lineHeight: 52, textAlign: 'right' },
  cardTitle: { fontSize: 19, fontWeight: '800' },
  cardStars: { flexDirection: 'row', gap: 2 },
  playBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: { fontSize: 26, fontWeight: '700', color: INK },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#5E6863', marginTop: Spacing.xxl, marginBottom: Spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm },
  optionTitle: { fontSize: 15, fontWeight: '600', color: INK },
  optionSub: { fontSize: 13, color: '#5E6863' },
});
