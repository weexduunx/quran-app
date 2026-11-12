/**
 * Lecteur « sourate entière », pour les récitateurs dont on ne dispose que d'un
 * fichier par sourate (ex. Mouhamed Hady Touré). Pas de mot à mot ni de suivi
 * verset par verset : quand on lance depuis un verset, on se place à une
 * position estimée (proportionnelle à la longueur du texte qui précède).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AudioPlayerProps } from '@/components/AudioPlayerSimple';
import { useReciterStore } from '@/stores/reciterStore';
import { recitationService } from '@/services/recitationService';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

const SPEEDS = [0.75, 1, 1.25, 1.5];

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

/** Longueur « récitée » approximative : lettres arabes sans voyelles ni signes */
const letters = (t?: string) => (t ?? '').replace(/[ً-ٰٟۖ-ۭ\s]/g, '').length;

export function SurahAudioPlayer({
  verses,
  surahNumber,
  surahName,
  currentVerseIndex,
  onVerseHighlight,
  isVisible,
  onClose,
}: AudioPlayerProps) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reciter = useReciterStore((s) => s.getSelectedReciter());
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const [speedIndex, setSpeedIndex] = useState(1);
  const [loop, setLoop] = useState(false);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [estimated, setEstimated] = useState(false);
  const pendingVerse = useRef<number | null>(null);
  const loadedUrl = useRef<string | null>(null);
  const slide = useRef(new Animated.Value(500)).current;

  const surah = surahNumber ?? verses[0]?.surah_id;
  const url = surah ? recitationService.surahAudioUrl(reciter, surah) : undefined;
  const bg = isDark ? '#0E3A2C' : '#0B3D2E';

  // Part du texte qui précède chaque verset (0 → 1)
  const offsets = useMemo(() => {
    const lens = verses.map((v) => letters(v.text_arabic));
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lens.map((l) => {
      const start = acc / total;
      acc += l;
      return start;
    });
  }, [verses]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionModeAndroid: 'duckOthers' }).catch(
      () => {}
    );
  }, []);

  useEffect(() => {
    Animated.spring(slide, { toValue: isVisible ? 0 : 500, useNativeDriver: true, tension: 80, friction: 12 }).start();
    if (!isVisible) player.pause();
  }, [isVisible, slide, player]);

  // Ouverture ou changement de verset demandé
  useEffect(() => {
    if (!isVisible || !url) return;
    const v = verses[currentVerseIndex];
    if (v) onVerseHighlight(v.id);
    pendingVerse.current = currentVerseIndex;
    if (loadedUrl.current !== url) {
      loadedUrl.current = url;
      player.replace({ uri: url });
    }
    player.setPlaybackRate(SPEEDS[speedIndex]);
    player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, url, currentVerseIndex]);

  // Dès que la durée est connue, se placer au verset demandé
  useEffect(() => {
    const index = pendingVerse.current;
    if (index === null || !status.duration) return;
    pendingVerse.current = null;
    if (index <= 0) {
      setEstimated(false);
      return;
    }
    player.seekTo(offsets[index] * status.duration);
    setEstimated(true);
  }, [status.duration, offsets, player, currentVerseIndex]);

  useEffect(() => {
    player.setPlaybackRate(SPEEDS[speedIndex]);
  }, [speedIndex, player]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (loop) {
      player.seekTo(0);
      player.play();
    }
  }, [status.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = (d: number) => player.seekTo(Math.max(0, Math.min(status.duration || 0, status.currentTime + d)));
  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.duration && status.currentTime >= status.duration - 0.5) player.seekTo(0);
      player.play();
    }
  };
  const close = () => {
    player.pause();
    onClose();
  };

  const busy = (!status.isLoaded || status.isBuffering) && !status.playing;
  const gold = '#E9D49A';

  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + Spacing.md, transform: [{ translateY: slide }] }]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="mic-outline" size={20} color={gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.callout, { color: '#fff', fontWeight: '600' }]} numberOfLines={1}>
            {reciter.name}
          </Text>
          <Text style={[Type.caption, { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>
            {surahName ? `${surahName} · ` : ''}sourate entière
          </Text>
        </View>
        <Tap onPress={close} hitSlop={10} accessibilityLabel="Fermer le lecteur" style={styles.iconBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Tap>
      </View>

      <Text style={styles.note}>
        {estimated
          ? `Départ à une position estimée du verset ${currentVerseIndex + 1} : ajustez avec ±10 s si besoin.`
          : 'Récitation par sourate entière : pas de mot à mot pour cette voix.'}
      </Text>

      <View style={styles.progressRow}>
        <Text style={styles.time}>{fmt(seeking ?? status.currentTime)}</Text>
        <Slider
          style={{ flex: 1, height: 32 }}
          minimumValue={0}
          maximumValue={Math.max(status.duration, 1)}
          value={seeking ?? status.currentTime}
          onValueChange={setSeeking}
          onSlidingComplete={(v) => {
            player.seekTo(v);
            setSeeking(null);
          }}
          minimumTrackTintColor={gold}
          maximumTrackTintColor="rgba(255,255,255,0.22)"
          thumbTintColor={gold}
          disabled={!status.isLoaded}
        />
        <Text style={styles.time}>{fmt(status.duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Tap haptic onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)} style={styles.pill} accessibilityLabel="Vitesse">
          <Text style={[Type.caption, { color: '#fff', fontWeight: '700' }]}>{String(SPEEDS[speedIndex]).replace('.', ',')}×</Text>
        </Tap>
        <Tap haptic onPress={() => skip(-10)} style={styles.iconBtn} accessibilityLabel="Reculer de 10 secondes">
          <Ionicons name="play-back" size={22} color="#fff" />
          <Text style={styles.skipText}>10 s</Text>
        </Tap>
        <Tap haptic onPress={toggle} style={[styles.play, { backgroundColor: gold }]} accessibilityLabel={status.playing ? 'Pause' : 'Lecture'}>
          {busy ? (
            <ActivityIndicator color="#0B3D2E" />
          ) : (
            <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color="#0B3D2E" style={!status.playing && { marginLeft: 3 }} />
          )}
        </Tap>
        <Tap haptic onPress={() => skip(10)} style={styles.iconBtn} accessibilityLabel="Avancer de 10 secondes">
          <Ionicons name="play-forward" size={22} color="#fff" />
          <Text style={styles.skipText}>10 s</Text>
        </Tap>
        <Tap
          haptic
          onPress={() => setLoop((l) => !l)}
          accessibilityLabel={loop ? 'Ne plus répéter la sourate' : 'Répéter la sourate'}
          style={[styles.pill, loop && { borderColor: gold, backgroundColor: 'rgba(255,255,255,0.10)' }]}
        >
          <Ionicons name="repeat" size={16} color={loop ? gold : '#fff'} />
        </Tap>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: 'rgba(255,255,255,0.72)', fontSize: 10 },
  note: { color: 'rgba(255,255,255,0.72)', fontSize: 12, textAlign: 'center', marginTop: Spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  time: { color: 'rgba(255,255,255,0.72)', fontSize: 12, minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  pill: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
