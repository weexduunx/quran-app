/**
 * « Écoute et répète » : le récitateur dit le verset, puis un silence laisse
 * l'enfant répéter. 3 fois par verset, puis verset suivant. Étoile à la fin.
 * Pensé pour un enfant qui ne lit pas : tout passe par le son et de gros boutons.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { KIDS_RECITER_ID, KIDS_REPETITIONS, KIDS_SURAHS, kidsColor } from '@/utils/kidsContent';
import { useKidsStore } from '@/stores/kidsStore';
import { popularReciters } from '@/stores/reciterStore';
import { recitationService, VerseAudio } from '@/services/recitationService';
import { useSurahVerses } from '@/hooks/useSurahs';
import { surahTransliteration } from '@/utils/surahNames';
import { repairArabicText } from '@/utils/textUtils';
import { ArabicFonts, Radius, Spacing } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

type Phase = 'ready' | 'listen' | 'turn' | 'paused' | 'done';

const BG = '#FFF8EC';
const INK = '#2B2418';
const GOLD = '#E9D49A';

export default function KidsLearnScreen() {
  const { surah: param } = useLocalSearchParams<{ surah: string }>();
  const surah = Number(param) || 1;
  const insets = useSafeAreaInsets();
  const color = kidsColor(Math.max(0, KIDS_SURAHS.indexOf(surah)));
  const reciter = popularReciters.find((r) => r.id === KIDS_RECITER_ID)!;

  const mode = useKidsStore((s) => s.mode);
  const completeSession = useKidsStore((s) => s.completeSession);
  const { verses, error } = useSurahVerses(surah);

  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const [phase, setPhaseState] = useState<Phase>('ready');
  const [verseIdx, setVerseIdx] = useState(0);
  const [rep, setRep] = useState(0);
  const [audio, setAudio] = useState<VerseAudio | null>(null);
  const [loading, setLoading] = useState(false);
  const [earned, setEarned] = useState(0);

  // Refs : les minuteries et la fin d'audio lisent toujours l'état à jour
  const phaseRef = useRef<Phase>('ready');
  const pausedFrom = useRef<Phase>('listen');
  const verseRef = useRef(0);
  const repRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => clearTimer();
  }, []);

  // Pulsation du « À toi ! »
  useEffect(() => {
    if (phase !== 'turn') {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const playVerse = useCallback(
    async (idx: number) => {
      const v = verses[idx];
      if (!v) return;
      clearTimer();
      verseRef.current = idx;
      repRef.current = 0;
      setVerseIdx(idx);
      setRep(0);
      setPhase('listen');
      setLoading(true);
      try {
        const a = await recitationService.getVerseAudio(reciter, surah, v.verse_number, v.global_number);
        if (verseRef.current !== idx) return;
        setAudio(a);
        player.replace({ uri: a.url });
        player.setPlaybackRate(1);
        player.play();
      } catch {
        setPhase('paused');
      } finally {
        setLoading(false);
      }
    },
    [verses, reciter, surah, player]
  );

  const finish = useCallback(() => {
    clearTimer();
    player.pause();
    setEarned(completeSession(surah));
    setPhase('done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [completeSession, surah, player]);

  // Après le silence de l'enfant (ou directement en écoute seule)
  const afterTurn = useCallback(() => {
    clearTimer();
    if (repRef.current + 1 < KIDS_REPETITIONS) {
      repRef.current += 1;
      setRep(repRef.current);
      setPhase('listen');
      player.seekTo(0);
      player.play();
    } else if (verseRef.current + 1 < verses.length) {
      playVerse(verseRef.current + 1);
    } else {
      finish();
    }
  }, [player, verses.length, playVerse, finish]);

  // Fin de la récitation d'un verset
  useEffect(() => {
    if (!status.didJustFinish || phaseRef.current !== 'listen') return;
    if (mode === 'repeat') {
      setPhase('turn');
      // Silence ≈ durée du verset (+15 %), borné pour rester ludique
      const silence = Math.min(14000, Math.max(2500, (status.duration || 3) * 1150));
      timer.current = setTimeout(afterTurn, silence);
    } else {
      timer.current = setTimeout(afterTurn, 700);
    }
  }, [status.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const p = phaseRef.current;
    if (p === 'ready' || p === 'done') {
      setEarned(0);
      playVerse(0);
    } else if (p === 'listen' || p === 'turn') {
      pausedFrom.current = p;
      clearTimer();
      player.pause();
      setPhase('paused');
    } else if (p === 'paused') {
      if (!audio) return playVerse(verseRef.current);
      if (pausedFrom.current === 'turn') afterTurn();
      else {
        setPhase('listen');
        player.play();
      }
    }
  };

  const go = (delta: number) => {
    const idx = Math.min(verses.length - 1, Math.max(0, verseRef.current + delta));
    playVerse(idx);
  };

  const leave = () => {
    clearTimer();
    player.pause();
    router.back();
  };

  const verse = verses[verseIdx];
  const wordIndex = audio && phase !== 'ready' ? recitationService.wordIndexAt(audio, status.currentTime * 1000) : -1;
  const words =
    audio?.words.length && phase !== 'ready'
      ? audio.words
      : (repairArabicText(verse?.text_uthmani || verse?.text_arabic || '')
          .split(/\s+/)
          .filter(Boolean)
          .map((w, i) => ({ position: i + 1, arabic: w, transliteration: undefined })) as VerseAudio['words']);

  const playing = phase === 'listen' || phase === 'turn';
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Tap haptic onPress={leave} accessibilityLabel="Retour aux sourates" style={[styles.roundBtn, { backgroundColor: color.bg }]}>
          <Ionicons name="arrow-back" size={28} color={color.ink} />
        </Tap>
        <Text style={styles.title} numberOfLines={1}>
          {surahTransliteration(surah)}
        </Text>
        <View style={{ width: 56 }} />
      </View>

      {/* Avancée : un rond par verset */}
      <View style={styles.dots} accessibilityLabel={`Verset ${verseIdx + 1} sur ${verses.length}`}>
        {verses.map((v, i) => (
          <View
            key={v.id}
            style={[
              styles.dot,
              {
                backgroundColor: i < verseIdx || phase === 'done' ? color.ink : i === verseIdx ? GOLD : 'transparent',
                borderColor: color.ink,
                width: i === verseIdx && phase !== 'done' ? 22 : 12,
              },
            ]}
          />
        ))}
      </View>

      {/* Le verset */}
      <ScrollView contentContainerStyle={styles.body}>
        {!verse ? (
          error ? (
            <Text style={styles.help}>Pas de connexion. Demande à un adulte de télécharger les sourates.</Text>
          ) : (
            <ActivityIndicator size="large" color={color.ink} />
          )
        ) : (
          <View style={[styles.verseCard, { backgroundColor: color.bg }]}>
            <View style={styles.words}>
              {words.map((w, i) => (
                <View key={`${w.position}-${i}`} style={[styles.word, i === wordIndex && { backgroundColor: GOLD }]}>
                  <Text style={[styles.wordAr, { color: i === wordIndex ? '#0B3D2E' : color.ink }]}>{w.arabic}</Text>
                  {!!w.transliteration && (
                    <Text style={[styles.wordTr, { color: i === wordIndex ? '#0B3D2E' : color.ink }]}>{w.transliteration}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ce qui se passe, en un coup d'œil */}
        {phase === 'turn' ? (
          <Animated.View style={[styles.turn, { transform: [{ scale }] }]} accessibilityLiveRegion="polite">
            <Ionicons name="mic" size={30} color="#0B3D2E" />
            <Text style={styles.turnText}>À toi !</Text>
          </Animated.View>
        ) : phase === 'listen' ? (
          <View style={[styles.listen, { borderColor: color.ink }]}>
            <Ionicons name="ear" size={26} color={color.ink} />
            <Text style={[styles.listenText, { color: color.ink }]}>Écoute…</Text>
          </View>
        ) : (
          <View style={{ height: 64 }} />
        )}

        {phase !== 'ready' && phase !== 'done' && (
          <View style={styles.reps} accessibilityLabel={`Écoute ${rep + 1} sur ${KIDS_REPETITIONS}`}>
            {Array.from({ length: KIDS_REPETITIONS }, (_, k) => (
              <Ionicons key={k} name={k <= rep ? 'ellipse' : 'ellipse-outline'} size={14} color={color.ink} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Commandes géantes */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Tap haptic onPress={() => go(-1)} disabled={verseIdx === 0 || phase === 'ready'} accessibilityLabel="Verset précédent" style={[styles.sideBtn, { backgroundColor: color.bg, opacity: verseIdx === 0 || phase === 'ready' ? 0.4 : 1 }]}>
          <Ionicons name="play-skip-back" size={30} color={color.ink} />
        </Tap>
        <Tap haptic onPress={togglePlay} accessibilityLabel={playing ? 'Pause' : phase === 'ready' ? 'Commencer' : 'Reprendre'} style={[styles.bigBtn, { backgroundColor: color.ink }]}>
          {loading ? (
            <ActivityIndicator color={color.bg} size="large" />
          ) : (
            <Ionicons name={playing ? 'pause' : 'play'} size={52} color={color.bg} style={!playing && { marginLeft: 6 }} />
          )}
        </Tap>
        <Tap
          haptic
          onPress={() => go(1)}
          disabled={verseIdx >= verses.length - 1 || phase === 'ready'}
          accessibilityLabel="Verset suivant"
          style={[styles.sideBtn, { backgroundColor: color.bg, opacity: verseIdx >= verses.length - 1 || phase === 'ready' ? 0.4 : 1 }]}
        >
          <Ionicons name="play-skip-forward" size={30} color={color.ink} />
        </Tap>
      </View>

      {phase === 'done' && <Celebration surah={surah} stars={earned} color={color} onAgain={togglePlay} onBack={leave} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bravo !
// ---------------------------------------------------------------------------
function Celebration({
  surah,
  stars,
  color,
  onAgain,
  onBack,
}: {
  surah: number;
  stars: number;
  color: { bg: string; ink: string };
  onAgain: () => void;
  onBack: () => void;
}) {
  const pop = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      180,
      pop.map((v) => Animated.spring(v, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }))
    ).start();
  }, [pop]);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={[styles.celebration, { backgroundColor: BG }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {pop.map((v, k) => (
            <Animated.View key={k} style={{ transform: [{ scale: v }] }}>
              <Ionicons name={k < stars ? 'star' : 'star-outline'} size={64} color={k < stars ? '#E2A400' : '#D9CFB8'} />
            </Animated.View>
          ))}
        </View>
        <Text style={styles.bravo}>Bravo !</Text>
        <Text style={styles.bravoSub}>Tu as écouté {surahTransliteration(surah)}</Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: Spacing.xl }}>
          <Tap haptic onPress={onAgain} accessibilityLabel="Recommencer" style={[styles.sideBtn, { backgroundColor: color.bg }]}>
            <Ionicons name="refresh" size={30} color={color.ink} />
          </Tap>
          <Tap haptic onPress={onBack} accessibilityLabel="Autres sourates" style={[styles.sideBtn, { backgroundColor: color.ink }]}>
            <Ionicons name="grid" size={28} color={color.bg} />
          </Tap>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg },
  roundBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '800', color: INK },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: Spacing.lg, paddingHorizontal: Spacing.xl },
  dot: { height: 12, borderRadius: 6, borderWidth: 2 },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.xl },
  verseCard: { alignSelf: 'stretch', borderRadius: 32, padding: Spacing.xl },
  words: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  word: { borderRadius: Radius.lg, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  wordAr: { fontFamily: ArabicFonts.regular, fontSize: 38, lineHeight: 64 },
  wordTr: { fontSize: 13, fontWeight: '600', opacity: 0.8, marginTop: -6 },
  turn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: Radius.pill,
    paddingHorizontal: 28,
    height: 64,
  },
  turnText: { fontSize: 26, fontWeight: '800', color: '#0B3D2E' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: Radius.pill, paddingHorizontal: 24, height: 64 },
  listenText: { fontSize: 22, fontWeight: '700' },
  reps: { flexDirection: 'row', gap: 8 },
  help: { fontSize: 18, textAlign: 'center', color: INK },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: Spacing.lg },
  sideBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  bigBtn: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43,36,24,0.45)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  celebration: { alignSelf: 'stretch', borderRadius: 36, padding: Spacing.xxl, alignItems: 'center' },
  bravo: { fontSize: 40, fontWeight: '800', color: INK, marginTop: Spacing.lg },
  bravoSub: { fontSize: 18, fontWeight: '600', color: '#6B5E48', marginTop: 4, textAlign: 'center' },
});
